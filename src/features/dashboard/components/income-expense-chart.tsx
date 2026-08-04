import ReactEChartsCore from 'echarts-for-react/esm/core'
import { echarts } from '@/lib/echarts-core'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { formatCurrency } from '@/utils/format'
import type { IncomeExpenseTrendPoint } from '../types'

function compactCurrency(value: number): string {
  if (value <= 0) return ''
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(value % 100_000 === 0 ? 0 : 1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return `₹${value}`
}

function SummaryStat({ label, value, dotClassName }: { label: string; value: number; dotClassName: string }) {
  return (
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${dotClassName}`} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="font-numeric text-lg leading-none font-semibold text-foreground">{formatCurrency(value)}</p>
    </div>
  )
}

export function IncomeExpenseChart({ data }: { data: IncomeExpenseTrendPoint[] }) {
  const colors = useThemeColors()

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0)
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0)
  const showLabels = data.length <= 8

  const option = {
    animation: false,
    grid: { left: 4, right: 4, top: showLabels ? 28 : 12, bottom: 24, containLabel: true },
    legend: { show: false },
    tooltip: { show: false },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: data.map((d) => d.label),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors['muted-foreground'], fontSize: 11, fontWeight: 500 },
      axisTick: { show: false },
    },
    yAxis: {
      show: false,
      type: 'value',
      splitLine: { show: true, lineStyle: { color: colors.border, type: 'dashed', opacity: 0.5 } },
    },
    series: [
      {
        name: 'Income',
        type: 'bar',
        barMaxWidth: 16,
        barGap: '30%',
        itemStyle: { borderRadius: [5, 5, 0, 0], color: colors.primary },
        label: {
          show: showLabels,
          position: 'top',
          formatter: (p: { value: number }) => compactCurrency(p.value),
          color: colors['muted-foreground'],
          fontSize: 9.5,
          fontWeight: 600,
        },
        emphasis: { disabled: true },
        data: data.map((d) => d.income),
      },
      {
        name: 'Expenses',
        type: 'bar',
        barMaxWidth: 16,
        barGap: '30%',
        itemStyle: { borderRadius: [5, 5, 0, 0], color: colors.warning },
        label: {
          show: showLabels,
          position: 'top',
          formatter: (p: { value: number }) => compactCurrency(p.value),
          color: colors['muted-foreground'],
          fontSize: 9.5,
          fontWeight: 600,
        },
        emphasis: { disabled: true },
        data: data.map((d) => d.expenses),
      },
    ],
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-lg bg-muted/40 px-3.5 py-3">
        <SummaryStat label="Income" value={totalIncome} dotClassName="bg-primary" />
        <div className="h-8 w-px bg-border" />
        <SummaryStat label="Expenses" value={totalExpenses} dotClassName="bg-warning" />
      </div>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: 220, width: '100%' }} notMerge />
    </div>
  )
}
