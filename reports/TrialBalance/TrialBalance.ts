import { t } from 'fyo';
import { DateTime } from 'luxon';
import {
  AccountRootType,
  AccountRootTypeEnum,
} from 'models/baseModels/Account/types';
import { isCredit } from 'models/helpers';
import {
  AccountReport,
  ACC_BAL_WIDTH,
  ACC_NAME_WIDTH,
  convertAccountRootNodesToAccountList,
  getFiscalEndpoints,
} from 'reports/AccountReport';
import {
  Account,
  AccountListNode,
  AccountNameValueMapMap,
  ColumnField,
  DateRange,
  GroupedMap,
  LedgerEntry,
  ReportCell,
  ReportData,
  ReportRow,
  RootTypeRow,
  ValueMap,
} from 'reports/types';
import { Field } from 'schemas/types';
import { QueryFilter } from 'utils/db/types';

export class TrialBalance extends AccountReport {
  static title = t`Trial Balance`;
  static reportName = 'trial-balance';

  fromDate?: string;
  toDate?: string;
  hideGroupAmounts = false;
  loading = false;

  _rawData: LedgerEntry[] = [];
  _dateRanges?: DateRange[];

  accountMap?: Record<string, Account>;

  get rootTypes(): AccountRootType[] {
    return [
      AccountRootTypeEnum.Asset,
      AccountRootTypeEnum.Liability,
      AccountRootTypeEnum.Income,
      AccountRootTypeEnum.Expense,
      AccountRootTypeEnum.Equity,
    ];
  }

