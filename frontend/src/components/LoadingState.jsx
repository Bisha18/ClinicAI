import React, { useState, useEffect } from 'react'
import { Brain, FileText, Stethoscope } from 'lucide-react'

const STEPS = [
  { Icon: FileText,    label: 'Parsing conversation',      ms: 0    },
  { Icon: Brain,       label: 'Gemini analysing symptoms', ms: 1800 },
  { Icon: Stethoscope, label: 'Structuring clinical note', ms: 3600 },
]

export default function LoadingState({ progress = 0, isAudio = false }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = STEPS.map(({ ms }, i) => setTimeout(() => setStep(i), ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    /* FIX: was px-8 py-12 fixed — responsive padding for small screens */
    <div className="bg-white rounded-2xl shadow-card-lg border border-brand-100 px-4 sm:px-8 py-8 sm:py-12 text-center animate-fade-up">

      {/* Spinner */}
      <div className="relative mx-auto mb-6 sm:mb-7" style={{ width: 72, height: 72 }}>
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-100 border-t-brand-500 animate-spin" />
        <div className="absolute inset-[10px] rounded-full bg-brand-50 flex items-center justify-center">
          <Brain size={22} className="text-brand-500" />
        </div>
      </div>

      <h3 className="font-display text-xl sm:text-2xl text-brand-900 mb-2">
        {isAudio ? 'Transcribing & Generating Note…' : 'Generating Clinical Note…'}
      </h3>
      <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto mb-6 sm:mb-8">
        Gemini is analysing the consultation and extracting structured medical information.
      </p>

      {/* Upload progress bar — audio only */}
      {isAudio && progress < 100 && (
        <div className="max-w-xs mx-auto mb-6 sm:mb-8">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Uploading audio</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="flex flex-col gap-2.5 max-w-xs mx-auto text-left">
        {STEPS.map(({ Icon, label }, i) => {
          const done   = i < step
          const active = i === step
          return (
            <div
              key={i}
              className={
                'flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl border transition-all duration-300 ' +
                (done   ? 'bg-emerald-50 border-emerald-200'
                : active ? 'bg-brand-50 border-brand-200'
                         : 'bg-slate-50 border-slate-100')
              }
            >
              <div className={
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ' +
                (done   ? 'bg-emerald-100 text-emerald-600'
                : active ? 'bg-brand-100 text-brand-600'
                         : 'bg-slate-100 text-slate-400')
              }>
                <Icon size={14} />
              </div>
              <span className={
                'flex-1 text-sm ' +
                (done   ? 'text-emerald-700 font-medium'
                : active ? 'text-brand-800 font-semibold'
                         : 'text-slate-400')
              }>
                {label}
              </span>
              {done && <span className="text-emerald-500 font-bold text-sm">✓</span>}
              {active && (
                <span className="flex gap-1">
                  {[0, 1, 2].map(d => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-dot"
                      style={{ animationDelay: `${d * 180}ms` }}
                    />
                  ))}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}