import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import { api, type Goal } from "../api"

const GOAL_TYPES = ["savings", "debt_payoff", "investment", "emergency_fund", "purchase", "other"]


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
}

const emptyForm: GoalFormData = {
  name: "",
  goal_type: "savings",
  target_amount: "",
  current_amount: "0",
  target_date: "",
  category: "",
  notes: "",
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
        <select
          value={data.goal_type}
          onChange={(e) => onChange({ ...data, goal_type: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {GOAL_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
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

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [contributing, setContributing] = useState<Record<number, string>>({})
  const [form, setForm] = useState<GoalFormData>(emptyForm)

  async function load() {
    setLoading(true)
    try {
      const data = await api.goals.list()
      setGoals(data)
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
    if (!form.name || !form.target_amount) return
    await api.goals.create({
      name: form.name,
      goal_type: form.goal_type,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      target_date: form.target_date || undefined,
      category: form.category || undefined,
      notes: form.notes || undefined,
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
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "New Goal"}
        </Button>
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
            <div key={i} className="h-64 bg-muted rounded-xl" />
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
                          <Badge variant="primary">{goal.goal_type.replace(/_/g, " ")}</Badge>
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
