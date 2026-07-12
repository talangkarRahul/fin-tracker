import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { api, type CategoryRule, type DescriptionItem, type AIPrediction } from "../api"
import { Tags, Sparkles, Plus, Trash2, Check, X, ChevronRight, BrainCircuit } from "lucide-react"

const CATEGORIES = [
  "FOOD", "SHOPPING", "UTILITIES", "TRANSPORT", "ENTERTAINMENT",
  "SUBSCRIPTION", "INSURANCE", "INVESTMENT", "HEALTHCARE",
  "SALARY", "RENT", "UPI", "TAXES", "TRAVEL", "INCOME", "OTHER",
]

const GROUPS = ["NEEDS", "WANTS", "INVESTMENT", "NOT_APPLICABLE"]

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
        selected.map((p) => ({ description: p.description, category: p.category, group: p.group || undefined }))
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <Tags size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Auto-categorize transactions or manage rules</p>
        </div>
      </div>

      {/* AI Auto-Categorize */}
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-xl" />
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BrainCircuit size={14} />
            Auto-Categorize with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Uses Groq (llama3-70b) to suggest categories for uncategorized transactions.
            Requires <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">GROQ_API_KEY</code> in <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">.env</code>.
            Get a free key at <span className="font-medium">console.groq.com</span>.
          </p>

          {!predictions && (
            <Button onClick={runPreview} disabled={predicting} size="sm">
              <Sparkles size={14} className="mr-1.5" />
              {predicting ? "Running AI..." : "Auto-Categorize with AI"}
            </Button>
          )}

          {predictions && predictions.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No uncategorized transactions found.
            </div>
          )}

          {predictions && predictions.length > 0 && (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left py-2.5 px-3 w-8">
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
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Description</th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Predicted Category</th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Group</th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p) => (
                      <tr key={p.description} className="border-b border-border hover:bg-muted/30">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={p.selected}
                            onChange={(e) => updatePrediction(p.description, { selected: e.target.checked })}
                            className="accent-primary"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-foreground max-w-xs truncate font-mono text-[11px]">
                          {p.description}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{p.count}</td>
                        <td className="py-2.5 px-3">
                          <input
                            value={p.category}
                            list="prediction-categories"
                            onChange={(e) => updatePrediction(p.description, { category: e.target.value })}
                            className="w-32 rounded-md border border-border bg-card px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Type or pick..."
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={p.group || ""}
                            onChange={(e) => updatePrediction(p.description, { group: e.target.value || null })}
                            className="w-28 rounded-md border border-border bg-card px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Auto</option>
                            {GROUPS.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <ConfidenceBadge value={p.confidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <datalist id="prediction-categories">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {predictions.filter((p) => p.selected).length} of {predictions.length} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPredictions(null)} size="sm" className="h-7 text-[10px] px-2">
                    <X size={11} className="mr-0.5" />
                    Cancel
                  </Button>
                  <Button onClick={applySelected} disabled={applying || predictions.filter((p) => p.selected).length === 0} size="sm" className="h-7 text-[10px] px-2">
                    <Check size={11} className="mr-0.5" />
                    {applying ? "Applying..." : "Apply Selected"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Rule */}
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-success to-success/60 rounded-l-xl" />
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plus size={14} />
            New Rule
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="keyword" className="block text-xs font-medium text-foreground mb-1">Keyword</label>
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
              <label htmlFor="category" className="block text-xs font-medium text-foreground mb-1">Category</label>
              <input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Groceries"
              />
            </div>
            <Button type="submit" disabled={!keyword.trim() || !category.trim()} size="sm" className="h-7 text-[10px] px-2">
              <ChevronRight size={11} className="mr-0.5" />
              Map & Update
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Rules */}
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10 rounded-l-xl" />
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Tags size={14} />
            Existing Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          {rules.length === 0 ? (
            <p className="text-xs text-muted-foreground">No rules defined yet</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground sticky top-0 bg-card">Keyword</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground sticky top-0 bg-card">Category</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground sticky top-0 bg-card">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-border hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-foreground font-mono text-[11px]">{rule.keyword}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="primary" className="text-[10px] px-1.5 py-0">{rule.category}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}
                          className="h-6 text-[10px] px-1.5 text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                          <Trash2 size={11} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
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
  return <Badge variant={variant} className="text-[10px] px-1.5 py-0">{pct}%</Badge>
}
