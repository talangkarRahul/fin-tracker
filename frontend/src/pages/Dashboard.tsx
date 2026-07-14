import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area,
} from "recharts"
import {
  Wallet, Heart, Siren, PiggyBank, TrendingUp, TrendingDown,
  Shield, ArrowUpRight, ArrowDownRight, Sparkles, ChevronRight,
  Layers,
} from "lucide-react"

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))",
  "hsl(var(--chart-7))", "hsl(var(--chart-8))",
]

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
  fontSize: 13,
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-muted rounded-xl" />
        <div className="h-72 bg-muted rounded-xl" />
      </div>
    </div>
  )
}

function percentFor(actual: number, max: number) {
  if (max <= 0) return 0
  return Math.min((actual / max) * 100, 100)
}

function HealthGauge({ score }: { score: number }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color =
    score >= 80 ? "hsl(var(--chart-1))" :
    score >= 60 ? "hsl(var(--chart-3))" :
    score >= 40 ? "hsl(var(--chart-5))" :
    "hsl(var(--chart-7))"
  return (
    <svg width={86} height={86} viewBox="0 0 86 86" className="shrink-0">
      <circle cx="43" cy="43" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={7} />
      <circle cx="43" cy="43" r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 43 43)" style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="43" y="46" textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize={20} fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(score)}</text>
    </svg>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [dateRange, setDateRange] = useState({ dateFrom: "", dateTo: "" })
  const [monthly, setMonthly] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [budgetVsActual, setBudgetVsActual] = useState<any[]>([])
  const [recentTxns, setRecentTxns] = useState<any[]>([])
  const [groupData, setGroupData] = useState<any[]>([])

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

      const safe = (p: Promise<any>) => p.catch(() => null)

      const [overviewRes, monthlyRes, catRes, trendRes, bvaRes, txnRes, groupRes] = await Promise.all([
        safe(fetch(`/api/dashboard/overview${qs ? `?${qs}` : ""}`).then((r) => r.json())),
        safe(fetch(`/api/reports/monthly?months=12${qs ? `&${qs}` : ""}`).then((r) => r.json())),
        safe(fetch(`/api/reports/category${qs ? `?${qs}` : ""}`).then((r) => r.json())),
        safe(fetch(`/api/reports/trends?months=6${qs ? `&${qs}` : ""}`).then((r) => r.json())),
        safe(fetch(`/api/reports/budget-vs-actual${qs ? `?${qs}` : ""}`).then((r) => r.json())),
        safe(fetch(`/api/transactions`).then((r) => r.json())),
        safe(fetch(`/api/reports/group${qs ? `?${qs}` : ""}`).then((r) => r.json())),
      ])

      setOverview(overviewRes)
      setMonthly(monthlyRes)
      setCategories(catRes)
      setTrends(trendRes)
      setBudgetVsActual(bvaRes)
      setRecentTxns((txnRes || []).slice(0, 8))
      setGroupData(groupRes || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSkeleton />
  if (!overview) return null

  const { summary, net_worth, health_score, emergency_fund, retirement, investments, insurance, goals, budgets, savings_rate } = overview
  const topBudgets = (budgets || []).slice(0, 4)
  const topGoals = (goals || []).filter((g: any) => !g.achieved).slice(0, 4)
  const netWorthVal = net_worth?.net_worth ?? 0
  const netWorthHistory = net_worth?.history ?? []
  const healthScoreVal = health_score?.score ?? 0
  const healthColor = health_score?.color ?? "muted"
  const efMonths = emergency_fund?.months_covered ?? 0
  const efTarget = emergency_fund?.target_months ?? 6
  const efPct = emergency_fund?.pct ?? 0
  const retirePct = retirement?.pct ?? 0
  const invGainPct = investments?.gain_pct ?? 0
  const insCover = insurance?.total_cover ?? 0
  const income = summary?.income || 0
  const expenses = summary?.expenses || 0
  const savingsVal = summary?.savings || 0
  const savingsRateVal = savings_rate?.rate ?? (income > 0 ? (savingsVal / income) * 100 : 0)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your financial overview at a glance</p>
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
        <Card className="relative overflow-hidden hover:shadow-md transition-shadow group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-l-xl" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Net Worth</p>
                <p className={`text-xl font-bold mt-0.5 ${netWorthVal >= 0 ? "text-foreground" : "text-destructive"}`}>
                  {formatCurrency(netWorthVal)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                <Wallet size={20} />
              </div>
            </div>
            {netWorthHistory.length > 1 && (
              <div className="mt-2 h-8">
                <ResponsiveContainer width="100%" height={32}>
                  <AreaChart data={netWorthHistory}>
                    <defs>
                      <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="net_worth" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#nwGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-md transition-shadow group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-emerald-600 rounded-l-xl" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Health Score</p>
                <p className={`text-sm font-bold mt-0.5 ${healthColor === "success" ? "text-success" : healthColor === "primary" ? "text-primary" : healthColor === "warning" ? "text-warning" : "text-destructive"}`}>
                  {health_score?.rating ?? "N/A"}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500 group-hover:scale-110 transition-transform">
                <Heart size={20} />
              </div>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <HealthGauge score={healthScoreVal} />
              <div className="space-y-1 flex-1 min-w-0">
                {health_score?.components && Object.entries(health_score.components).slice(0, 3).map(([k, v]: any) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate mr-1">{v.label}</span>
                    <span className="font-medium tabular-nums">{Math.round(v.score)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-md transition-shadow group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-600 rounded-l-xl" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Emergency Fund</p>
                <p className="text-xl font-bold mt-0.5">{efMonths} <span className="text-sm font-normal text-muted-foreground">/ {efTarget} mo</span></p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                <Siren size={20} />
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(emergency_fund?.current_amount || 0)}</span>
                <span>{formatCurrency(emergency_fund?.target_amount || 0)}</span>
              </div>
              <Progress value={efPct} className="h-1.5" barClassName="bg-gradient-to-r from-amber-500 to-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-md transition-shadow group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-violet-600 rounded-l-xl" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Retirement</p>
                <p className={`text-xl font-bold mt-0.5 ${retirePct >= 100 ? "text-success" : "text-foreground"}`}>
                  {Math.round(retirePct)}%
                </p>
                {retirement?.corpus_needed && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Need {formatCurrency(retirement.corpus_needed)}
                  </p>
                )}
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                <PiggyBank size={20} />
              </div>
            </div>
            <Progress value={retirePct} className="mt-3 h-1.5" barClassName="bg-gradient-to-r from-purple-500 to-violet-500" />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Income / Expenses / Savings Rate + Investments + Insurance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow group">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-base font-bold text-success mt-0.5">{formatCurrency(income)}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-success/10 text-success group-hover:scale-110 transition-transform">
                <TrendingUp size={18} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow group">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-base font-bold text-destructive mt-0.5">{formatCurrency(expenses)}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive group-hover:scale-110 transition-transform">
                <TrendingDown size={18} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow group">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Savings Rate</p>
                <p className={`text-base font-bold mt-0.5 ${savingsRateVal >= 20 ? "text-success" : savingsRateVal >= 10 ? "text-warning" : "text-destructive"}`}>
                  {savingsRateVal.toFixed(1)}%
                </p>
              </div>
              <div className={`p-1.5 rounded-lg group-hover:scale-110 transition-transform ${savingsRateVal >= 20 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                <Sparkles size={18} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow group">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Insurance Cover</p>
                <p className="text-base font-bold mt-0.5">{formatCurrency(insCover)}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Shield size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2b: Investments Gain */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow group md:col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Investments Gain</p>
                <p className={`text-base font-bold mt-0.5 ${invGainPct >= 0 ? "text-success" : "text-destructive"}`}>
                  {invGainPct >= 0 ? "+" : ""}{invGainPct}%
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({formatCurrency(investments?.gain || 0)})
                  </span>
                </p>
              </div>
              <div className={`p-1.5 rounded-lg group-hover:scale-110 transition-transform ${invGainPct >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                <TrendingUp size={18} />
              </div>
            </div>
            {investments?.total_invested > 0 && (
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground border-t border-border pt-2">
                <span>Invested: {formatCurrency(investments.total_invested)}</span>
                <span>Current: {formatCurrency(investments.total_current)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow md:col-span-2">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground font-medium">Recent Transactions</p>
              <a href="/transactions" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                View all <ChevronRight size={12} />
              </a>
            </div>
            <div className="mt-2 space-y-2">
              {recentTxns.length === 0 && <p className="text-xs text-muted-foreground">No transactions yet</p>}
              {recentTxns.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded-md ${tx.amount > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {tx.amount > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-[180px]">{tx.description || "Untitled"}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.date} · {tx.category}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums ${tx.amount > 0 ? "text-success" : "text-destructive"}`}>
                    {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Budgets + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Budgets</CardTitle>
              <a href="/budgets" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                Manage <ChevronRight size={12} />
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {topBudgets.length === 0 && <p className="text-sm text-muted-foreground">No budgets set</p>}
            {topBudgets.map((b: any) => (
              <div key={b.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground capitalize">{b.category}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{formatCurrency(b.spent)} / {formatCurrency(b.limit_amount)}</span>
                </div>
                <Progress value={percentFor(b.spent, b.limit_amount)} className="h-2"
                  barClassName={b.alert === "exceeded" ? "bg-destructive" : b.alert === "warning" ? "bg-warning" : "bg-primary"} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Goals</CardTitle>
              <a href="/goals" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                Manage <ChevronRight size={12} />
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {topGoals.length === 0 && <p className="text-sm text-muted-foreground">No goals in progress</p>}
            {topGoals.map((g: any) => (
              <div key={g.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{g.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{formatCurrency(g.current_amount + (g.invested_via_goal || 0))} / {formatCurrency(g.target_amount)}</span>
                </div>
                <Progress value={g.progress.pct} className="h-2" barClassName={g.achieved ? "bg-success" : "bg-primary"} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-success to-success/60 rounded-l-xl" />
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Monthly Summary</CardTitle>
              {monthly.length > 1 && (() => {
                const latest = monthly[monthly.length - 1]
                const prev = monthly[monthly.length - 2]
                const incomeChange = prev?.income ? ((latest.income - prev.income) / prev.income * 100) : 0
                const expChange = prev?.expenses ? ((latest.expenses - prev.expenses) / prev.expenses * 100) : 0
                return (
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1">
                      <TrendingUp size={10} className="text-success" />
                      <span className="text-success font-medium">+{Math.round(incomeChange)}%</span>
                      <span className="text-muted-foreground">income</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown size={10} className="text-destructive" />
                      <span className="text-destructive font-medium">{expChange >= 0 ? "+" : ""}{Math.round(expChange)}%</span>
                      <span className="text-muted-foreground">exp</span>
                    </span>
                  </div>
                )
              })()}
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly} barGap={6} barCategoryGap="20%">
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-6))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--chart-6))" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [formatCurrency(Number(value))]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" fill="url(#incomeGrad)" name="Income" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive animationDuration={600} animationEasing="ease-out" />
                <Bar dataKey="expenses" fill="url(#expenseGrad)" name="Expenses" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive animationDuration={600} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-warning to-warning/60 rounded-l-xl" />
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
              <span className="text-[10px] text-muted-foreground">{categories.length} categories</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {categories.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-xs text-muted-foreground">No data for this period</div>
            ) : (
              <>
                {/* Center total */}
                <div className="text-center -mb-10 relative z-10">
                  <p className="text-xs text-muted-foreground">Total Spending</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {formatCurrency(categories.reduce((s: number, c: any) => s + c.amount, 0))}
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%" cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={2}
                      isAnimationActive
                      animationDuration={600}
                      animationEasing="ease-out"
                    >
                      {categories.map((_: any, idx: number) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: any, name: any) => {
                        const total = categories.reduce((s: number, c: any) => s + c.amount, 0)
                        const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0"
                        return [`${formatCurrency(Number(value))} (${pct}%)`, name]
                      }}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingLeft: 8 }}
                      formatter={(value: string) => (
                        <span className="text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Group Breakdown — Compact progress bars */}
      {groupData.length > 0 && (() => {
        const total = groupData.reduce((s: number, c: any) => s + c.amount, 0)
        const groupMeta: Record<string, { label: string; target: number; color: string; bg: string }> = {
          NEEDS: { label: "Needs", target: 50, color: "bg-emerald-500", bg: "bg-emerald-500/10" },
          WANTS: { label: "Wants", target: 30, color: "bg-amber-500", bg: "bg-amber-500/10" },
          INVESTMENT: { label: "Investment", target: 20, color: "bg-blue-500", bg: "bg-blue-500/10" },
          NOT_APPLICABLE: { label: "Not Applicable", target: 0, color: "bg-gray-400", bg: "bg-gray-400/10" },
        }
        const sorted = [...groupData].sort((a: any, b: any) => b.amount - a.amount)
        return (
          <Card className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-chart-2 to-chart-2/60 rounded-l-xl" />
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers size={14} />
                  50/30/20 Breakdown
                </CardTitle>
                <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(total)}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4 space-y-3">
              {sorted.map((entry: any) => {
                const meta = groupMeta[entry.group] || { label: entry.group, target: 0, color: "bg-gray-400", bg: "bg-gray-400/10" }
                const pct = total > 0 ? (entry.amount / total) * 100 : 0
                const diff = pct - meta.target
                return (
                  <div key={entry.group} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${meta.color}`} />
                        <span className="font-medium text-foreground">{meta.label}</span>
                        {meta.target > 0 && (
                          <span className="text-muted-foreground/60 text-[10px]">target {meta.target}%</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="text-muted-foreground">{formatCurrency(entry.amount)}</span>
                        <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
                        {meta.target > 0 && (
                          <span className={`text-[10px] ${diff > 5 ? "text-destructive" : diff < -5 ? "text-warning" : "text-success"}`}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${meta.color}`}
                        style={{ width: `${pct}%` }}
                      />
                      {meta.target > 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                          style={{ left: `${meta.target}%` }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
              <p className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border/50">
                Vertical line on each bar shows the 50/30/20 target percentage.
              </p>
            </CardContent>
          </Card>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-xl" />
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Budget vs Actual</CardTitle>
              {budgetVsActual.length > 0 && (() => {
                const over = budgetVsActual.filter((b: any) => b.spent > b.limit).length
                return (
                  <span className={`text-[10px] font-medium ${over > 0 ? "text-destructive" : "text-success"}`}>
                    {over > 0 ? `${over} over budget` : "On track"}
                  </span>
                )
              })()}
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {budgetVsActual.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-xs text-muted-foreground">No budgets set</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={budgetVsActual} barGap={6} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [formatCurrency(Number(value))]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="limit" fill="url(#budgetGrad)" name="Budget" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive animationDuration={600} animationEasing="ease-out" />
                  <Bar dataKey="spent" name="Actual" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive animationDuration={600} animationEasing="ease-out">
                    {budgetVsActual.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.spent > entry.limit ? "hsl(var(--destructive))" : "hsl(var(--success))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-chart-4 to-chart-4/60 rounded-l-xl" />
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Spending Trends</CardTitle>
              {trends.length > 1 && (() => {
                const first = trends[0]
                const last = trends[trends.length - 1]
                const change = first?.amount ? ((last.amount - first.amount) / first.amount * 100) : 0
                return (
                  <span className={`text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${change <= 0 ? "badge-positive" : "badge-negative"}`}>
                    {change <= 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                    {Math.abs(change).toFixed(0)}% vs start
                  </span>
                )
              })()}
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {trends.length < 2 ? (
              <div className="flex items-center justify-center h-[280px] text-xs text-muted-foreground">More data points needed</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trends}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [formatCurrency(Number(value)), "Spending"]} />
                  <Area type="monotone" dataKey="amount" fill="url(#trendGrad)" stroke="transparent" isAnimationActive animationDuration={600} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-4))" strokeWidth={2.5} name="Spending" dot={{ r: 3, fill: "hsl(var(--chart-4))", strokeWidth: 0 }} activeDot={{ r: 5, fill: "hsl(var(--chart-4))", strokeWidth: 2, stroke: "hsl(var(--background))" }} isAnimationActive animationDuration={600} animationEasing="ease-out" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
