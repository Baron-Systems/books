import { Fyo, t } from 'fyo';
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import {
  Action,
  ChangeArg,
  DefaultMap,
  FiltersMap,
  FormulaMap,
  HiddenMap,
  ListViewSettings,
  ValidationMap,
} from 'fyo/model/types';
import { isPesa } from 'fyo/utils';
import { NotFoundError, ValidationError } from 'fyo/utils/errors';
import {
  getDocStatusListColumn,
  getLedgerLinkAction,
  getNumberSeries,
} from 'models/helpers';
import { LedgerPosting } from 'models/Transactional/LedgerPosting';
import { Transactional } from 'models/Transactional/Transactional';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import { QueryFilter } from 'utils/db/types';
import { AccountTypeEnum } from '../Account/types';
import { Invoice } from '../Invoice/Invoice';
import { Party } from '../Party/Party';
import { PaymentFor } from '../PaymentFor/PaymentFor';
import { PaymentType, PaymentTypeEnum } from './types';
import { PartyRoleEnum } from '../Party/types';
import { TaxSummary } from '../TaxSummary/TaxSummary';
import { PaymentMethod } from '../PaymentMethod/PaymentMethod';

type AccountTypeMap = Record<AccountTypeEnum, string[] | undefined>;

export class Payment extends Transactional {
  taxes?: TaxSummary[];
  party?: string;
  amount?: Money;
  writeoff?: Money;
  paymentType?: PaymentType;
  paymentMethod?: string;
  referenceType?: ModelNameEnum.SalesInvoice | ModelNameEnum.PurchaseInvoice;
  for?: PaymentFor[];
  _accountsMap?: AccountTypeMap;
  initialAmount?: Money;

  async paymentMethodDoc() {
    return (await this.loadAndGetLink('paymentMethod')) as PaymentMethod;
  }

  async change({ changed }: ChangeArg) {
    if (changed === 'for') {
      this.updateAmountOnReferenceUpdate();
      await this.updateDetailsOnReferenceUpdate();
    }

    if (changed === 'amount') {
      const forRefs = (this.for ?? []) as Doc[];
      if (forRefs.length > 1) {
        await this.distributeAmountToReferences();
      } else if (forRefs.length === 1) {
        this.updateReferenceOnAmountUpdate();
      }
    }
  }

  async updateDetailsOnReferenceUpdate() {
    const forReferences = (this.for ?? []) as Doc[];

    const { referenceType, referenceName } = forReferences[0] ?? {};
    if (
      forReferences.length !== 1 ||
      this.party ||
      this.paymentType ||
      !referenceName ||
      !referenceType
    ) {
      return;
    }

    const schemaName = referenceType as string;
    const doc = (await this.fyo.doc.getDoc(
      schemaName,
      referenceName as string
    )) as Invoice;

    let paymentType: PaymentType;
    if (doc.isSales) {
      paymentType = 'Receive';
    } else {
      paymentType = 'Pay';
    }

    this.party = doc.party as string;
    this.paymentType = paymentType;
  }

  updateAmountOnReferenceUpdate() {
    this.amount = this.fyo.pesa(0);
    for (const paymentReference of (this.for ?? []) as Doc[]) {
      this.amount = this.amount.add(paymentReference.amount as Money);
    }
  }

  updateReferenceOnAmountUpdate() {
    const forReferences = (this.for ?? []) as Doc[];
    if (forReferences.length !== 1) {
      return;
    }

    forReferences[0].amount = this.amount;
  }

  /**
   * Fetches outstanding invoices for the current party, ordered by date ASC (due order).
   * Used for auto-distribution and "Fetch Outstanding Invoices" button.
   */
  async getOutstandingInvoicesForParty(): Promise<
    { name: string; schemaName: string; outstandingAmount: Money; date: Date }[]
  > {
    const party = this.party;
    const paymentType = this.paymentType;
    if (!party || !paymentType) {
      return [];
    }

    const schemaName =
      paymentType === 'Receive'
        ? ModelNameEnum.SalesInvoice
        : ModelNameEnum.PurchaseInvoice;

    const zero =
      '0.' +
      '0'.repeat(this.fyo.singles.SystemSettings?.internalPrecision ?? 11);

    const rows = (await this.fyo.db.getAllRaw(schemaName, {
      fields: ['name', 'outstandingAmount', 'date'],
      filters: {
        party,
        submitted: true,
        cancelled: false,
        outstandingAmount: ['!=', zero],
      },
      orderBy: 'date',
      order: 'asc',
    })) as { name: string; outstandingAmount: string | number; date: string }[];

    return rows
      .map((r) => ({
        name: r.name,
        schemaName,
        outstandingAmount: this.fyo.pesa(r.outstandingAmount),
        date: new Date(r.date),
      }))
      .filter((r) => r.outstandingAmount.gt(0));
  }

