import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { api, type CategoryRule, type DescriptionItem, type AIPrediction } from "../api"

const CATEGORIES = [
  "FOOD", "SHOPPING", "UTILITIES", "TRANSPORT", "ENTERTAINMENT",
  "SUBSCRIPTION", "INSURANCE", "INVESTMENT", "HEALTHCARE",
  "SALARY", "RENT", "UPI", "TAXES", "TRAVEL", "INCOME", "OTHER",
]

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-48 bg-muted rounded-xl" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  )
}

export default function Categories() {
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [descriptions, setDescriptions] = useState<DescriptionItem[]>([])
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState("")

  const [predictions, setPredictions] = useState<(AIPrediction & { selected: boolean })[] | null>(null)
  const [predicting, setPredicting] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [rulesData, descData] = await Promise.all([
          api.categoryRules.list(),
          api.descriptions(),
        ])
        setRules(rulesData)
        setDescriptions(descData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim() || !category.trim()) return
    try {
      const result = await api.categoryRules.create(keyword.trim(), category.trim())
      alert(`Updated ${result.updated_count} transaction(s)`)
      setKeyword("")
      setCategory("")
      const rulesData = await api.categoryRules.list()
      setRules(rulesData)
    } catch {
      alert("Failed to create rule")
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.categoryRules.delete(id)
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch {
      alert("Failed to delete rule")
    }
  }

  async function runPreview() {
    setPredicting(true)
    try {
      const data = await api.autoCategorize.preview()
      setPredictions(
        data.predictions.map((p) => ({ ...p, selected: p.confidence >= 0.7 }))
      )
    } catch {
      alert("Auto-categorize failed. Check your Groq API key in .env")
    } finally {
      setPredicting(false)
    }
  }

  function updatePrediction(desc: string, patch: Partial<AIPrediction & { selected: boolean }>) {
    setPredictions((prev) =>
      prev?.map((p) => (p.description === desc ? { ...p, ...patch } : p)) ?? null
    )
  }

  async function applySelected() {
    if (!predictions) return
    const selected = predictions.filter((p) => p.selected && p.category)
    if (selected.length === 0) return
    setApplying(true)
    try {
      const result = await api.autoCategorize.apply(
        selected.map((p) => ({ description: p.description, category: p.category }))
      )
      alert(`Updated ${result.updated} transactions, created ${result.rules_created} rules`)
      setPredictions(null)
      const [rulesData, descData] = await Promise.all([
        api.categoryRules.list(),
        api.descriptions(),
      ])
      setRules(rulesData)
      setDescriptions(descData)
    } catch {
      alert("Failed to apply categories")
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
        <p className="text-muted-foreground mt-1">Auto-categorize transactions or manage rules</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auto-Categorize with AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Uses Groq (llama3-70b) to suggest categories for uncategorized transactions.
            Requires <code className="text-xs bg-muted px-1.5 py-0.5 rounded">GROQ_API_KEY</code> in <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env</code>.
            Get a free key at <span className="font-medium">console.groq.com</span>.
          </p>

          {!predictions && (
            <Button onClick={runPreview} disabled={predicting}>
              {predicting ? "Running AI..." : "Auto-Categorize with AI"}
            </Button>
          )}

          {predictions && predictions.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No uncategorized transactions found.
            </div>
          )}

          {predictions && predictions.length > 0 && (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left py-3 px-4 w-8">
                        <input
                          type="checkbox"
                          checked={predictions.every((p) => p.selected)}
                          onChange={(e) =>
                            setPredictions((prev) =>
                              prev?.map((p) => ({ ...p, selected: e.target.checked })) ?? null
                            )
                          }
                          className="accent-primary"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Predicted</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p) => (
                      <tr key={p.description} className="border-b border-border hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={p.selected}
                            onChange={(e) => updatePrediction(p.description, { selected: e.target.checked })}
                            className="accent-primary"
                          />
                        </td>
                        <td className="py-3 px-4 text-foreground max-w-xs truncate font-mono text-xs">
                          {p.description}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{p.count}</td>
                        <td className="py-3 px-4">
                          <select
                            value={p.category}
                            onChange={(e) => updatePrediction(p.description, { category: e.target.value })}
                            className="rounded-md border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <ConfidenceBadge value={p.confidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {predictions.filter((p) => p.selected).length} of {predictions.length} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPredictions(null)}>
                    Cancel
                  </Button>
                  <Button onClick={applySelected} disabled={applying || predictions.filter((p) => p.selected).length === 0}>
                    {applying ? "Applying..." : "Apply Selected"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            <div className="flex-1">
              <label htmlFor="keyword" className="block text-sm font-medium text-foreground mb-1">
                Keyword
              </label>
              <input
                id="keyword"
                list="descriptions-list"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Type or select a description..."
              />
              <datalist id="descriptions-list">
                {descriptions.map((d) => (
                  <option key={d.description} value={d.description} />
                ))}
              </datalist>
            </div>
            <div className="flex-1">
              <label htmlFor="category" className="block text-sm font-medium text-foreground mb-1">
                Category
              </label>
              <input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Groceries"
              />
            </div>
            <Button type="submit" disabled={!keyword.trim() || !category.trim()}>
              Map & Update
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules defined yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Keyword</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 text-foreground">{rule.keyword}</td>
                      <td className="py-3 px-4">
                        <Badge>{rule.category}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="danger" size="sm" onClick={() => handleDelete(rule.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const variant = pct >= 90 ? "success" as const : pct >= 70 ? "warning" as const : "danger" as const
  return <Badge variant={variant}>{pct}%</Badge>
}
