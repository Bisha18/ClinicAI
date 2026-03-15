import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Activity, LayoutDashboard, PlusCircle,
  FolderOpen, LogOut, Stethoscope, User, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/generate',  Icon: PlusCircle,      label: 'New Note'  },
  { to: '/records',   Icon: FolderOpen,      label: 'Records'   },
]

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    /* w-64 on mobile gives enough room; w-56 on md+ is the original compact width */
    <aside className="w-64 md:w-56 h-full min-h-screen bg-brand-900 flex flex-col">

      {/* ── Brand + mobile close ─────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-brand-700/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-400/15 border border-brand-400/20 flex items-center justify-center shrink-0">
            <Activity size={17} className="text-brand-300" strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-white text-[1.05rem] leading-none">ClinicalAI</p>
            <p className="text-brand-400 text-[0.58rem] font-semibold uppercase tracking-widest mt-0.5">
              Notes Generator
            </p>
          </div>
        </div>

        {/* X button — only on mobile */}
        <button
          onClick={onClose}
          className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-brand-400 hover:text-white hover:bg-brand-700/40 transition-colors shrink-0 ml-2"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ' +
              'transition-colors duration-150 ' +
              (isActive
                ? 'bg-brand-400/15 text-white'
                : 'text-brand-300/80 hover:bg-brand-400/10 hover:text-white')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-brand-400' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User panel ──────────────────────────────────── */}
      {/* pb-safe adds extra padding for iOS home indicator */}
      <div className="px-3 pb-5 pt-3 border-t border-brand-700/40" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-brand-800/60 mb-1.5">
          <div className="w-7 h-7 rounded-full bg-brand-400/20 flex items-center justify-center shrink-0">
            {user?.specialty
              ? <Stethoscope size={13} className="text-brand-300" />
              : <User        size={13} className="text-brand-300" />}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {user?.full_name || 'Doctor'}
            </p>
            {user?.specialty && (
              <p className="text-brand-400 text-[0.62rem] truncate mt-0.5">
                {user.specialty}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-brand-400 hover:text-white hover:bg-brand-400/10 transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}