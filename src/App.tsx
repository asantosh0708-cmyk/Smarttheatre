import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, TicketIcon, ScanLine, LogOut, Film, BarChart3, Menu, X } from 'lucide-react'
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import BookTickets from './pages/BookTickets'
import EntryScanner from './pages/EntryScanner'
import ExitScanner from './pages/ExitScanner'
import ScreensShows from './pages/ScreensShows'
import Predictions from './pages/Predictions'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/book', label: 'Book Tickets', icon: TicketIcon },
  { to: '/entry', label: 'Entry Scanner', icon: ScanLine },
  { to: '/exit', label: 'Exit Scanner', icon: LogOut },
  { to: '/admin', label: 'Screens & Shows', icon: Film },
  { to: '/predictions', label: 'Predictions', icon: BarChart3 },
]

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col md:flex-row">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex flex-col w-60 bg-ink-800 border-r border-ink-600 shrink-0">
          <div className="px-6 py-6 border-b border-ink-600">
            <h1 className="font-display text-2xl font-bold text-brass-300 tracking-wide">
              Ticket Pass
            </h1>
            <p className="text-xs text-ink-400 mt-1 font-body">Theatre Management</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brass-500/15 text-brass-300 border-l-2 border-brass-400'
                      : 'text-ink-400 hover:text-brass-50 hover:bg-ink-700'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="px-6 py-4 border-t border-ink-600 text-xs text-ink-400">
            Occupancy &amp; Ticket System
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between bg-ink-800 border-b border-ink-600 px-4 py-3 sticky top-0 z-50">
          <h1 className="font-display text-xl font-bold text-brass-300">Ticket Pass</h1>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-brass-50 p-1"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden bg-ink-800 border-b border-ink-600 px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-brass-500/15 text-brass-300'
                      : 'text-ink-400 hover:text-brass-50 hover:bg-ink-700'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/book" element={<BookTickets />} />
              <Route path="/entry" element={<EntryScanner />} />
              <Route path="/exit" element={<ExitScanner />} />
              <Route path="/admin" element={<ScreensShows />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  )
}
