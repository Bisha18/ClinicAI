/**
 * App.jsx
 * =======
 * Root component. Manages top-level layout and drives state transitions:
 *
 *   idle    → <ConversationInput>
 *   loading → <LoadingState>
 *   success → <ClinicalNoteDisplay>
 *   error   → <ErrorState>
 *
 * All async logic lives in the useClinicalNotes hook — this component
 * is purely responsible for layout and rendering the right child.
 */

import React, { useState } from 'react'
import Header               from './components/Header'
import ConversationInput    from './components/ConversationInput'
import LoadingState         from './components/LoadingState'
import ClinicalNoteDisplay  from './components/ClinicalNoteDisplay'
import ErrorState           from './components/ErrorState'
import { useClinicalNotes } from './hooks/useClinicalNotes'

export default function App() {
  const {
    isIdle, isLoading, isSuccess, isError,
    result, error, uploadProgress,
    generateFromText, generateFromAudio, reset,
  } = useClinicalNotes()

  const [lastMode, setLastMode] = useState('text')

  const handleText  = p => { setLastMode('text');  generateFromText(p)  }
  const handleAudio = p => { setLastMode('audio'); generateFromAudio(p) }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-10 pb-24">

        {/* Hero — shown only on idle */}
        {isIdle && (
          <div className="text-center mb-8 animate-fade-up">

            {/* Tech badge */}
            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 animate-pulse-dot" />
              <span className="text-teal-700 text-[0.72rem] font-semibold tracking-wide">
                Gemini 1.5 Flash · LangChain · FastAPI · Tailwind v4
              </span>
            </div>

            <h1 className="font-display text-5xl text-teal-900 leading-[1.12] mb-4">
              Turn Consultations Into<br />
              <em className="italic text-teal-600">Clinical Notes Instantly</em>
            </h1>

            <p className="text-slate-500 text-base leading-relaxed max-w-lg mx-auto">
              Paste or record a doctor-patient conversation and receive a
              complete, structured clinical note in seconds.
            </p>
          </div>
        )}

        {/* Feature chips — idle only */}
        {isIdle && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {['Symptoms', 'Diagnosis', 'Treatment Plan', 'Medications', 'Follow-up'].map(c => (
              <span
                key={c}
                className="px-4 py-1.5 bg-white border border-teal-200 rounded-full text-[0.75rem] font-semibold text-teal-700"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Dynamic content area */}
        {isIdle    && (
          <ConversationInput
            onSubmitText={handleText}
            onSubmitAudio={handleAudio}
            isLoading={false}
          />
        )}
        {isLoading && (
          <LoadingState uploadProgress={uploadProgress} isAudio={lastMode === 'audio'} />
        )}
        {isSuccess && result && (
          <ClinicalNoteDisplay result={result} onReset={reset} />
        )}
        {isError && (
          <ErrorState error={error} onRetry={reset} />
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-[0.72rem] text-slate-400">
          FastAPI · LangChain · Google Gemini · React ·{' '}
          <span className="text-teal-500 font-medium">Tailwind CSS v4</span>
        </footer>
      </main>
    </div>
  )
}