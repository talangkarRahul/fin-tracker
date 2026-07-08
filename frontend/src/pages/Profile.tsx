import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { api, type FinancialProfile } from "../api"

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
  const [profile, setProfile] = useState<Partial<FinancialProfile>>({})
  const [assets, setAssets] = useState<KVPair[]>([])
  const [liabilities, setLiabilities] = useState<KVPair[]>([])

  useEffect(() => {
    api.getProfile().then((p) => {
      setProfile(p)
      setAssets(kvToPairs(p.existing_assets))
      setLiabilities(kvToPairs(p.existing_liabilities))
    }).finally(() => setLoading(false))
  }, [])

  function set(key: string, value: unknown) {
    setProfile((p) => ({ ...p, [key]: value }))
  }

  function assetLabels() { return assets.map((a) => a.label.toLowerCase().trim()) }
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
      await api.updateProfile({
        ...profile,
        existing_assets: pairsToKv(assets),
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
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financial Profile</h1>
        <p className="text-muted-foreground mt-1">Your personal financial details used across all modules</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Age</label>
              <input type="number" min={1} max={120} value={profile.age ?? ""}
                onChange={(e) => set("age", e.target.value ? parseInt(e.target.value) : null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Monthly Income (₹)</label>
              <input type="number" min={0} step={1000} value={profile.income ?? ""}
                onChange={(e) => set("income", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Monthly Expenses (₹)</label>
              <input type="number" min={0} step={1000} value={profile.monthly_expenses ?? ""}
                onChange={(e) => set("monthly_expenses", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Dependents</label>
              <input type="number" min={0} max={20} value={profile.dependents ?? ""}
                onChange={(e) => set("dependents", e.target.value ? parseInt(e.target.value) : null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tax Regime</label>
              <select value={profile.tax_regime ?? ""}
                onChange={(e) => set("tax_regime", e.target.value || null)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select...</option>
                <option value="old">Old Regime</option>
                <option value="new">New Regime</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Risk Appetite</label>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Existing Assets</CardTitle>
            <Button size="sm" variant="outline" onClick={() => addCustom("asset")}>+ Custom</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {ASSET_PRESETS.map((preset) => {
              const exists = assetLabels().includes(preset.toLowerCase())
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addPreset(preset, "asset")}
                  disabled={exists}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    exists
                      ? "bg-primary/10 text-primary border-primary/30 cursor-default"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              )
            })}
          </div>
          {assets.length === 0 && <p className="text-sm text-muted-foreground">Click a preset above or add custom</p>}
          <div className="space-y-2">
            {assets.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <input type="text" value={item.label}
                  onChange={(e) => updateAsset(i, "label", e.target.value)}
                  placeholder="Asset name"
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" min={0} step={1000} value={item.amount || ""}
                  onChange={(e) => updateAsset(i, "amount", parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  className="w-36 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => removeAsset(i)} className="text-destructive hover:text-destructive/80 text-sm font-medium px-2">✕</button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Existing Liabilities</CardTitle>
            <Button size="sm" variant="outline" onClick={() => addCustom("liability")}>+ Custom</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {LIABILITY_PRESETS.map((preset) => {
              const exists = liabilityLabels().includes(preset.toLowerCase())
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addPreset(preset, "liability")}
                  disabled={exists}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    exists
                      ? "bg-primary/10 text-primary border-primary/30 cursor-default"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              )
            })}
          </div>
          {liabilities.length === 0 && <p className="text-sm text-muted-foreground">Click a preset above or add custom</p>}
          <div className="space-y-2">
            {liabilities.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <input type="text" value={item.label}
                  onChange={(e) => updateLiability(i, "label", e.target.value)}
                  placeholder="Liability name"
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" min={0} step={1000} value={item.amount || ""}
                  onChange={(e) => updateLiability(i, "amount", parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  className="w-36 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => removeLiability(i)} className="text-destructive hover:text-destructive/80 text-sm font-medium px-2">✕</button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Fund</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-foreground mb-1">Target (months of expenses)</label>
            <input type="number" min={1} max={24} value={profile.emergency_fund_months ?? 6}
              onChange={(e) => set("emergency_fund_months", parseInt(e.target.value) || 6)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  )
}
