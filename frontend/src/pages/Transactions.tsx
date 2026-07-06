import { useEffect, useState, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import ImportCSVDialog from "../components/ImportCSVDialog"
import { formatCurrency } from "../lib/format"
import { api, type Transaction } from "../api"


function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-muted rounded-lg w-64" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  )
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [form, setForm] = useState({ date: "", description: "", amount: "", category: "", transaction_type: "expense" })
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", type: "all", category: "all" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ date: "", description: "", amount: "", category: "", transaction_type: "expense" })
  async function load() {
    setLoading(true)
    try {
      const data = await api.transactions()
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date || !form.amount) return
    await api.createTransaction({
      date: form.date,
      description: form.description || undefined,
      amount: parseFloat(form.amount),
      category: form.category || undefined,
      transaction_type: form.transaction_type,
    })
    setForm({ date: "", description: "", amount: "", category: "", transaction_type: "expense" })
    setShowForm(false)
    await load()
  }

  async function handleDelete(id: number) {
    await api.deleteTransaction(id)
    await load()
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id)
    setEditForm({
      date: tx.date,
      description: tx.description || "",
      amount: String(Math.abs(tx.amount)),
      category: tx.category || "",
      transaction_type: tx.amount < 0 ? "expense" : "income",
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleUpdate(id: number) {
    if (!editForm.date || !editForm.amount) return
    await api.updateTransaction(id, {
      date: editForm.date,
      description: editForm.description || undefined,
      amount: parseFloat(editForm.amount),
      category: editForm.category || undefined,
      transaction_type: editForm.transaction_type,
    })
    setEditingId(null)
    await load()
  }

  const categories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category).filter(Boolean))
    return ["all", ...Array.from(set).sort()]
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filters.type !== "all") {
        const isExpense = t.amount < 0
        if (filters.type === "income" && isExpense) return false
        if (filters.type === "expense" && !isExpense) return false
      }
      if (filters.category !== "all" && t.category !== filters.category) return false
      if (filters.dateFrom && t.date < filters.dateFrom) return false
      if (filters.dateTo && t.date > filters.dateTo) return false
      return true
    })
  }, [transactions, filters])

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">View, add, and import your financial transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            Import CSV
          </Button>
          <Button onClick={() => { setShowForm(!showForm); setForm({ date: "", description: "", amount: "", category: "", transaction_type: "expense" }) }}>
            {showForm ? "Cancel" : "Add Transaction"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Transaction</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount</label>
                <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                <select value={form.transaction_type} onChange={(e) => {
                  const val = e.target.value
                  setForm({ ...form, transaction_type: val })
                  if (val === "expense" && form.amount && parseFloat(form.amount) < 0) return
                  if (val === "income" && form.amount && parseFloat(form.amount) > 0) return
                }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-5">
                <Button type="submit">Add Transaction</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Transactions</CardTitle>
            <span className="text-xs text-muted-foreground">{filtered.length} of {transactions.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs">From</span>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
              <span className="text-muted-foreground text-xs">To</span>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
              {categories.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Description</th>
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Category</th>
                  <th className="text-right py-3 px-5 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Type</th>
                  <th className="text-right py-3 px-5 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">No transactions match filters</td>
                  </tr>
                )}
                {filtered.map((tx) =>
                  editingId === tx.id ? (
                    <tr key={tx.id} className="border-b border-border bg-primary-light/30">
                      <td className="py-2 px-3">
                        <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="text" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                          className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                      </td>
                      <td className="py-2 px-3">
                        <select value={editForm.transaction_type} onChange={(e) => setEditForm({ ...editForm, transaction_type: e.target.value })}
                          className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" onClick={() => handleUpdate(tx.id)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={tx.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-5 text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="py-3 px-5 text-foreground max-w-xs truncate">{tx.description}</td>
                      <td className="py-3 px-5">
                        <Badge variant="secondary">{tx.category}</Badge>
                      </td>
                      <td className={`py-3 px-5 text-right font-medium tabular-nums whitespace-nowrap ${tx.amount < 0 ? "text-destructive" : "text-success"}`}>
                        {formatCurrency(Math.abs(tx.amount))}
                      </td>
                      <td className="py-3 px-5">
                        <Badge variant={tx.transaction_type === "income" || tx.transaction_type === "credit" ? "success" : "danger"}>
                          {tx.transaction_type === "income" || tx.transaction_type === "credit" ? "income" : "expense"}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(tx)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => handleDelete(tx.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {showImportDialog && (
        <ImportCSVDialog onClose={() => setShowImportDialog(false)} onImported={load} />
      )}
    </div>
  )
}
