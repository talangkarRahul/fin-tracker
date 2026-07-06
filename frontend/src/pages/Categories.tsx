import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { api, type CategoryRule, type DescriptionItem } from "../api"

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

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
        <p className="text-muted-foreground mt-1">Manage category mapping rules</p>
      </div>

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
