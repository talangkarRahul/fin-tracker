import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import Transactions from "./pages/Transactions"
import Goals from "./pages/Goals"
import Budgets from "./pages/Budgets"
import Recurring from "./pages/Recurring"
import Categories from "./pages/Categories"

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/recurring", label: "Recurring" },
  { to: "/budgets", label: "Budgets" },
  { to: "/goals", label: "Goals" },
  { to: "/categories", label: "Categories" },
]

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
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary-light text-primary-hover"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                  end={to === "/"}
                >
                  {label}
                </NavLink>
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
            <Route path="/categories" element={<Categories />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
