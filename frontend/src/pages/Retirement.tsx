import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import {
  PiggyBank, CalendarDays, Clock,
  Banknote, Settings, Check, X, Calculator,
  ArrowRightLeft, Info, ArrowRight
} from "lucide-react"

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const onTrack = data.pct >= 100
  const progressColor = onTrack ? "bg-success" : data.pct >= 50 ? "bg-warning" : "bg-destructive"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <PiggyBank size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Retirement Planner</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Plan your retirement corpus and savings target</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditing(!editing)}>
          {editing ? <X size={15} className="mr-1.5" /> : <Settings size={15} className="mr-1.5" />}
          {editing ? "Cancel" : "Adjust Assumptions"}
        </Button>
      </div>

      {data.monthly_expenses === 0 && (
        <Card className="relative overflow-hidden border-dashed border-border/50">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-xl" />
          <CardContent className="pt-5 pb-5 px-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Set Up Your Profile First</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Your retirement plan is calculated from your age and monthly expenses.
                  Fill in your financial profile to get a personalized retirement roadmap.
                </p>
              </div>
              <a href="/profile"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2">
                Go to Profile <ArrowRight size={12} />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress card */}
      <Card className="relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b rounded-l-xl ${
          onTrack ? "from-success to-success/60" : data.pct >= 50 ? "from-warning to-warning/60" : "from-destructive to-destructive/60"
        }`} />
        <CardContent className="pt-5 pb-5 px-4 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Current Corpus</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(data.current_corpus)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-medium">Corpus Needed</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(data.corpus_needed)}</p>
            </div>
          </div>
          <Progress value={data.pct} className="h-2.5" barClassName={progressColor} />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{data.pct}% funded</span>
            <span className="text-muted-foreground">{formatCurrency(data.gap)} gap</span>
          </div>
        </CardContent>
      </Card>

      {/* SIP needed + stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Calculator size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Monthly SIP Needed</p>
              <p className="text-sm font-bold text-primary">{formatCurrency(data.monthly_sip_needed)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted-foreground/10 text-muted-foreground shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Your Age</p>
              <p className="text-sm font-bold text-foreground">{data.current_age}</p>
              <p className="text-[10px] text-muted-foreground">Retire at {data.retirement_age}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted-foreground/10 text-muted-foreground shrink-0">
              <CalendarDays size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Time to Retirement</p>
              <p className="text-sm font-bold text-foreground">{data.years_to_retirement} yrs</p>
              <p className="text-[10px] text-muted-foreground">{data.years_in_retirement} yrs in retirement</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted-foreground/10 text-muted-foreground shrink-0">
              <Banknote size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Monthly Expenses at Retirement</p>
              <p className="text-sm font-bold text-foreground">{formatCurrency(data.monthly_expenses_at_retirement)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assumptions form */}
      {editing && (
        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-xl" />
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings size={14} />
              Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
              <Check size={14} className="mr-1.5" />
              {saving ? "Saving..." : "Recalculate"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline + Financials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-success to-success/60 rounded-l-xl" />
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays size={14} />
              Your Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Current age</span>
              <span className="font-medium text-foreground text-xs">{data.current_age}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Years until retirement</span>
              <span className="font-medium text-foreground text-xs">{data.years_to_retirement}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Retirement age</span>
              <span className="font-medium text-foreground text-xs">{data.retirement_age}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Years in retirement</span>
              <span className="font-medium text-foreground text-xs">{data.years_in_retirement}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Life expectancy</span>
              <span className="font-medium text-foreground text-xs">{data.life_expectancy}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-warning to-warning/60 rounded-l-xl" />
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowRightLeft size={14} />
              Financials at Retirement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Monthly expenses (today)</span>
              <span className="font-medium text-foreground text-xs">{formatCurrency(data.monthly_expenses)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Inflation-adjusted monthly</span>
              <span className="font-medium text-foreground text-xs">{formatCurrency(data.monthly_expenses_at_retirement)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Annual expenses at retirement</span>
              <span className="font-medium text-foreground text-xs">{formatCurrency(data.annual_expenses_at_retirement)}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-border">
              <span className="text-muted-foreground text-xs font-medium">Corpus needed</span>
              <span className="font-bold text-foreground text-xs">{formatCurrency(data.corpus_needed)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs font-medium">Current corpus</span>
              <span className="font-bold text-foreground text-xs">{formatCurrency(data.current_corpus)}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-border">
              <span className="text-muted-foreground text-xs font-medium">Monthly SIP required</span>
              <span className="font-bold text-primary text-xs">{formatCurrency(data.monthly_sip_needed)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10 rounded-l-xl" />
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Info size={14} />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4 space-y-2 text-xs text-muted-foreground">
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
