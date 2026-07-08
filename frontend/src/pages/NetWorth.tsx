import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { formatCurrency } from "../lib/format"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts"

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
        <div className="h-40 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

  const netWorthColor = data.net_worth >= 0 ? "text-success" : "text-destructive"
  const isPositive = data.net_worth >= 0

  const barData = [
    { name: "Assets", amount: data.total_assets, fill: "hsl(var(--chart-1))" },
    { name: "Liabilities", amount: data.total_liabilities, fill: "hsl(var(--chart-2))" },
    { name: "Net Worth", amount: Math.abs(data.net_worth), fill: isPositive ? "hsl(var(--chart-3))" : "hsl(var(--chart-4))" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Net Worth</h1>
          <p className="text-muted-foreground mt-1">Assets minus liabilities over time</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Your Net Worth</p>
          <p className={`text-4xl font-bold ${netWorthColor}`}>
            {isPositive ? "" : "-"}{formatCurrency(Math.abs(data.net_worth))}
          </p>
          <div className="flex justify-center gap-8 mt-4 text-sm">
            <div>
              <span className="text-muted-foreground">Assets </span>
              <span className="font-semibold text-foreground">{formatCurrency(data.total_assets)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Liabilities </span>
              <span className="font-semibold text-foreground">{formatCurrency(data.total_liabilities)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Assets</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSortBy(sortBy === "amount" ? "alpha" : "amount")}>
                Sort: {sortBy === "amount" ? "Amount" : "A-Z"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets recorded. Add them in your Profile.</p>
            ) : (
              <div className="space-y-2">
                {sortItems(data.assets).map((item) => {
                  const pct = data.total_assets ? (item.amount / data.total_assets) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">{item.label}</span>
                        <span className="text-muted-foreground">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-0.5">
                        <div className="h-full bg-success rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Liabilities</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSortBy(sortBy === "amount" ? "alpha" : "amount")}>
                Sort: {sortBy === "amount" ? "Amount" : "A-Z"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.liabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No liabilities recorded. Add them in your Profile.</p>
            ) : (
              <div className="space-y-2">
                {sortItems(data.liabilities).map((item) => {
                  const pct = data.total_liabilities ? (item.amount / data.total_liabilities) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">{item.label}</span>
                        <span className="text-destructive">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-0.5">
                        <div className="h-full bg-destructive rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} barSize={60}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Net Worth Trend</CardTitle></CardHeader>
          <CardContent>
            {historyData.length < 2 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                More data points needed. Check back after a few days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historyData}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
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
