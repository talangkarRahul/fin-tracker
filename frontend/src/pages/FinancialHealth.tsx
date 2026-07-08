import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

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

function scoreColor(s: number): string {
  if (s >= 80) return "bg-success"
  if (s >= 55) return "bg-warning"
  return "bg-destructive"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financial Health</h1>
          <p className="text-muted-foreground mt-1">Overall assessment of your financial well-being</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
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

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Component Scores</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical" barSize={20}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value: number) => [`${Math.round(value)}/100`, "Score"]}
                />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COMPONENT_ORDER.map((key) => {
          const c = data.components[key]
          if (!c) return null
          return (
            <Card key={key}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <span className="text-xs text-muted-foreground">{c.weight}% weight</span>
                </div>
                <Progress value={c.score} className="h-2" barClassName={scoreColor(c.score)} />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground">{Math.round(c.score)}/100</span>
                  <span className="text-xs text-muted-foreground">{c.detail}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
