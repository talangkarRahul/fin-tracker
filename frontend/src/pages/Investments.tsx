import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import {
  BarChart3, TrendingUp, Landmark, PiggyBank, Briefcase,
  Building2, Award, ScrollText, Plus, X, Check, Pencil, Trash2,
  CandlestickChart, Upload, FileSpreadsheet,
} from "lucide-react"

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
  { value: "mutual_fund", label: "Mutual Fund", icon: <BarChart3 size={14} /> },
  { value: "stock", label: "Stock", icon: <TrendingUp size={14} /> },
  { value: "fd", label: "Fixed Deposit", icon: <Landmark size={14} /> },
  { value: "ppf", label: "PPF", icon: <PiggyBank size={14} /> },
  { value: "epf", label: "EPF", icon: <Briefcase size={14} /> },
  { value: "nps", label: "NPS", icon: <Building2 size={14} /> },
  { value: "gold", label: "Gold", icon: <Award size={14} /> },
  { value: "sgb", label: "SGB", icon: <Award size={14} /> },
  { value: "bonds", label: "Bonds", icon: <ScrollText size={14} /> },
  { value: "other", label: "Other", icon: <CandlestickChart size={14} /> },
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

function InvForm({ data, onChange, onSubmit, onCancel, submitLabel }: {
  data: FormData
  onChange: (d: FormData) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {INV_TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => onChange({ ...data, investment_type: t.value })}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-all cursor-pointer ${
                data.investment_type === t.value
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-card text-muted-foreground hover:border-ring hover:bg-muted/50"
              }`}
            >
              {t.icon}
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Name</label>
        <input type="text" value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Amount Invested</label>
          <input type="number" min="0" value={data.amount_invested} onChange={(e) => onChange({ ...data, amount_invested: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Current Value</label>
          <input type="number" min="0" value={data.current_value} onChange={(e) => onChange({ ...data, current_value: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Purchase Date</label>
          <input type="date" value={data.purchase_date} onChange={(e) => onChange({ ...data, purchase_date: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">SIP Amount</label>
          <input type="number" min="0" value={data.sip_amount} onChange={(e) => onChange({ ...data, sip_amount: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">SIP Frequency</label>
          <select value={data.sip_frequency} onChange={(e) => onChange({ ...data, sip_frequency: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Notes</label>
        <textarea value={data.notes} onChange={(e) => onChange({ ...data, notes: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={data.active} onChange={(e) => onChange({ ...data, active: e.target.checked })}
          className="rounded border-border" />
        <span className="text-sm text-foreground">Active</span>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" onClick={onSubmit} size="sm">
          <Check size={14} className="mr-1" />
          {submitLabel}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} size="sm">
          <X size={14} className="mr-1" />
          Cancel
        </Button>}
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
  const [showImport, setShowImport] = useState(false)
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [csvPreview, setCsvPreview] = useState<string[][]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)

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

  const FIELD_LABELS: Record<string, string> = {
    name: "Name *",
    investment_type: "Type",
    amount_invested: "Amount Invested *",
    current_value: "Current Value",
    purchase_date: "Purchase Date",
    sip_amount: "SIP Amount",
    sip_frequency: "SIP Frequency",
    notes: "Notes",
    active: "Active",
  }

  function parseCSV(text: string): { headers: string[]; rows: string[][] } {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length === 0) return { headers: [], rows: [] }
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
    const rows = lines.slice(1, 6).map((line) =>
      line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    )
    return { headers, rows }
  }

  function autoDetectMapping(headers: string[]): Record<string, string> {
    const map: Record<string, string> = {}
    const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""))
    const patterns: [string, string[]][] = [
      ["name", ["name", "scheme", "fund", "investment", "description", "holding"]],
      ["investment_type", ["type", "investmenttype", "investment_type", "category", "assetclass"]],
      ["amount_invested", ["amountinvested", "invested", "amount", "cost", "investmentamount", "purchasevalue"]],
      ["current_value", ["currentvalue", "value", "nav", "marketvalue", "current", "presentvalue"]],
      ["purchase_date", ["purchasedate", "date", "purchased", "startdate", "acquisitiondate", "buy_date"]],
      ["sip_amount", ["sipamount", "sip", "monthlysip", "sip_value"]],
      ["sip_frequency", ["sipfrequency", "frequency", "sipfreq"]],
      ["notes", ["notes", "note", "remark", "comments"]],
      ["active", ["active", "status", "isenabled"]],
    ]
    for (const [field, aliases] of patterns) {
      for (let i = 0; i < headers.length; i++) {
        if (aliases.includes(lower[i])) {
          map[field] = headers[i]
          break
        }
      }
    }
    return map
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCSV(text)
      setCsvColumns(headers)
      setCsvPreview(rows)
      setColumnMapping(autoDetectMapping(headers))
    }
    reader.readAsText(file)
  }

  async function handleImportCSV() {
    if (!csvFile) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", csvFile)
      formData.append("mapping", JSON.stringify(columnMapping))
      const res = await fetch("/api/investments/import", { method: "POST", body: formData })
      const result = await res.json()
      alert(`Imported ${result.imported} investments`)
      setShowImport(false)
      setCsvFile(null)
      setCsvColumns([])
      setCsvPreview([])
      setColumnMapping({})
      await load()
    } catch {
      alert("Failed to import CSV")
    } finally {
      setImporting(false)
    }
  }

  const sorted = [...items].sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-success/10 text-success">
            <TrendingUp size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Investments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track your investment portfolio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setShowImport(!showImport); if (!showImport) setShowForm(false); }}>
            <Upload size={15} className="mr-1.5" />
            Import CSV
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(!showForm); if (!showForm) setShowImport(false); }}>
            {showForm ? <X size={15} className="mr-1.5" /> : <Plus size={15} className="mr-1.5" />}
            {showForm ? "Cancel" : "Add Investment"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
                  <Landmark size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Total Invested</p>
                  <p className="text-base font-bold">{formatCurrency(summary.total_invested)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10 text-success shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Current Value</p>
                  <p className="text-base font-bold">{formatCurrency(summary.total_current)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${summary.gain >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {summary.gain >= 0 ? <TrendingUp size={16} /> : <TrendingUp size={16} className="rotate-180" />}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Gain / Loss</p>
                  <p className={`text-base font-bold ${summary.gain >= 0 ? "text-success" : "text-destructive"}`}>
                    {summary.gain >= 0 ? "+" : ""}{formatCurrency(summary.gain)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${summary.gain_pct >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  <BarChart3 size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Return</p>
                  <p className={`text-base font-bold ${summary.gain_pct >= 0 ? "text-success" : "text-destructive"}`}>
                    {summary.gain_pct >= 0 ? "+" : ""}{summary.gain_pct}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By type */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(summary.by_type).map(([type, data]) => {
              const info = INV_MAP[type]
              const gain = data.current - data.invested
              const gainPct = data.invested > 0 ? (gain / data.invested) * 100 : 0
              return (
                <Card key={type} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-3 pb-2.5 text-center">
                    <div className="flex justify-center mb-1">
                      <div className={`p-1.5 rounded-lg ${gainPct >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {info?.icon ?? <CandlestickChart size={14} />}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{info?.label ?? type}</p>
                    <p className="text-[10px] text-muted-foreground">{data.count} holdings</p>
                    <p className={`text-xs font-bold mt-0.5 tabular-nums ${gainPct >= 0 ? "text-success" : "text-destructive"}`}>
                      {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Import CSV */}
      {showImport && (
        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-xl" />
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Upload size={14} />
              Import Investments from CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-3">
            {!csvFile ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:border-primary/50 transition-colors">
                <FileSpreadsheet size={32} className="text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
                <p className="text-xs text-muted-foreground mt-0.5">Columns: name, type, amount_invested, current_value, purchase_date, etc.</p>
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              </label>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">
                    <FileSpreadsheet size={12} className="inline mr-1" />
                    {csvFile.name}
                  </p>
                  <button onClick={() => { setCsvFile(null); setCsvColumns([]); setCsvPreview([]); setColumnMapping({}); }}
                    className="text-destructive hover:text-destructive/80 text-xs cursor-pointer">
                    <X size={12} className="inline mr-0.5" />
                    Remove
                  </button>
                </div>

                {/* Column mapping */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(FIELD_LABELS).map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-[10px] font-medium text-foreground mb-0.5">{label}</label>
                      <select value={columnMapping[field] || ""}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                        className="w-full rounded-lg border border-border bg-card px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">— skip —</option>
                        {csvColumns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Preview */}
                {csvPreview.length > 0 && (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-border bg-muted">
                          {csvColumns.map((col) => (
                            <th key={col} className="text-left py-1.5 px-2 font-medium text-muted-foreground">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="border-b border-border">
                            {row.map((cell, j) => (
                              <td key={j} className="py-1 px-2 text-foreground truncate max-w-[120px]">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button onClick={handleImportCSV} disabled={importing || !columnMapping.name} size="sm">
                    <Upload size={14} className="mr-1" />
                    {importing ? "Importing..." : `Import${csvFile ? ` (${csvFile.name})` : ""}`}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowImport(false); setCsvFile(null); setCsvColumns([]); setCsvPreview([]); setColumnMapping({}); }} size="sm">
                    <X size={14} className="mr-1" />
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">New Investment</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InvForm data={form} onChange={setForm} onSubmit={handleCreate} submitLabel="Create" onCancel={resetForm} />
          </CardContent>
        </Card>
      )}

      {/* Loading / Empty / List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <TrendingUp size={32} className="text-muted-foreground/60" />
          </div>
          <p className="text-lg font-medium text-foreground">No investments yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first investment to start tracking your portfolio.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => {
            const info = INV_MAP[item.investment_type] ?? INV_MAP.other!
            const isGain = item.gain >= 0
            return (
              <Card key={item.id} className="relative overflow-hidden hover:shadow-md transition-all group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b rounded-l-xl ${
                  item.active ? (isGain ? "from-success to-success/60" : "from-destructive to-destructive/60") : "from-muted-foreground/30 to-muted-foreground/10"
                }`} />
                {editingId === item.id ? (
                  <>
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold">Edit Investment</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <InvForm data={form} onChange={setForm} onSubmit={() => handleUpdate(item.id)} onCancel={resetForm} submitLabel="Save" />
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="pt-4 pb-4 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${isGain ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {info?.icon ?? <CandlestickChart size={14} />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <Badge variant="primary" className="text-[10px] px-1.5 py-0">{info?.label ?? item.investment_type}</Badge>
                            {!item.active && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>}
                            {item.sip_amount > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">SIP {formatCurrency(item.sip_amount)}/{item.sip_frequency}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className={`text-sm font-bold tabular-nums ${isGain ? "text-success" : "text-destructive"}`}>
                          {isGain ? "+" : ""}{formatCurrency(item.gain)}
                        </p>
                        <p className={`text-[10px] tabular-nums ${isGain ? "text-success" : "text-destructive"}`}>
                          {item.gain_pct >= 0 ? "+" : ""}{item.gain_pct}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Invested</p>
                        <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(item.amount_invested)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Current</p>
                        <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(item.current_value)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Purchased</p>
                        <p className="text-xs font-semibold text-foreground tabular-nums">{item.purchase_date || "-"}</p>
                      </div>
                    </div>
                    {item.notes && <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>}
                    <div className="flex gap-2 mt-3 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm" onClick={() => startEdit(item)} className="h-7 text-[10px] px-2">
                        <Pencil size={11} className="mr-0.5" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}
                        className="h-7 text-[10px] px-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                        <Trash2 size={11} className="mr-0.5" />
                        Delete
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-3 pt-2 border-t border-border sm:hidden">
                      <Button variant="outline" size="sm" onClick={() => startEdit(item)} className="h-7 text-[10px] px-2">
                        <Pencil size={11} className="mr-0.5" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}
                        className="h-7 text-[10px] px-2 text-destructive">
                        <Trash2 size={11} className="mr-0.5" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
