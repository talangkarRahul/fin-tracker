import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"

interface RetirementData {
  id: number
  retirement_age: number
  life_expectancy: number
  expected_inflation: number
  pre_retirement_return: number
  post_retirement_return: number
  current_age: number
  monthly_expenses: number
  current_corpus: number
  years_to_retirement: number
  years_in_retirement: number
  monthly_expenses_at_retirement: number
  annual_expenses_at_retirement: number
  corpus_needed: number
  gap: number
  pct: number
  monthly_sip_needed: number
}

async function fetchPlan(): Promise<RetirementData> {
  const res = await fetch("/api/retirement-plan")
  return res.json()
}

async function updatePlan(data: Partial<RetirementData>): Promise<RetirementData> {
  const res = await fetch("/api/retirement-plan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export default function Retirement() {
  const [data, setData] = useState<RetirementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    retirement_age: "60",
    life_expectancy: "85",
    expected_inflation: "6",
    pre_retirement_return: "8",
    post_retirement_return: "6",
    current_corpus: "0",
  })

  async function load() {
    setLoading(true)
    try {
      const d = await fetchPlan()
      setData(d)
      setForm({
        retirement_age: String(d.retirement_age),
        life_expectancy: String(d.life_expectancy),
        expected_inflation: String(d.expected_inflation),
        pre_retirement_return: String(d.pre_retirement_return),
        post_retirement_return: String(d.post_retirement_return),
        current_corpus: String(d.current_corpus),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const d = await updatePlan({
        retirement_age: parseInt(form.retirement_age) || 60,
        life_expectancy: parseInt(form.life_expectancy) || 85,
        expected_inflation: parseFloat(form.expected_inflation) || 6,
        pre_retirement_return: parseFloat(form.pre_retirement_return) || 8,
        post_retirement_return: parseFloat(form.post_retirement_return) || 6,
        current_corpus: parseFloat(form.current_corpus) || 0,
      })
      setData(d)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const onTrack = data.pct >= 100
  const progressColor = onTrack ? "bg-success" : data.pct >= 50 ? "bg-warning" : "bg-destructive"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Retirement Planner</h1>
          <p className="text-muted-foreground mt-1">Plan your retirement corpus and savings target</p>
        </div>
        <Button variant="outline" onClick={() => setEditing(!editing)}>
          {editing ? "Cancel" : "Adjust Assumptions"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground">Current Corpus</p>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(data.current_corpus)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Corpus Needed</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(data.corpus_needed)}</p>
            </div>
          </div>
          <Progress value={data.pct} className="h-3" barClassName={progressColor} />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{data.pct}% funded</span>
            <span className="text-muted-foreground">{formatCurrency(data.gap)} gap</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Monthly SIP Needed</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(data.monthly_sip_needed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Your Age</p>
            <p className="text-xl font-bold text-foreground">{data.current_age}</p>
            <p className="text-xs text-muted-foreground">Retire at {data.retirement_age}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Time to Retirement</p>
            <p className="text-xl font-bold text-foreground">{data.years_to_retirement} yrs</p>
            <p className="text-xs text-muted-foreground">{data.years_in_retirement} yrs in retirement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Monthly Expenses at Retirement</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(data.monthly_expenses_at_retirement)}</p>
          </CardContent>
        </Card>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>Assumptions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Retirement Age</label>
                <input type="number" value={form.retirement_age} onChange={(e) => setForm({ ...form, retirement_age: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Life Expectancy</label>
                <input type="number" value={form.life_expectancy} onChange={(e) => setForm({ ...form, life_expectancy: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Expected Inflation %</label>
                <input type="number" step="0.1" value={form.expected_inflation} onChange={(e) => setForm({ ...form, expected_inflation: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Pre-Retirement Return %</label>
                <input type="number" step="0.1" value={form.pre_retirement_return} onChange={(e) => setForm({ ...form, pre_retirement_return: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Post-Retirement Return %</label>
                <input type="number" step="0.1" value={form.post_retirement_return} onChange={(e) => setForm({ ...form, post_retirement_return: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Current Corpus</label>
                <input type="number" value={form.current_corpus} onChange={(e) => setForm({ ...form, current_corpus: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? "Saving..." : "Recalculate"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Your Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current age</span>
              <span className="font-medium text-foreground">{data.current_age}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Years until retirement</span>
              <span className="font-medium text-foreground">{data.years_to_retirement}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retirement age</span>
              <span className="font-medium text-foreground">{data.retirement_age}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Years in retirement</span>
              <span className="font-medium text-foreground">{data.years_in_retirement}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Life expectancy</span>
              <span className="font-medium text-foreground">{data.life_expectancy}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Financials at Retirement</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly expenses (today)</span>
              <span className="font-medium text-foreground">{formatCurrency(data.monthly_expenses)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inflation-adjusted monthly</span>
              <span className="font-medium text-foreground">{formatCurrency(data.monthly_expenses_at_retirement)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annual expenses at retirement</span>
              <span className="font-medium text-foreground">{formatCurrency(data.annual_expenses_at_retirement)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground font-medium">Corpus needed</span>
              <span className="font-bold text-foreground">{formatCurrency(data.corpus_needed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Current corpus</span>
              <span className="font-bold text-foreground">{formatCurrency(data.current_corpus)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground font-medium">Monthly SIP required</span>
              <span className="font-bold text-primary">{formatCurrency(data.monthly_sip_needed)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>How It Works</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>This calculator estimates the retirement corpus you'll need based on your current expenses, expected inflation, and desired retirement age. It assumes your expenses grow with inflation until retirement, then your corpus earns a post-retirement return while you draw down on it.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Corpus needed</strong> — calculated as the present value (at retirement) of all future expenses during retirement, discounted at the post-retirement return rate</li>
            <li><strong>Monthly SIP</strong> — how much you need to invest each month from now until retirement, assuming your current corpus is already invested at the pre-retirement return rate</li>
            <li><strong>Current corpus</strong> — automatically includes your active investments and any retirement goals you've set. You can override it in assumptions.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
