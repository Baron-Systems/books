<template>
  <div class="flex flex-col h-full">
    <SectionHeader>
      <template #title>{{ t`Profit and Loss` }}</template>
      <template #action>
        <div class="flex items-center gap-3">
          <!-- Chart Legend -->
          <div v-if="hasData" class="flex text-sm gap-4">
            <div class="flex items-center gap-2">
              <span
                class="w-3 h-3 rounded-sm inline-block flex-shrink-0 bg-blue-500 dark:bg-blue-600"
              />
              <span class="text-gray-700 dark:text-gray-300">{{ t`Profit` }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="w-3 h-3 rounded-sm inline-block flex-shrink-0 bg-pink-500 dark:bg-pink-600"
              />
              <span class="text-gray-700 dark:text-gray-300">{{ t`Loss` }}</span>
            </div>
          </div>
          <PeriodSelector
            :value="period"
            :options="periodOptions"
            @change="(value) => (period = value)"
          />
        </div>
      </template>
    </SectionHeader>

    <!-- Summary cards -->
    <div
      v-if="hasData"
      class="grid grid-cols-3 gap-3 mt-4"
      style="min-height: 4.5rem"
    >
      <div
        class="rounded-lg border dark:border-gray-700/80 p-3 flex flex-col justify-center bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50"
      >
        <span
          class="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
        >
          {{ t`Income` }}
        </span>
        <span
          class="text-lg font-semibold mt-0.5 text-emerald-800 dark:text-emerald-200 tabular-nums"
        >
          {{ formatCurrency(totalIncome) }}
        </span>
      </div>
      <div
        class="rounded-lg border dark:border-gray-700/80 p-3 flex flex-col justify-center bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50"
      >
        <span
          class="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-400"
        >
          {{ t`Expenses` }}
        </span>
        <span
          class="text-lg font-semibold mt-0.5 text-rose-800 dark:text-rose-200 tabular-nums"
        >
          {{ formatCurrency(totalExpenses) }}
        </span>
      </div>
      <div
        class="rounded-lg border dark:border-gray-700/80 p-3 flex flex-col justify-center"
        :class="
          netProfit >= 0
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
        "
      >
        <span
          class="text-xs font-medium uppercase tracking-wide"
          :class="
            netProfit >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
          "
        >
          {{ t`Net` }}
        </span>
        <span
          class="text-lg font-semibold mt-0.5 tabular-nums"
          :class="
            netProfit >= 0
              ? 'text-emerald-800 dark:text-emerald-200'
              : 'text-rose-800 dark:text-rose-200'
          "
        >
          {{ formatCurrency(netProfit) }}
        </span>
      </div>
    </div>

    <BarChart
      v-if="hasData"
      class="mt-4"
      :aspect-ratio="2.05"
      :colors="chartData.colors"
      :grid-color="chartData.gridColor"
      :font-color="chartData.fontColor"
      :points="chartData.points"
      :x-labels="chartData.xLabels"
      :format="chartData.format"
      :format-x="chartData.formatX"
      :y-max="chartData.yMax"
      :y-min="chartData.yMin"
    />
    <div v-else class="flex-1 w-full h-full flex-center my-20">
      <span class="text-base text-gray-600 dark:text-gray-500">
        {{ t`No transactions yet` }}
      </span>
    </div>
  </div>
</template>
<script lang="ts">
import BarChart from 'src/components/Charts/BarChart.vue';
import { fyo } from 'src/initFyo';
import { formatXLabels, getYMax, getYMin } from 'src/utils/chart';
import { uicolors } from 'src/utils/colors';
import { getDatesAndPeriodList } from 'src/utils/misc';
import { getValueMapFromList } from 'utils';
import DashboardChartBase from './BaseDashboardChart.vue';
import PeriodSelector from './PeriodSelector.vue';
import SectionHeader from './SectionHeader.vue';
import { defineComponent } from 'vue';

// Linting broken in this file cause of `extends: ...`
/*
  eslint-disable @typescript-eslint/no-unsafe-argument,
  @typescript-eslint/no-unsafe-return
*/
export default defineComponent({
  name: 'ProfitAndLoss',
  components: {
    PeriodSelector,
    SectionHeader,
    BarChart,
  },
  extends: DashboardChartBase,
  props: {
    darkMode: { type: Boolean, default: false },
  },
  data: () => ({
    data: [] as { yearmonth: string; balance: number }[],
    hasData: false,
    periodOptions: ['This Year', 'This Quarter', 'YTD'],
    totalIncome: 0,
    totalExpenses: 0,
  }),
  computed: {
    netProfit(): number {
      return this.totalIncome - this.totalExpenses;
    },
    chartData() {
      const points = [this.data.map((d) => d.balance)];
      const colors = [
        {
          positive: uicolors.blue[this.darkMode ? '600' : '500'],
          negative: uicolors.pink[this.darkMode ? '600' : '500'],
        },
      ];
      const format = (value: number) => fyo.format(value ?? 0, 'Currency');
      const yMax = getYMax(points);
      const yMin = getYMin(points);
      return {
        xLabels: this.data.map((d) => d.yearmonth),
        points,
        format,
        colors,
        yMax,
        yMin,
        formatX: formatXLabels,
        gridColor: this.darkMode ? 'rgba(200, 200, 200, 0.2)' : undefined,
        fontColor: this.darkMode ? uicolors.gray['400'] : undefined,
        zeroLineColor: this.darkMode ? uicolors.gray['400'] : undefined,
      };
    },
  },
  activated() {
    this.setData();
  },
  methods: {
    formatCurrency(value: number) {
      return fyo.format(value ?? 0, 'Currency');
    },
    async setData() {
      const { fromDate, toDate, periodList } = getDatesAndPeriodList(
        this.period
      );

      const data = await fyo.db.getIncomeAndExpenses(
        fromDate.toISO(),
        toDate.toISO()
      );
      const incomes = getValueMapFromList(data.income, 'yearmonth', 'balance');
      const expenses = getValueMapFromList(
        data.expense,
        'yearmonth',
        'balance'
      );

      this.totalIncome = (data.income as { balance: number }[]).reduce(
        (sum, row) => sum + (row.balance ?? 0),
        0
      );
      this.totalExpenses = (data.expense as { balance: number }[]).reduce(
        (sum, row) => sum + (row.balance ?? 0),
        0
      );

      this.data = periodList.map((d) => {
        const key = d.toFormat('yyyy-MM');
        const inc = incomes[key] ?? 0;
        const exp = expenses[key] ?? 0;
        return { yearmonth: key, balance: inc - exp };
      });
      this.hasData = data.income.length > 0 || data.expense.length > 0;
    },
  },
});
</script>
