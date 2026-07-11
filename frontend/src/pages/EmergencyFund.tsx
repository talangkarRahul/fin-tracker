import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { formatCurrency } from "../lib/format"
import {
  ShieldCheck, PiggyBank, CalendarDays, ArrowRight, Settings,
  Lightbulb, TrendingUp, Wallet,
} from "lucide-react"

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
        <div className="h-40 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const isFullyFunded = data.pct >= 100
  const isBuilding = data.pct >= 50
  const progressColor = isFullyFunded ? "bg-success" : isBuilding ? "bg-warning" : "bg-destructive"
  const gradientColor = isFullyFunded
    ? "from-success to-success/60"
    : isBuilding
    ? "from-warning to-warning/60"
    : "from-destructive to-destructive/60"

  const recommendedMin = data.monthly_expenses * 3
  const recommendedIdeal = data.monthly_expenses * 6

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Emergency Fund</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your financial safety net</p>
          </div>
        </div>
        <Badge variant={isFullyFunded ? "success" : isBuilding ? "warning" : "danger"}
          className="text-xs px-3 py-1">
          {isFullyFunded ? "Fully Funded" : isBuilding ? "Building Up" : "Needs Attention"}
        </Badge>
      </div>

      {/* Main progress card */}
      <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${gradientColor} rounded-l-xl`} />
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Current Savings</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{formatCurrency(data.current_amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium">Target</p>
              <p className="text-lg font-semibold text-foreground mt-0.5">{formatCurrency(data.target_amount)}</p>
            </div>
          </div>
          <Progress value={data.pct} className="h-2" barClassName={progressColor} />
          <div className="flex justify-between text-xs mt-1.5">
            <span className="text-muted-foreground tabular-nums">{Math.round(data.pct)}% funded</span>
            <span className="text-muted-foreground tabular-nums">{formatCurrency(data.deficit)} deficit</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <CalendarDays size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Months Covered</p>
              <p className="text-base font-bold">{data.months_covered} <span className="text-xs font-normal text-muted-foreground">/ {data.target_months}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Monthly Expenses</p>
              <p className="text-base font-bold">{formatCurrency(data.monthly_expenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <Wallet size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Recommended Range</p>
              <p className="text-sm font-bold">{formatCurrency(recommendedMin)} – {formatCurrency(recommendedIdeal)}</p>
              <p className="text-[10px] text-muted-foreground">(3-6 months)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contribute + Settings card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank size={16} className="text-primary" />
              <CardTitle className="text-sm font-semibold">Contribute</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditingTarget(!editingTarget)}
              className="h-8 text-xs">
              <Settings size={13} className="mr-1" />
              {editingTarget ? "Cancel" : "Settings"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input type="number" step="0.01" min="0" placeholder="Amount to add"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <Button variant="success" onClick={handleContribute}
              disabled={!contributeAmount || parseFloat(contributeAmount) <= 0}
              className="h-10 text-sm">
              <ArrowRight size={14} className="mr-1" />
              Add
            </Button>
          </div>

          {editingTarget && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Target Months</label>
                <input type="number" min="1" value={editMonths}
                  onChange={(e) => setEditMonths(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Monthly Expenses</label>
                <input type="number" min="0" value={editExpenses}
                  onChange={(e) => setEditExpenses(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <Button size="sm" onClick={handleSaveSettings}>
                  <Settings size={13} className="mr-1" />
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-warning" />
            <CardTitle className="text-sm font-semibold">Why an Emergency Fund?</CardTitle>
          </div>
        </CardHeader>
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
