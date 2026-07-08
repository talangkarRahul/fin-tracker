import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import { api, type Goal, type GoalCalculatorResult } from "../api"

const GOAL_TYPES = [
  { value: "savings", label: "Savings", emoji: "📦" },
  { value: "retirement", label: "Retirement", emoji: "🏖️" },
  { value: "child_education", label: "Child Education", emoji: "🎓" },
  { value: "house", label: "House", emoji: "🏠" },
  { value: "car", label: "Car", emoji: "🚗" },
  { value: "vacation", label: "Vacation", emoji: "✈️" },
  { value: "wedding", label: "Wedding", emoji: "💒" },
  { value: "debt_payoff", label: "Debt Payoff", emoji: "💳" },
  { value: "investment", label: "Investment", emoji: "📈" },
  { value: "purchase", label: "Purchase", emoji: "🛒" },
  { value: "other", label: "Custom", emoji: "🎯" },
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
        <label className="block text-sm font-medium text-foreground mb-1">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Goal Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {GOAL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...data, goal_type: t.value })}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                data.goal_type === t.value
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
          <label className="block text-sm font-medium text-foreground mb-1">Target Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={data.target_amount}
            onChange={(e) => onChange({ ...data, target_amount: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Current Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={data.current_amount}
            onChange={(e) => onChange({ ...data, current_amount: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Target Date <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            type="date"
            value={data.target_date}
            onChange={(e) => onChange({ ...data, target_date: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Expected Return <span className="text-muted-foreground font-normal">% p.a.</span></label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="50"
            value={data.expected_return}
            onChange={(e) => onChange({ ...data, expected_return: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Category</label>
        <input
          type="text"
          value={data.category}
          onChange={(e) => onChange({ ...data, category: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
        <textarea
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" onClick={onSubmit} size="sm">{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} size="sm">Cancel</Button>}
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
      <CardHeader><CardTitle>SIP Calculator</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Find out how much you need to invest monthly to reach your goal.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Target Amount</label>
            <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Time (months)</label>
            <input type="number" value={months} onChange={(e) => setMonths(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Current Savings</label>
            <input type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Return % p.a.</label>
            <input type="number" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Inflation %</label>
            <input type="number" value={inflationRate} onChange={(e) => setInflationRate(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <Button onClick={calculate} disabled={loading} size="sm">
          {loading ? "Calculating..." : "Calculate"}
        </Button>
        {result && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg bg-primary/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">Monthly SIP Needed</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(result.monthly_sip)}</p>
            </div>
            <div className="rounded-lg bg-warning/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">Inflation-Adjusted Target</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(result.inflation_adjusted_target)}</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Goals</h1>
          <p className="text-muted-foreground mt-1">Track your savings and financial goals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowCalculator(!showCalculator); }}>
            {showCalculator ? "Close" : "SIP Calculator"}
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? "Cancel" : "New Goal"}
          </Button>
        </div>
      </div>

      {showCalculator && <CalculatorPanel />}

      <div className="bg-gradient-to-br from-primary-light/60 to-card border border-primary/20 rounded-xl px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">🎯</span>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">My Goal</label>
            <textarea
              id="motivation-textarea"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = "auto"
                el.style.height = el.scrollHeight + "px"
              }}
              placeholder="What's your financial goal? Write something that keeps you motivated..."
              rows={2}
              className="w-full bg-transparent border-none resize-none text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none overflow-hidden"
            />
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={saveMotivation} disabled={savingMotivation}>
                {savingMotivation ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Goal</CardTitle></CardHeader>
          <CardContent>
            <GoalForm data={form} onChange={setForm} onSubmit={handleCreate} submitLabel="Create Goal" />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-muted rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No goals yet. Create your first goal to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <Card key={goal.id}>
              {editingId === goal.id ? (
                <>
                  <CardHeader><CardTitle>Edit Goal</CardTitle></CardHeader>
                  <CardContent>
                    <GoalForm
                      data={form}
                      onChange={setForm}
                      onSubmit={() => handleUpdate(goal.id)}
                      onCancel={resetForm}
                      submitLabel="Save"
                    />
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle>{goal.name}</CardTitle>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="primary">
                            {GOAL_TYPE_MAP[goal.goal_type]?.emoji}{" "}
                            {(GOAL_TYPE_MAP[goal.goal_type]?.label ?? goal.goal_type).replace(/_/g, " ")}
                          </Badge>
                          {goal.category && <Badge>{goal.category}</Badge>}
                          {goal.achieved && <Badge variant="success">Achieved</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium">{formatCurrency(goal.current_amount)}</span>
                        <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
                      </div>
                      <Progress value={goal.progress.pct} className="h-2.5" barClassName={goal.achieved ? "bg-success" : goal.progress.on_track === false ? "bg-destructive" : "bg-primary"} />
                      <p className="text-xs text-muted-foreground mt-1 text-right">{Math.round(goal.progress.pct)}%</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Target</p>
                        <p className="font-medium text-foreground">{formatCurrency(goal.target_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Current</p>
                        <p className="font-medium text-foreground">{formatCurrency(goal.current_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Remaining</p>
                        <p className="font-medium text-foreground">{formatCurrency(goal.progress.remaining)}</p>
                      </div>
                    </div>

                    {goal.monthly_sip !== null && goal.monthly_sip !== undefined && (
                      <div className="rounded-lg bg-primary/5 p-3 text-center">
                        <p className="text-xs text-muted-foreground">Monthly SIP Needed</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(goal.monthly_sip)}</p>
                        {goal.inflation_adjusted_target !== null && goal.inflation_adjusted_target !== undefined && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Inflation-adj. target: {formatCurrency(goal.inflation_adjusted_target)} @ {goal.expected_return ?? 8}% return
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {goal.progress.days_left !== null && goal.progress.days_left !== undefined
                          ? pluralDays(goal.progress.days_left)
                          : "No deadline"}
                      </span>
                      {goal.progress.on_track === true && (
                        <Badge variant="success">On Track</Badge>
                      )}
                      {goal.progress.on_track === false && (
                        <Badge variant="danger">Behind</Badge>
                      )}
                      {goal.progress.on_track === null && goal.target_date && (
                        <Badge variant="secondary">No Data</Badge>
                      )}
                    </div>

                    {goal.notes && (
                      <p className="text-sm text-muted-foreground italic">{goal.notes}</p>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Amount"
                        value={contributing[goal.id] || ""}
                        onChange={(e) => setContributing((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                        className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleContribute(goal.id)}
                        disabled={!contributing[goal.id] || parseFloat(contributing[goal.id]) <= 0}
                      >
                        Contribute
                      </Button>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-border">
                      <Button variant="outline" size="sm" onClick={() => startEdit(goal)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(goal.id)}>Delete</Button>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}