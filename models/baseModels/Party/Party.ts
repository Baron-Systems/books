import { Fyo } from 'fyo';
import { Doc } from 'fyo/model/doc';
import {
  Action,
  FiltersMap,
  FormulaMap,
  ListViewSettings,
  ValidationMap,
} from 'fyo/model/types';
import {
  validateEmail,
  validatePhoneNumber,
} from 'fyo/model/validationFunction';
import { Money } from 'pesa';
import { PartyRole } from './types';
import { ModelNameEnum } from 'models/types';

export class Party extends Doc {
  role?: PartyRole;
  party?: string;
  fromLead?: string;
  defaultAccount?: string;
  loyaltyPoints?: number;
  outstandingAmount?: Money;
  async updateOutstandingAmount() {
    /**
     * If Role === "Both" then outstanding Amount
     * will be the amount to be paid to the party.
     * Unallocated payment (Customer Credit / Vendor Advance) reduces outstanding.
     */

    const role = this.role as PartyRole;
    let outstandingAmount = this.fyo.pesa(0);

    if (role === 'Customer') {
      const outstandingReceive = await this._getTotalOutstandingAmount(
        'SalesInvoice'
      );
      const openingReceive = await this._getOpeningEntryOutstandingAmount(
        'Receivable'
      );
      const unallocatedReceive = await this._getUnallocatedPaymentTotal(
        'Receive'
      );
      outstandingAmount = outstandingAmount.add(
        outstandingReceive.add(openingReceive).sub(unallocatedReceive)
      );
    }

    if (role === 'Supplier') {
      const outstandingPay = await this._getTotalOutstandingAmount(
        'PurchaseInvoice'
      );
      const openingPay = await this._getOpeningEntryOutstandingAmount('Payable');
      const unallocatedPay = await this._getUnallocatedPaymentTotal('Pay');
      outstandingAmount = outstandingAmount.add(
        outstandingPay.add(openingPay).sub(unallocatedPay)
      );
    }

    if (role === 'Both') {
      const outstandingReceive = await this._getTotalOutstandingAmount(
        'SalesInvoice'
      );
      const outstandingPay = await this._getTotalOutstandingAmount(
        'PurchaseInvoice'
      );
      const openingReceive = await this._getOpeningEntryOutstandingAmount(
        'Receivable'
      );
      const openingPay = await this._getOpeningEntryOutstandingAmount('Payable');
      const unallocatedReceive = await this._getUnallocatedPaymentTotal(
        'Receive'
      );
      const unallocatedPay = await this._getUnallocatedPaymentTotal('Pay');
      outstandingAmount = outstandingAmount
        .add(outstandingReceive.add(openingReceive).sub(unallocatedReceive))
        .sub(outstandingPay.add(openingPay).sub(unallocatedPay));
    }

    await this.setAndSync({ outstandingAmount });
  }

  async updateLoyaltyPoints() {
    let loyaltyPoints = 0;

    if (this.role === 'Customer' || this.role === 'Both') {
      loyaltyPoints = await this._getTotalLoyaltyPoints();
    }

    await this.setAndSync({ loyaltyPoints });
  }

  async _getTotalLoyaltyPoints() {
    const data = (await this.fyo.db.getAll(ModelNameEnum.LoyaltyPointEntry, {
      fields: ['name', 'loyaltyPoints', 'expiryDate', 'postingDate'],
      filters: {
        customer: this.name as string,
      },
    })) as {
      name: string;
      loyaltyPoints: number;
      expiryDate: Date;
      postingDate: Date;
    }[];

    const totalLoyaltyPoints = data.reduce((total, entry) => {
      if (entry.expiryDate > entry.postingDate) {
        return total + entry.loyaltyPoints;
      }

      return total;
    }, 0);

    return totalLoyaltyPoints;
  }

  async _getTotalOutstandingAmount(
    schemaName: 'SalesInvoice' | 'PurchaseInvoice'
  ) {
    const outstandingAmounts = await this.fyo.db.getAllRaw(schemaName, {
      fields: ['outstandingAmount'],
      filters: {
        submitted: true,
        cancelled: false,
        party: this.name as string,
      },
    });

    return outstandingAmounts
      .map(({ outstandingAmount }) =>
        this.fyo.pesa(outstandingAmount as number)
      )
      .reduce((a, b) => a.add(b), this.fyo.pesa(0));
  }

