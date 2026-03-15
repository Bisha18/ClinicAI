import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { login as apiLogin } from '../utils/api'
import { useAuth } from '../context/AuthContext'

const INPUT =
  'w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm ' +
  'text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all'

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiLogin(form)
      login(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    /* FIX: added py-8 so the form isn't clipped on short viewports (iPhone SE, landscape) */
    <div className="min-h-screen bg-linear-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-up">

        {/* Brand */}
        <div className="text-center mb-7">
          <div
            className="rounded-2xl bg-brand-400/15 border border-brand-400/25 flex items-center justify-center mx-auto mb-4"
            style={{ width: 52, height: 52 }}
          >
            <Activity size={26} className="text-brand-300" strokeWidth={2} />
          </div>
          <h1 className="font-display text-3xl text-white mb-1">Welcome back</h1>
          <p className="text-brand-300/80 text-sm">Sign in to your ClinicalAI account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-auth p-6 sm:p-7">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mb-5">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email" placeholder="Email address" required autoComplete="email"
                className={INPUT} value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPw ? 'text' : 'password'} placeholder="Password" required
                autoComplete="current-password" className={INPUT + ' pr-10'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 shadow-card transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-5">
            No account yet?{' '}
            <Link to="/signup" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}