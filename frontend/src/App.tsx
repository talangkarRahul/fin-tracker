import { useState, useRef, useEffect } from "react"
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom"
import { LayoutDashboard, ChevronDown, ArrowRightLeft, ClipboardList, TrendingUp, Settings, Moon, Sun } from "lucide-react"
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
  icon: React.ReactNode
  children: { to: string; label: string }[]
}

const groups: NavGroup[] = [
  {
    label: "Transactions",
    icon: <ArrowRightLeft size={16} />,
    children: [
      { to: "/transactions", label: "Transactions" },
      { to: "/recurring", label: "Recurring" },
    ],
  },
  {
    label: "Planning",
    icon: <ClipboardList size={16} />,
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
    icon: <TrendingUp size={16} />,
    children: [
      { to: "/net-worth", label: "Net Worth" },
      { to: "/financial-health", label: "Health Score" },
    ],
  },
  {
    label: "Settings",
    icon: <Settings size={16} />,
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
  const childPaths = allChildPaths(group)
  const isActive = childPaths.includes(location.pathname)

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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <span className="hidden lg:inline">{group.icon}</span>
        {group.label}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-2 pt-0 w-44 animate-dropdown"
          onMouseEnter={openDelayed}
          onMouseLeave={closeDelayed}
        >
          <div className="relative bg-card border border-border rounded-xl shadow-xl py-1.5">
            <div className="absolute -top-1.5 left-4 w-3 h-3 bg-card border-l border-t border-border rotate-45" />
            {group.children.map((child) => {
              const active = location.pathname === child.to
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
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
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme")
    if (saved) return saved === "dark"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [dark])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
            <NavLink to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <LayoutDashboard size={16} className="text-primary-foreground" />
              </div>
              Fin Tracker
            </NavLink>
            <div className="flex items-center gap-0.5">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <LayoutDashboard size={16} className="hidden lg:inline" />
                Dashboard
              </NavLink>
              {groups.map((g) => (
                <DropdownGroup key={g.label} group={g} />
              ))}
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              className="ml-2 p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
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
