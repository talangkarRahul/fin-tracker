import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"

interface InvestmentItem {
  id: number
  investment_type: string
  name: string
  amount_invested: number
  current_value: number
  gain: number
  gain_pct: number
  purchase_date: string | null
  sip_amount: number
  sip_frequency: string | null
  notes: string | null
  active: boolean
}

interface InvestmentSummary {
  total_invested: number
  total_current: number
  gain: number
  gain_pct: number
  active_count: number
  by_type: Record<string, { invested: number; current: number; count: number }>
}

const INV_TYPES = [
  { value: "mutual_fund", label: "Mutual Fund", emoji: "📊" },
  { value: "stock", label: "Stock", emoji: "📈" },
  { value: "fd", label: "Fixed Deposit", emoji: "🏦" },
  { value: "ppf", label: "PPF", emoji: "🪙" },
  { value: "epf", label: "EPF", emoji: "💼" },
  { value: "nps", label: "NPS", emoji: "🏛️" },
  { value: "gold", label: "Gold", emoji: "🥇" },
  { value: "sgb", label: "SGB", emoji: "🪙" },
  { value: "bonds", label: "Bonds", emoji: "📜" },
  { value: "other", label: "Other", emoji: "📋" },
]

const INV_MAP = Object.fromEntries(INV_TYPES.map((t) => [t.value, t]))

async function fetchInvestments(): Promise<InvestmentItem[]> {
  const res = await fetch("/api/investments")
  return res.json()
}

async function fetchSummary(): Promise<InvestmentSummary> {
  const res = await fetch("/api/investments/summary")
  return res.json()
}

async function createInvestment(data: Partial<InvestmentItem>): Promise<InvestmentItem> {
  const res = await fetch("/api/investments", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  })
  return res.json()
}

