<template>
  <Modal
    class="w-2/6 ml-auto mr-3.5"
    :set-close-listener="false"
    :open-modal="openModal && !!sinvDoc?.fieldMap"
  >
    <div v-if="sinvDoc.fieldMap" class="px-4 py-6 grid" style="height: 95vh">
      <Currency
        :df="fyo.fieldMap.PaymentFor.amount"
        :read-only="true"
        :border="true"
        :text-right="true"
        :value="paidAmount"
      />
      <div class="grid grid-cols-2 gap-6">
        <Button
          v-for="method in paymentMethods"
          :key="method"
          type="primary"
          class="w-full py-5"
          @click="setPaymentMethodAndAmount(method)"
        >
          <slot>
            <p class="uppercase text-lg text-white font-semibold">
              {{ t`${method}` }}
            </p>
          </slot>
        </Button>
      </div>

      <div class="mt-8 grid grid-cols-2 gap-6">
        <Data
          v-show="!isPaymentMethodIsCash"
          :df="fyo.fieldMap.Payment.referenceId"
          :show-label="true"
          :border="true"
          :required="!transferAmount.isZero()"
          :read-only="false"
          :value="transferRefNo"
          @change="(value:string) => $emit('setTransferRefNo', value)"
        />

        <Date
          v-show="!isPaymentMethodIsCash"
          :df="fyo.fieldMap.Payment.clearanceDate"
          :show-label="true"
          :border="true"
          :required="!transferAmount.isZero()"
          :read-only="false"
          :value="transferClearanceDate"
          @change="(value:Date) => $emit('setTransferClearanceDate', value)"
        />
      </div>

      <div class="mt-14 grid grid-cols-2 gap-6">
        <Currency
          v-show="showPaidChange"
          :df="{
            label: t`Paid Change`,
            fieldtype: 'Currency',
            fieldname: 'paidChange',
          }"
          :read-only="true"
          :show-label="true"
          :border="true"
          :text-right="true"
          :value="paidChange"
        />

        <Currency
          v-show="showBalanceAmount"
          :df="{
            label: t`Balance Amount`,
            fieldtype: 'Currency',
            fieldname: 'balanceAmount',
          }"
          :read-only="true"
          :show-label="true"
          :border="true"
          :text-right="true"
          :value="balanceAmount"
        />
      </div>

      <div
        class="mb-14 row-start-4 row-span-2 grid grid-cols-2 gap-x-6 gap-y-11"
      >
        <Currency
          :df="sinvDoc.fieldMap.netTotal"
          :read-only="true"
          :show-label="true"
          :border="true"
          :text-right="true"
          :value="sinvDoc?.netTotal"
        />

        <Currency
          :df="{
            label: t`Taxes and Charges`,
            fieldtype: 'Currency',
            fieldname: 'taxesAndCharges',
          }"
          :read-only="true"
          :show-label="true"
          :border="true"
          :text-right="true"
          :value="totalTaxedAmount"
        />

        <Currency
          :df="sinvDoc.fieldMap.baseGrandTotal"
          :read-only="true"
          :show-label="true"
          :border="true"
          :text-right="true"
          :value="sinvDoc?.baseGrandTotal"
        />

        <Currency
          v-if="isDiscountingEnabled"
          :df="sinvDoc.fieldMap.discountAmount"
          :read-only="true"
          :show-label="true"
          :border="true"
          :text-right="true"
          :value="itemDiscounts"
        />

        <Currency
          :df="sinvDoc.fieldMap.grandTotal"
          :read-only="true"
          :show-label="true"
          :border="true"
          :text-right="true"
          :value="sinvDoc?.grandTotal"
        />

        <Currency
          :df="sinvDoc.fieldMap.outstandingAmount"
          :read-only="true"
          :show-label="true"
          :border="true"
          :text-right="true"
          :value="sinvDoc?.outstandingAmount"
        />
      </div>

      <div class="grid grid-cols-2 gap-4 bottom-8">
        <template v-if="!openedForPay">
          <div class="col-span-1">
            <Button
              type="primary"
              class="w-full"
              style="padding: 1.35rem"
              @click="registerTransaction"
            >
              <slot>
                <p class="uppercase text-lg text-white font-semibold">
                  {{ t`Register` }}
                </p>
              </slot>
            </Button>
          </div>

          <div class="col-span-1">
            <Button
              type="primary"
              class="w-full"
              style="padding: 1.35rem"
              @click="registerAndPrintTransaction"
            >
              <slot>
                <p class="uppercase text-lg text-white font-semibold">
                  {{ t`Register & Print` }}
                </p>
              </slot>
            </Button>
          </div>
        </template>

        <div class="col-span-1">
          <Button
            type="secondary"
            class="w-full"
            style="padding: 1.35rem"
            @click="cancelTransaction"
          >
            <slot>
              <p class="uppercase text-lg font-semibold">
                {{ t`Cancel` }}
              </p>
            </slot>
          </Button>
        </div>

        <div class="col-span-1">
          <Button
            type="primary"
            class="w-full"
            style="padding: 1.35rem"
            @click="payTransaction"
          >
            <slot>
              <p class="uppercase text-lg text-white font-semibold">
                {{ t`Pay` }}
              </p>
            </slot>
          </Button>
        </div>

        <div class="col-span-1">
          <Button
            type="primary"
            class="w-full"
            style="padding: 1.35rem"
            @click="payAndPrintTransaction"
          >
            <slot>
              <p class="uppercase text-lg text-white font-semibold">
                {{ t`Pay & Print` }}
              </p>
            </slot>
          </Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import Button from 'src/components/Button.vue';
