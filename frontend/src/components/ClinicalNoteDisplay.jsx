import React, { useState } from 'react'
import {
  CheckCircle, User, Calendar, Copy, RotateCcw,
  Thermometer, Stethoscope, Pill, ClipboardList, CalendarClock,
  ChevronDown, ChevronUp, Mic,
} from 'lucide-react'

const SECTIONS = [
  { key: 'patient_symptoms', label: 'Patient Symptoms',      Icon: Thermometer,   chip: 'bg-orange-50 border-orange-200',  chipText: 'text-orange-700',  iconBox: 'bg-orange-100 text-orange-500'  },
  { key: 'diagnosis',        label: 'Diagnosis',             Icon: Stethoscope,   chip: 'bg-violet-50 border-violet-200',  chipText: 'text-violet-700',  iconBox: 'bg-violet-100 text-violet-500'  },
  { key: 'treatment_plan',   label: 'Treatment Plan',        Icon: ClipboardList, chip: 'bg-sky-50 border-sky-200',        chipText: 'text-sky-700',     iconBox: 'bg-sky-100 text-sky-500'        },
  { key: 'medications',      label: 'Medications',           Icon: Pill,          chip: 'bg-emerald-50 border-emerald-200', chipText: 'text-emerald-700', iconBox: 'bg-emerald-100 text-emerald-500' },
  { key: 'follow_up',        label: 'Follow-up Instructions',Icon: CalendarClock, chip: 'bg-amber-50 border-amber-200',    chipText: 'text-amber-700',   iconBox: 'bg-amber-100 text-amber-500'    },
]

function buildPlainText(note, patient_name, visit_date) {
  const lines = ['CLINICAL NOTE']
  if (patient_name) lines.push(`Patient: ${patient_name}`)
  if (visit_date)   lines.push(`Date: ${visit_date}`)
  lines.push('')
  SECTIONS.forEach(({ key, label }) => { lines.push(`${label}:`, note[key], '') })
  return lines.join('\n')
}

export default function ClinicalNoteDisplay({ result, onReset }) {
  const { clinical_note: note, patient_name, visit_date, transcription } = result
  const [copied, setCopied] = useState(false)
  const [showTx, setShowTx] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(buildPlainText(note, patient_name, visit_date))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-up">

      {/* Success banner */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle size={16} className="text-emerald-500 shrink-0" />
        <span className="text-emerald-700 text-sm font-medium">
          Note generated and saved to your records
        </span>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-card-lg border border-slate-100 overflow-hidden">

        {/* Card header
            FIX: Was a single flex row with title+badges left and buttons right.
            On narrow screens (320-375px) this overflowed. Now the title row and
            action buttons are stacked vertically, each full-width on mobile,
            side-by-side on sm+.                                                  */}
        <div className="px-4 sm:px-7 py-4 sm:py-5 border-b border-slate-100">
          {/* Top row: title + action buttons */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="font-display text-2xl sm:text-[1.65rem] text-brand-900 leading-tight">
              Clinical Note
            </h2>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg text-xs font-semibold text-brand-700 transition-colors cursor-pointer"
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                New Note
              </button>
            </div>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-2">
            {patient_name && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600">
                <User size={10} /> {patient_name}
              </span>
            )}
            {visit_date && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600">
                <Calendar size={10} /> {visit_date}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700">
              <CheckCircle size={10} /> Gemini AI
            </span>
          </div>
        </div>

        {/* Clinical sections */}
        <div className="px-4 sm:px-7 py-5 sm:py-6 flex flex-col gap-5">
          {SECTIONS.map(({ key, label, Icon, chip, chipText, iconBox }, idx) => (
            <div key={key} className="animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 py-0.5 rounded-full border ${chip} mb-2.5`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${iconBox}`}>
                  <Icon size={11} />
                </div>
                <span className={`text-[0.64rem] font-bold uppercase tracking-wider ${chipText}`}>
                  {label}
                </span>
              </div>
              {note[key] === 'Not mentioned.' ? (
                <p className="text-slate-400 text-sm italic pl-1">Not mentioned in the conversation.</p>
              ) : (
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap pl-1">{note[key]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Audio transcription accordion */}
        {transcription && (
          <>
            <div className="h-px bg-slate-100 mx-4 sm:mx-7" />
            <div className="px-4 sm:px-7 py-4">
              <button
                onClick={() => setShowTx(v => !v)}
                type="button"
                className="flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors cursor-pointer"
              >
                <Mic size={14} />
                Audio Transcription
                {showTx ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showTx && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-fade-in">
                  <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap font-mono">{transcription}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center px-4 leading-relaxed">
        ⚕ AI-generated for documentation assistance only.
        Always verify before adding to official medical records.
      </p>
    </div>
  )
}