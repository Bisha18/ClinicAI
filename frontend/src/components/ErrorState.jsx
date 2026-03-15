import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

function getHint(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('google_api_key') || m.includes('api key'))
    return 'Check that GOOGLE_API_KEY is set correctly in backend/.env and restart uvicorn.'
  if (m.includes('429') || m.includes('rate limit'))
    return 'Gemini rate limit reached — wait a moment then try again.'
  if (m.includes('401') || m.includes('403') || m.includes('token'))
    return 'Your session may have expired. Log out and sign back in.'
  if (m.includes('network') || m.includes('econnrefused') || m.includes('connect'))
    return 'Cannot reach the backend. Make sure uvicorn is running on port 8000.'
  if (m.includes('mongo'))
    return 'MongoDB connection failed. Check MONGO_URI in backend/.env.'
  if (m.includes('too short') || m.includes('empty'))
    return 'The conversation is too short. Add more dialogue and try again.'
  return 'Check the browser console and the uvicorn terminal for details.'
}

export default function ErrorState({ error, onRetry }) {
  return (
    /* FIX: was px-8 fixed — responsive padding */
    <div className="bg-white rounded-2xl shadow-card border border-red-100 px-5 sm:px-8 py-10 text-center animate-fade-up">
      <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
        <AlertTriangle size={26} className="text-red-500" />
      </div>

      <h3 className="font-display text-xl sm:text-2xl text-slate-900 mb-4">Something went wrong</h3>

      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-left">
        <code className="text-xs text-red-700 font-mono leading-relaxed break-words whitespace-pre-wrap">
          {error}
        </code>
      </div>

      <p className="text-slate-500 text-sm leading-relaxed mb-7 max-w-sm mx-auto">
        <strong className="text-slate-700">Tip: </strong>
        {getHint(error)}
      </p>

      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-700 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-card transition-colors cursor-pointer"
      >
        <RotateCcw size={14} />
        Try Again
      </button>
    </div>
  )
}