async function updateInvestment(id: number, data: Partial<InvestmentItem>): Promise<InvestmentItem> {
  const res = await fetch(`/api/investments/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  })
  return res.json()
}

async function deleteInvestment(id: number): Promise<void> {
  await fetch(`/api/investments/${id}`, { method: "DELETE" })
}

interface FormData {
  investment_type: string
  name: string
  amount_invested: string
  current_value: string
  purchase_date: string
  sip_amount: string
  sip_frequency: string
  notes: string
  active: boolean
}

const emptyForm: FormData = {
  investment_type: "mutual_fund",
  name: "",
  amount_invested: "",
  current_value: "",
  purchase_date: "",
  sip_amount: "0",
  sip_frequency: "monthly",
  notes: "",
  active: true,
}

function InvForm({
  data, onChange, onSubmit, onCancel, submitLabel,
}: {
  data: FormData
  onChange: (d: FormData) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {INV_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...data, investment_type: t.value })}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                data.investment_type === t.value
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-card text-muted-foreground hover:border-ring"
              }`}
            >
              <span>{t.emoji}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Name</label>
        <input type="text" value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Amount Invested</label>
          <input type="number" min="0" value={data.amount_invested} onChange={(e) => onChange({ ...data, amount_invested: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Current Value</label>
          <input type="number" min="0" value={data.current_value} onChange={(e) => onChange({ ...data, current_value: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Purchase Date</label>
          <input type="date" value={data.purchase_date} onChange={(e) => onChange({ ...data, purchase_date: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">SIP Amount</label>
          <input type="number" min="0" value={data.sip_amount} onChange={(e) => onChange({ ...data, sip_amount: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">SIP Frequency</label>
          <select value={data.sip_frequency} onChange={(e) => onChange({ ...data, sip_frequency: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
        <textarea value={data.notes} onChange={(e) => onChange({ ...data, notes: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={data.active} onChange={(e) => onChange({ ...data, active: e.target.checked })}
          className="rounded border-border" />
        <span className="text-sm text-foreground">Active</span>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" onClick={onSubmit} size="sm">{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} size="sm">Cancel</Button>}
      </div>
    </div>
  )
}

export default function Investments() {
  const [items, setItems] = useState<InvestmentItem[]>([])
  const [summary, setSummary] = useState<InvestmentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)

  async function load() {
    setLoading(true)
    try {
      const [inv, summ] = await Promise.all([fetchInvestments(), fetchSummary()])
      setItems(inv)
      setSummary(summ)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  async function handleCreate() {
    if (!form.name) return
    await createInvestment({
      investment_type: form.investment_type,
      name: form.name,
      amount_invested: parseFloat(form.amount_invested) || 0,
      current_value: parseFloat(form.current_value) || 0,
      purchase_date: form.purchase_date || undefined,
      sip_amount: parseFloat(form.sip_amount) || 0,
      sip_frequency: form.sip_frequency || undefined,
      notes: form.notes || undefined,
      active: form.active,
    })
    resetForm()
    await load()
  }

  async function handleUpdate(id: number) {
    if (!form.name) return
    await updateInvestment(id, {
      investment_type: form.investment_type,
      name: form.name,
      amount_invested: parseFloat(form.amount_invested) || 0,
      current_value: parseFloat(form.current_value) || 0,
      purchase_date: form.purchase_date || undefined,
      sip_amount: parseFloat(form.sip_amount) || 0,
      sip_frequency: form.sip_frequency || undefined,
      notes: form.notes || undefined,
      active: form.active,
    })
    resetForm()
    await load()
  }

  async function handleDelete(id: number) {
    await deleteInvestment(id)
    await load()
  }

  function startEdit(item: InvestmentItem) {
    setForm({
      investment_type: item.investment_type,
      name: item.name,
      amount_invested: String(item.amount_invested),
      current_value: String(item.current_value),
      purchase_date: item.purchase_date || "",
      sip_amount: String(item.sip_amount),
      sip_frequency: item.sip_frequency || "monthly",
      notes: item.notes || "",
      active: item.active,
    })
    setEditingId(item.id)
    setShowForm(false)
  }

  const sorted = [...items].sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Investments</h1>
          <p className="text-muted-foreground mt-1">Track your investment portfolio</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "Add Investment"}
        </Button>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Total Invested</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.total_invested)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.total_current)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Gain / Loss</p>
                <p className={`text-2xl font-bold ${summary.gain >= 0 ? "text-success" : "text-destructive"}`}>
                  {summary.gain >= 0 ? "+" : ""}{formatCurrency(summary.gain)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Return %</p>
                <p className={`text-2xl font-bold ${summary.gain_pct >= 0 ? "text-success" : "text-destructive"}`}>
                  {summary.gain_pct >= 0 ? "+" : ""}{summary.gain_pct}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(summary.by_type).map(([type, data]) => {
              const info = INV_MAP[type]
              const gain = data.current - data.invested
              const gainPct = data.invested > 0 ? (gain / data.invested) * 100 : 0
              return (
                <Card key={type}>
                  <CardContent className="pt-4 text-center">
                    <p className="text-lg">{info?.emoji ?? "📋"}</p>
                    <p className="text-xs font-medium text-foreground truncate">{info?.label ?? type}</p>
                    <p className="text-xs text-muted-foreground">{data.count} holdings</p>
                    <p className={`text-sm font-bold mt-1 ${gainPct >= 0 ? "text-success" : "text-destructive"}`}>
                      {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Investment</CardTitle></CardHeader>
          <CardContent>
            <InvForm data={form} onChange={setForm} onSubmit={handleCreate} submitLabel="Create" onCancel={resetForm} />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No investments tracked yet. Add your first investment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => (
            <Card key={item.id}>
              {editingId === item.id ? (
                <>
                  <CardHeader><CardTitle>Edit Investment</CardTitle></CardHeader>
                  <CardContent>
                    <InvForm data={form} onChange={setForm} onSubmit={() => handleUpdate(item.id)} onCancel={resetForm} submitLabel="Save" />
                  </CardContent>
                </>
              ) : (
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{INV_MAP[item.investment_type]?.emoji ?? "📋"}</span>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          <Badge variant="primary">{INV_MAP[item.investment_type]?.label ?? item.investment_type}</Badge>
                          {!item.active && <Badge variant="secondary">Inactive</Badge>}
                          {item.sip_amount > 0 && <Badge variant="secondary">SIP {formatCurrency(item.sip_amount)}/{item.sip_frequency}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${item.gain >= 0 ? "text-success" : "text-destructive"}`}>
                        {item.gain >= 0 ? "+" : ""}{formatCurrency(item.gain)}
                      </p>
                      <p className={`text-xs ${item.gain_pct >= 0 ? "text-success" : "text-destructive"}`}>
                        {item.gain_pct >= 0 ? "+" : ""}{item.gain_pct}%
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Invested</p>
                      <p className="font-medium text-foreground">{formatCurrency(item.amount_invested)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Current</p>
                      <p className="font-medium text-foreground">{formatCurrency(item.current_value)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Purchased</p>
                      <p className="font-medium text-foreground">{item.purchase_date || "-"}</p>
                    </div>
                  </div>
                  {item.notes && <p className="text-sm text-muted-foreground mt-2 italic">{item.notes}</p>}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => startEdit(item)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Delete</Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
