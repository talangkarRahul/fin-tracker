import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"

import { Progress } from "../components/ui/progress"
import { formatCurrency } from "../lib/format"
import { api, type Goal, type Budget, type MonthlyRow, type CategoryRow, type TrendPoint, type BudgetVsActual } from "../api"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
]

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-72 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}


function percentFor(actual: number, max: number) {
  if (max <= 0) return 0
  return Math.min((actual / max) * 100, 100)
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<{ income: number; expenses: number; savings: number } | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [monthly, setMonthly] = useState<MonthlyRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual[]>([])
  const [dateRange, setDateRange] = useState({ dateFrom: "", dateTo: "" })

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const df = dateRange.dateFrom || undefined
      const dt = dateRange.dateTo || undefined
      const [summaryData, goalsData, budgetsData, monthlyData, categoriesData, trendsData, bvaData] = await Promise.all([
        api.summary(df, dt),
        api.goals.list(),
        api.budgets.list(),
        api.reports.monthly(12, df, dt),
        api.reports.category(undefined, df, dt),
        api.reports.trends(6, undefined, df, dt),
        api.reports.budgetVsActual(df, dt),
      ])
      setSummary(summaryData)
      setGoals(goalsData)
      setBudgets(budgetsData)
      setMonthly(monthlyData)
      setCategories(categoriesData)
      setTrends(trendsData)
      setBudgetVsActual(bvaData)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSkeleton />

  const topBudgets = budgets.slice(0, 4)
  const topGoals = goals.slice(0, 4)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your financial overview at a glance</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs">From</span>
          <input type="date" value={dateRange.dateFrom} onChange={(e) => setDateRange({ ...dateRange, dateFrom: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-muted-foreground text-xs">To</span>
          <input type="date" value={dateRange.dateTo} onChange={(e) => setDateRange({ ...dateRange, dateTo: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Button size="sm" variant="ghost" onClick={() => setDateRange({ dateFrom: "", dateTo: "" })}>
          All Time
        </Button>
        {(dateRange.dateFrom || dateRange.dateTo) && (
          <span className="text-xs text-muted-foreground">Filtered</span>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(summary.income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(summary.expenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.savings)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Budgets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topBudgets.length === 0 && (
              <p className="text-sm text-muted-foreground">No budgets set</p>
            )}
            {topBudgets.map((b) => (
              <div key={b.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{b.category}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(b.spent)} / {formatCurrency(b.limit_amount)}
                  </span>
                </div>
                <Progress value={percentFor(b.spent, b.limit_amount)} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topGoals.length === 0 && (
              <p className="text-sm text-muted-foreground">No goals set</p>
            )}
            {topGoals.map((g) => (
              <div key={g.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{g.name}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}
                  </span>
                </div>
                <Progress value={percentFor(g.current_amount, g.target_amount)} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly} barGap={4}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="income" fill="hsl(var(--chart-1))" name="Income" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expenses" fill="hsl(var(--chart-6))" name="Expenses" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                >
                  {categories.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetVsActual} barGap={4}>
                <XAxis dataKey="category" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="limit" fill="hsl(var(--chart-1))" name="Budget" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="spent" fill="hsl(var(--chart-2))" name="Actual" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-4))" name="Spending" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--chart-4))" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
