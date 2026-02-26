import { fyo } from 'src/initFyo';
import { QueryFilter } from 'utils/db/types';
import type { PartyStatementRow } from './printTemplates';

type PartyRole = 'Customer' | 'Supplier' | 'Both' | string;

export type PartyStatementData = {
  openingBalance: number;
  closingBalance: number;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  rows: PartyStatementRow[];
};

const toNum = (v: number | string) =>
  typeof v === 'number' ? v : parseFloat(String(v)) || 0;

const formatCur = (v: number | string) =>
  fyo.format(fyo.pesa(v), fyo.getField('SalesInvoice', 'grandTotal'));

const formatSignedCur = (v: number) => {
  const abs = formatCur(Math.abs(v));
  return v < 0 ? `-${abs}` : abs;
};

function getDateFilter(fromDate?: string, toDate?: string): QueryFilter {
  if (fromDate && toDate) {
    return { date: ['between', [fromDate, toDate]] } as QueryFilter;
  }
  if (fromDate) {
    return { date: ['>=', fromDate] } as QueryFilter;
  }
  if (toDate) {
    return { date: ['<=', toDate] } as QueryFilter;
  }
  return {} as QueryFilter;
}

async function getPartyAccountNamesByRole(_role: PartyRole): Promise<string[]> {
  // Keep statement source inclusive across control accounts so legacy/mixed
  // party movements don't disappear (customer/supplier/both).
  const accountTypes = ['Receivable', 'Payable'];

  const partyAccounts = (await fyo.db.getAllRaw('Account', {
    fields: ['name'],
    filters: {
      isGroup: false,
      accountType: ['in', accountTypes],
    },
  })) as { name: string }[];

  return partyAccounts.map((a) => a.name);
}

export async function getPartyCurrentBalance(
  partyName: string,
  role: PartyRole
): Promise<number> {
  const partyAccountNames = await getPartyAccountNamesByRole(role);
  if (!partyAccountNames.length) {
    return 0;
  }

  const glEntries = (await fyo.db.getAllRaw('AccountingLedgerEntry', {
    fields: ['debit', 'credit'],
    filters: {
      party: partyName,
      account: ['in', partyAccountNames],
      reverted: false,
    },
  })) as { debit: number | string; credit: number | string }[];

  return glEntries.reduce((sum, e) => sum + toNum(e.debit) - toNum(e.credit), 0);
}

