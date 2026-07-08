import { useState, useRef, useEffect } from "react"
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import Transactions from "./pages/Transactions"
import Goals from "./pages/Goals"
import Budgets from "./pages/Budgets"
import Recurring from "./pages/Recurring"
import Categories from "./pages/Categories"
import Profile from "./pages/Profile"
import EmergencyFund from "./pages/EmergencyFund"
import NetWorth from "./pages/NetWorth"
import FinancialHealth from "./pages/FinancialHealth"
import Insurance from "./pages/Insurance"
import Investments from "./pages/Investments"
import Retirement from "./pages/Retirement"

interface NavGroup {
  label: string
  children: { to: string; label: string }[]
}

const groups: NavGroup[] = [
  {
    label: "Transactions",
    children: [
      { to: "/transactions", label: "Transactions" },
      { to: "/recurring", label: "Recurring" },
    ],
  },
  {
    label: "Planning",
    children: [
      { to: "/budgets", label: "Budgets" },
      { to: "/goals", label: "Goals" },
      { to: "/emergency-fund", label: "Emergency Fund" },
      { to: "/insurance", label: "Insurance" },
      { to: "/investments", label: "Investments" },
      { to: "/retirement", label: "Retirement" },
    ],
  },
  {
    label: "Analytics",
    children: [
      { to: "/net-worth", label: "Net Worth" },
      { to: "/financial-health", label: "Health Score" },
    ],
  },
  {
    label: "Settings",
    children: [
      { to: "/categories", label: "Categories" },
      { to: "/profile", label: "Profile" },
    ],
  },
]

function allChildPaths(g: NavGroup): string[] {
  return g.children.map((c) => c.to)
}

function DropdownGroup({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const isActive = allChildPaths(group).includes(location.pathname)

  function openDelayed() {
    if (timer.current) clearTimeout(timer.current)
    setOpen(true)
  }

  function closeDelayed() {
    timer.current = setTimeout(() => setOpen(false), 150)
  }

  function toggle() {
    if (timer.current) clearTimeout(timer.current)
    setOpen((o) => !o)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative" onMouseEnter={openDelayed} onMouseLeave={closeDelayed}>
      <button
        onClick={toggle}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
          isActive
            ? "bg-primary-light text-primary-hover"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {group.label} <span className="text-xs ml-0.5 opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0 pt-1 w-44" onMouseEnter={openDelayed} onMouseLeave={closeDelayed}>
          <div className="bg-card border border-border rounded-xl shadow-lg py-1">
            {group.children.map((child) => {
              const active = location.pathname === child.to
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary-light text-primary-hover font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {child.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
            <NavLink to="/" className="font-bold text-lg tracking-tight text-foreground">
              Fin Tracker
            </NavLink>
            <div className="flex gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary-light text-primary-hover"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                Dashboard
              </NavLink>
              {groups.map((g) => (
                <DropdownGroup key={g.label} group={g} />
              ))}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/recurring" element={<Recurring />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/emergency-fund" element={<EmergencyFund />} />
            <Route path="/net-worth" element={<NetWorth />} />
            <Route path="/financial-health" element={<FinancialHealth />} />
            <Route path="/insurance" element={<Insurance />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/retirement" element={<Retirement />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
