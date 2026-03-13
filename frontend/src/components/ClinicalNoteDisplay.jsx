/**
 * ClinicalNoteDisplay.jsx
 * =======================
 * Renders the AI-generated ClinicalNote in a formatted, printable card.
 * Each of the 5 clinical sections has its own colour-coded chip + icon.
 *
 * Features:
 *  - Patient metadata chips (name, date)
 *  - Copy-to-clipboard button
 *  - Generate another note button
 *  - Collapsible audio transcription accordion
 *  - Staggered section reveal via animationDelay (dynamic — must use inline style)
 */

import React, { useState } from 'react'
import {
  CheckCircle, User, Calendar, ClipboardCopy, RotateCcw,
  Thermometer, Stethoscope, Pill, ClipboardList, CalendarClock,
  ChevronDown, ChevronUp, Mic,
} from 'lucide-react'

// Each section maps to a colour scheme.
// Tailwind v4: all colour utilities come from @theme tokens in index.css.
const SECTIONS = [
  {
    key: 'patient_symptoms', label: 'Patient Symptoms', Icon: Thermometer,
    chip: 'bg-orange-50 border-orange-200', labelCls: 'text-orange-600',
    iconBg: 'bg-orange-100', iconColor: 'text-orange-500',
  },
  {
    key: 'diagnosis', label: 'Diagnosis', Icon: Stethoscope,
    chip: 'bg-violet-50 border-violet-200', labelCls: 'text-violet-600',
    iconBg: 'bg-violet-100', iconColor: 'text-violet-500',
  },
  {
    key: 'treatment_plan', label: 'Treatment Plan', Icon: ClipboardList,
    chip: 'bg-sky-50 border-sky-200', labelCls: 'text-sky-600',
    iconBg: 'bg-sky-100', iconColor: 'text-sky-500',
  },
  {
    key: 'medications', label: 'Medications', Icon: Pill,
    chip: 'bg-emerald-50 border-emerald-200', labelCls: 'text-emerald-600',
    iconBg: 'bg-emerald-100', iconColor: 'text-emerald-500',
  },
  {
    key: 'follow_up', label: 'Follow-up Instructions', Icon: CalendarClock,
    chip: 'bg-amber-50 border-amber-200', labelCls: 'text-amber-600',
    iconBg: 'bg-amber-100', iconColor: 'text-amber-500',
  },
]

export default function ClinicalNoteDisplay({ result, onReset }) {
  const { clinical_note, patient_name, visit_date, transcription } = result
  const [copied, setCopied] = useState(false)
  const [showTx, setShowTx] = useState(false)

  function buildPlainText() {
    return [
      'CLINICAL NOTE',
      patient_name ? `Patient: ${patient_name}` : '',
      visit_date   ? `Date: ${visit_date}`       : '',
      '',
      `Patient Symptoms:\n${clinical_note.patient_symptoms}`,
      '',
      `Diagnosis:\n${clinical_note.diagnosis}`,
      '',
      `Treatment Plan:\n${clinical_note.treatment_plan}`,
      '',
      `Medications:\n${clinical_note.medications}`,
      '',
      `Follow-up Instructions:\n${clinical_note.follow_up}`,
    ].filter(Boolean).join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildPlainText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-up">

      {/* Success banner */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle size={17} className="text-emerald-500 shrink-0" />
        <span className="text-emerald-700 text-sm font-medium">
          Clinical note generated successfully
        </span>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-card-lg border border-slate-100 overflow-hidden">

        {/* Card header */}
        <div className="flex items-start justify-between gap-4 px-7 py-6">
          <div>
            <h2 className="font-display text-2xl text-teal-900 mb-3">Clinical Note</h2>
            <div className="flex flex-wrap gap-2">
              {patient_name && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600">
                  <User size={11} /> {patient_name}
                </span>
              )}
              {visit_date && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600">
                  <Calendar size={11} /> {visit_date}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-600">
                <CheckCircle size={11} /> Gemini AI
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-semibold text-teal-700 transition-colors cursor-pointer"
            >
              <ClipboardCopy size={13} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} /> New Note
            </button>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Clinical sections */}
        <div className="px-7 py-6 flex flex-col gap-6">
          {SECTIONS.map(({ key, label, Icon, chip, labelCls, iconBg, iconColor }, idx) => (
            <div
              key={key}
              className="flex flex-col gap-2.5 animate-fade-up"
              style={{ animationDelay: `${idx * 70}ms` }}   // dynamic — must be inline
            >
              {/* Section label chip */}
              <div className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full w-fit border ${chip}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${iconBg}`}>
                  <Icon size={13} className={iconColor} />
                </div>
                <span className={`text-[0.68rem] font-bold uppercase tracking-widest ${labelCls}`}>
                  {label}
                </span>
              </div>

              {/* Section value */}
              <div className="pl-1">
                {clinical_note[key] === 'Not mentioned.' ? (
                  <p className="text-slate-400 text-sm italic">Not mentioned in the conversation.</p>
                ) : (
                  <p className="text-slate-700 text-[0.92rem] leading-relaxed whitespace-pre-wrap">
                    {clinical_note[key]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Transcription accordion (audio only) */}
        {transcription && (
          <>
            <div className="h-px bg-slate-100" />
            <div className="px-7 py-4">
              <button
                onClick={() => setShowTx(!showTx)}
                type="button"
                className="flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800 transition-colors cursor-pointer"
              >
                <Mic size={14} />
                Audio Transcription
                {showTx ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showTx && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-fade-in">
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {transcription}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[0.72rem] text-slate-400 text-center leading-relaxed px-4">
        ⚕ AI-generated for documentation assistance only.
        Always review before use in official medical records.
      </p>
    </div>
  )
}