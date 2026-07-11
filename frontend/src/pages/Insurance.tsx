import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import {
  Shield, Heart, Landmark, TrendingUp, Car, Bike, Home, Plane,
  Activity, AlertTriangle, FileText, Plus, X, Check, Pencil, Trash2, Calendar,
} from "lucide-react"

interface InsurancePolicy {
  id: number
  policy_type: string
  provider: string | null
  policy_number: string | null
  sum_insured: number
  premium_amount: number
  premium_frequency: string
  start_date: string | null
  end_date: string | null
  nominee: string | null
  notes: string | null
  active: boolean
}

interface InsuranceSummary {
  total_cover: number
  total_annual_premium: number
  active_policies: number
  by_type: Record<string, { count: number; total_cover: number }>
}

const PT_ICONS: Record<string, React.ReactNode> = {
  term_life: <Shield size={14} />,
  health: <Heart size={14} />,
  endowment: <Landmark size={14} />,
  ulip: <TrendingUp size={14} />,
  car: <Car size={14} />,
  bike: <Bike size={14} />,
  home: <Home size={14} />,
  travel: <Plane size={14} />,
  critical_illness: <Activity size={14} />,
  personal_accident: <AlertTriangle size={14} />,
  other: <FileText size={14} />,
}

const POLICY_TYPES = [
  { value: "term_life", label: "Term Life", icon: <Shield size={14} /> },
  { value: "health", label: "Health", icon: <Heart size={14} /> },
  { value: "endowment", label: "Endowment", icon: <Landmark size={14} /> },
  { value: "ulip", label: "ULIP", icon: <TrendingUp size={14} /> },
  { value: "car", label: "Car", icon: <Car size={14} /> },
  { value: "bike", label: "Bike", icon: <Bike size={14} /> },
  { value: "home", label: "Home", icon: <Home size={14} /> },
  { value: "travel", label: "Travel", icon: <Plane size={14} /> },
  { value: "critical_illness", label: "Critical Illness", icon: <Activity size={14} /> },
  { value: "personal_accident", label: "Personal Accident", icon: <AlertTriangle size={14} /> },
  { value: "other", label: "Other", icon: <FileText size={14} /> },
]

const PT_MAP = Object.fromEntries(POLICY_TYPES.map((t) => [t.value, t]))
const PT_DISPLAY = Object.fromEntries(POLICY_TYPES.map((t) => [t.value, { label: t.label, icon: t.icon }]))

const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-Yearly",
  yearly: "Yearly", one_time: "One-Time",
}

const FREQ_MULTIPLIER: Record<string, number> = {
  monthly: 12, quarterly: 4, half_yearly: 2, yearly: 1, one_time: 0,
}

async function fetchPolicies(): Promise<InsurancePolicy[]> {
  const res = await fetch("/api/insurance")
  return res.json()
}

async function fetchSummary(): Promise<InsuranceSummary> {
  const res = await fetch("/api/insurance/summary")
  return res.json()
}

async function createPolicy(data: Partial<InsurancePolicy>): Promise<InsurancePolicy> {
  const res = await fetch("/api/insurance", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  })
  return res.json()
}

