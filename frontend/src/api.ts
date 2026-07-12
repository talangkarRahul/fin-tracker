const BASE = "/api"

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST ${path}: ${res.status}`)
  return res.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status}`)
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" })
  if (!res.ok) throw new Error(`DELETE ${path}: ${res.status}`)
  return res.json()
}

export interface ColumnMapping {
  date_column: string
  description_column: string
  amount_column?: string
  debit_column?: string
  credit_column?: string
  balance_column?: string
  date_format?: "dayfirst" | "monthfirst"
}

async function importCSV(file: File, mapping: ColumnMapping): Promise<{ status: string; imported: number }> {
  const form = new FormData()
  form.append("file", file)
  form.append("mapping", JSON.stringify(mapping))
  const res = await fetch(`${BASE}/import`, { method: "POST", body: form })
  if (!res.ok) throw new Error(`POST /import: ${res.status}`)
  return res.json()
}

async function importPDFPreview(
  file: File
): Promise<{ columns: string[]; rows: string[][] }> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BASE}/import/pdf-preview`, { method: "POST", body: form })
  if (!res.ok) throw new Error(`POST /import/pdf-preview: ${res.status}`)
  return res.json()
}

async function importPDF(file: File, mapping: ColumnMapping): Promise<{ status: string; imported: number }> {
  const form = new FormData()
  form.append("file", file)
  form.append("mapping", JSON.stringify(mapping))
  const res = await fetch(`${BASE}/import/pdf`, { method: "POST", body: form })
  if (!res.ok) throw new Error(`POST /import/pdf: ${res.status}`)
  return res.json()
}

export interface Summary {
  income: number; expenses: number; savings: number
}

export interface Goal {
  id: number; name: string; goal_type: string
  target_amount: number; current_amount: number
  invested_via_goal: number
  target_date: string; category: string | null
  notes: string | null; achieved: boolean
  expected_return: number
  progress: { pct: number; remaining: number; days_left: number; on_track: boolean | null }
  monthly_sip: number | null
  inflation_adjusted_target: number | null
  linked_investments: Array<{
    id: number; name: string
    amount_invested: number; current_value: number
    investment_type: string
  }>
}

export interface Budget {
  id: number; category: string; period: string
  limit_amount: number; start_date: string; end_date: string | null
  spent: number; remaining: number; pct: number; alert: string | null
}

export interface RecurringItem {
  id: number; description: string; category: string | null
  amount: number; frequency: string; interval: number
  next_run: string; last_run: string | null; end_date: string | null; active: boolean
}

export interface CategoryRule {
  id: number; keyword: string; category: string
}

export interface DescriptionItem {
  description: string; count: number
}

export interface Transaction {
  id: number; date: string; description: string
  amount: number; balance: number | null
  transaction_type: string; category: string
  group: string | null
}



export interface MonthlyRow {
  month: string; income: number; expenses: number; savings: number; savings_rate: number
}

export interface CategoryRow {
  category: string; amount: number; pct: number
}

export interface TrendPoint {
  month: string; category: string; amount: number
}

export interface BudgetVsActual {
  category: string; limit: number; spent: number; remaining: number; pct: number
}

export const api = {
  summary: (date_from?: string, date_to?: string) => {
    const params = new URLSearchParams()
    if (date_from) params.set("date_from", date_from)
    if (date_to) params.set("date_to", date_to)
    const qs = params.toString()
    return get<Summary>(`/summary${qs ? `?${qs}` : ""}`)
  },
  expenseBreakdown: (date_from?: string, date_to?: string) => {
    const params = new URLSearchParams()
    if (date_from) params.set("date_from", date_from)
    if (date_to) params.set("date_to", date_to)
    const qs = params.toString()
    return get<Record<string, number>>(`/expense-breakdown${qs ? `?${qs}` : ""}`)
  },
  savingsRate: (date_from?: string, date_to?: string) => {
    const params = new URLSearchParams()
    if (date_from) params.set("date_from", date_from)
    if (date_to) params.set("date_to", date_to)
    const qs = params.toString()
    return get<{ rate: number }>(`/savings-rate${qs ? `?${qs}` : ""}`)
  },
  transactions: () => get<Transaction[]>("/transactions"),
  createTransaction: (data: Partial<Transaction>) => post<Transaction>("/transactions", data),
  updateTransaction: (id: number, data: Partial<Transaction>) => put<Transaction>(`/transactions/${id}`, data),
  deleteTransaction: (id: number) => del(`/transactions/${id}`),
  importCSV,
  importPDFPreview,
  importPDF,
  goals: {
    list: () => get<Goal[]>("/goals"),
    get: (id: number) => get<Goal>(`/goals/${id}`),
    create: (data: Partial<Goal>) => post<Goal>("/goals", data),
    update: (id: number, data: Partial<Goal>) => put<Goal>(`/goals/${id}`, data),
    delete: (id: number) => del(`/goals/${id}`),
    contribute: (id: number, amount: number) => post<Goal>(`/goals/${id}/contribute`, { amount }),
    calculator: (params: {
      target_amount: number; months: number
      current_amount?: number; expected_return?: number; inflation_rate?: number
    }) => {
      const qs = new URLSearchParams({
        target_amount: String(params.target_amount),
        months: String(params.months),
        current_amount: String(params.current_amount ?? 0),
        expected_return: String(params.expected_return ?? 8),
        inflation_rate: String(params.inflation_rate ?? 6),
      }).toString()
      return get<GoalCalculatorResult>(`/goals/calculator?${qs}`)
    },
  },
  budgets: {
    list: () => get<Budget[]>("/budgets"),
    get: (id: number) => get<Budget>(`/budgets/${id}`),
    create: (data: Partial<Budget>) => post<Budget>("/budgets", data),
    update: (id: number, data: Partial<Budget>) => put<Budget>(`/budgets/${id}`, data),
    delete: (id: number) => del(`/budgets/${id}`),
  },
  recurring: {
    list: () => get<RecurringItem[]>("/recurring"),
    get: (id: number) => get<RecurringItem>(`/recurring/${id}`),
    create: (data: Partial<RecurringItem>) => post<RecurringItem>("/recurring", data),
    update: (id: number, data: Partial<RecurringItem>) => put<RecurringItem>(`/recurring/${id}`, data),
    delete: (id: number) => del(`/recurring/${id}`),
    toggle: (id: number) => post(`/recurring/${id}/toggle`),
    process: () => post<{ processed: number }>("/recurring/process"),
  },
  categoryRules: {
    list: () => get<CategoryRule[]>("/category-rules"),
    create: (keyword: string, category: string) => post<CategoryRule & { updated_count: number }>("/category-rules", { keyword, category }),
    delete: (id: number) => del(`/category-rules/${id}`),
  },
  descriptions: () => get<DescriptionItem[]>("/descriptions"),
  getDashboardNote: () => get<{ id: number; content: string }>("/dashboard-note"),
  setDashboardNote: (content: string) => put<{ id: number; content: string }>("/dashboard-note", { content }),
  reports: {
    monthly: (months = 12, date_from?: string, date_to?: string) => {
      const params = new URLSearchParams()
      params.set("months", String(months))
      if (date_from) params.set("date_from", date_from)
      if (date_to) params.set("date_to", date_to)
      const qs = params.toString()
      return get<MonthlyRow[]>(`/reports/monthly?${qs}`)
    },
    category: (month?: string, date_from?: string, date_to?: string) => {
      const params = new URLSearchParams()
      if (month) params.set("month", month)
      if (date_from) params.set("date_from", date_from)
      if (date_to) params.set("date_to", date_to)
      const qs = params.toString()
      return get<CategoryRow[]>(`/reports/category${qs ? `?${qs}` : ""}`)
    },
    trends: (months = 6, categories?: string, date_from?: string, date_to?: string) => {
      const params = new URLSearchParams()
      params.set("months", String(months))
      if (categories) params.set("categories", categories)
      if (date_from) params.set("date_from", date_from)
      if (date_to) params.set("date_to", date_to)
      const qs = params.toString()
      return get<TrendPoint[]>(`/reports/trends?${qs}`)
    },
    budgetVsActual: (date_from?: string, date_to?: string) => {
      const params = new URLSearchParams()
      if (date_from) params.set("date_from", date_from)
      if (date_to) params.set("date_to", date_to)
      const qs = params.toString()
      return get<BudgetVsActual[]>(`/reports/budget-vs-actual${qs ? `?${qs}` : ""}`)
    },
  },
  autoCategorize: {
    preview: () => get<{ predictions: AIPrediction[] }>("/auto-categorize/preview"),
    apply: (mappings: { description: string; category: string; group?: string }[]) =>
      post<{ updated: number; rules_created: number }>("/auto-categorize/apply", { mappings }),
  },
  getProfile: () => get<FinancialProfile>("/financial-profile"),
  updateProfile: (data: Partial<FinancialProfile>) => put<FinancialProfile>("/financial-profile", data),
}

export interface AIPrediction {
  description: string
  category: string
  group: string | null
  confidence: number
  count: number
}

export interface FinancialProfile {
  id: number
  age: number | null
  income: number | null
  monthly_expenses: number | null
  dependents: number | null
  existing_assets: Record<string, number> | null
  existing_liabilities: Record<string, number> | null
  tax_regime: "old" | "new" | null
  risk_appetite: "low" | "moderate" | "high" | null
  emergency_fund_months: number
}

export interface GoalCalculatorResult {
  monthly_sip: number
  inflation_adjusted_target: number
}
