import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import { api, type Budget } from "../api"

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
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-24 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </div>
        <div className="h-10 w-28 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
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

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Budgets</h1>
          <p className="text-muted-foreground mt-1">Manage your spending limits</p>
        </div>
        {!showForm && <Button onClick={openNew}>New Budget</Button>}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Budget" : "New Budget"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <input
                  type="text"
                  value={form.category ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Period</label>
                <select
                  value={form.period ?? "monthly"}
                  onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Limit Amount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.limit_amount ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, limit_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.start_date ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                <input
                  type="date"
                  value={form.end_date ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {budgets.length === 0 && !showForm && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No budgets set</p>
          <p className="text-muted-foreground text-sm mt-1">Create a budget to start tracking your spending limits.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.map((b) => {
          const isExceeded = b.pct >= 100
          const isWarning = b.pct >= 80
          const barColor = isExceeded ? "bg-destructive" : isWarning ? "bg-warning" : "bg-primary"

          return (
            <Card key={b.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="!text-base !font-semibold !text-foreground !normal-case !tracking-normal">
                    {b.category}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{periodLabels[b.period] ?? b.period}</Badge>
                    {b.alert && (
                      <Badge variant={isExceeded ? "danger" : "warning"}>{b.alert}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">{formatCurrency(b.spent)}</span>
                    <span className="text-muted-foreground">{Math.round(b.pct)}%</span>
                  </div>
                  <Progress value={b.pct} className="h-2.5" barClassName={barColor} />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Limit</p>
                    <p className="font-medium text-foreground">{formatCurrency(b.limit_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Remaining</p>
                    <p className="font-medium text-foreground">{formatCurrency(b.remaining)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Period</p>
                    <p className="font-medium text-foreground capitalize">{periodLabels[b.period] ?? b.period}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(b.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
