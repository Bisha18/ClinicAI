import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Mail, Lock, Eye, EyeOff, User, Stethoscope, AlertCircle } from 'lucide-react'
import { signup as apiSignup } from '../utils/api'
import { useAuth } from '../context/AuthContext'

const INPUT =
  'w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm ' +
  'text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all'

const SPECIALTIES = [
  'General Practice', 'Cardiology', 'Paediatrics', 'Neurology',
  'Orthopaedics', 'Dermatology', 'Psychiatry', 'Oncology',
  'Emergency Medicine', 'Radiology', 'Other',
]

export default function SignupPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [form,    setForm]    = useState({ email: '', full_name: '', password: '', specialty: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await apiSignup(form)
      login(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">

        {/* Brand */}
        <div className="text-center mb-7">
          <div
            className="w-13 h-13 rounded-2xl bg-brand-400/15 border border-brand-400/25 flex items-center justify-center mx-auto mb-4"
            style={{ width: 52, height: 52 }}
          >
            <Activity size={26} className="text-brand-300" strokeWidth={2} />
          </div>
          <h1 className="font-display text-3xl text-white mb-1">Create account</h1>
          <p className="text-brand-300/80 text-sm">Start generating clinical notes in seconds</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-auth p-7">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mb-5">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Full name */}
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Full name"
                required
                autoComplete="name"
                className={INPUT}
                value={form.full_name}
                onChange={set('full_name')}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="Email address"
                required
                autoComplete="email"
                className={INPUT}
                value={form.email}
                onChange={set('email')}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password (min 8 characters)"
                required
                autoComplete="new-password"
                className={INPUT + ' pr-10'}
                value={form.password}
                onChange={set('password')}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Specialty */}
            <div className="relative">
              <Stethoscope size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                className={INPUT + ' appearance-none'}
                value={form.specialty}
                onChange={set('specialty')}
              >
                <option value="">Select specialty (optional)</option>
                {SPECIALTIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 shadow-card transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}