  /**
   * Distributes this.amount across this.for in order (by invoice date).
   * Each row gets min(remaining amount, invoice outstanding). Uses Money, no precision loss.
   */
  async distributeAmountToReferences(): Promise<void> {
    const forRefs = this.for ?? [];
    if (forRefs.length === 0) return;

    const totalPayment = this.amount ?? this.fyo.pesa(0);
    if (totalPayment.lte(0)) return;

    const zero = this.fyo.pesa(0);
    for (const row of forRefs) {
      row.amount = zero;
    }

    let remaining = totalPayment;

    for (const row of forRefs) {
      if (remaining.isZero()) break;

      const referenceType = row.referenceType;
      const referenceName = row.referenceName;
      if (!referenceType || !referenceName) {
        continue;
      }

      const refDoc = (await this.fyo.doc.getDoc(
        referenceType,
        referenceName
      )) as Invoice;
      const outstanding = refDoc?.outstandingAmount?.abs() ?? zero;

      const allocate = remaining.gte(outstanding)
        ? outstanding
        : remaining;
      row.amount = allocate;
      remaining = remaining.sub(allocate);
    }
  }

  /**
   * Fetches all outstanding invoices for the current party, fills "for" table,
   * sets amount to sum of outstanding, and runs distribution. Call from UI "Fetch Outstanding Invoices" button.
   */
  async fetchOutstandingInvoicesAndDistribute(): Promise<void> {
    if (!this.party || !this.paymentType) {
      throw new ValidationError(
        this.fyo.t`Set Party and Payment Type before fetching outstanding invoices.`
      );
    }

    const invoices = await this.getOutstandingInvoicesForParty();
    if (invoices.length === 0) {
      throw new ValidationError(
        this.fyo.t`No outstanding invoices found for this party.`
      );
    }

    const forRefs: PaymentFor[] = [];
    let sumOutstanding = this.fyo.pesa(0);

    for (const inv of invoices) {
      const row = this.fyo.doc.getNewDoc('PaymentFor', {
        referenceType: inv.schemaName,
        referenceName: inv.name,
        amount: inv.outstandingAmount,
        parent: this.name,
        parentSchemaName: this.schemaName,
        parentFieldname: 'for',
      }) as PaymentFor;
      row.parentdoc = this;
      sumOutstanding = sumOutstanding.add(inv.outstandingAmount);
      forRefs.push(row);
    }

    this.for = forRefs;
    this.amount = sumOutstanding;
    await this.distributeAmountToReferences();
  }

  async validate() {
    await super.validate();
    if (this.submitted) {
      return;
    }

    // Sync allocation to current amount (e.g. user changed amount to partial; for rows must sum ≤ amount)
    const forRefs = (this.for ?? []) as Doc[];
    if (forRefs.length > 0 && (this.amount as Money)?.gt(0)) {
      await this.distributeAmountToReferences();
    }

    await this.validateFor();
    await this.validateAccounts();
    await this.validateTotalReferenceAmount();
    await this.validateReferences();
    await this.validateReferencesAreSet();
  }

  async validateFor() {
    for (const childDoc of this.for ?? []) {
      const referenceName = childDoc.referenceName;
      const referenceType = childDoc.referenceType;

      const refDoc = (await this.fyo.doc.getDoc(
        childDoc.referenceType!,
        childDoc.referenceName
      )) as Invoice;

      if (referenceName && referenceType && !refDoc) {
        throw new ValidationError(
          t`${referenceType} of type ${
            this.fyo.schemaMap?.[referenceType]?.label ?? referenceType
          } does not exist`
        );
      }

      if (!refDoc) {
        continue;
      }

      if (refDoc?.party !== this.party) {
        throw new ValidationError(
          t`${refDoc.name!} party ${refDoc.party!} is different from ${this
            .party!}`
        );
      }
    }
  }

