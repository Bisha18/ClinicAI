/**
 * ErrorState.jsx
 * ==============
 * Friendly error display with contextual suggestions and a retry button.
 * Maps common error patterns to human-readable hints.
 */

import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

function getSuggestion(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('google_api_key') || m.includes('api key'))
    return 'Check that GOOGLE_API_KEY is set correctly in backend/.env.'
  if (m.includes('rate limit') || m.includes('429'))
    return 'Gemini rate limit hit — wait a moment, or check your quota at aistudio.google.com.'
  if (m.includes('too short') || m.includes('empty'))
    return 'The conversation is too short. Add more dialogue for the AI to process.'
  if (m.includes('audio') || m.includes('transcri'))
    return 'Ensure the audio is clear and under 20 MB. Try MP3 or WAV format.'
  if (m.includes('network') || m.includes('connect') || m.includes('fetch'))
    return 'Cannot reach the backend. Make sure FastAPI is running on port 8000.'
  return 'Check the browser console and FastAPI terminal logs for more details.'
}

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-red-100 px-8 py-10 text-center animate-fade-up">

      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
        <AlertTriangle size={28} className="text-red-500" />
      </div>

      <h3 className="font-display text-2xl text-slate-900 mb-4">Something went wrong</h3>

      {/* Raw error */}
      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-left">
        <code className="text-xs text-red-700 font-mono leading-relaxed break-words whitespace-pre-wrap">
          {error}
        </code>
      </div>

      {/* Hint */}
      <p className="text-slate-500 text-sm leading-relaxed mb-7 max-w-md mx-auto">
        <strong className="text-slate-700">Suggestion: </strong>
        {getSuggestion(error)}
      </p>

      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-teal-700/20 cursor-pointer"
      >
        <RotateCcw size={15} /> Try Again
      </button>
    </div>
  )
}