import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"

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

const POLICY_TYPES = [
  { value: "term_life", label: "Term Life", emoji: "🛡️" },
  { value: "health", label: "Health", emoji: "🏥" },
  { value: "endowment", label: "Endowment", emoji: "💰" },
  { value: "ulip", label: "ULIP", emoji: "📈" },
  { value: "car", label: "Car", emoji: "🚗" },
  { value: "bike", label: "Bike", emoji: "🏍️" },
  { value: "home", label: "Home", emoji: "🏠" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "critical_illness", label: "Critical Illness", emoji: "❤️" },
  { value: "personal_accident", label: "Personal Accident", emoji: "⚠️" },
  { value: "other", label: "Other", emoji: "📄" },
]

const PT_MAP = Object.fromEntries(POLICY_TYPES.map((t) => [t.value, t]))

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
        <label className="block text-sm font-medium text-foreground mb-1">Policy Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {POLICY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...data, policy_type: t.value })}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                data.policy_type === t.value
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-card text-muted-foreground hover:border-ring"
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Provider</label>
          <input type="text" value={data.provider} onChange={(e) => onChange({ ...data, provider: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Policy Number</label>
          <input type="text" value={data.policy_number} onChange={(e) => onChange({ ...data, policy_number: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Sum Insured</label>
          <input type="number" min="0" value={data.sum_insured} onChange={(e) => onChange({ ...data, sum_insured: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Premium</label>
          <input type="number" min="0" value={data.premium_amount} onChange={(e) => onChange({ ...data, premium_amount: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Frequency</label>
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
          <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
          <input type="date" value={data.start_date} onChange={(e) => onChange({ ...data, start_date: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
          <input type="date" value={data.end_date} onChange={(e) => onChange({ ...data, end_date: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nominee</label>
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
        <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
        <textarea value={data.notes} onChange={(e) => onChange({ ...data, notes: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" onClick={onSubmit} size="sm">{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} size="sm">Cancel</Button>}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Insurance</h1>
          <p className="text-muted-foreground mt-1">Track your insurance policies and coverage</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "Add Policy"}
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Active Policies</p>
              <p className="text-2xl font-bold text-foreground">{summary.active_policies}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Total Cover</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.total_cover)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Annual Premium</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.total_annual_premium)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Cover / Premium</p>
              <p className="text-2xl font-bold text-foreground">
                {summary.total_annual_premium > 0
                  ? `${(summary.total_cover / summary.total_annual_premium).toFixed(1)}x`
                  : "-"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Policy</CardTitle></CardHeader>
          <CardContent>
            <PolicyForm data={form} onChange={setForm} onSubmit={handleCreate} submitLabel={saving ? "Saving..." : "Create"} onCancel={resetForm} />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
        </div>
      ) : policies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No policies yet. Add your first insurance policy.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPolicies.map((p) => (
            <Card key={p.id}>
              {editingId === p.id ? (
                <>
                  <CardHeader><CardTitle>Edit Policy</CardTitle></CardHeader>
                  <CardContent>
                    <PolicyForm data={form} onChange={setForm} onSubmit={() => handleUpdate(p.id)} onCancel={resetForm} submitLabel={saving ? "Saving..." : "Save"} />
                  </CardContent>
                </>
              ) : (
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{PT_MAP[p.policy_type]?.emoji ?? "📄"}</span>
                        <h3 className="font-semibold text-foreground">{p.provider || "Unknown Provider"}</h3>
                        {!p.active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="primary">{PT_MAP[p.policy_type]?.label ?? p.policy_type}</Badge>
                        {p.policy_number && <Badge>{p.policy_number}</Badge>}
                        {p.nominee && <Badge variant="secondary">Nominee: {p.nominee}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Sum Insured</p>
                      <p className="font-medium text-foreground">{formatCurrency(p.sum_insured)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Premium</p>
                      <p className="font-medium text-foreground">{formatCurrency(p.premium_amount)} / {FREQ_LABELS[p.premium_frequency]?.toLowerCase() ?? p.premium_frequency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Annual Premium</p>
                      <p className="font-medium text-foreground">{formatCurrency(annualPremium(p))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Period</p>
                      <p className="font-medium text-foreground">{p.start_date || "?"} – {p.end_date || "?"}</p>
                    </div>
                  </div>
                  {p.notes && <p className="text-sm text-muted-foreground mt-2 italic">{p.notes}</p>}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => startEdit(p)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>Delete</Button>
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