  async validateAccounts() {
    if (this.paymentAccount !== this.account || !this.account) {
      return;
    }
    const methodDoc = await this.paymentMethodDoc();
    const type = methodDoc?.type as string | undefined;
    if (type === 'Customer Credit' || type === 'Vendor Advance') {
      return;
    }
    throw new this.fyo.errors.ValidationError(
      t`To Account and From Account can't be the same: ${
        this.account as string
      }`
    );
  }

  async validateTotalReferenceAmount() {
    const forReferences = (this.for ?? []) as Doc[];
    if (forReferences.length === 0) {
      return;
    }

    const referenceAmountTotal = forReferences
      .map(({ amount }) => amount as Money)
      .reduce((a, b) => a.add(b), this.fyo.pesa(0));

    const methodDoc = await this.paymentMethodDoc();
    const type = methodDoc?.type as string | undefined;
    const isBalanceApplication =
      type === 'Customer Credit' || type === 'Vendor Advance';

    if (isBalanceApplication) {
      if (forReferences.length === 0 && (this.amount as Money).gt(0)) {
        throw new ValidationError(
          this.fyo.t`Balance application must reference at least one invoice.`
        );
      }
      if (!(this.amount as Money).eq(referenceAmountTotal)) {
        throw new ValidationError(
          this.fyo.t`Balance application amount must equal allocated total: ${this.fyo.format(
            referenceAmountTotal,
            'Currency'
          )}.`
        );
      }
      if ((this.writeoff as Money)?.gt(0)) {
        throw new ValidationError(
          this.fyo.t`Write off is not allowed on balance application (Customer Credit / Vendor Advance).`
        );
      }
      return;
    }

    if (
      (this.amount as Money)
        .add((this.writeoff as Money) ?? 0)
        .gte(referenceAmountTotal)
    ) {
      return;
    }

    const writeoff = this.fyo.format(this.writeoff!, 'Currency');
    const payment = this.fyo.format(this.amount!, 'Currency');
    const refAmount = this.fyo.format(referenceAmountTotal, 'Currency');

    if ((this.writeoff as Money).gt(0)) {
      throw new ValidationError(
        this.fyo.t`Amount: ${payment} and writeoff: ${writeoff} 
          is less than the total amount allocated to 
          references: ${refAmount}.`
      );
    }

    throw new ValidationError(
      this.fyo.t`Amount: ${payment} is less than the total
        amount allocated to references: ${refAmount}.`
    );
  }

  async validateWriteOffAccount() {
    if ((this.writeoff as Money).isZero()) {
      return;
    }

    const writeOffAccount = this.fyo.singles.AccountingSettings!
      .writeOffAccount as string | null | undefined;

    if (!writeOffAccount) {
      throw new NotFoundError(
        t`Write Off Account not set.
          Please set Write Off Account in General Settings`,
        false
      );
    }

    const exists = await this.fyo.db.exists(
      ModelNameEnum.Account,
      writeOffAccount
    );

    if (exists) {
      return;
    }

    throw new NotFoundError(
      t`Write Off Account ${writeOffAccount} does not exist.
          Please set Write Off Account in General Settings`,
      false
    );
  }

  async validateReferencesAreSet() {
    const type = (await this.paymentMethodDoc()).type;

    if (type !== 'Bank') {
      return;
    }

    if (!this.clearanceDate) {
      throw new ValidationError(t`Clearance Date not set.`);
    }

    if (!this.referenceId) {
      throw new ValidationError(t`Reference Id not set.`);
    }

    await this.validateReferenceIdUniqueness();
  }

  async validateReferenceIdUniqueness() {
    const referenceId = this.referenceId as string | undefined;
    if (!referenceId) {
      return;
    }

    const filters: QueryFilter = {
      referenceId,
      cancelled: false,
    };

    if (this.name) {
      filters.name = ['!=', this.name];
    }

    if (this.party) {
      filters.party = this.party;
    }

    if (this.paymentMethod) {
      filters.paymentMethod = this.paymentMethod;
    }

    const existing = await this.fyo.db.getAll(ModelNameEnum.Payment, {
      fields: ['name'],
      filters,
      limit: 1,
    });

    if (existing.length > 0) {
      throw new ValidationError(
        t`Reference Id ${referenceId} already exists for this party and payment method.`
      );
    }
  }