async function updatePolicy(id: number, data: Partial<InsurancePolicy>): Promise<InsurancePolicy> {
  const res = await fetch(`/api/insurance/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  })
  return res.json()
}

async function deletePolicy(id: number): Promise<void> {
  await fetch(`/api/insurance/${id}`, { method: "DELETE" })
}

interface FormData {
  policy_type: string
  provider: string
  policy_number: string
  sum_insured: string
  premium_amount: string
  premium_frequency: string
  start_date: string
  end_date: string
  nominee: string
  notes: string
  active: boolean
}

const emptyForm: FormData = {
  policy_type: "term_life",
  provider: "",
  policy_number: "",
  sum_insured: "",
  premium_amount: "",
  premium_frequency: "yearly",
  start_date: "",
  end_date: "",
  nominee: "",
  notes: "",
  active: true,
}

function PolicyForm({
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
    <label className="block text-xs font-medium text-foreground mb-1">Policy Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {POLICY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...data, policy_type: t.value })}
               className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition-all cursor-pointer ${
                 data.policy_type === t.value
                   ? "border-primary bg-primary/10 text-primary font-semibold"
                   : "border-border bg-card text-muted-foreground hover:border-ring hover:bg-muted/50"
               }`}
             >
               <span className="shrink-0">{t.icon}</span>
               <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
        <label className="block text-xs font-medium text-foreground mb-1">Provider</label>
        <input type="text" value={data.provider} onChange={(e) => onChange({ ...data, provider: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Policy Number</label>
        <input type="text" value={data.policy_number} onChange={(e) => onChange({ ...data, policy_number: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Sum Insured</label>
        <input type="number" min="0" value={data.sum_insured} onChange={(e) => onChange({ ...data, sum_insured: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Premium</label>
        <input type="number" min="0" value={data.premium_amount} onChange={(e) => onChange({ ...data, premium_amount: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Frequency</label>
          <select value={data.premium_frequency} onChange={(e) => onChange({ ...data, premium_frequency: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {Object.entries(FREQ_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
        <label className="block text-xs font-medium text-foreground mb-1">Start Date</label>
        <input type="date" value={data.start_date} onChange={(e) => onChange({ ...data, start_date: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">End Date</label>
          <input type="date" value={data.end_date} onChange={(e) => onChange({ ...data, end_date: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
        <label className="block text-xs font-medium text-foreground mb-1">Nominee</label>
        <input type="text" value={data.nominee} onChange={(e) => onChange({ ...data, nominee: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="flex items-end pb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={data.active} onChange={(e) => onChange({ ...data, active: e.target.checked })}
            className="rounded border-border" />
          <span className="text-sm text-foreground">Active</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Notes</label>
        <textarea value={data.notes} onChange={(e) => onChange({ ...data, notes: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
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

export default function Insurance() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [summary, setSummary] = useState<InsuranceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([fetchPolicies(), fetchSummary()])
      setPolicies(p)
      setSummary(s)
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
    if (!form.provider && !form.policy_number) return
    setSaving(true)
    try {
      await createPolicy({
        policy_type: form.policy_type,
        provider: form.provider || undefined,
        policy_number: form.policy_number || undefined,
        sum_insured: parseFloat(form.sum_insured) || 0,
        premium_amount: parseFloat(form.premium_amount) || 0,
        premium_frequency: form.premium_frequency,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        nominee: form.nominee || undefined,
        notes: form.notes || undefined,
        active: form.active,
      })
      resetForm()
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: number) {
    setSaving(true)
    try {
      await updatePolicy(id, {
        policy_type: form.policy_type,
        provider: form.provider || undefined,
        policy_number: form.policy_number || undefined,
        sum_insured: parseFloat(form.sum_insured) || 0,
        premium_amount: parseFloat(form.premium_amount) || 0,
        premium_frequency: form.premium_frequency,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        nominee: form.nominee || undefined,
        notes: form.notes || undefined,
        active: form.active,
      })
      resetForm()
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    await deletePolicy(id)
    await load()
  }

  function startEdit(p: InsurancePolicy) {
    setForm({
      policy_type: p.policy_type,
      provider: p.provider || "",
      policy_number: p.policy_number || "",
      sum_insured: String(p.sum_insured),
      premium_amount: String(p.premium_amount),
      premium_frequency: p.premium_frequency,
      start_date: p.start_date || "",
      end_date: p.end_date || "",
      nominee: p.nominee || "",
      notes: p.notes || "",
      active: p.active,
    })
    setEditingId(p.id)
    setShowForm(false)
  }

  function annualPremium(p: InsurancePolicy): number {
    return p.premium_amount * (FREQ_MULTIPLIER[p.premium_frequency] ?? 1)
  }

  const sortedPolicies = [...policies].sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Insurance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track your insurance policies and coverage</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? <X size={15} className="mr-1.5" /> : <Plus size={15} className="mr-1.5" />}
          {showForm ? "Cancel" : "Add Policy"}
        </Button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Shield size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">Active Policies</p>
                <p className="text-base font-bold">{summary.active_policies}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10 text-success shrink-0">
                <Landmark size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">Total Cover</p>
                <p className="text-base font-bold">{formatCurrency(summary.total_cover)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">Annual Premium</p>
                <p className="text-base font-bold">{formatCurrency(summary.total_annual_premium)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10 text-warning shrink-0">
                <Activity size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">Cover / Premium</p>
                <p className="text-base font-bold">
                  {summary.total_annual_premium > 0
                    ? `${(summary.total_cover / summary.total_annual_premium).toFixed(1)}x`
                    : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">New Policy</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PolicyForm data={form} onChange={setForm} onSubmit={handleCreate} submitLabel={saving ? "Saving..." : "Create"} onCancel={resetForm} />
          </CardContent>
        </Card>
      )}

      {/* Loading / Empty / List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
      ) : policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Shield size={32} className="text-muted-foreground/60" />
          </div>
          <p className="text-lg font-medium text-foreground">No policies yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first insurance policy to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPolicies.map((p) => {
            const ptInfo = PT_DISPLAY[p.policy_type] ?? PT_DISPLAY.other
            return (
              <Card key={p.id} className="relative overflow-hidden hover:shadow-md transition-all group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b rounded-l-xl ${
                  p.active ? "from-primary to-primary/60" : "from-muted-foreground/30 to-muted-foreground/10"
                }`} />
                {editingId === p.id ? (
                  <>
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold">Edit Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <PolicyForm data={form} onChange={setForm} onSubmit={() => handleUpdate(p.id)} onCancel={resetForm} submitLabel={saving ? "Saving..." : "Save"} />
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="pt-4 pb-4 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${p.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {ptInfo.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{p.provider || "Unknown Provider"}</h3>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <Badge variant="primary" className="text-[10px] px-1.5 py-0 capitalize">
                              {ptInfo.icon} {ptInfo.label}
                            </Badge>
                            {!p.active && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>}
                            {p.policy_number && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.policy_number}</Badge>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Sum Insured</p>
                        <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(p.sum_insured)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Premium</p>
                        <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(p.premium_amount)} <span className="text-[10px] font-normal text-muted-foreground">/{FREQ_LABELS[p.premium_frequency]?.toLowerCase() ?? p.premium_frequency}</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Annual Premium</p>
                        <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(annualPremium(p))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Period</p>
                        <p className="text-xs font-semibold text-foreground tabular-nums">{p.start_date || "?"} – {p.end_date || "?"}</p>
                      </div>
                    </div>
                    {p.nominee && <p className="text-[10px] text-muted-foreground mt-1">Nominee: {p.nominee}</p>}
                    {p.notes && <p className="text-xs text-muted-foreground mt-1 italic">{p.notes}</p>}
                    <div className="flex gap-2 mt-3 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm" onClick={() => startEdit(p)} className="h-7 text-[10px] px-2">
                        <Pencil size={11} className="mr-0.5" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}
                        className="h-7 text-[10px] px-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                        <Trash2 size={11} className="mr-0.5" />
                        Delete
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-3 pt-2 border-t border-border sm:hidden">
                      <Button variant="outline" size="sm" onClick={() => startEdit(p)} className="h-7 text-[10px] px-2">
                        <Pencil size={11} className="mr-0.5" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}
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
