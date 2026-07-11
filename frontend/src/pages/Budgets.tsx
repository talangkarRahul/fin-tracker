import { useEffect, useState, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import { api, type Budget } from "../api"
import {
  Plus, X, Check, Pencil, Trash2, Wallet, CalendarDays,
  TrendingUp, TrendingDown, Landmark, AlertCircle,
} from "lucide-react"

const periodLabels: Record<string, string> = {
  monthly: "Monthly",
  annual: "Annual",
}

function emptyForm() {
  return { category: "", period: "monthly", limit_amount: 0, start_date: "", end_date: "" }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
      </div>
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 bg-muted rounded" />
        <div className="h-10 w-28 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-44 bg-muted rounded-xl" />)}
      </div>
    </div>
  )
}

function categoryIcon(cat: string) {
  const icons: Record<string, React.ReactNode> = {
    food: <TrendingDown size={18} />,
    rent: <Landmark size={18} />,
    groceries: <TrendingDown size={18} />,
    salary: <TrendingUp size={18} />,
    entertainment: <Wallet size={18} />,
    transport: <TrendingDown size={18} />,
    utilities: <Landmark size={18} />,
    shopping: <Wallet size={18} />,
  }
  return icons[cat.toLowerCase()] ?? <Wallet size={18} />
}

export default function Budgets() {
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<Budget>>(emptyForm())

  async function load() {
    try {
      setBudgets(await api.budgets.list())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setForm(emptyForm())
    setEditingId(null)
    setShowForm(false)
  }

  function openNew() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(b: Budget) {
    setForm({
      category: b.category,
      period: b.period,
      limit_amount: b.limit_amount,
      start_date: b.start_date,
      end_date: b.end_date ?? "",
    })
    setEditingId(b.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const payload = { ...form, end_date: form.end_date || null }
      if (editingId !== null) {
        await api.budgets.update(editingId, payload)
      } else {
        await api.budgets.create(payload)
      }
      resetForm()
      await load()
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.budgets.delete(id)
      await load()
    } catch {
      // ignore
    }
  }

  const summary = useMemo(() => {
    let totalLimit = 0
    let totalSpent = 0
    let totalRemaining = 0
    let exceeded = 0
    for (const b of budgets) {
      totalLimit += b.limit_amount
      totalSpent += b.spent
      totalRemaining += b.remaining
      if (b.pct >= 100) exceeded++
    }
    return { totalLimit, totalSpent, totalRemaining, count: budgets.length, exceeded }
  }, [budgets])

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your spending limits</p>
        </div>
        {!showForm && (
          <Button onClick={openNew}>
            <Plus size={15} className="mr-1.5" />
            New Budget
          </Button>
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Total Budget</p>
            <p className="text-base font-bold mt-0.5">{formatCurrency(summary.totalLimit)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{summary.count} budgets</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Total Spent</p>
            <p className="text-base font-bold mt-0.5 text-destructive">{formatCurrency(summary.totalSpent)}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Total Remaining</p>
            <p className={`text-base font-bold mt-0.5 ${summary.totalRemaining > 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(summary.totalRemaining)}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Over Budget</p>
            <p className={`text-base font-bold mt-0.5 ${summary.exceeded > 0 ? "text-destructive" : "text-success"}`}>
              {summary.exceeded} of {summary.count}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{editingId ? "Edit Budget" : "New Budget"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Category</label>
                <input type="text" value={form.category ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Period</label>
                <select value={form.period ?? "monthly"}
                  onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Limit Amount (₹)</label>
                <input type="number" min={0} step="0.01" value={form.limit_amount ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, limit_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Start Date</label>
                <input type="date" value={form.start_date ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">End Date</label>
                <input type="date" value={form.end_date ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm">
                  <Check size={14} className="mr-1" />
                  {editingId ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  <X size={14} className="mr-1" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {budgets.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Wallet size={32} className="text-muted-foreground/60" />
          </div>
          <p className="text-lg font-medium text-foreground">No budgets set</p>
          <p className="text-sm text-muted-foreground mt-1">Create a budget to start tracking your spending limits.</p>
          <Button onClick={openNew} className="mt-4">
            <Plus size={15} className="mr-1.5" />
            Create Budget
          </Button>
        </div>
      )}

      {/* Budget cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.map((b) => {
          const isExceeded = b.pct >= 100
          const isWarning = b.pct >= 80
          const barColor = isExceeded ? "bg-destructive" : isWarning ? "bg-warning" : "bg-primary"
          const gradientColor = isExceeded
            ? "from-destructive to-destructive/60"
            : isWarning
            ? "from-warning to-warning/60"
            : "from-primary to-primary/60"
          const dailyBudget = b.period === "monthly" ? b.limit_amount / 30 : b.limit_amount / 365

          return (
            <Card key={b.id} className="relative overflow-hidden hover:shadow-md transition-all group">
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${gradientColor} rounded-l-xl`} />
              <CardHeader className="pb-1 pt-4 px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isExceeded ? "bg-destructive/10 text-destructive" :
                      isWarning ? "bg-warning/10 text-warning" :
                      "bg-primary/10 text-primary"
                    }`}>
                      {categoryIcon(b.category)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold capitalize truncate">{b.category}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <CalendarDays size={10} className="mr-0.5" />
                          {periodLabels[b.period] ?? b.period}
                        </Badge>
                        {b.alert && (
                          <Badge variant={isExceeded ? "danger" : "warning"} className="text-[10px] px-1.5 py-0">
                            <AlertCircle size={10} className="mr-0.5" />
                            {b.alert}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 px-4 pb-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-foreground tabular-nums">{formatCurrency(b.spent)}</span>
                    <span className={`text-xs font-medium tabular-nums ${isExceeded ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground"}`}>
                      {Math.round(b.pct)}%
                    </span>
                  </div>
                  <Progress value={b.pct} className="h-1.5" barClassName={barColor} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Limit</p>
                    <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(b.limit_amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Remaining</p>
                    <p className={`text-xs font-semibold tabular-nums ${b.remaining > 0 ? "text-success" : "text-destructive"}`}>
                      {b.remaining > 0 ? formatCurrency(b.remaining) : "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Daily</p>
                    <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(Math.round(dailyBudget))}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)} className="h-7 text-[10px] px-2">
                    <Pencil size={11} className="mr-0.5" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)}
                    className="h-7 text-[10px] px-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                    <Trash2 size={11} className="mr-0.5" />
                    Delete
                  </Button>
                </div>
                {/* Always-visible mobile fallback */}
                <div className="flex gap-2 pt-0.5 sm:hidden">
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)} className="h-7 text-[10px] px-2">
                    <Pencil size={11} className="mr-0.5" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)}
                    className="h-7 text-[10px] px-2 text-destructive">
                    <Trash2 size={11} className="mr-0.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