  async getTaxSummary() {
    const taxes: Record<
      string,
      Record<
        string,
        {
          account: string;
          from_account: string;
          rate: number;
          amount: Money;
        }
      >
    > = {};

    for (const childDoc of this.for ?? []) {
      const referenceName = childDoc.referenceName;
      const referenceType = childDoc.referenceType;

      const refDoc = (await this.fyo.doc.getDoc(
        childDoc.referenceType!,
        childDoc.referenceName
      )) as Invoice;

      if (referenceName && referenceType && !refDoc) {
        throw new ValidationError(
          t`${referenceType} of type ${
            this.fyo.schemaMap?.[referenceType]?.label ?? referenceType
          } does not exist`
        );
      }

      if (!refDoc) {
        continue;
      }

      for (const {
        details,
        taxAmount,
        exchangeRate,
      } of await refDoc.getTaxItems()) {
        const { account, payment_account } = details;
        if (!payment_account) {
          continue;
        }

        taxes[payment_account] ??= {};
        taxes[payment_account][account] ??= {
          account: payment_account,
          from_account: account,
          rate: details.rate,
          amount: this.fyo.pesa(0),
        };

        taxes[payment_account][account].amount = taxes[payment_account][
          account
        ].amount.add(taxAmount.mul(exchangeRate ?? 1));
      }
    }

    type Summary = typeof taxes[string][string] & { idx: number };
    const taxArr: Summary[] = [];
    let idx = 0;
    for (const payment_account in taxes) {
      for (const account in taxes[payment_account]) {
        const tax = taxes[payment_account][account];
        if (tax.amount.isZero()) {
          continue;
        }

        taxArr.push({
          ...tax,
          idx,
        });
        idx += 1;
      }
    }

    return taxArr;
  }

  async getPosting() {
    /**
     * account        : From Account
     * paymentAccount : To Account
     *
     * if Receive
     * -        account : Debtors, etc
     * - paymentAccount : Cash, Bank, etc
     *
     * if Pay
     * -        account : Cash, Bank, etc
     * - paymentAccount : Creditors, etc
     *
     * Balance application (Customer Credit / Vendor Advance): Dr account, Cr account (same) — net zero, allocation only.
     */
    const methodDoc = await this.paymentMethodDoc();
    const type = methodDoc?.type as string | undefined;
    const isBalanceApplication =
      type === 'Customer Credit' || type === 'Vendor Advance';

    const posting: LedgerPosting = new LedgerPosting(this, this.fyo);
    const account = this.account as string;
    const amount = this.amount as Money;

    if (isBalanceApplication) {
      await posting.debit(account, amount);
      await posting.credit(account, amount);
      return posting;
    }

    await this.validateWriteOffAccount();
    const paymentAccount = this.paymentAccount as string;

    await posting.debit(paymentAccount, amount);
    await posting.credit(account, amount);

    if (this.taxes) {
      if (this.paymentType === 'Receive') {
        for (const tax of this.taxes) {
          await posting.debit(tax.from_account!, tax.amount!);
          await posting.credit(tax.account!, tax.amount!);
        }
      } else if (this.paymentType === 'Pay') {
        for (const tax of this.taxes) {
          await posting.credit(tax.from_account!, tax.amount!);
          await posting.debit(tax.account!, tax.amount!);
        }
      }
    }

    await this.applyWriteOffPosting(posting);
    return posting;
  }

  async applyWriteOffPosting(posting: LedgerPosting) {
    const writeoff = this.writeoff as Money;
    if (writeoff.isZero()) {
      return posting;
    }

    const account = this.account as string;
    const paymentAccount = this.paymentAccount as string;
    const writeOffAccount = this.fyo.singles.AccountingSettings!
      .writeOffAccount as string;

    if (this.paymentType === 'Pay') {
      await posting.credit(paymentAccount, writeoff);
      await posting.debit(writeOffAccount, writeoff);
    } else {
      await posting.debit(account, writeoff);
      await posting.credit(writeOffAccount, writeoff);
    }
  }

  async validateReferences() {
    const forReferences = this.for ?? [];
    if (forReferences.length === 0) {
      return;
    }

    for (const row of forReferences) {
      this.validateReferenceType(row);
    }

    await this.validateReferenceAllocationAmounts();
    this.validateReferenceOutstanding();
  }

