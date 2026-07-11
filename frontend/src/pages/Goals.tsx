import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import { api, type Goal, type GoalCalculatorResult } from "../api"
import {
  Plus, X, Check, Pencil, Trash2, Wallet, Umbrella, GraduationCap,
  Home, Car, Plane, Heart, CreditCard, TrendingUp, ShoppingCart,
  Target, Calculator, Sparkles, ArrowRight,
} from "lucide-react"

const GOAL_TYPES = [
  { value: "savings", label: "Savings", icon: <Wallet size={15} /> },
  { value: "retirement", label: "Retirement", icon: <Umbrella size={15} /> },
  { value: "child_education", label: "Child Education", icon: <GraduationCap size={15} /> },
  { value: "house", label: "House", icon: <Home size={15} /> },
  { value: "car", label: "Car", icon: <Car size={15} /> },
  { value: "vacation", label: "Vacation", icon: <Plane size={15} /> },
  { value: "wedding", label: "Wedding", icon: <Heart size={15} /> },
  { value: "debt_payoff", label: "Debt Payoff", icon: <CreditCard size={15} /> },
  { value: "investment", label: "Investment", icon: <TrendingUp size={15} /> },
  { value: "purchase", label: "Purchase", icon: <ShoppingCart size={15} /> },
  { value: "other", label: "Custom", icon: <Target size={15} /> },
]

const GOAL_TYPE_MAP = Object.fromEntries(GOAL_TYPES.map((t) => [t.value, t]))

function pluralDays(days: number) {
  if (days === 0) return "Due today"
  if (days === 1) return "1 day left"
  return `${days} days left`
}

interface GoalFormData {
  name: string
  goal_type: string
  target_amount: string
  current_amount: string
  target_date: string
  category: string
  notes: string
  expected_return: string
}

const emptyForm: GoalFormData = {
  name: "",
  goal_type: "savings",
  target_amount: "",
  current_amount: "0",
  target_date: "",
  category: "",
  notes: "",
  expected_return: "8",
}

function GoalForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  data: GoalFormData
  onChange: (d: GoalFormData) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Name</label>
        <input type="text" value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Goal Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {GOAL_TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => onChange({ ...data, goal_type: t.value })}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition-all cursor-pointer ${
                data.goal_type === t.value
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-card text-muted-foreground hover:border-ring"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Target Amount (₹)</label>
          <input type="number" step="0.01" min="0" value={data.target_amount}
            onChange={(e) => onChange({ ...data, target_amount: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Current Amount</label>
          <input type="number" step="0.01" min="0" value={data.current_amount}
            onChange={(e) => onChange({ ...data, current_amount: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Target Date <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input type="date" value={data.target_date}
            onChange={(e) => onChange({ ...data, target_date: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Expected Return <span className="text-muted-foreground font-normal">% p.a.</span></label>
          <input type="number" step="0.1" min="0" max="50" value={data.expected_return}
            onChange={(e) => onChange({ ...data, expected_return: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Category</label>
        <input type="text" value={data.category}
          onChange={(e) => onChange({ ...data, category: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Notes</label>
        <textarea value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
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

function CalculatorPanel() {
  const [targetAmount, setTargetAmount] = useState("1000000")
  const [months, setMonths] = useState("60")
  const [currentAmount, setCurrentAmount] = useState("0")
  const [expectedReturn, setExpectedReturn] = useState("8")
  const [inflationRate, setInflationRate] = useState("6")
  const [result, setResult] = useState<GoalCalculatorResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function calculate() {
    const ta = parseFloat(targetAmount)
    const m = parseInt(months)
    if (!ta || !m || m <= 0) return
    setLoading(true)
    try {
      const res = await api.goals.calculator({
        target_amount: ta,
        months: m,
        current_amount: parseFloat(currentAmount) || 0,
        expected_return: parseFloat(expectedReturn) || 8,
        inflation_rate: parseFloat(inflationRate) || 6,
      })
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-primary" />
          <CardTitle className="text-sm font-semibold">SIP Calculator</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Find out how much you need to invest monthly to reach your goal.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Target Amount</label>
            <input type="number" value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Time (months)</label>
            <input type="number" value={months}
              onChange={(e) => setMonths(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Current Savings</label>
            <input type="number" value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Return % p.a.</label>
            <input type="number" value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Inflation %</label>
            <input type="number" value={inflationRate}
              onChange={(e) => setInflationRate(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <Button onClick={calculate} disabled={loading} size="sm">
          <Calculator size={14} className="mr-1" />
          {loading ? "Calculating..." : "Calculate"}
        </Button>
        {result && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-primary/10 p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-medium">Monthly SIP Needed</p>
              <p className="text-lg font-bold text-primary mt-0.5">{formatCurrency(result.monthly_sip)}</p>
            </div>
            <div className="rounded-xl bg-warning/10 p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-medium">Inflation-Adjusted Target</p>
              <p className="text-lg font-bold text-warning mt-0.5">{formatCurrency(result.inflation_adjusted_target)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [contributing, setContributing] = useState<Record<number, string>>({})
  const [form, setForm] = useState<GoalFormData>(emptyForm)
  const [motivation, setMotivation] = useState("")
  const [savingMotivation, setSavingMotivation] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api.goals.list()
      setGoals(data.filter((g) => g.goal_type !== "emergency_fund"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    api.getDashboardNote().then((n) => {
      setMotivation(n.content)
      setTimeout(() => {
        const el = document.getElementById("motivation-textarea")
        if (el) {
          el.style.height = "auto"
          el.style.height = el.scrollHeight + "px"
        }
      }, 0)
    }).catch(() => {})
  }, [])

  async function saveMotivation() {
    setSavingMotivation(true)
    try {
      await api.setDashboardNote(motivation)
    } finally {
      setSavingMotivation(false)
    }
  }

  function resetForm() {
    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  async function handleCreate() {
    if (!form.name || !form.target_amount) return
    await api.goals.create({
      name: form.name,
      goal_type: form.goal_type,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      target_date: form.target_date || undefined,
      category: form.category || undefined,
      notes: form.notes || undefined,
      expected_return: parseFloat(form.expected_return) || 8,
    })
    resetForm()
    await load()
  }

  async function handleUpdate(id: number) {
    if (!form.name || !form.target_amount) return
    await api.goals.update(id, {
      name: form.name,
      goal_type: form.goal_type,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      target_date: form.target_date || undefined,
      category: form.category || undefined,
      notes: form.notes || undefined,
      expected_return: parseFloat(form.expected_return) || 8,
    })
    resetForm()
    await load()
  }

  async function handleDelete(id: number) {
    await api.goals.delete(id)
    await load()
  }

  async function handleContribute(id: number) {
    const amount = parseFloat(contributing[id] || "")
    if (!amount || amount <= 0) return
    await api.goals.contribute(id, amount)
    setContributing((prev) => ({ ...prev, [id]: "" }))
    await load()
  }

  function startEdit(goal: Goal) {
    setForm({
      name: goal.name,
      goal_type: goal.goal_type,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      target_date: goal.target_date || "",
      category: goal.category || "",
      notes: goal.notes || "",
      expected_return: String(goal.expected_return ?? 8),
    })
    setEditingId(goal.id)
    setShowForm(false)
  }

  const summary = goals.reduce(
    (acc, g) => ({
      total: acc.total + 1,
      target: acc.target + g.target_amount,
      current: acc.current + (g.current_amount || 0),
      achieved: acc.achieved + (g.achieved ? 1 : 0),
    }),
    { total: 0, target: 0, current: 0, achieved: 0 },
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your savings and financial goals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowCalculator(!showCalculator); }}>
            <Calculator size={15} className="mr-1.5" />
            {showCalculator ? "Close" : "SIP Calculator"}
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? <X size={15} className="mr-1.5" /> : <Plus size={15} className="mr-1.5" />}
            {showForm ? "Cancel" : "New Goal"}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Total Goals</p>
            <p className="text-base font-bold mt-0.5">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Total Target</p>
            <p className="text-base font-bold mt-0.5">{formatCurrency(summary.target)}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Total Saved</p>
            <p className="text-base font-bold mt-0.5 text-success">{formatCurrency(summary.current)}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Achieved</p>
            <p className={`text-base font-bold mt-0.5 ${summary.achieved === summary.total ? "text-success" : "text-foreground"}`}>
              {summary.achieved}/{summary.total}
            </p>
          </CardContent>
        </Card>
      </div>

      {showCalculator && <CalculatorPanel />}

      {/* Motivation note */}
      <div className="bg-gradient-to-br from-primary/5 to-card border border-primary/10 rounded-xl px-5 py-4">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">My Goal</label>
            <textarea id="motivation-textarea" value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = "auto"
                el.style.height = el.scrollHeight + "px"
              }}
              placeholder="What's your financial goal? Write something that keeps you motivated..."
              rows={2}
              className="w-full bg-transparent border-none resize-none text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none overflow-hidden" />
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={saveMotivation} disabled={savingMotivation}>
                {savingMotivation ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">New Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalForm data={form} onChange={setForm} onSubmit={handleCreate} submitLabel="Create Goal" />
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-muted rounded-xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Target size={32} className="text-muted-foreground/60" />
          </div>
          <p className="text-lg font-medium text-foreground">No goals yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first goal to get started.</p>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="mt-4">
            <Plus size={15} className="mr-1.5" />
            Create Goal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const gt = GOAL_TYPE_MAP[goal.goal_type]
            const isBehind = goal.progress.on_track === false
            const pct = goal.progress.pct

            return (
              <Card key={goal.id} className="relative overflow-hidden hover:shadow-md transition-all group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b rounded-l-xl ${
                  goal.achieved ? "from-success to-success/60" :
                  isBehind ? "from-destructive to-destructive/60" :
                  "from-primary to-primary/60"
                }`} />
                {editingId === goal.id ? (
                  <>
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold">Edit Goal</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <GoalForm data={form} onChange={setForm} onSubmit={() => handleUpdate(goal.id)}
                        onCancel={resetForm} submitLabel="Save" />
                    </CardContent>
                  </>
                ) : (
                  <>
                    <CardHeader className="pb-1 pt-4 px-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            goal.achieved ? "bg-success/10 text-success" :
                            isBehind ? "bg-destructive/10 text-destructive" :
                            "bg-primary/10 text-primary"
                          }`}>
                            {gt?.icon ?? <Target size={15} />}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-semibold truncate">{goal.name}</CardTitle>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              <Badge variant="primary" className="text-[10px] px-1.5 py-0 capitalize">
                                {gt?.icon} {gt?.label ?? goal.goal_type.replace(/_/g, " ")}
                              </Badge>
                              {goal.category && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{goal.category}</Badge>
                              )}
                              {goal.achieved && (
                                <Badge variant="success" className="text-[10px] px-1.5 py-0">Achieved</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0 px-4 pb-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-foreground tabular-nums">{formatCurrency(goal.current_amount)}</span>
                          <span className="text-muted-foreground tabular-nums">{formatCurrency(goal.target_amount)}</span>
                        </div>
                        <Progress value={pct} className="h-1.5"
                          barClassName={goal.achieved ? "bg-success" : isBehind ? "bg-destructive" : "bg-primary"} />
                        <p className="text-[10px] text-muted-foreground mt-0.5 text-right tabular-nums">{Math.round(pct)}%</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Target</p>
                          <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(goal.target_amount)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Saved</p>
                          <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(goal.current_amount)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Remaining</p>
                          <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(goal.progress.remaining)}</p>
                        </div>
                      </div>

                      {goal.monthly_sip !== null && goal.monthly_sip !== undefined && (
                        <div className="rounded-lg bg-primary/5 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground font-medium">Monthly SIP Needed</p>
                          <p className="text-sm font-bold text-primary mt-0.5">{formatCurrency(goal.monthly_sip)}</p>
                          {goal.inflation_adjusted_target !== null && goal.inflation_adjusted_target !== undefined && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Adj. target: {formatCurrency(goal.inflation_adjusted_target)} @ {goal.expected_return ?? 8}%
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {goal.progress.days_left !== null && goal.progress.days_left !== undefined
                            ? pluralDays(goal.progress.days_left)
                            : "No deadline"}
                        </span>
                        <div className="flex items-center gap-1">
                          {goal.progress.on_track === true && <Badge variant="success" className="text-[10px] px-1.5 py-0">On Track</Badge>}
                          {goal.progress.on_track === false && <Badge variant="danger" className="text-[10px] px-1.5 py-0">Behind</Badge>}
                          {goal.progress.on_track === null && goal.target_date && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">No Data</Badge>}
                        </div>
                      </div>

                      {goal.notes && (
                        <p className="text-xs text-muted-foreground italic">{goal.notes}</p>
                      )}

                      {/* Contribute */}
                      <div className="flex gap-2">
                        <input type="number" step="0.01" min="0" placeholder="Amount to contribute"
                          value={contributing[goal.id] || ""}
                          onChange={(e) => setContributing((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                          className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                        <Button variant="success" size="sm"
                          onClick={() => handleContribute(goal.id)}
                          disabled={!contributing[goal.id] || parseFloat(contributing[goal.id]) <= 0}
                          className="h-8 text-xs">
                          <ArrowRight size={12} className="mr-0.5" />
                          Add
                        </Button>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="sm" onClick={() => startEdit(goal)} className="h-7 text-[10px] px-2">
                          <Pencil size={11} className="mr-0.5" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)}
                          className="h-7 text-[10px] px-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                          <Trash2 size={11} className="mr-0.5" />
                          Delete
                        </Button>
                      </div>
                      <div className="flex gap-2 pt-0.5 sm:hidden">
                        <Button variant="outline" size="sm" onClick={() => startEdit(goal)} className="h-7 text-[10px] px-2">
                          <Pencil size={11} className="mr-0.5" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)}
                          className="h-7 text-[10px] px-2 text-destructive">
                          <Trash2 size={11} className="mr-0.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
