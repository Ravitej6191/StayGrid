import ReactEChartsCore from 'echarts-for-react/esm/core'
import { echarts } from '@/lib/echarts-core'
import { useThemeColors } from '@/hooks/use-theme-colors'
import type { IncomeExpenseTrendPoint } from '../types'

function compactCurrency(value: number): string {
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return `₹${value}`
}

export function IncomeExpenseChart({ data }: { data: IncomeExpenseTrendPoint[] }) {
  const colors = useThemeColors()

  const option = {
    animation: false,
    grid: { left: 8, right: 8, top: 44, bottom: 28, containLabel: true },
    legend: {
      data: ['Income', 'Expenses'],
      top: 0,
      left: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: colors['muted-foreground'], fontSize: 12 },
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'click',
      confine: true,
      backgroundColor: colors.popover,
      borderColor: colors.border,
      borderWidth: 1,
      textStyle: { color: colors['popover-foreground'], fontSize: 12 },
      extraCssText: 'border-radius: 10px; padding: 8px 12px; box-shadow: 0 4px 16px rgb(0 0 0 / 0.15);',
      formatter: (params: { seriesName: string; name: string; value: number; color: string }) =>
        `<div style="font-weight:600;margin-bottom:2px;">${params.name}</div>` +
        `<div style="display:flex;align-items:center;gap:6px;">` +
        `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${params.color};"></span>` +
        `${params.seriesName}: <b>${compactCurrency(params.value)}</b></div>`,
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: data.map((d) => d.month),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors['muted-foreground'], fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: { show: false, type: 'value' },
    series: [
      {
        name: 'Income',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: { color: colors.primary, borderRadius: [4, 4, 0, 0] },
        emphasis: { disabled: true },
        data: data.map((d) => d.income),
      },
      {
        name: 'Expenses',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: { color: colors.warning, borderRadius: [4, 4, 0, 0] },
        emphasis: { disabled: true },
        data: data.map((d) => d.expenses),
      },
    ],
  }

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: 240, width: '100%' }} notMerge />
}