  async setReportData(filter?: string, force?: boolean) {
    this.loading = true;
    if (force || filter !== 'hideGroupAmounts') {
      await this._setRawData();
    }

    const map = this._getGroupedMap(true, 'account');
    const rangeGroupedMap = await this._getGroupedByDateRanges(map);
    const accountTree = await this._getAccountTree(rangeGroupedMap);

    const rootTypeRows: RootTypeRow[] = this.rootTypes
      .map((rootType) => {
        const rootNodes = this.getRootNodes(rootType, accountTree)!;
        const rootList = convertAccountRootNodesToAccountList(rootNodes);
        return {
          rootType,
          rootNodes,
          rows: this.getReportRowsFromAccountList(rootList),
        };
      })
      .filter((row) => !!(row.rootNodes && row.rootNodes.length));

    this.reportData = await this.getReportDataFromRows(rootTypeRows);
    this.totalsRow = this._buildTotalsRow();
    this.loading = false;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getReportDataFromRows(
    rootTypeRows: RootTypeRow[]
  ): Promise<ReportData> {
    const reportData = rootTypeRows.reduce((reportData, r) => {
      reportData.push(...r.rows);
      reportData.push(this.getEmptyRow());
      return reportData;
    }, [] as ReportData);

    reportData.pop();

    return reportData;
  }

  _buildTotalsRow(): ReportRow | null {
    if (!this.reportData?.length) {
      return null;
    }

    // مجموعات الأعمدة بالترتيب:
    // 0: اسم الحساب
    // 1: Opening (Dr)  | 2: Opening (Cr)
    // 3: Debit         | 4: Credit
    // 5: Closing (Dr)  | 6: Closing (Cr)
    let openingDebit = 0;
    let openingCredit = 0;
    let periodDebit = 0;
    let periodCredit = 0;
    let closingDebit = 0;
    let closingCredit = 0;

    for (const row of this.reportData) {
      if (row.isGroup || row.isEmpty) {
        continue;
      }

      const cells = row.cells;
      if (cells.length < 7) {
        continue;
      }

      const oDr = Number(cells[1].rawValue ?? 0);
      const oCr = Number(cells[2].rawValue ?? 0);
      const pDr = Number(cells[3].rawValue ?? 0);
      const pCr = Number(cells[4].rawValue ?? 0);
      const cDr = Number(cells[5].rawValue ?? 0);
      const cCr = Number(cells[6].rawValue ?? 0);

      openingDebit += oDr;
      openingCredit += oCr;
      periodDebit += pDr;
      periodCredit += pCr;
      closingDebit += cDr;
      closingCredit += cCr;
    }

    const columns = this.getColumns();
    const totalsByField: Record<string, number> = {
      openingDebit,
      openingCredit,
      debit: periodDebit,
      credit: periodCredit,
      closingDebit,
      closingCredit,
    };

    const cells: ReportCell[] = columns.map((col, index) => {
      if (index === 0) {
        return {
          value: t`Total`,
          rawValue: '',
          align: 'left',
          width: col.width ?? 1,
          bold: true,
        };
      }

      const sum = totalsByField[col.fieldname ?? ''];
      const hasSum = typeof sum === 'number' && !Number.isNaN(sum);

      return {
        value: hasSum ? this.fyo.format(sum, 'Currency') : '',
        rawValue: hasSum ? sum : '',
        align: hasSum ? 'right' : (col.align ?? 'left'),
        width: col.width ?? 1,
      };
    });

    return { cells };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async _getGroupedByDateRanges(
    map: GroupedMap
  ): Promise<AccountNameValueMapMap> {
    const accountValueMap: AccountNameValueMapMap = new Map();

    for (const account of map.keys()) {
      const valueMap: ValueMap = new Map();

      /**
       * Set Balance for every DateRange key
       */
      for (const entry of map.get(account)!) {
        const key = this._getRangeMapKey(entry);
        if (key === null) {
          continue;
        }

        const map = valueMap.get(key);
        const totalCredit = map?.credit ?? 0;
        const totalDebit = map?.debit ?? 0;

        valueMap.set(key, {
          credit: totalCredit + (entry.credit ?? 0),
          debit: totalDebit + (entry.debit ?? 0),
        });
      }

      if (!this.accountMap) {
        await this._setAndReturnAccountMap();
      }

      const openingRange = this._dateRanges![0];
      const periodRange = this._dateRanges![1];
      const closingRange = this._dateRanges![2];

      const opening = valueMap.get(openingRange) ?? { debit: 0, credit: 0 };
      const period = valueMap.get(periodRange) ?? { debit: 0, credit: 0 };

      const accountInfo = this.accountMap![account];
      if (accountInfo && !accountInfo.isGroup) {
        const rootType = accountInfo.rootType;
        const creditNature = isCredit(rootType);
        const openingBalance = creditNature
          ? opening.credit - opening.debit
          : opening.debit - opening.credit;
        const closingBalance = creditNature
          ? openingBalance - period.debit + period.credit
          : openingBalance + period.debit - period.credit;

        const closingDebit = creditNature
          ? (closingBalance < 0 ? -closingBalance : 0)
          : (closingBalance >= 0 ? closingBalance : 0);
        const closingCredit = creditNature
          ? (closingBalance >= 0 ? closingBalance : 0)
          : (closingBalance < 0 ? -closingBalance : 0);

        valueMap.set(closingRange, {
          debit: closingDebit,
          credit: closingCredit,
        });
      }

      accountValueMap.set(account, valueMap);
    }

    return accountValueMap;
  }

  _getRangeMapKey(entry: LedgerEntry): DateRange | null {
    const entryDate = DateTime.fromISO(
      entry.date!.toISOString().split('T')[0]
    ).toMillis();

    const toDateMillis = DateTime.fromISO(this.toDate!).toMillis();
    if (entryDate >= toDateMillis) {
      return null;
    }

    return super._getRangeMapKey(entry);
  }

  async _getDateRanges(): Promise<DateRange[]> {
    if (!this.toDate || !this.fromDate) {
      await this.setDefaultFilters();
    }

    const toDate = DateTime.fromISO(this.toDate!);
    const fromDate = DateTime.fromISO(this.fromDate!);

    return [
      {
        fromDate: DateTime.fromISO('0001-01-01'),
        toDate: fromDate,
      },
      { fromDate, toDate },
      {
        fromDate: toDate,
        toDate: DateTime.fromISO('9999-12-31'),
      },
    ];
  }

  getRowFromAccountListNode(al: AccountListNode) {
    const nameCell = {
      value: al.name,
      rawValue: al.name,
      align: 'left',
      width: ACC_NAME_WIDTH,
      bold: !al.level,
      indent: al.level ?? 0,
    } as ReportCell;

    const balanceCells = this._dateRanges!.map((k) => {
      const map = al.valueMap?.get(k);
      const hide = this.hideGroupAmounts && al.isGroup;

      return [
        {
          rawValue: map?.debit ?? 0,
          value: hide ? '' : this.fyo.format(map?.debit ?? 0, 'Currency'),
          align: 'right',
          width: ACC_BAL_WIDTH,
        },
        {
          rawValue: map?.credit ?? 0,
          value: hide ? '' : this.fyo.format(map?.credit ?? 0, 'Currency'),
          align: 'right',
          width: ACC_BAL_WIDTH,
        } as ReportCell,
      ];
    });

    return {
      cells: [nameCell, balanceCells].flat(2),
      level: al.level,
      isGroup: !!al.isGroup,
      folded: false,
      foldedBelow: false,
    } as ReportRow;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async _getQueryFilters(): Promise<QueryFilter> {
    const filters: QueryFilter = {};
    filters.reverted = false;
    return filters;
  }

  async setDefaultFilters(): Promise<void> {
    if (!this.toDate || !this.fromDate) {
      const { year } = DateTime.now();
      const endpoints = await getFiscalEndpoints(year + 1, year, this.fyo);

      this.fromDate = endpoints.fromDate;
      this.toDate = DateTime.fromISO(endpoints.toDate)
        .minus({ days: 1 })
        .toISODate();
    }

    await this._setDateRanges();
  }

  getFilters(): Field[] {
    return [
      {
        fieldtype: 'Date',
        fieldname: 'fromDate',
        placeholder: t`From Date`,
        label: t`From Date`,
        required: true,
      },
      {
        fieldtype: 'Date',
        fieldname: 'toDate',
        placeholder: t`To Date`,
        label: t`To Date`,
        required: true,
      },
      {
        fieldtype: 'Check',
        label: t`Hide Group Amounts`,
        fieldname: 'hideGroupAmounts',
      } as Field,
    ] as Field[];
  }

  getColumns(): ColumnField[] {
    return [
      {
        label: t`Account`,
        fieldtype: 'Link',
        fieldname: 'account',
        align: 'left',
        width: ACC_NAME_WIDTH,
      },
      {
        label: t`Opening (Dr)`,
        fieldtype: 'Data',
        fieldname: 'openingDebit',
        align: 'right',
        width: ACC_BAL_WIDTH,
      },
      {
        label: t`Opening (Cr)`,
        fieldtype: 'Data',
        fieldname: 'openingCredit',
        align: 'right',
        width: ACC_BAL_WIDTH,
      },
      {
        label: t`Debit`,
        fieldtype: 'Data',
        fieldname: 'debit',
        align: 'right',
        width: ACC_BAL_WIDTH,
      },
      {
        label: t`Credit`,
        fieldtype: 'Data',
        fieldname: 'credit',
        align: 'right',
        width: ACC_BAL_WIDTH,
      },
      {
        label: t`Closing (Dr)`,
        fieldtype: 'Data',
        fieldname: 'closingDebit',
        align: 'right',
        width: ACC_BAL_WIDTH,
      },
      {
        label: t`Closing (Cr)`,
        fieldtype: 'Data',
        fieldname: 'closingCredit',
        align: 'right',
        width: ACC_BAL_WIDTH,
      },
    ] as ColumnField[];
  }
}