  /** No row may allocate more than that invoice's outstanding (Money-safe). */
  async validateReferenceAllocationAmounts() {
    for (const row of this.for ?? []) {
      const allocated = row.amount ?? this.fyo.pesa(0);
      if (!allocated.gt(0)) {
        throw new ValidationError(
          this.fyo.t`Allocated amount for each reference must be greater than 0.`
        );
      }

      const referenceType = row.referenceType;
      const referenceName = row.referenceName;
      if (!referenceType || !referenceName) {
        continue;
      }

      const refDoc = (await this.fyo.doc.getDoc(
        referenceType,
        referenceName
      )) as Invoice;
      const outstanding =
        refDoc?.outstandingAmount?.abs() ?? this.fyo.pesa(0);
      if (allocated.gt(outstanding)) {
        const refName = row.referenceName ?? '';
        throw new ValidationError(
          this.fyo.t`Allocated amount ${this.fyo.format(
            allocated,
            'Currency'
          )} for ${refName} cannot exceed outstanding ${this.fyo.format(
            outstanding,
            'Currency'
          )}.`
        );
      }
    }
  }

  validateReferenceType(row: PaymentFor) {
    const referenceType = row.referenceType;
    if (
      ![ModelNameEnum.SalesInvoice, ModelNameEnum.PurchaseInvoice].includes(
        referenceType!
      )
    ) {
      throw new ValidationError(t`Please select a valid reference type.`);
    }
  }

  validateReferenceOutstanding() {
    const amount = this.amount as Money;
    if (amount.lte(0)) {
      throw new ValidationError(
        this.fyo.t`Payment amount: ${this.fyo.format(
          this.amount!,
          'Currency'
        )} should be greater than 0.`
      );
    }
    // Allow overpayment: amount > sum(outstanding) is valid and becomes Customer Credit / Vendor Advance
  }

  async afterSubmit() {
    await super.afterSubmit();
    await this.updateReferenceDocOutstanding();
    await this.updatePartyOutstanding();
  }

  async updateReferenceDocOutstanding() {
    const isMoney = isPesa as unknown as (v: unknown) => v is Money;
    for (const row of this.for ?? []) {
      const current = (await this.fyo.db.get(
        row.referenceType!,
        row.referenceName as string,
        ['outstandingAmount']
      )) as { outstandingAmount?: Money | number | string };
      const prevRaw = current?.outstandingAmount;
      const previousOutstandingAmount: Money =
        prevRaw != null
          ? isMoney(prevRaw)
            ? prevRaw
            : this.fyo.pesa(prevRaw)
          : this.fyo.pesa(0);
      const outstandingAmount = previousOutstandingAmount.sub(row.amount!);
      await this.fyo.db.update(row.referenceType!, {
        name: row.referenceName,
        outstandingAmount,
      });
    }
  }

  async beforeSync(): Promise<void> {
    await super.beforeSync();

    const forRefs = (this.for ?? []) as Doc[];
    const allocatedTotal = forRefs
      .map((r) => r.amount as Money)
      .reduce((a, b) => a.add(b), this.fyo.pesa(0));

    for (const row of forRefs) {
      if (!this.fyo.singles.AccountingSettings?.enablePartialPayment) {
        const amount = (this.writeoff as Money).isZero()
          ? (this.amount as Money)
          : (this.amountPaid as Money);

        if (amount.lt(allocatedTotal)) {
          if ((this.writeoff as Money).isZero()) {
            this.amount = allocatedTotal;
            throw new ValidationError(
              this.fyo.t`Enable Partial payment to pay partial amount`
            );
          }
        }
      }
    }
  }

  async afterCancel() {
    await super.afterCancel();
    await this.revertOutstandingAmount();
  }

  async revertOutstandingAmount() {
    await this._revertReferenceOutstanding();
    await this.updatePartyOutstanding();
  }

  async _revertReferenceOutstanding() {
    const isMoney = isPesa as unknown as (v: unknown) => v is Money;
    for (const ref of this.for ?? []) {
      const current = (await this.fyo.db.get(
        ref.referenceType!,
        ref.referenceName as string,
        ['outstandingAmount']
      )) as { outstandingAmount?: Money | number | string };
      const prevRaw = current?.outstandingAmount;
      const previous: Money =
        prevRaw != null
          ? isMoney(prevRaw)
            ? prevRaw
            : this.fyo.pesa(prevRaw)
          : this.fyo.pesa(0);
      const outstandingAmount = previous.add(ref.amount!);
      await this.fyo.db.update(ref.referenceType!, {
        name: ref.referenceName,
        outstandingAmount,
      });
    }
  }