  /**
   * Net party amount from submitted, non-cancelled Opening Entry journal rows
   * posted to party control accounts.
   *
   * Receivable: debit - credit (customer due increases on debit)
   * Payable: credit - debit (supplier due increases on credit)
   */
  async _getOpeningEntryOutstandingAmount(
    accountType: 'Receivable' | 'Payable'
  ): Promise<Money> {
    const openingEntries = (await this.fyo.db.getAllRaw('JournalEntry', {
      fields: ['name'],
      filters: {
        submitted: true,
        cancelled: false,
        entryType: 'Opening Entry',
      },
    })) as { name: string }[];

    if (!openingEntries.length) {
      return this.fyo.pesa(0);
    }

    const openingNames = openingEntries.map((e) => e.name);
    const ledgerRows = (await this.fyo.db.getAllRaw('AccountingLedgerEntry', {
      fields: ['account', 'debit', 'credit'],
      filters: {
        party: this.name as string,
        referenceType: 'JournalEntry',
        referenceName: ['in', openingNames],
        reverted: false,
      },
    })) as {
      account: string;
      debit: string | number;
      credit: string | number;
    }[];

    if (!ledgerRows.length) {
      return this.fyo.pesa(0);
    }

    const accountNames = [...new Set(ledgerRows.map((r) => r.account).filter(Boolean))];
    if (!accountNames.length) {
      return this.fyo.pesa(0);
    }

    const controlAccounts = (await this.fyo.db.getAllRaw('Account', {
      fields: ['name'],
      filters: {
        name: ['in', accountNames],
        isGroup: false,
        accountType,
      },
    })) as { name: string }[];

    if (!controlAccounts.length) {
      return this.fyo.pesa(0);
    }

    const controlAccountSet = new Set(controlAccounts.map((a) => a.name));
    return ledgerRows.reduce((sum, row) => {
      if (!controlAccountSet.has(row.account)) {
        return sum;
      }
      const debit = this.fyo.pesa(row.debit ?? 0);
      const credit = this.fyo.pesa(row.credit ?? 0);
      return accountType === 'Receivable'
        ? sum.add(debit.sub(credit))
        : sum.add(credit.sub(debit));
    }, this.fyo.pesa(0));
  }

  /**
   * Sum of (payment.amount - sum(payment for.amount)) for submitted, non-cancelled Payment.
   * Customer Credit (Receive) or Vendor Advance (Pay) — reduces party outstanding.
   */
  async _getUnallocatedPaymentTotal(
    paymentType: 'Receive' | 'Pay'
  ): Promise<Money> {
    const list = await this.getPaymentsWithUnallocatedAmount(paymentType);
    return list.reduce(
      (sum, p) => sum.add(p.unallocated),
      this.fyo.pesa(0)
    );
  }

  /**
   * Returns submitted, non-cancelled Payment docs for this party with the given paymentType,
   * each with its unallocated amount (payment.amount - sum(for.amount)), ordered by date ASC (oldest first).
   * Used for Automatic Balance Adjustment when allocating customer credit / vendor advance to a new invoice.
   */
  async getPaymentsWithUnallocatedAmount(
    paymentType: 'Receive' | 'Pay'
  ): Promise<{ name: string; unallocated: Money }[]> {
    const payments = (await this.fyo.db.getAllRaw('Payment', {
      fields: ['name', 'amount', 'date'],
      filters: {
        party: this.name as string,
        paymentType,
        submitted: true,
        cancelled: false,
      },
      orderBy: 'date',
      order: 'asc',
    })) as { name: string; amount: string | number; date: string }[];

    const result: { name: string; unallocated: Money }[] = [];
    for (const p of payments) {
      const paymentAmount = this.fyo.pesa(p.amount);
      const forRows = (await this.fyo.db.getAllRaw('PaymentFor', {
        fields: ['amount'],
        filters: { parent: p.name },
      })) as { amount: string | number }[];
      const allocated = forRows.reduce(
        (sum, r) => sum.add(this.fyo.pesa(r.amount)),
        this.fyo.pesa(0)
      );
      const unallocated = paymentAmount.sub(allocated);
      if (unallocated.gt(0)) {
        result.push({ name: p.name, unallocated });
      }
    }
    return result;
  }

