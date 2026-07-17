import { useState } from 'react'
import { AlertTriangle, Banknote, BedDouble, DoorOpen, IndianRupee, ShieldAlert } from 'lucide-react'
import { ChartCard } from '@/components/common/chart-card'
import { ErrorState } from '@/components/common/error-state'
import { PullToRefresh } from '@/components/common/pull-to-refresh'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardData } from '@/features/dashboard/hooks/use-dashboard-data'
import { useBuildingData } from '@/features/building/hooks/use-building-data'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { QuickActions } from '@/features/dashboard/components/quick-actions'
import { IncomeExpenseChart } from '@/features/dashboard/components/income-expense-chart'
import { AddTenantSheet } from '@/features/tenants/components/add-tenant-sheet'
import { RecordPaymentSheet } from '@/features/tenants/components/record-payment-sheet'
import { AddExpenseSheet } from '@/features/expenses/components/add-expense-sheet'
import { BroadcastSheet } from '@/features/broadcast/components/broadcast-sheet'
import { formatCurrency } from '@/utils/format'
import { getTimeOfDayGreeting } from '@/utils/greeting'
import { usePageTitle } from '@/hooks/use-page-title'
import { useAuth } from '@/providers/auth-provider'

export function DashboardPage() {
  usePageTitle('StayGrid')
  const { data, isLoading, isError, refetch } = useDashboardData()
  const { data: building } = useBuildingData()
  const { user } = useAuth()
  const [addTenantOpen, setAddTenantOpen] = useState(false)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)

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
          onRecordPayment={() => setRecordPaymentOpen(true)}
          onAddTenant={() => setAddTenantOpen(true)}
          onAddExpense={() => setAddExpenseOpen(true)}
          onBroadcast={() => setBroadcastOpen(true)}
        />

        {isError ? (
          <ErrorState title="Couldn't load dashboard" description="Please try again." onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard icon={IndianRupee} label="Income This Month" value={formatCurrency(data.stats.incomeThisMonth)} tone="primary" />
              <StatCard icon={Banknote} label="Expense This Month" value={formatCurrency(data.stats.monthlyExpense)} tone="warning" />
              <StatCard icon={AlertTriangle} label="Pending Rents" value={formatCurrency(data.stats.pendingRent)} tone="danger" />
              <StatCard icon={DoorOpen} label="Occupancy" value={`${data.stats.occupancyPercent}%`} tone="info" />
              <StatCard icon={BedDouble} label="Vacant Beds" value={String(data.stats.vacantCount)} tone="neutral" />
              <StatCard icon={ShieldAlert} label="Pending Deposits" value={String(data.stats.pendingDepositsCount)} tone="danger" />
            </div>

            <ChartCard title="Income vs Expenses" description="All time">
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

        <AddTenantSheet open={addTenantOpen} onOpenChange={setAddTenantOpen} />
        <RecordPaymentSheet open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen} />
        <AddExpenseSheet open={addExpenseOpen} onOpenChange={setAddExpenseOpen} />
        <BroadcastSheet open={broadcastOpen} onOpenChange={setBroadcastOpen} />
      </div>
    </PullToRefresh>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
