import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"

interface EFStatus {
  id: number
  target_months: number
  monthly_expenses: number
  current_amount: number
  target_amount: number
  deficit: number
  pct: number
  months_covered: number
}

async function fetchEF(): Promise<EFStatus> {
  const res = await fetch("/api/emergency-fund")
  return res.json()
}

async function updateEF(data: Partial<EFStatus>): Promise<EFStatus> {
  const res = await fetch("/api/emergency-fund", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

async function contributeEF(amount: number): Promise<EFStatus> {
  const res = await fetch("/api/emergency-fund/contribute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  })
  return res.json()
}

export default function EmergencyFund() {
  const [data, setData] = useState<EFStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [contributeAmount, setContributeAmount] = useState("")
  const [editingTarget, setEditingTarget] = useState(false)
  const [editMonths, setEditMonths] = useState("")
  const [editExpenses, setEditExpenses] = useState("")

  async function load() {
    setLoading(true)
    try {
      const d = await fetchEF()
      setData(d)
      setEditMonths(String(d.target_months))
      setEditExpenses(String(d.monthly_expenses))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleContribute() {
    const amt = parseFloat(contributeAmount)
    if (!amt || amt <= 0) return
    const d = await contributeEF(amt)
    setData(d)
    setContributeAmount("")
  }

  async function handleSaveSettings() {
    const months = parseFloat(editMonths)
    const expenses = parseFloat(editExpenses)
    if (!months || !expenses) return
    const d = await updateEF({ target_months: months, monthly_expenses: expenses })
    setData(d)
    setEditingTarget(false)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const statusBadge = data.pct >= 100
    ? { label: "Fully Funded", class: "bg-success/10 text-success" }
    : data.pct >= 50
      ? { label: "Building Up", class: "bg-warning/10 text-warning" }
      : { label: "Needs Attention", class: "bg-destructive/10 text-destructive" }

  const recommendedMin = data.monthly_expenses * 3
  const recommendedIdeal = data.monthly_expenses * 6
  const progressColor = data.pct >= 100 ? "bg-success" : data.pct >= 50 ? "bg-warning" : "bg-destructive"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Emergency Fund</h1>
          <p className="text-muted-foreground mt-1">Your financial safety net</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadge.class}`}>
          {statusBadge.label}
        </span>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground">Current Savings</p>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(data.current_amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Target</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(data.target_amount)}</p>
            </div>
          </div>
          <Progress value={data.pct} className="h-3" barClassName={progressColor} />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{data.pct}% funded</span>
            <span className="text-muted-foreground">{formatCurrency(data.deficit)} deficit</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Months Covered</p>
            <p className="text-2xl font-bold text-foreground">{data.months_covered}</p>
            <p className="text-xs text-muted-foreground">of {data.target_months} target</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Monthly Expenses</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(data.monthly_expenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Recommended Range</p>
            <p className="text-base font-bold text-foreground">{formatCurrency(recommendedMin)} – {formatCurrency(recommendedIdeal)}</p>
            <p className="text-xs text-muted-foreground">(3-6 months of expenses)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contribute</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditingTarget(!editingTarget)}>
              {editingTarget ? "Cancel" : "Edit Settings"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount to add"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              variant="success"
              onClick={handleContribute}
              disabled={!contributeAmount || parseFloat(contributeAmount) <= 0}
            >
              Add to Fund
            </Button>
          </div>

          {editingTarget && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Target Months</label>
                <input
                  type="number"
                  min="1"
                  value={editMonths}
                  onChange={(e) => setEditMonths(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Monthly Expenses</label>
                <input
                  type="number"
                  min="0"
                  value={editExpenses}
                  onChange={(e) => setEditExpenses(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="col-span-2">
                <Button size="sm" onClick={handleSaveSettings}>Save</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Why an Emergency Fund?</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>An emergency fund covers unexpected expenses like medical emergencies, job loss, or urgent home repairs — without going into debt.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>3 months</strong> — minimum for single income households with stable jobs</li>
            <li><strong>6 months</strong> — recommended for most people</li>
            <li><strong>9-12 months</strong> — if you have dependents, irregular income, or work in a volatile industry</li>
          </ul>
          <p className="pt-1">Keep your emergency fund in a <strong>high-interest savings account</strong> or <strong>liquid fund</strong> — easily accessible but earning some return.</p>
        </CardContent>
      </Card>
    </div>
  )
}