  formulas: FormulaMap = {
    defaultAccount: {
      formula: async () => {
        if (this.defaultAccount) {
          return this.defaultAccount;
        }

        const role = this.role as PartyRole;
        if (role === 'Both') {
          return '';
        }

        const preferredNames =
          role === 'Supplier'
            ? ['Creditors', 'الدائنون', 'الدائنين']
            : ['Debtors', 'المدينون', 'المدينين'];

        for (const accountName of preferredNames) {
          const accountExists = await this.fyo.db.exists('Account', accountName);
          if (accountExists) {
            return accountName;
          }
        }

        const accountType = role === 'Customer' ? 'Receivable' : 'Payable';
        const controlAccounts = (await this.fyo.db.getAll('Account', {
          fields: ['name'],
          filters: {
            isGroup: false,
            accountType,
          },
        })) as { name?: string }[];

        const preferredByName = controlAccounts.find((acc) =>
          role === 'Supplier'
            ? /(credit|payable|دائن)/i.test(acc.name as string)
            : /(debt|receivable|مدين)/i.test(acc.name as string)
        );
        if (preferredByName?.name) {
          return preferredByName.name;
        }

        return controlAccounts[0]?.name ?? '';
      },
      dependsOn: ['role'],
    },
    currency: {
      formula: () => {
        if (!this.currency) {
          return this.fyo.singles.SystemSettings!.currency as string;
        }
      },
    },
  };

  validations: ValidationMap = {
    email: validateEmail,
    phone: validatePhoneNumber,
  };

  static filters: FiltersMap = {
    defaultAccount: (doc: Doc) => {
      const role = doc.role as PartyRole;
      if (role === 'Both') {
        return {
          isGroup: false,
          accountType: ['in', ['Payable', 'Receivable']],
        };
      }

      return {
        isGroup: false,
        accountType: role === 'Customer' ? 'Receivable' : 'Payable',
      };
    },
  };

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'email', 'phone', 'outstandingAmount'],
    };
  }

  async afterDelete() {
    await super.afterDelete();
    if (!this.fromLead) {
      return;
    }
    const leadData = await this.fyo.doc.getDoc(ModelNameEnum.Lead, this.name);
    await leadData.setAndSync('status', 'Interested');
  }

  async afterSync() {
    await super.afterSync();
    if (!this.fromLead) {
      return;
    }

    const leadData = await this.fyo.doc.getDoc(ModelNameEnum.Lead, this.name);
    await leadData.setAndSync('status', 'Converted');
  }

  static getActions(fyo: Fyo): Action[] {
    return [
      {
        label: fyo.t`Create Purchase`,
        condition: (doc: Doc) =>
          !doc.notInserted && (doc.role as PartyRole) !== 'Customer',
        action: async (partyDoc, router) => {
          const doc = fyo.doc.getNewDoc('PurchaseInvoice', {
            party: partyDoc.name,
            account: partyDoc.defaultAccount as string,
          });

          await router.push({
            path: `/edit/PurchaseInvoice/${doc.name!}`,
            query: {
              schemaName: 'PurchaseInvoice',
              values: {
                // @ts-ignore
                party: partyDoc.name!,
              },
            },
          });
        },
      },
      {
        label: fyo.t`View Purchases`,
        condition: (doc: Doc) =>
          !doc.notInserted && (doc.role as PartyRole) !== 'Customer',
        action: async (partyDoc, router) => {
          await router.push({
            path: '/list/PurchaseInvoice',
            query: { filters: JSON.stringify({ party: partyDoc.name }) },
          });
        },
      },
      {
        label: fyo.t`Create Sale`,
        condition: (doc: Doc) =>
          !doc.notInserted && (doc.role as PartyRole) !== 'Supplier',
        action: async (partyDoc, router) => {
          const doc = fyo.doc.getNewDoc('SalesInvoice', {
            party: partyDoc.name,
            account: partyDoc.defaultAccount as string,
          });

          await router.push({
            path: `/edit/SalesInvoice/${doc.name!}`,
            query: {
              schemaName: 'SalesInvoice',
              values: {
                // @ts-ignore
                party: partyDoc.name!,
              },
            },
          });
        },
      },
      {
        label: fyo.t`View Sales`,
        condition: (doc: Doc) =>
          !doc.notInserted && (doc.role as PartyRole) !== 'Supplier',
        action: async (partyDoc, router) => {
          await router.push({
            path: '/list/SalesInvoice',
            query: { filters: JSON.stringify({ party: partyDoc.name }) },
          });
        },
      },
    ];
  }
}
