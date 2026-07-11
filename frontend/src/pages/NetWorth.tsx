import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts"
import { TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, Equal, SortAsc, Wallet } from "lucide-react"

interface NWItem {
  label: string
  amount: number
}

interface NWHistoryPoint {
  date: string
  total_assets: number
  total_liabilities: number
  net_worth: number
}

interface NWData {
  total_assets: number
  total_liabilities: number
  net_worth: number
  assets: NWItem[]
  liabilities: NWItem[]
  history: NWHistoryPoint[]
}

async function fetchNW(): Promise<NWData> {
  const res = await fetch("/api/net-worth")
  return res.json()
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
}

export default function NetWorth() {
  const [data, setData] = useState<NWData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"amount" | "alpha">("amount")

  async function load() {
    setLoading(true)
    try {
      const d = await fetchNW()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function sortItems(items: NWItem[]): NWItem[] {
    if (sortBy === "amount") return [...items].sort((a, b) => b.amount - a.amount)
    return [...items].sort((a, b) => a.label.localeCompare(b.label))
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-36 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="h-72 bg-muted rounded-xl" />
          <div className="h-72 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const historyData = data.history.map((h) => ({
    ...h,
    date: h.date.slice(0, 7),
  }))

  const isPositive = data.net_worth >= 0
  const netWorthColor = isPositive ? "text-success" : "text-destructive"

  const barData = [
    { name: "Assets", amount: data.total_assets, fill: "hsl(var(--chart-1))" },
    { name: "Liabilities", amount: data.total_liabilities, fill: "hsl(var(--chart-2))" },
    { name: "Net Worth", amount: Math.abs(data.net_worth), fill: isPositive ? "hsl(var(--chart-3))" : "hsl(var(--chart-4))" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            <TrendingUp size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Net Worth</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Assets minus liabilities over time</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Hero net worth card */}
      <Card className="relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b rounded-l-xl ${
          isPositive ? "from-success to-success/60" : "from-destructive to-destructive/60"
        }`} />
        <CardContent className="pt-5 pb-5 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Your Net Worth</p>
              <p className={`text-3xl font-bold mt-0.5 ${netWorthColor}`}>
                {isPositive ? "" : "-"}{formatCurrency(Math.abs(data.net_worth))}
              </p>
            </div>
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-success/10 text-success">
                  <ArrowUpRight size={14} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Assets</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(data.total_assets)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
                  <ArrowDownRight size={14} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Liabilities</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(data.total_liabilities)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets / Liabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-success to-success/60 rounded-l-xl" />
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowUpRight size={14} />
                Assets
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSortBy(sortBy === "amount" ? "alpha" : "amount")} className="h-7 text-[10px] px-2">
                <SortAsc size={11} className="mr-0.5" />
                {sortBy === "amount" ? "Amount" : "A-Z"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {data.assets.length === 0 ? (
              <p className="text-xs text-muted-foreground">No assets recorded. Add them in your Profile.</p>
            ) : (
              <div className="space-y-2">
                {sortItems(data.assets).map((item) => {
                  const pct = data.total_assets ? (item.amount / data.total_assets) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground font-medium">{item.label}</span>
                        <span className="text-muted-foreground tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-0.5">
                        <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-destructive to-destructive/60 rounded-l-xl" />
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowDownRight size={14} />
                Liabilities
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSortBy(sortBy === "amount" ? "alpha" : "amount")} className="h-7 text-[10px] px-2">
                <SortAsc size={11} className="mr-0.5" />
                {sortBy === "amount" ? "Amount" : "A-Z"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {data.liabilities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No liabilities recorded. Add them in your Profile.</p>
            ) : (
              <div className="space-y-2">
                {sortItems(data.liabilities).map((item) => {
                  const pct = data.total_liabilities ? (item.amount / data.total_liabilities) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground font-medium">{item.label}</span>
                        <span className="text-destructive tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-0.5">
                        <div className="h-full bg-destructive rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-xl" />
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Equal size={14} />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} barSize={60}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-xl" />
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={14} />
              Net Worth Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {historyData.length < 2 ? (
              <div className="flex items-center justify-center h-[250px] text-xs text-muted-foreground">
                More data points needed. Check back after a few days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historyData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="net_worth" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Net Worth" dot={false} />
                  <Line type="monotone" dataKey="total_assets" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Assets" dot={false} />
                  <Line type="monotone" dataKey="total_liabilities" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Liabilities" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