  async updatePartyOutstanding() {
    const partyDoc = (await this.fyo.doc.getDoc(
      ModelNameEnum.Party,
      this.party
    )) as Party;
    await partyDoc.updateOutstandingAmount();
  }

  static defaults: DefaultMap = {
    numberSeries: (doc) => getNumberSeries(doc.schemaName, doc.fyo),
    date: () => new Date(),
  };

  async getTotalTax() {
    const taxArr = await this.getTaxSummary();

    return taxArr
      .map(({ amount }) => amount)
      .reduce((a, b) => a.add(b), this.fyo.pesa(0));
  }

  async _getAccountsMap(): Promise<AccountTypeMap> {
    if (this._accountsMap) {
      return this._accountsMap;
    }

    const accounts = (await this.fyo.db.getAll(ModelNameEnum.Account, {
      fields: ['name', 'accountType'],
      filters: {
        accountType: [
          'in',
          [
            AccountTypeEnum.Bank,
            AccountTypeEnum.Cash,
            AccountTypeEnum.Payable,
            AccountTypeEnum.Receivable,
          ],
        ],
      },
    })) as { name: string; accountType: AccountTypeEnum }[];

    return (this._accountsMap = accounts.reduce((acc, ac) => {
      acc[ac.accountType] ??= [];
      acc[ac.accountType]!.push(ac.name);
      return acc;
    }, {} as AccountTypeMap));
  }

  async _getReferenceAccount() {
    const account = await this._getAccountFromParty();
    if (!account) {
      return await this._getAccountFromFor();
    }

    return account;
  }

  async _getAccountFromParty() {
    const party = (await this.loadAndGetLink('party')) as Party | null;
    if (!party || party.role === 'Both') {
      return null;
    }

    return party.defaultAccount ?? null;
  }

  async _getAccountFromFor() {
    const reference = this?.for?.[0];
    if (!reference) {
      return null;
    }

    const refDoc = (await reference.loadAndGetLink(
      'referenceName'
    )) as Invoice | null;

    if (
      refDoc &&
      refDoc.schema.name === ModelNameEnum.SalesInvoice &&
      refDoc.isReturned
    ) {
      const accountsMap = await this._getAccountsMap();
      return accountsMap[AccountTypeEnum.Cash]?.[0];
    }

    return refDoc?.account ?? null;
  }

