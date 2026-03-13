/**
 * LoadingState.jsx
 * ================
 * Animated panel shown while Gemini processes the consultation.
 * Steps auto-advance on timers to give visual feedback.
 *
 * animate-spin-ring, animate-pulse-dot → defined via @utility in index.css
 */

import React, { useState, useEffect } from 'react'
import { Brain, FileText, Stethoscope } from 'lucide-react'

const STEPS = [
  { Icon: FileText,    label: 'Parsing conversation',       delay: 0    },
  { Icon: Brain,       label: 'Gemini analysing symptoms',  delay: 1800 },
  { Icon: Stethoscope, label: 'Structuring clinical note',  delay: 3800 },
]

export default function LoadingState({ uploadProgress = 0, isAudio = false }) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timers = STEPS.map(({ delay }, i) =>
      setTimeout(() => setActiveStep(i), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="bg-white rounded-2xl shadow-card-lg border border-teal-100 px-8 py-12 text-center animate-fade-up">

      {/* Spinner ring */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-[3px] border-teal-100 border-t-teal-500 animate-spin-ring" />
        <div className="absolute inset-2 rounded-full bg-teal-50 flex items-center justify-center">
          <Brain size={24} className="text-teal-500" />
        </div>
      </div>

      <h3 className="font-display text-2xl text-teal-900 mb-2">
        {isAudio ? 'Transcribing & Generating Notes…' : 'Generating Clinical Notes…'}
      </h3>
      <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto mb-8">
        Gemini is carefully analysing the consultation and extracting structured medical information.
      </p>

      {/* Upload progress (audio only) */}
      {isAudio && uploadProgress < 100 && (
        <div className="max-w-xs mx-auto mb-7">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Uploading audio</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step indicators */}
      <div className="flex flex-col gap-2.5 max-w-xs mx-auto text-left">
        {STEPS.map(({ Icon, label }, i) => {
          const isDone   = i < activeStep
          const isActive = i === activeStep
          return (
            <div
              key={i}
              className={
                'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ' +
                (isDone   ? 'bg-emerald-50/70 border-emerald-200/60'
                : isActive ? 'bg-teal-50 border-teal-200'
                           : 'bg-slate-50 border-slate-100')
              }
            >
              <div className={
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ' +
                (isDone   ? 'bg-emerald-100 text-emerald-600'
                : isActive ? 'bg-teal-100 text-teal-600'
                           : 'bg-slate-100 text-slate-400')
              }>
                <Icon size={14} />
              </div>

              <span className={
                'flex-1 text-sm ' +
                (isDone   ? 'text-emerald-700 font-medium'
                : isActive ? 'text-teal-800 font-semibold'
                           : 'text-slate-400')
              }>
                {label}
              </span>

              {isDone && <span className="text-emerald-500 font-bold text-sm">✓</span>}
              {isActive && (
                <span className="flex gap-1">
                  {[0, 1, 2].map(d => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-dot"
                      style={{ animationDelay: `${d * 200}ms` }}
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