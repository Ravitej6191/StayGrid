import { useState } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertTriangle, Banknote, Building2, ChevronRight, HandCoins, IndianRupee, Landmark, UserPlus } from 'lucide-react'
import { ChartCard } from '@/components/common/chart-card'
import { ErrorState } from '@/components/common/error-state'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDashboardData } from '@/features/dashboard/hooks/use-dashboard-data'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { QuickActions } from '@/features/dashboard/components/quick-actions'
import { IncomeExpenseChart } from '@/features/dashboard/components/income-expense-chart'
import type { DashboardRange } from '@/features/dashboard/types'
import { formatCurrency } from '@/utils/format'
import { getTimeOfDayGreeting } from '@/utils/greeting'
import { usePageTitle } from '@/hooks/use-page-title'
import { useAuth } from '@/providers/auth-provider'

const rangeOptions: { value: DashboardRange; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'fortnight', label: 'Last 15 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
]

export function DashboardPage() {
  usePageTitle('Jeevanam')
  const navigate = useNavigate()
  const [range, setRange] = useState<DashboardRange>('all')
  const { data, isLoading, isError, refetch } = useDashboardData(range)
  const { data: building } = useBuildingData()
  const { user } = useAuth()

  const greeting = getTimeOfDayGreeting()

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {greeting}
            {building?.building.ownerName ? `, ${building.building.ownerName.split(' ')[0]}` : user ? `, ${user.name.split(' ')[0]}` : ''}
          </h2>
          {building ? <p className="mt-0.5 text-sm text-muted-foreground">Here's how {building.building.name} is doing</p> : null}
        </div>

        <QuickActions
          onRecordPayment={() => navigate('/tenants/record-payment')}
          onRecordLoan={() => navigate('/loans/record-repayment')}
          onAddExpense={() => navigate('/expenses/new')}
          onBroadcast={() => navigate('/broadcast')}
        />

        {isError ? (
          <ErrorState title="Couldn't load dashboard" description="Please try again." onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <DashboardSkeleton />
        ) : building && building.floors.length === 0 ? (
          <SetupChecklist navigate={navigate} />
        ) : (
          <>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="grid grid-cols-3 gap-2.5"
            >
              {[
                { icon: IndianRupee, label: 'Income This Month', value: formatCurrency(data.stats.incomeThisMonth), tone: 'primary' as const },
                { icon: Banknote, label: 'Expense This Month', value: formatCurrency(data.stats.monthlyExpense), tone: 'warning' as const },
                { icon: AlertTriangle, label: 'Pending Rents', value: formatCurrency(data.stats.pendingRent), tone: 'danger' as const },
              ].map((stat) => (
                <motion.div key={stat.label} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                  <StatCard icon={stat.icon} label={stat.label} value={stat.value} tone={stat.tone} />
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="grid grid-cols-2 gap-2.5"
            >
              {[
                { icon: HandCoins, label: 'Loan Paid Till Now', value: formatCurrency(data.stats.loanPaidTillNow), tone: 'info' as const },
                { icon: Landmark, label: 'Outstanding (All Loans)', value: formatCurrency(data.stats.loanOutstanding), tone: 'danger' as const },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  onClick={() => navigate('/loans')}
                  className="cursor-pointer"
                >
                  <StatCard icon={stat.icon} label={stat.label} value={stat.value} tone={stat.tone} />
                </motion.div>
              ))}
            </motion.div>

            <ChartCard
              title="Income vs Expenses"
              action={
                <Select value={range} onValueChange={(value) => setRange(value as DashboardRange)}>
                  <SelectTrigger size="sm" className="w-[128px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {rangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              {data.trend.every((d) => d.income === 0 && d.expenses === 0) ? (
                <p className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                  No income or expenses recorded yet.
                </p>
              ) : (
                <IncomeExpenseChart data={data.trend} />
              )}
            </ChartCard>
          </>
        )}
      </div>
    </PullToRefresh>
  )
}

function SetupChecklist({ navigate }: { navigate: NavigateFunction }) {
  const steps = [
    {
      icon: Building2,
      label: 'Add a floor and your first house',
      description: 'Set up where your tenants will stay.',
      onClick: () => navigate('/building'),
    },
    {
      icon: UserPlus,
      label: 'Add your first tenant',
      description: 'Start tracking rent and deposits.',
      onClick: () => navigate('/tenants/new'),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-gradient-to-b from-primary/8 to-transparent p-4"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Get your property set up</p>
        <p className="mt-0.5 text-xs text-muted-foreground">A couple of quick steps before you can start tracking rent.</p>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <button
            key={step.label}
            type="button"
            onClick={step.onClick}
            className="press-scale group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-all duration-200 ease-[var(--ease-out-smooth)] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
              <step.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{step.label}</span>
              <span className="block text-xs text-muted-foreground">{step.description}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
