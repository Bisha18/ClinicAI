import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Calendar, TrendingUp,
  PlusCircle, Stethoscope, ChevronRight,
  Loader2, AlertTriangle,
} from 'lucide-react'
import { getDashboard } from '../utils/api'
import { useAuth } from '../context/AuthContext'

function StatCard({ Icon, label, value, sub, iconCls, bgCls }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${bgCls}`}>
        <Icon size={18} className={iconCls} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1 truncate">{label}</p>
        <p className="text-slate-900 text-xl sm:text-2xl font-bold leading-none mb-1">{value}</p>
        {sub && <p className="text-slate-400 text-xs">{sub}</p>}
      </div>
    </div>
  )
}

function RecordRow({ r }) {
  const date = r.visit_date || new Date(r.created_at).toLocaleDateString('en-GB')
  return (
    <Link
      to={`/records/${r.id}`}
      className="flex items-center gap-3 sm:gap-3.5 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-slate-50 transition-colors group border-b border-slate-100 last:border-0"
    >
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
        <Stethoscope size={12} className="text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {r.patient_name || <span className="text-slate-400 font-normal italic">Unknown patient</span>}
        </p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{r.diagnosis}</p>
      </div>
      <div className="text-right shrink-0 hidden xs:block">
        <p className="text-xs text-slate-400">{date}</p>
        <span className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${r.input_mode === 'audio' ? 'bg-violet-100 text-violet-600' : 'bg-brand-100 text-brand-700'}`}>
          {r.input_mode}
        </span>
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-400 transition-colors shrink-0" />
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function greeting() {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={30} className="text-brand-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading dashboard…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="text-center px-4">
        <AlertTriangle size={30} className="text-red-400 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  )

  const firstName = user?.full_name?.split(' ')[0] || 'Doctor'

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sm:mb-7">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-slate-900">
            {greeting()}, Dr.&nbsp;{firstName}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <Link
          to="/generate"
          className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-brand-700 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-card transition-all"
        >
          <PlusCircle size={15} />
          New Note
        </Link>
      </div>

      {/* Stat cards
          xs (< 640px)  : 1 column
          sm (640-1023px): 2 columns  ← avoids cramped 3-col at 544px with sidebar
          lg (1024px+)  : 3 columns                                                */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <StatCard Icon={FileText}   label="Total Records"  value={data.total_records} sub="All time"     iconCls="text-brand-600"  bgCls="bg-brand-50"  />
        <StatCard Icon={Calendar}   label="This Week"      value={data.this_week}     sub="Last 7 days"  iconCls="text-sky-600"    bgCls="bg-sky-50"    />
        <StatCard Icon={TrendingUp} label="This Month"     value={data.this_month}    sub="Last 30 days" iconCls="text-violet-600" bgCls="bg-violet-50" />
      </div>

      {/* Content grid
          mobile/tablet (< lg) : single column, stacked
          lg+ : 5-col split (recent 3 / diagnoses 2)         */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">

        {/* Recent records */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100">
            <h2 className="text-slate-800 font-semibold text-sm">Recent Records</h2>
            <Link to="/records" className="text-xs text-brand-600 font-semibold hover:text-brand-700 transition-colors">
              View all →
            </Link>
          </div>
          {data.recent_records.length === 0 ? (
            <div className="py-10 text-center px-4">
              <FileText size={28} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No records yet.</p>
              <Link to="/generate" className="text-brand-600 text-sm font-semibold hover:text-brand-700 transition-colors">
                Generate your first note →
              </Link>
            </div>
          ) : (
            data.recent_records.map(r => <RecordRow key={r.id} r={r} />)
          )}
        </div>

        {/* Top diagnoses */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100">
            <h2 className="text-slate-800 font-semibold text-sm">Top Diagnoses</h2>
          </div>
          <div className="px-4 sm:px-5 py-4 flex flex-col gap-3 sm:gap-4">
            {data.top_diagnoses.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No data yet</p>
            ) : (
              data.top_diagnoses.map(({ diagnosis, count }, i) => {
                const pct  = Math.round(count / Math.max(data.total_records, 1) * 100)
                const bars = ['bg-brand-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500']
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-700 font-medium truncate max-w-[75%]">{diagnosis}</span>
                      <span className="text-slate-400 shrink-0 ml-2">{count}×</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${bars[i % bars.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}