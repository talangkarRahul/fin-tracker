import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Activity, RefreshCw, ShieldCheck, TrendingUp, Heart, Landmark, PiggyBank, Target, DollarSign, AlertTriangle, Sparkles } from "lucide-react"

interface ComponentScore {
  score: number
  weight: number
  label: string
  detail: string
}

interface HealthData {
  score: number
  rating: string
  color: string
  components: Record<string, ComponentScore>
}

function Gauge({ score, rating, color }: { score: number; color: string; rating: string }) {
  const r = 70
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  const colorMap: Record<string, string> = {
    success: "hsl(var(--chart-3))",
    primary: "hsl(var(--chart-1))",
    warning: "hsl(var(--chart-5))",
    danger: "hsl(var(--chart-4))",
    destructive: "hsl(var(--destructive))",
  }

  const strokeColor = colorMap[color] || "hsl(var(--muted-foreground))"

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
        <circle
          cx="90" cy="90" r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
        <text x="90" y="82" textAnchor="middle" fontSize="32" fontWeight="bold" fill="hsl(var(--foreground))">
          {Math.round(score)}
        </text>
        <text x="90" y="106" textAnchor="middle" fontSize="14" fill={strokeColor} fontWeight="600">
          {rating}
        </text>
      </svg>
    </div>
  )
}

async function fetchHealth(): Promise<HealthData> {
  const res = await fetch("/api/financial-health")
  return res.json()
}

const COMPONENT_ORDER = ["emergency_fund", "debt_to_income", "savings_rate", "goal_progress", "net_worth", "budget_adherence"]

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  emergency_fund: <PiggyBank size={14} />,
  debt_to_income: <Landmark size={14} />,
  savings_rate: <TrendingUp size={14} />,
  goal_progress: <Target size={14} />,
  net_worth: <DollarSign size={14} />,
  budget_adherence: <Activity size={14} />,
}

function scoreColor(s: number): string {
  if (s >= 80) return "bg-success"
  if (s >= 55) return "bg-warning"
  return "bg-destructive"
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
}

export default function FinancialHealth() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const d = await fetchHealth()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const chartData = COMPONENT_ORDER.map((key) => ({
    name: data.components[key]?.label ?? key,
    score: data.components[key]?.score ?? 0,
    weight: data.components[key]?.weight ?? 0,
  }))

  const getScoreGradient = () => {
    if (data.score >= 80) return "from-success to-success/60"
    if (data.score >= 55) return "from-warning to-warning/60"
    return "from-destructive to-destructive/60"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Heart size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Financial Health</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Overall assessment of your financial well-being</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Gauge + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="relative overflow-hidden lg:col-span-1">
          <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b rounded-l-xl ${getScoreGradient()}`} />
          <CardContent className="pt-5 pb-4 px-4">
            <Gauge score={data.score} rating={data.rating} color={data.color} />
            <div className="text-center mt-2">
              <p className="text-xs text-muted-foreground">
                {data.score >= 90 ? "Excellent! You're in great shape." :
                 data.score >= 75 ? "Good job! A few areas to improve." :
                 data.score >= 55 ? "Fair. Focus on the weaker areas below." :
                 data.score >= 35 ? "Needs work. Start with the basics." :
                 "Critical. Time to take action."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-xl" />
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity size={14} />
              Component Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical" barSize={20}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${Math.round(value)}/100`, "Score"]} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--chart-${(i % 8) + 1}))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Component cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {COMPONENT_ORDER.map((key) => {
          const c = data.components[key]
          if (!c) return null
          const gradientColor = c.score >= 80 ? "from-success to-success/60" : c.score >= 55 ? "from-warning to-warning/60" : "from-destructive to-destructive/60"
          return (
            <Card key={key} className="relative overflow-hidden hover:shadow-sm transition-shadow">
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b rounded-l-xl ${gradientColor}`} />
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      c.score >= 80 ? "bg-success/10 text-success" : c.score >= 55 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                    }`}>
                      {COMPONENT_ICONS[key] ?? <Sparkles size={14} />}
                    </div>
                    <p className="text-xs font-semibold text-foreground">{c.label}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.weight}%</span>
                </div>
                <Progress value={c.score} className="h-1.5" barClassName={scoreColor(c.score)} />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-bold text-foreground">{Math.round(c.score)}/100</span>
                  <span className="text-[10px] text-muted-foreground text-right leading-tight max-w-[160px]">{c.detail}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
