import { useEffect, useState, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import ImportCSVDialog from "../components/ImportCSVDialog"
import { formatCurrency } from "../lib/format"
import { api, type Transaction } from "../api"
import {
  Plus, Upload, Search, X, Check, Edit3, Trash2,
  TrendingUp, TrendingDown, Filter, ChevronLeft, ChevronRight,
} from "lucide-react"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
      </div>
      <div className="h-10 bg-muted rounded-lg w-64" />
      <div className="h-80 bg-muted rounded-xl" />
    </div>
  )
}

const groupStyles: Record<string, string> = {
  NEEDS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  WANTS: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  INVESTMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  NOT_APPLICABLE: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

function GroupBadge({ group }: { group: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${groupStyles[group] || ""}`}>
      {group}
    </span>
  )
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [form, setForm] = useState({ date: "", description: "", amount: "", category: "", transaction_type: "expense", group: "" })
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", type: "all", category: "all", group: "all", search: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ date: "", description: "", amount: "", category: "", transaction_type: "expense", group: "" })
  const [page, setPage] = useState(1)
  const pageSize = 15

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
      group: form.group || undefined,
      transaction_type: form.transaction_type,
    })
    setForm({ date: "", description: "", amount: "", category: "", transaction_type: "expense", group: "" })
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
      group: tx.group || "",
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
      group: editForm.group || undefined,
      transaction_type: editForm.transaction_type,
    })
    setEditingId(null)
    await load()
  }

  const categories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category).filter(Boolean))
    return ["all", ...Array.from(set).sort()]
  }, [transactions])

  const groups = useMemo(() => {
    const vals = transactions.map((t) => t.group).filter((g): g is string => g !== null)
    const set = new Set(vals)
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
      if (filters.group !== "all" && t.group !== filters.group) return false
      if (filters.dateFrom && t.date < filters.dateFrom) return false
      if (filters.dateTo && t.date > filters.dateTo) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const desc = (t.description || "").toLowerCase()
        const cat = (t.category || "").toLowerCase()
        if (!desc.includes(q) && !cat.includes(q)) return false
      }
      return true
    })
  }, [transactions, filters])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered, pageSize])

  useEffect(() => { setPage(1) }, [filters])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const summary = useMemo(() => {
    let income = 0
    let expenses = 0
    for (const t of filtered) {
      if (t.amount > 0) income += t.amount
      else expenses += Math.abs(t.amount)
    }
    return { income, expenses, net: income - expenses, count: filtered.length }
  }, [filtered])

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">View, add, and import your financial transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload size={15} className="mr-1.5" />
            Import
          </Button>
          <Button onClick={() => { setShowForm(!showForm); setForm({ date: "", description: "", amount: "", category: "", transaction_type: "expense", group: "" }) }}>
            {showForm ? <X size={15} className="mr-1.5" /> : <Plus size={15} className="mr-1.5" />}
            {showForm ? "Cancel" : "Add"}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Income</p>
              <p className="text-lg font-bold text-success mt-0.5">{formatCurrency(summary.income)}</p>
            </div>
            <div className="p-2 rounded-lg bg-success/10 text-success">
              <TrendingUp size={18} />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Expenses</p>
              <p className="text-lg font-bold text-destructive mt-0.5">{formatCurrency(summary.expenses)}</p>
            </div>
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <TrendingDown size={18} />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Net</p>
              <p className={`text-lg font-bold mt-0.5 ${summary.net >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(summary.net)}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${summary.net >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              <Filter size={18} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">New Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Date</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Salary, Groceries"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Amount (₹)</label>
                <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Category</label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Food, Rent"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Group</label>
                <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Auto</option>
                  <option value="NEEDS">NEEDS</option>
                  <option value="WANTS">WANTS</option>
                  <option value="INVESTMENT">INVESTMENT</option>
                  <option value="NOT_APPLICABLE">NOT_APPLICABLE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Type</label>
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
                <Button type="submit" size="sm">
                  <Check size={14} className="mr-1" />
                  Add Transaction
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transactions table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold">All Transactions</CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              {summary.count} of {transactions.length}
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs">From</span>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32" />
              <span className="text-muted-foreground text-xs">To</span>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32" />
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
            <select value={filters.group} onChange={(e) => setFilters({ ...filters, group: e.target.value })}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
              {groups.map((g) => (
                <option key={g} value={g ?? ""}>{g === "all" ? "All groups" : g}</option>
              ))}
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search..."
                className="rounded-lg border border-border bg-card pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32 sm:w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Description</th>
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Group</th>
                  <th className="text-right py-3 px-5 font-medium text-muted-foreground">Amount</th>
                  <th className="text-center py-3 px-5 font-medium text-muted-foreground">Type</th>
                  <th className="text-right py-3 px-5 font-medium text-muted-foreground w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={24} className="text-muted-foreground/40" />
                        <span>No transactions match filters</span>
                      </div>
                    </td>
                  </tr>
                )}
                {paginated.map((tx) =>
                  editingId === tx.id ? (
                    <tr key={tx.id} className="border-b border-border bg-primary/5">
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
                        <select value={editForm.group} onChange={(e) => setEditForm({ ...editForm, group: e.target.value })}
                          className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="">Auto</option>
                          <option value="NEEDS">NEEDS</option>
                          <option value="WANTS">WANTS</option>
                          <option value="INVESTMENT">INVESTMENT</option>
                          <option value="NOT_APPLICABLE">NOT_APPLICABLE</option>
                        </select>
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
                          <Button size="sm" onClick={() => handleUpdate(tx.id)}>
                            <Check size={13} className="mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            <X size={13} className="mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={tx.id} className="border-b border-border hover:bg-muted/30 transition-colors group">
                      <td className="py-3 px-5 text-muted-foreground whitespace-nowrap text-xs">{formatDate(tx.date)}</td>
                      <td className="py-3 px-5 text-foreground max-w-xs truncate text-sm">{tx.description || <span className="text-muted-foreground/50 italic">No description</span>}</td>
                      <td className="py-3 px-5">
                        {tx.category ? (
                          <Badge variant="secondary" className="capitalize">{tx.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs italic">Uncategorized</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        {tx.group ? (
                          <GroupBadge group={tx.group} />
                        ) : (
                          <span className="text-muted-foreground/50 text-xs italic">—</span>
                        )}
                      </td>
                      <td className={`py-3 px-5 text-right font-semibold tabular-nums whitespace-nowrap text-sm ${tx.amount < 0 ? "text-destructive" : "text-success"}`}>
                        {tx.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(tx.amount))}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <Badge variant={tx.amount > 0 ? "success" : "danger"}>
                          {tx.amount > 0 ? "income" : "expense"}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(tx)}
                            className="h-8 w-8 p-0">
                            <Edit3 size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(tx.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                        {/* Always visible on mobile fallback */}
                        <div className="flex gap-1 justify-end sm:hidden">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(tx)} className="h-7 px-2 text-xs">Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(tx.id)} className="h-7 px-2 text-xs text-destructive">Del</Button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground tabular-nums">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}
                  className="h-8 w-8 p-0">
                  <ChevronLeft size={15} />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-xs text-muted-foreground">…</span>
                      )}
                      <Button
                        variant={p === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setPage(p)}
                        className="h-8 w-8 p-0 text-xs tabular-nums"
                      >
                        {p}
                      </Button>
                    </span>
                  ))}
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                  className="h-8 w-8 p-0">
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {showImportDialog && (
        <ImportCSVDialog onClose={() => setShowImportDialog(false)} onImported={load} />
      )}
    </div>
  )
}
