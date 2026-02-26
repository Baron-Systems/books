import { Fyo, t } from 'fyo';
import { Doc } from 'fyo/model/doc';
import { ValidationError } from 'fyo/utils/errors';
import {
  Action,
  DefaultMap,
  FiltersMap,
  HiddenMap,
  ListViewSettings,
} from 'fyo/model/types';
import {
  getDocStatus,
  getLedgerLinkAction,
  getNumberSeries,
  getStatusText,
  statusColor,
} from 'models/helpers';
import { Transactional } from 'models/Transactional/Transactional';
import { Money } from 'pesa';
import { LedgerPosting } from '../../Transactional/LedgerPosting';
import { Party } from '../Party/Party';

const PARTY_REQUIRED_ACCOUNT_TYPES = ['Receivable', 'Payable'];

export class JournalEntry extends Transactional {
  accounts?: Doc[];

  async afterSubmit(): Promise<void> {
    await super.afterSubmit();
    await this._updateOpeningEntryPartyOutstanding();
  }

  async afterCancel(): Promise<void> {
    await super.afterCancel();
    await this._updateOpeningEntryPartyOutstanding();
  }

  async loadLinks(): Promise<void> {
    await super.loadLinks();
    for (const row of this.accounts ?? []) {
      const name = row.account as string | undefined;
      if (!name) continue;
      try {
        const acc = await this.fyo.doc.getDoc('Account', name);
        (row as { _accountType?: string | null })._accountType =
          (acc as { accountType?: string }).accountType ?? null;
      } catch {
        (row as { _accountType?: string | null })._accountType = null;
      }
    }
  }

  async getPosting() {
    const posting: LedgerPosting = new LedgerPosting(this, this.fyo);

    for (const row of this.accounts ?? []) {
      const debit = row.debit as Money;
      const credit = row.credit as Money;
      const account = row.account as string;
      const party = row.party as string | undefined;

      const hasAmount = !debit.isZero() || !credit.isZero();
      if (account && hasAmount) {
        const accountDoc = await this.fyo.doc.getDoc('Account', account);
        const accountType = accountDoc?.accountType as string | undefined;
        if (
          accountType &&
          PARTY_REQUIRED_ACCOUNT_TYPES.includes(accountType) &&
          !party
        ) {
          throw new ValidationError(
            t`Party is required for ${accountType} account "${account}".`
          );
        }
      }

      if (!debit.isZero()) {
        await posting.debit(account, debit, party);
      } else if (!credit.isZero()) {
        await posting.credit(account, credit, party);
      }
    }

    return posting;
  }

  async validate(): Promise<void> {
    await super.validate();
    const rows = this.accounts ?? [];
    for (let i = 0; i < rows.length; i++) {
      const account = rows[i].account;
      if (!account || (typeof account === 'string' && !account.trim())) {
        throw new ValidationError(
          t`Account is required in row ${i + 1}.`
        );
      }
    }
  }

  private async _updateOpeningEntryPartyOutstanding(): Promise<void> {
    if ((this.entryType as string) !== 'Opening Entry') {
      return;
    }

    const partyNames = [
      ...new Set(
        (this.accounts ?? [])
          .map((row) => row.party as string | undefined)
          .filter((name): name is string => !!name)
      ),
    ];

    for (const partyName of partyNames) {
      const partyDoc = (await this.fyo.doc.getDoc('Party', partyName)) as Party;
      await partyDoc.updateOutstandingAmount();
    }
  }

  hidden: HiddenMap = {
    referenceNumber: () =>
      !(this.referenceNumber || !(this.isSubmitted || this.isCancelled)),
    referenceDate: () =>
      !(this.referenceDate || !(this.isSubmitted || this.isCancelled)),
    userRemark: () =>
      !(this.userRemark || !(this.isSubmitted || this.isCancelled)),
    attachment: () =>
      !(this.attachment || !(this.isSubmitted || this.isCancelled)),
  };

  static defaults: DefaultMap = {
    numberSeries: (doc) => getNumberSeries(doc.schemaName, doc.fyo),
    date: () => new Date(),
  };

  static filters: FiltersMap = {
    numberSeries: () => ({ referenceType: 'JournalEntry' }),
  };

  static getActions(fyo: Fyo): Action[] {
    return [getLedgerLinkAction(fyo)];
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        {
          label: t`Status`,
          fieldname: 'status',
          fieldtype: 'Select',
          render(doc) {
            const status = getDocStatus(doc);
            const color = statusColor[status] ?? 'gray';
            const label = getStatusText(status);

            return {
              template: `<Badge class="text-xs" color="${color}">${label}</Badge>`,
            };
          },
        },
        'date',
        'entryType',
        'referenceNumber',
      ],
    };
  }
}
