import { Doc } from 'fyo/model/doc';
import { FiltersMap, FormulaMap, HiddenMap } from 'fyo/model/types';
import { Money } from 'pesa';
import type { QueryFilter } from 'utils/db/types';

const PARTY_ACCOUNT_TYPES = ['Receivable', 'Payable'];

export class JournalEntryAccount extends Doc {
  _accountType?: string | null;

  get accountTypeForParty(): string | null {
    if (this._accountType) {
      return this._accountType;
    }
    const link = this.getLink('account') as unknown as
      | { accountType?: unknown }
      | null
      | undefined;
    const t = link?.accountType;
    return typeof t === 'string' ? t : null;
  }

  hidden: HiddenMap = {
    party: () => {
      const t = this.accountTypeForParty;
      return !t || !PARTY_ACCOUNT_TYPES.includes(t);
    },
  };

  static filters: FiltersMap = {
    account: () => ({ isGroup: false }),
    party: (doc) => {
      const t = (doc as unknown as JournalEntryAccount).accountTypeForParty;
      if (t === 'Receivable')
        return { role: ['in', ['Customer', 'Both']] } as QueryFilter;
      if (t === 'Payable')
        return { role: ['in', ['Supplier', 'Both']] } as QueryFilter;
      return {} as QueryFilter;
    },
  };

  getAutoDebitCredit(type: 'debit' | 'credit') {
    const currentValue = this.get(type) as Money;
    if (!currentValue.isZero()) {
      return;
    }

    const otherType = type === 'debit' ? 'credit' : 'debit';
    const otherTypeValue = this.get(otherType) as Money;
    if (!otherTypeValue.isZero()) {
      return this.fyo.pesa(0);
    }

    const totalType = this.parentdoc!.getSum('accounts', type, false) as Money;
    const totalOtherType = this.parentdoc!.getSum(
      'accounts',
      otherType,
      false
    ) as Money;

    if (totalType.lt(totalOtherType)) {
      return totalOtherType.sub(totalType);
    }
  }

  formulas: FormulaMap = {
    debit: {
      formula: () => this.getAutoDebitCredit('debit'),
    },
    credit: {
      formula: () => this.getAutoDebitCredit('credit'),
    },
  };

  async _applyChange(
    changedFieldname: string,
    retriggerChildDocApplyChange?: boolean
  ): Promise<boolean> {
    const changed = await super._applyChange(
      changedFieldname,
      retriggerChildDocApplyChange
    );
    if (changedFieldname === 'account') {
      const acc = await this.loadAndGetLink('account');
      this._accountType =
        (acc as { accountType?: string } | null)?.accountType ?? null;
    }
    return changed;
  }
}
