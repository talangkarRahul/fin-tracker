import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Progress } from "../components/ui/progress"
import { formatCurrency } from "../lib/format"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))",
  "hsl(var(--chart-7))", "hsl(var(--chart-8))",
]

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => <div key={i} className="h-72 bg-muted rounded-xl" />)}
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
  const [overview, setOverview] = useState<any>(null)
  const [dateRange, setDateRange] = useState({ dateFrom: "", dateTo: "" })
  const [monthly, setMonthly] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [budgetVsActual, setBudgetVsActual] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const df = dateRange.dateFrom || undefined
      const dt = dateRange.dateTo || undefined

      const params = new URLSearchParams()
      if (df) params.set("date_from", df)
      if (dt) params.set("date_to", dt)
      const qs = params.toString()

      const [overviewRes, monthlyRes, catRes, trendRes, bvaRes] = await Promise.all([
        fetch(`/api/dashboard/overview${qs ? `?${qs}` : ""}`).then((r) => r.json()),
        fetch(`/api/reports/monthly?months=12${qs ? `&${qs}` : ""}`).then((r) => r.json()),
        fetch(`/api/reports/category${qs ? `?${qs}` : ""}`).then((r) => r.json()),
        fetch(`/api/reports/trends?months=6${qs ? `&${qs}` : ""}`).then((r) => r.json()),
        fetch(`/api/reports/budget-vs-actual${qs ? `?${qs}` : ""}`).then((r) => r.json()),
      ])

      setOverview(overviewRes)
      setMonthly(monthlyRes)
      setCategories(catRes)
      setTrends(trendRes)
      setBudgetVsActual(bvaRes)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSkeleton />
  if (!overview) return null

  const { summary, net_worth, health_score, emergency_fund, retirement, investments, insurance, goals, budgets } = overview
  const topBudgets = (budgets || []).slice(0, 4)
  const topGoals = (goals || []).filter((g: any) => !g.achieved).slice(0, 4)
  const netWorthVal = net_worth?.net_worth ?? 0
  const healthScoreVal = health_score?.score ?? 0
  const healthColor = health_score?.color ?? "muted"
  const efMonths = emergency_fund?.months_covered ?? 0
  const efTarget = emergency_fund?.target_months ?? 6
  const retirePct = retirement?.pct ?? 0
  const invGainPct = investments?.gain_pct ?? 0
  const insCover = insurance?.total_cover ?? 0

  const healthBadgeClass = healthColor === "success" ? "bg-success/10 text-success" :
    healthColor === "primary" ? "bg-primary/10 text-primary" :
    healthColor === "warning" ? "bg-warning/10 text-warning" :
    "bg-destructive/10 text-destructive"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your financial overview at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm bg-card border border-border rounded-xl px-3 py-1.5">
            <span className="text-muted-foreground text-xs">From</span>
            <input type="date" value={dateRange.dateFrom} onChange={(e) => setDateRange({ ...dateRange, dateFrom: e.target.value })}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-28" />
            <span className="text-muted-foreground text-xs">To</span>
            <input type="date" value={dateRange.dateTo} onChange={(e) => setDateRange({ ...dateRange, dateTo: e.target.value })}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-28" />
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setDateRange({ dateFrom: "", dateTo: "" })}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Row 1: Core Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Net Worth</p>
            <p className={`text-xl font-bold ${netWorthVal >= 0 ? "text-foreground" : "text-destructive"}`}>
              {formatCurrency(netWorthVal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Health Score</p>
            <p className={`text-xl font-bold ${healthBadgeClass.split(" ")[1]}`}>{Math.round(healthScoreVal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Emergency Fund</p>
            <p className="text-xl font-bold text-foreground">{efMonths} <span className="text-sm font-normal text-muted-foreground">/ {efTarget} mo</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Retirement</p>
            <p className={`text-xl font-bold ${retirePct >= 100 ? "text-success" : "text-foreground"}`}>{Math.round(retirePct)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Income/Expenses + Investments + Insurance + Savings Rate */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-base font-bold text-success">{formatCurrency(summary?.income || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-base font-bold text-destructive">{formatCurrency(summary?.expenses || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Investments</p>
            <p className={`text-base font-bold ${invGainPct >= 0 ? "text-success" : "text-destructive"}`}>
              {invGainPct >= 0 ? "+" : ""}{invGainPct}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Insurance Cover</p>
            <p className="text-base font-bold text-foreground">{formatCurrency(insCover)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Budgets + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Budgets</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {topBudgets.length === 0 && <p className="text-sm text-muted-foreground">No budgets set</p>}
            {topBudgets.map((b: any) => (
              <div key={b.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{b.category}</span>
                  <span className="text-muted-foreground text-xs">{formatCurrency(b.spent)} / {formatCurrency(b.limit_amount)}</span>
                </div>
                <Progress value={percentFor(b.spent, b.limit_amount)} className="h-2" barClassName={b.alert === "exceeded" ? "bg-destructive" : b.alert === "warning" ? "bg-warning" : "bg-primary"} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Goals</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {topGoals.length === 0 && <p className="text-sm text-muted-foreground">No goals in progress</p>}
            {topGoals.map((g: any) => (
              <div key={g.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{g.name}</span>
                  <span className="text-muted-foreground text-xs">{formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}</span>
                </div>
                <Progress value={g.progress.pct} className="h-2" barClassName={g.achieved ? "bg-success" : "bg-primary"} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Monthly Summary</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly} barGap={4}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="income" fill="hsl(var(--chart-1))" name="Income" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expenses" fill="hsl(var(--chart-6))" name="Expenses" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {categories.map((_: any, idx: number) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Budget vs Actual</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetVsActual} barGap={4}>
                <XAxis dataKey="category" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="limit" fill="hsl(var(--chart-1))" name="Budget" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="spent" fill="hsl(var(--chart-2))" name="Actual" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Spending Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 13 }} />
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
