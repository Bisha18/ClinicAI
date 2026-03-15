import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute
 * ──────────────
 * Renders children when authenticated.
 * Shows a spinner while the initial token validation is in flight.
 * Redirects to /login if not authenticated.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-[3px] border-brand-100 border-t-brand-500 animate-spin"
          />
          <p className="text-slate-400 text-sm font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}