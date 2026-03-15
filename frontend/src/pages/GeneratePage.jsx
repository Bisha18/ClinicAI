/**
 * GeneratePage.jsx
 * ================
 * FIX: This file was an exact copy of DashboardPage.jsx — it imported
 * getDashboard, exported `function DashboardPage()`, and had no generate UI.
 * The /generate route was silently showing the dashboard instead.
 *
 * Correct implementation: ConversationInput → useClinicalNotes → result display.
 */

import React from 'react'
import ConversationInput  from '../components/ConversationInput'
import ClinicalNoteDisplay from '../components/ClinicalNoteDisplay'
import LoadingState       from '../components/LoadingState'
import ErrorState         from '../components/ErrorState'
import { useClinicalNotes } from '../hooks/useClinicalNotes'

export default function GeneratePage() {
  const {
    isIdle, isLoading, isSuccess, isError,
    result, error, progress,
    genText, genAudio, reset,
  } = useClinicalNotes()

  function handleText({ conversation, patientName, visitDate }) {
    genText({ conversation, patientName, visitDate })
  }

  function handleAudio({ audioFile, patientName, visitDate }) {
    genAudio({ audioFile, patientName, visitDate })
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl text-slate-900">Generate Clinical Note</h1>
        <p className="text-slate-400 text-sm mt-1">
          Paste a conversation or upload an audio recording to create a structured clinical note.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        {(isIdle || isLoading) && (
          <>
            <ConversationInput
              onSubmitText={handleText}
              onSubmitAudio={handleAudio}
              isLoading={isLoading}
            />
            {isLoading && (
              <div className="mt-6">
                <LoadingState progress={progress} isAudio={!!result?.transcription} />
              </div>
            )}
          </>
        )}

        {isError && (
          <ErrorState error={error} onRetry={reset} />
        )}

        {isSuccess && result && (
          <ClinicalNoteDisplay result={result} onReset={reset} />
        )}
      </div>
    </div>
  )
}