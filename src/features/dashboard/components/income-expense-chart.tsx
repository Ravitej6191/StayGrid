import ReactEChartsCore from 'echarts-for-react/esm/core'
import { echarts } from '@/lib/echarts-core'
import { useThemeColors } from '@/hooks/use-theme-colors'
import type { IncomeExpenseTrendPoint } from '../types'

function compactCurrency(value: number): string {
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return `₹${value}`
}

function withAlpha(color: string, alphaPercent: number): string {
  return color.replace(/\)$/, ` / ${alphaPercent}%)`)
}

export function IncomeExpenseChart({ data }: { data: IncomeExpenseTrendPoint[] }) {
  const colors = useThemeColors()

  const option = {
    animation: false,
    grid: { left: 8, right: 8, top: 40, bottom: 30 },
    legend: {
      data: ['Income', 'Expenses'],
      top: 0,
      right: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: colors['muted-foreground'], fontSize: 12 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.popover,
      borderColor: colors.border,
      textStyle: { color: colors['popover-foreground'], fontSize: 12 },
      valueFormatter: (value: number) => compactCurrency(value),
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map((d) => d.month),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors['muted-foreground'], fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: { show: false, type: 'value' },
    series: [
      {
        name: 'Income',
        type: 'line',
        smooth: 0.3,
        smoothMonotone: 'x',
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: colors.primary, width: 2.5 },
        itemStyle: { color: colors.primary },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(colors.primary, 35) },
              { offset: 1, color: withAlpha(colors.primary, 0) },
            ],
          },
        },
        data: data.map((d) => d.income),
      },
      {
        name: 'Expenses',
        type: 'line',
        smooth: 0.3,
        smoothMonotone: 'x',
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: colors.warning, width: 2 },
        itemStyle: { color: colors.warning },
        data: data.map((d) => d.expenses),
      },
    ],
  }

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: 240, width: '100%' }} notMerge />
}
