import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }     from './context/AuthContext'
import ProtectedRoute       from './components/ProtectedRoute'
import Sidebar              from './components/Sidebar'
import LoginPage            from './pages/LoginPage'
import SignupPage           from './pages/SignupPage'
import DashboardPage        from './pages/DashboardPage'
import GeneratePage         from './pages/GeneratePage'
import RecordsPage          from './pages/RecordsPage'
import RecordDetailPage     from './pages/RecordDetailPage'
import { Menu }             from 'lucide-react'
import { Activity }         from 'lucide-react'

function Layout({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ── Dark overlay (mobile only) ─────────────────────── */}
      <div
        className={
          'fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 md:hidden ' +
          (open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')
        }
        onClick={() => setOpen(false)}
      />

      {/* ── Sidebar ───────────────────────────────────────────
          Mobile : fixed drawer, slides in from left
          md+    : static column, always visible              */}
      <div className={
        'fixed inset-y-0 left-0 z-40 flex-shrink-0 ' +
        'transition-transform duration-300 ease-in-out ' +
        'md:static md:translate-x-0 md:z-auto ' +
        (open ? 'translate-x-0' : '-translate-x-full')
      }>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* ── Page body ─────────────────────────────────────────
          pt-14 clears the mobile topbar height (h-14).
          On md+ the topbar is hidden so pt-0 resets it.     */}
      <div className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">

        {/* Mobile topbar — hidden on md+ */}
        <header className="fixed top-0 left-0 right-0 z-20 h-14 flex items-center gap-3 px-4 bg-brand-900 border-b border-brand-700/30 md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-brand-300 hover:bg-brand-700/40 transition-colors shrink-0"
          >
            <Menu size={20} />
          </button>
          <Activity size={18} className="text-brand-400 shrink-0" />
          <span className="font-display text-white text-lg leading-none">ClinicalAI</span>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function Guard({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"       element={<LoginPage  />} />
          <Route path="/signup"      element={<SignupPage />} />
          <Route path="/dashboard"   element={<Guard><DashboardPage    /></Guard>} />
          <Route path="/generate"    element={<Guard><GeneratePage     /></Guard>} />
          <Route path="/records"     element={<Guard><RecordsPage      /></Guard>} />
          <Route path="/records/:id" element={<Guard><RecordDetailPage /></Guard>} />
          <Route path="*"            element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}