export async function getPartyStatementData(
  partyName: string,
  role: PartyRole,
  fromDate?: string,
  toDate?: string
): Promise<PartyStatementData> {
  const partyAccountNames = await getPartyAccountNamesByRole(role);
  if (!partyAccountNames.length) {
    return {
      openingBalance: 0,
      closingBalance: 0,
      currentBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
      rows: [],
    };
  }

  const dateField = fyo.getField('SalesInvoice', 'date');
  const dateFieldJe = fyo.getField('JournalEntry', 'date') ?? dateField;
  const baseFilters: QueryFilter = {
    party: partyName,
    account: ['in', partyAccountNames],
    reverted: false,
  };
  const periodDateFilter = getDateFilter(fromDate, toDate);

  let openingBalance = 0;
  if (fromDate) {
    const openingEntries = (await fyo.db.getAllRaw('AccountingLedgerEntry', {
      fields: ['debit', 'credit'],
      filters: {
        ...baseFilters,
        date: ['<', fromDate],
      },
    })) as { debit: number | string; credit: number | string }[];
    openingBalance = openingEntries.reduce(
      (sum, e) => sum + toNum(e.debit) - toNum(e.credit),
      0
    );
  } else {
    // If no date range is selected, still surface explicit Opening Entry value.
    const openingJeRefs = (await fyo.db.getAllRaw('JournalEntry', {
      fields: ['name'],
      filters: { entryType: 'Opening Entry' },
    })) as { name: string }[];
    const openingJeNames = openingJeRefs.map((j) => j.name);
    if (openingJeNames.length) {
      const openingLedgerEntries = (await fyo.db.getAllRaw('AccountingLedgerEntry', {
        fields: ['debit', 'credit'],
        filters: {
          ...baseFilters,
          referenceType: 'JournalEntry',
          referenceName: ['in', openingJeNames],
        },
      })) as { debit: number | string; credit: number | string }[];
      openingBalance = openingLedgerEntries.reduce(
        (sum, e) => sum + toNum(e.debit) - toNum(e.credit),
        0
      );
    }
  }

  const currentBalance = await getPartyCurrentBalance(partyName, role);

  const ledgerEntries = (await fyo.db.getAllRaw('AccountingLedgerEntry', {
    fields: [
      'name',
      'date',
      'account',
      'debit',
      'credit',
      'referenceType',
      'referenceName',
    ],
    filters: {
      ...baseFilters,
      ...periodDateFilter,
    },
    orderBy: ['date', 'name'],
    order: 'asc',
  })) as {
    name: string;
    date: string;
    account: string;
    debit: number | string;
    credit: number | string;
    referenceType: string;
    referenceName: string;
  }[];

  const jeRefNames = [
    ...new Set(
      ledgerEntries
        .filter((e) => e.referenceType === 'JournalEntry')
        .map((e) => e.referenceName)
    ),
  ];

  let entryTypeMap: Record<string, string> = {};
  if (jeRefNames.length) {
    const jeList = (await fyo.db.getAllRaw('JournalEntry', {
      fields: ['name', 'entryType'],
      filters: { name: ['in', jeRefNames] },
    })) as { name: string; entryType: string }[];
    entryTypeMap = Object.fromEntries(
      jeList.map((j) => [j.name, j.entryType || 'Journal Entry'])
    );
  }

  const rows: PartyStatementRow[] = [];
  const seen = new Set<string>();
  // If fromDate exists, running starts from opening balance before period.
  // Otherwise running starts from zero and accumulates full listed movements.
  let runningBalance = fromDate ? openingBalance : 0;
  let totalDebit = 0;
  let totalCredit = 0;

  if (fromDate) {
    rows.push({
      date: fyo.format(fromDate, dateFieldJe),
      typeLabel: fyo.t`Opening Balance`,
      reference: '-',
      debit: '',
      credit: '',
      runningBalance: formatSignedCur(openingBalance),
      runningBalanceNum: openingBalance,
      isOpeningRow: true,
    });
  }

  for (const e of ledgerEntries) {
    const debitNum = toNum(e.debit);
    const creditNum = toNum(e.credit);
    const dedupeKey = [
      e.referenceType || '',
      e.referenceName || '',
      e.account || '',
      e.date || '',
      debitNum,
      creditNum,
    ].join('|');
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    totalDebit += debitNum;
    totalCredit += creditNum;
    runningBalance += debitNum - creditNum;

    const refType = e.referenceType || '';
    let typeLabel = (fyo.schemaMap[refType]?.label as string) || refType || 'Journal Entry';

    if (refType === 'JournalEntry') {
      const entryType = entryTypeMap[e.referenceName];
      typeLabel =
        entryType === 'Opening Entry'
          ? fyo.t`Opening Entry` || 'Opening Entry'
          : entryType || fyo.schemaMap.JournalEntry?.label || 'Journal Entry';
    } else if (refType === 'Payment') {
      typeLabel = fyo.schemaMap.Payment?.label || 'Payment';
    }

    rows.push({
      date: fyo.format(e.date, dateFieldJe),
      typeLabel,
      reference: e.referenceName,
      debit: debitNum ? formatCur(debitNum) : '',
      credit: creditNum ? formatCur(creditNum) : '',
      debitNum: debitNum || undefined,
      creditNum: creditNum || undefined,
      schemaName:
        refType === 'SalesInvoice' || refType === 'PurchaseInvoice'
          ? refType
          : undefined,
      runningBalance: formatSignedCur(runningBalance),
      runningBalanceNum: runningBalance,
    });
  }

  // Avoid double-counting opening when fromDate is not set and opening entries
  // are already part of the listed period rows.
  const closingBalance = (fromDate ? openingBalance : 0) + totalDebit - totalCredit;
  return {
    openingBalance,
    closingBalance,
    currentBalance,
    totalDebit,
    totalCredit,
    rows,
  };
}