  formulas: FormulaMap = {
    account: {
      formula: async () => {
        const accountsMap = await this._getAccountsMap();
        if (this.paymentType === 'Receive') {
          return (
            (await this._getReferenceAccount()) ??
            accountsMap[AccountTypeEnum.Receivable]?.[0] ??
            null
          );
        }

        const paymentMethodDoc = await this.paymentMethodDoc();

        if (paymentMethodDoc.type === 'Cash') {
          return accountsMap[AccountTypeEnum.Cash]?.[0] ?? null;
        }

        return accountsMap[AccountTypeEnum.Bank]?.[0] ?? null;
      },
      dependsOn: ['paymentMethod', 'paymentType', 'party'],
    },
    paymentAccount: {
      formula: async () => {
        const accountsMap = await this._getAccountsMap();
        if (this.paymentType === 'Pay') {
          return (
            (await this._getReferenceAccount()) ??
            accountsMap[AccountTypeEnum.Payable]?.[0] ??
            null
          );
        }

        const paymentMethodDoc = await this.paymentMethodDoc();

        if (paymentMethodDoc.account) {
          return paymentMethodDoc.get('account');
        }

        if (paymentMethodDoc.type === 'Cash') {
          return accountsMap[AccountTypeEnum.Cash]?.[0] ?? null;
        }

        return accountsMap[AccountTypeEnum.Bank]?.[0] ?? null;
      },
      dependsOn: ['paymentMethod', 'paymentType', 'party'],
    },
    paymentType: {
      formula: async () => {
        if (!this.party) {
          return;
        }

        const reference = this?.for?.[0];
        const refDoc = (await reference?.loadAndGetLink(
          'referenceName'
        )) as Invoice | null;

        const partyDoc = (await this.loadAndGetLink('party')) as Party;
        const outstanding = partyDoc.outstandingAmount as Money;

        if (partyDoc.role === PartyRoleEnum.Supplier) {
          if (refDoc?.isReturn) {
            return PaymentTypeEnum.Receive;
          } else {
            return PaymentTypeEnum.Pay;
          }
        } else if (partyDoc.role === PartyRoleEnum.Customer) {
          if (refDoc?.isSales && refDoc.isReturn) {
            return PaymentTypeEnum.Pay;
          } else {
            return PaymentTypeEnum.Receive;
          }
        } else if (partyDoc.role === PartyRoleEnum.Both) {
          if (!refDoc) {
            return this.paymentType;
          }
          if (refDoc.isSales) {
            if (refDoc.isReturn) {
              return PaymentTypeEnum.Pay;
            }
            return PaymentTypeEnum.Receive;
          }
          if (refDoc.isReturn) {
            return PaymentTypeEnum.Receive;
          }
          return PaymentTypeEnum.Pay;
        }

        if (outstanding?.isZero() ?? true) {
          return this.paymentType;
        }

        if (outstanding?.isPositive()) {
          return PaymentTypeEnum.Receive;
        }
        return PaymentTypeEnum.Pay;
      },
    },
    // amount: no formula so user amount can exceed sum(for) for Customer Credit / Vendor Advance; set by updateAmountOnReferenceUpdate when "for" changes
    amountPaid: {
      formula: () => this.amount!.sub(this.writeoff!),
      dependsOn: ['amount', 'writeoff', 'for'],
    },
    referenceType: {
      formula: () => {
        return this.referenceType || undefined;
      },
      dependsOn: ['for'],
    },
    taxes: { formula: async () => await this.getTaxSummary() },
  };

  validations: ValidationMap = {
    amount: (value: DocValue) => {
      if ((value as Money).isNegative()) {
        throw new ValidationError(
          this.fyo.t`Payment amount cannot be less than zero.`
        );
      }

      if ((value as Money).isZero()) {
        throw new ValidationError(
          this.fyo.t`Payment amount cannot be ${this.fyo.format(
            value as Money,
            'Currency'
          )}.`
        );
      }

      // Allow overpayment (amount > sum of outstanding) — becomes Customer Credit / Vendor Advance; no cap
    },
  };

  hidden: HiddenMap = {
    amountPaid: () => this.writeoff?.isZero() ?? true,
    attachment: () =>
      !(this.attachment || !(this.isSubmitted || this.isCancelled)),
    for: () => !!((this.isSubmitted || this.isCancelled) && !this.for?.length),
    taxes: () => !this.taxes?.length,
  };

  static filters: FiltersMap = {
    party: (doc: Doc) => {
      const paymentType = (doc as Payment).paymentType;
      if (paymentType === 'Pay') {
        return { role: ['in', ['Supplier', 'Both']] } as QueryFilter;
      }

      if (paymentType === 'Receive') {
        return { role: ['in', ['Customer', 'Both']] } as QueryFilter;
      }

      return {};
    },
    numberSeries: () => {
      return { referenceType: 'Payment' };
    },
    account: (doc: Doc) => {
      const paymentType = doc.paymentType as PaymentType;
      const paymentMethod = doc.paymentMethod as PaymentMethod;

      if (paymentType === 'Receive') {
        return { accountType: 'Receivable', isGroup: false };
      }

      if (paymentMethod.name === 'Cash') {
        return { accountType: 'Cash', isGroup: false };
      } else {
        return { accountType: ['in', ['Bank', 'Cash']], isGroup: false };
      }
    },
    paymentAccount: (doc: Doc) => {
      const paymentType = doc.paymentType as PaymentType;
      const paymentMethod = doc.paymentMethod as PaymentMethod;

      if (paymentType === 'Pay') {
        return { accountType: 'Payable', isGroup: false };
      }

      if (paymentMethod.name === 'Cash') {
        return { accountType: 'Cash', isGroup: false };
      } else {
        return { accountType: ['in', ['Bank', 'Cash']], isGroup: false };
      }
    },
  };

  static getActions(fyo: Fyo): Action[] {
    return [getLedgerLinkAction(fyo)];
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', getDocStatusListColumn(), 'party', 'date', 'amount'],
    };
  }
}