import Currency from 'src/components/Controls/Currency.vue';
import Data from 'src/components/Controls/Data.vue';
import Date from 'src/components/Controls/Date.vue';
import Modal from 'src/components/Modal.vue';
import { Money } from 'pesa';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { defineComponent, inject } from 'vue';
import { fyo } from 'src/initFyo';
import { isPesa } from 'fyo/utils';
import { ModelNameEnum } from 'models/types';
import { showToast } from 'src/utils/interactive';

export default defineComponent({
  name: 'PaymentModal',
  components: {
    Modal,
    Currency,
    Button,
    Data,
    Date,
  },
  props: {
    openModal: {
      type: Boolean,
      default: false,
    },
    openedForPay: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'createTransaction',
    'setPaidAmount',
    'setPaymentMethod',
    'setTransferClearanceDate',
    'setTransferRefNo',
    'toggleModal',
  ],
  setup() {
    return {
      paidAmount: inject('paidAmount') as Money,
      paymentMethod: inject('paymentMethod') as string,
      isDiscountingEnabled: inject('isDiscountingEnabled') as boolean,
      itemDiscounts: inject('itemDiscounts') as Money,
      transferAmount: inject('transferAmount') as Money,
      sinvDoc: inject('sinvDoc') as SalesInvoice,
      transferRefNo: inject('transferRefNo') as string,
      transferClearanceDate: inject('transferClearanceDate') as Date,
      totalTaxedAmount: inject('totalTaxedAmount') as Money,
    };
  },
  data() {
    return {
      paymentMethods: [] as string[],
    };
  },
  computed: {
    isPaymentMethodIsCash(): boolean {
      return this.paymentMethod === 'Cash';
    },
    balanceAmount(): Money {
      const grandTotal = this.sinvDoc?.grandTotal ?? fyo.pesa(0);

      if (isPesa(this.paidAmount) && this.paidAmount.isZero()) {
        return grandTotal.sub(this.transferAmount);
      }

      return grandTotal.sub(this.paidAmount);
    },
    paidChange(): Money {
      const grandTotal = this.sinvDoc?.grandTotal ?? fyo.pesa(0);

      if (this.fyo.pesa(this.paidAmount.float).isZero()) {
        return this.transferAmount.sub(grandTotal);
      }

      return this.fyo.pesa(this.paidAmount.float).sub(grandTotal);
    },
    showBalanceAmount(): boolean {
      if (this.paidAmount.float === 0) {
        return false;
      }

      if (
        this.fyo
          .pesa(this.paidAmount.float)
          .gte(this.sinvDoc?.grandTotal ?? fyo.pesa(0))
      ) {
        return false;
      }

      if (this.transferAmount.gte(this.sinvDoc?.grandTotal ?? fyo.pesa(0))) {
        return false;
      }

      return true;
    },
    showPaidChange(): boolean {
      if (this.sinvDoc.isReturn) {
        return false;
      }

      if (
        this.fyo.pesa(this.paidAmount.float).eq(fyo.pesa(0)) &&
        this.transferAmount.eq(fyo.pesa(0))
      ) {
        return false;
      }

      if (
        this.fyo
          .pesa(this.paidAmount.float)
          .gt(this.sinvDoc?.grandTotal ?? fyo.pesa(0))
      ) {
        return true;
      }

      if (this.transferAmount.gt(this.sinvDoc?.grandTotal ?? fyo.pesa(0))) {
        return true;
      }

      return false;
    },
  },
  async mounted() {
    await this.setPaymentMethods();
  },
  methods: {
    setPaymentMethodAndAmount(paymentMethod?: string) {
      if (paymentMethod) {
        this.$emit('setPaymentMethod', paymentMethod);
        this.$emit(
          'setPaidAmount',
          (this.sinvDoc.outstandingAmount as Money).float
        );
      }
    },
    async setPaymentMethods() {
      this.paymentMethods = (
        (await this.fyo.db.getAll(ModelNameEnum.PaymentMethod, {
          fields: ['name'],
        })) as { name: string }[]
      ).map((d) => d.name);
    },
    registerTransaction() {
      const hasPaidAmount = !this.paidAmount.isZero();
      if (hasPaidAmount && !this.paymentMethod) {
        return showToast({
          type: 'error',
          message: this.fyo
            .t`Please select a payment method when entering a payment amount.`,
        });
      }
      this.$emit('createTransaction', false, true);
    },
    registerAndPrintTransaction() {
      const hasPaidAmount = !this.paidAmount.isZero();
      if (hasPaidAmount && !this.paymentMethod) {
        return showToast({
          type: 'error',
          message: this.fyo
            .t`Please select a payment method when entering a payment amount.`,
        });
      }
      this.$emit('createTransaction', true, true);
    },
    payTransaction() {
      if (!this.paymentMethod) {
        return showToast({
          type: 'error',
          message: this.fyo
            .t`Please select a payment method before proceeding with payment.`,
        });
        return;
      }
      this.$emit('createTransaction', false, true);
    },
    payAndPrintTransaction() {
      if (!this.paymentMethod) {
        return showToast({
          type: 'error',
          message: this.fyo
            .t`Please select a payment method before proceeding with payment.`,
        });
        return;
      }

      this.$emit('createTransaction', true, true);
    },
    cancelTransaction() {
      this.$emit('setPaidAmount', fyo.pesa(0));
      this.$emit('toggleModal', 'Payment');
    },
  },
});
</script>
