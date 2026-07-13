import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { api, type FinancialProfile } from "../api"
import { formatCurrency } from "../lib/format"
import { User, Wallet, Landmark, PiggyBank, Save, Plus, X, ShieldCheck, Users, Percent, GanttChartSquare, Link2, ExternalLink } from "lucide-react"

interface KVPair {
  label: string
  amount: number
}

const ASSET_PRESETS = [
  "Savings Account", "Fixed Deposit", "Mutual Funds", "Stocks",
  "PPF", "EPF", "NPS", "Gold / Jewelry", "Real Estate", "Cash in Hand",
]

const LIABILITY_PRESETS = [
  "Home Loan", "Personal Loan", "Credit Card", "Car Loan",
  "Education Loan", "Gold Loan",
]

const INVESTMENT_LINKED_LABELS = new Set([
  "Mutual Funds", "Stocks", "PPF", "EPF", "NPS",
])

function kvToPairs(obj: Record<string, number> | null): KVPair[] {
  if (!obj) return []
  return Object.entries(obj).map(([label, amount]) => ({ label, amount }))
}

function pairsToKv(pairs: KVPair[]): Record<string, number> {
  return Object.fromEntries(pairs.filter((p) => p.label.trim()).map((p) => [p.label.trim(), p.amount]))
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-32 bg-muted rounded" />
      <div className="h-96 bg-muted rounded-xl" />
    </div>
  )
}

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Partial<FinancialProfile & { investment_assets: { label: string; amount: number }[] }>>({})
  const [assets, setAssets] = useState<KVPair[]>([])
  const [investmentAssets, setInvestmentAssets] = useState<{ label: string; amount: number }[]>([])
  const [liabilities, setLiabilities] = useState<KVPair[]>([])

  useEffect(() => {
    api.getProfile().then((p: any) => {
      const { investment_assets, ...rest } = p
      setProfile(rest)
      setInvestmentAssets(investment_assets ?? [])
      // Manual assets exclude investment-linked labels
      const allAssets = kvToPairs(rest.existing_assets)
      setAssets(allAssets.filter((a) => !INVESTMENT_LINKED_LABELS.has(a.label)))
      setLiabilities(kvToPairs(rest.existing_liabilities))
    }).finally(() => setLoading(false))
  }, [])

  function set(key: string, value: unknown) {
    setProfile((p) => ({ ...p, [key]: value }))
  }

  function assetLabels() {
    const manual = assets.map((a) => a.label.toLowerCase().trim())
    const inv = investmentAssets.map((a) => a.label.toLowerCase().trim())
    return [...new Set([...manual, ...inv])]
  }
  function liabilityLabels() { return liabilities.map((l) => l.label.toLowerCase().trim()) }

  function addPreset(label: string, type: "asset" | "liability") {
    const labels = type === "asset" ? assetLabels() : liabilityLabels()
    if (labels.includes(label.toLowerCase())) return
    if (type === "asset") {
      setAssets((prev) => [...prev, { label, amount: 0 }])
    } else {
      setLiabilities((prev) => [...prev, { label, amount: 0 }])
    }
  }

  function addCustom(type: "asset" | "liability") {
    if (type === "asset") {
      setAssets((prev) => [...prev, { label: "", amount: 0 }])
    } else {
      setLiabilities((prev) => [...prev, { label: "", amount: 0 }])
    }
  }

  function updateAsset(i: number, key: keyof KVPair, val: string | number) {
    setAssets((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))
  }

  function updateLiability(i: number, key: keyof KVPair, val: string | number) {
    setLiabilities((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))
  }

  function removeAsset(i: number) { setAssets((prev) => prev.filter((_, idx) => idx !== i)) }
  function removeLiability(i: number) { setLiabilities((prev) => prev.filter((_, idx) => idx !== i)) }

  async function handleSave() {
    setSaving(true)
    try {
      const filtered = assets.filter((a) => !INVESTMENT_LINKED_LABELS.has(a.label))
      const existing = profile.existing_assets ?? {}
      const investmentLinked = Object.fromEntries(
        Object.entries(existing).filter(([label]) => INVESTMENT_LINKED_LABELS.has(label))
      )
      await api.updateProfile({
        ...profile,
        existing_assets: { ...investmentLinked, ...pairsToKv(filtered) },
        existing_liabilities: pairsToKv(liabilities),
      })
      alert("Profile saved")
    } catch {
      alert("Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <User size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your personal financial details used across all modules</p>
        </div>
      </div>

      {/* Personal Info */}
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-xl" />
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GanttChartSquare size={14} />
            Personal Info
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Age</label>
              <input type="number" min={1} max={120} value={profile.age ?? ""}
                onChange={(e) => set("age", e.target.value ? parseInt(e.target.value) : null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Monthly Income (₹)</label>
              <input type="number" min={0} step={1000} value={profile.income ?? ""}
                onChange={(e) => set("income", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Monthly Expenses (₹)</label>
              <input type="number" min={0} step={1000} value={profile.monthly_expenses ?? ""}
                onChange={(e) => set("monthly_expenses", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                <Users size={12} className="inline mr-1" />
                Dependents
              </label>
              <input type="number" min={0} max={20} value={profile.dependents ?? ""}
                onChange={(e) => set("dependents", e.target.value ? parseInt(e.target.value) : null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                <Percent size={12} className="inline mr-1" />
                Tax Regime
              </label>
              <select value={profile.tax_regime ?? ""}
                onChange={(e) => set("tax_regime", e.target.value || null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select...</option>
                <option value="old">Old Regime</option>
                <option value="new">New Regime</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                <ShieldCheck size={12} className="inline mr-1" />
                Risk Appetite
              </label>
              <select value={profile.risk_appetite ?? ""}
                onChange={(e) => set("risk_appetite", e.target.value || null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select...</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Assets */}
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-success to-success/60 rounded-l-xl" />
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet size={14} />
              Existing Assets
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => addCustom("asset")} className="h-7 text-[10px] px-2">
              <Plus size={11} className="mr-0.5" />
              Custom
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          {/* Investment-linked assets (read-only) */}
          {investmentAssets.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Link2 size={10} />
                From Investments (auto-synced)
              </p>
              <div className="space-y-1.5">
                {investmentAssets.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 bg-success/5 rounded-lg px-3 py-2">
                    <div className="flex-1 flex items-center gap-2">
                      <ExternalLink size={11} className="text-success shrink-0" />
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Preset buttons for non-investment assets */}
          <div className="flex flex-wrap gap-1.5">
            {ASSET_PRESETS.filter((p) => !INVESTMENT_LINKED_LABELS.has(p)).map((preset) => {
              const exists = assetLabels().includes(preset.toLowerCase())
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addPreset(preset, "asset")}
                  disabled={exists}
                  className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors cursor-pointer ${
                    exists
                      ? "bg-success/10 text-success border-success/30 cursor-default"
                      : "border-border text-muted-foreground hover:border-success/40 hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              )
            })}
          </div>
          {assets.filter((a) => !INVESTMENT_LINKED_LABELS.has(a.label)).length === 0 && (
            <p className="text-xs text-muted-foreground">Add custom assets like Real Estate, Cash, etc.</p>
          )}
          <div className="space-y-2">
            {assets.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={item.label}
                  onChange={(e) => updateAsset(i, "label", e.target.value)}
                  placeholder="Asset name"
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" min={0} step={1000} value={item.amount || ""}
                  onChange={(e) => updateAsset(i, "amount", parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  className="w-32 rounded-lg border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => removeAsset(i)}
                  className="text-destructive hover:text-destructive/80 p-1 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Existing Liabilities */}
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-destructive to-destructive/60 rounded-l-xl" />
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark size={14} />
              Existing Liabilities
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => addCustom("liability")} className="h-7 text-[10px] px-2">
              <Plus size={11} className="mr-0.5" />
              Custom
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {LIABILITY_PRESETS.map((preset) => {
              const exists = liabilityLabels().includes(preset.toLowerCase())
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addPreset(preset, "liability")}
                  disabled={exists}
                  className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors cursor-pointer ${
                    exists
                      ? "bg-destructive/10 text-destructive border-destructive/30 cursor-default"
                      : "border-border text-muted-foreground hover:border-destructive/40 hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              )
            })}
          </div>
          {liabilities.length === 0 && <p className="text-xs text-muted-foreground">Click a preset above or add custom</p>}
          <div className="space-y-2">
            {liabilities.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={item.label}
                  onChange={(e) => updateLiability(i, "label", e.target.value)}
                  placeholder="Liability name"
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" min={0} step={1000} value={item.amount || ""}
                  onChange={(e) => updateLiability(i, "amount", parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  className="w-32 rounded-lg border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => removeLiability(i)}
                  className="text-destructive hover:text-destructive/80 p-1 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Fund */}
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-warning to-warning/60 rounded-l-xl" />
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PiggyBank size={14} />
            Emergency Fund
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <div className="max-w-xs">
            <label className="block text-xs font-medium text-foreground mb-1">Target (months of expenses)</label>
            <input type="number" min={1} max={24} value={profile.emergency_fund_months ?? 6}
              onChange={(e) => set("emergency_fund_months", parseInt(e.target.value) || 6)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={15} className="mr-1.5" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  )
}
