import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, User, Calendar, Mic, FileText, Trash2, Copy,
  Thermometer, Stethoscope, Pill, ClipboardList, CalendarClock,
  ChevronDown, ChevronUp, Loader2, AlertTriangle,
} from 'lucide-react'
import { getRecord, deleteRecord } from '../utils/api'

const SECTIONS = [
  { key: 'patient_symptoms', label: 'Patient Symptoms',       Icon: Thermometer,   chip: 'bg-orange-50 border-orange-200',   chipText: 'text-orange-700',  iconBox: 'bg-orange-100 text-orange-500'   },
  { key: 'diagnosis',        label: 'Diagnosis',              Icon: Stethoscope,   chip: 'bg-violet-50 border-violet-200',   chipText: 'text-violet-700',  iconBox: 'bg-violet-100 text-violet-500'   },
  { key: 'treatment_plan',   label: 'Treatment Plan',         Icon: ClipboardList, chip: 'bg-sky-50 border-sky-200',         chipText: 'text-sky-700',     iconBox: 'bg-sky-100 text-sky-500'         },
  { key: 'medications',      label: 'Medications',            Icon: Pill,          chip: 'bg-emerald-50 border-emerald-200', chipText: 'text-emerald-700', iconBox: 'bg-emerald-100 text-emerald-500'  },
  { key: 'follow_up',        label: 'Follow-up Instructions', Icon: CalendarClock, chip: 'bg-amber-50 border-amber-200',     chipText: 'text-amber-700',   iconBox: 'bg-amber-100 text-amber-500'     },
]

function buildPlainText(rec) {
  const lines = ['CLINICAL NOTE', `Patient: ${rec.patient_name || '—'}`, `Date: ${rec.visit_date || '—'}`, '']
  SECTIONS.forEach(({ key, label }) => { lines.push(`${label}:`, rec[key], '') })
  return lines.join('\n')
}

export default function RecordDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const [rec,     setRec]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [copied,  setCopied]  = useState(false)
  const [showTx,  setShowTx]  = useState(false)
  const [showCv,  setShowCv]  = useState(false)

  useEffect(() => {
    getRecord(id)
      .then(setRec)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!window.confirm('Permanently delete this record?')) return
    try { await deleteRecord(id); navigate('/records') }
    catch (err) { alert(err.message) }
  }

  function handleCopy() {
    if (!rec) return
    navigator.clipboard.writeText(buildPlainText(rec))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="text-brand-500 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="text-center px-4">
        <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <Link to="/records" className="text-brand-600 text-sm font-semibold hover:text-brand-700">← Back to Records</Link>
      </div>
    </div>
  )

  const created   = new Date(rec.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  const InputIcon = rec.input_mode === 'audio' ? Mic : FileText

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sm:mb-7">
        <div className="flex items-center gap-3">
          <Link to="/records" className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
            <ArrowLeft size={15} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-slate-900 leading-tight">
              {rec.patient_name || 'Unknown Patient'}
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">Generated {created}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl text-xs font-semibold text-brand-700 transition-colors cursor-pointer">
            <Copy size={12} /> {copied ? 'Copied!' : 'Copy Note'}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-semibold text-red-600 transition-colors cursor-pointer">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {/* Layout
          mobile (< md)  : stacked — note first, metadata second
          md+ (768px+)   : 3-col split — note takes 2 cols, metadata 1 col
          FIX: was lg:grid-cols-3 — tablet wasted full width on stacked layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">

        {/* Clinical note — 2 of 3 cols on md+ */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100">
            <Stethoscope size={15} className="text-brand-500" />
            <h2 className="font-semibold text-slate-800 text-sm">Clinical Note</h2>
            {rec.gemini_model && (
              <span className="ml-auto text-[0.62rem] font-semibold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                {rec.gemini_model}
              </span>
            )}
          </div>

          <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5">
            {SECTIONS.map(({ key, label, Icon, chip, chipText, iconBox }, idx) => (
              <div key={key} className="animate-fade-up" style={{ animationDelay: `${idx * 55}ms` }}>
                <div className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 py-0.5 rounded-full border ${chip} mb-2`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${iconBox}`}>
                    <Icon size={11} />
                  </div>
                  <span className={`text-[0.63rem] font-bold uppercase tracking-wider ${chipText}`}>{label}</span>
                </div>
                {rec[key] === 'Not mentioned.' ? (
                  <p className="text-slate-400 text-sm italic pl-1">Not mentioned in the conversation.</p>
                ) : (
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap pl-1">{rec[key]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Audio transcript */}
          {rec.transcription && (
            <>
              <div className="h-px bg-slate-100 mx-4 sm:mx-6" />
              <div className="px-4 sm:px-6 py-3.5">
                <button type="button" onClick={() => setShowTx(v => !v)} className="flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors cursor-pointer">
                  <Mic size={13} /> Audio Transcript {showTx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showTx && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-fade-in">
                    <p className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">{rec.transcription}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Source conversation */}
          <div className="h-px bg-slate-100 mx-4 sm:mx-6" />
          <div className="px-4 sm:px-6 py-3.5">
            <button type="button" onClick={() => setShowCv(v => !v)} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
              <FileText size={13} /> Source Conversation {showCv ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showCv && (
              <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-fade-in">
                <p className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">{rec.conversation}</p>
              </div>
            )}
          </div>
        </div>

        {/* Metadata panel — 1 col */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Record Info</h3>
            <div className="flex flex-col gap-3.5">
              {[
                { Icon: User,          label: 'Patient',    value: rec.patient_name || '—' },
                { Icon: Calendar,      label: 'Visit Date', value: rec.visit_date   || '—' },
                { Icon: InputIcon,     label: 'Input Mode', value: rec.input_mode          },
                { Icon: CalendarClock, label: 'Generated',  value: created                 },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={12} className="text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-slate-700 mt-0.5 break-words">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link to="/generate" className="flex items-center gap-2.5 px-4 py-3 bg-brand-700 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-card transition-all">
            <FileText size={14} /> Generate New Note
          </Link>
          <Link to="/records" className="flex items-center gap-2.5 px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all">
            <ArrowLeft size={14} /> All Records
          </Link>
        </div>
      </div>
    </div>
  )
}