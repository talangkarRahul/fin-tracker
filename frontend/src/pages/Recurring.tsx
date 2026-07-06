import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import { api, type RecurringItem } from "../api"


function formatFrequency(freq: string, interval: number) {
  if (interval === 1) return freq.charAt(0).toUpperCase() + freq.slice(1)
  const labels: Record<string, string> = { daily: "days", weekly: "weeks", monthly: "months", yearly: "years" }
  return `Every ${interval} ${labels[freq] || freq}`
}

function formatDate(date: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString()
}

const emptyForm = { description: "", category: "", amount: 0, frequency: "monthly", interval: 1, next_run: "", end_date: "" }

export default function Recurring() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RecurringItem | null>(null)
  const [form, setForm] = useState(emptyForm)

  function load() {
    setLoading(true)
    api.recurring.list().then(setItems).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setForm(emptyForm)
    setShowForm(false)
    setEditing(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, amount: Number(form.amount), interval: Number(form.interval) }
    if (editing) {
      await api.recurring.update(editing.id, payload)
    } else {
      await api.recurring.create(payload)
    }
    resetForm()
    load()
  }

  async function handleEdit(item: RecurringItem) {
    setEditing(item)
    setForm({
      description: item.description,
      category: item.category || "",
      amount: item.amount,
      frequency: item.frequency,
      interval: item.interval,
      next_run: item.next_run,
      end_date: item.end_date || "",
    })
    setShowForm(true)
  }

  async function handleDelete(id: number) {
    await api.recurring.delete(id)
    load()
  }

  async function handleToggle(id: number) {
    await api.recurring.toggle(id)
    load()
  }

  async function handleProcess() {
    const result = await api.recurring.process()
    alert(`Processed ${result.processed} recurring item(s)`)
    load()
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-72 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recurring</h1>
          <p className="text-muted-foreground mt-1">Manage recurring transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleProcess}>Process Due</Button>
          <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
            {showForm ? "Cancel" : "New Recurring"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Recurring" : "New Recurring"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount (negative = expense)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Interval</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.interval}
                  onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Next Run</label>
                <input
                  type="date"
                  required
                  value={form.next_run}
                  onChange={(e) => setForm({ ...form, next_run: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit">{editing ? "Update" : "Create"}</Button>
                <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-5">No recurring items yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 font-medium text-muted-foreground">Description</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Frequency</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Next Run</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Last Run</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-5 py-3 text-foreground">{item.description}</td>
                      <td className="px-5 py-3 text-muted-foreground">{item.category || "—"}</td>
                      <td className={`px-5 py-3 font-medium ${item.amount < 0 ? "text-destructive" : "text-success"}`}>
                        {item.amount < 0 ? "-" : "+"}{formatCurrency(item.amount)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{formatFrequency(item.frequency, item.interval)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(item.next_run)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(item.last_run)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={item.active ? "success" : "secondary"}>
                          {item.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant={item.active ? "outline" : "success"} onClick={() => handleToggle(item.id)}>
                            {item.active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>Edit</Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive/80" onClick={() => handleDelete(item.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
