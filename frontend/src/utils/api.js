/**
 * utils/api.js
 * ============
 * Centralised API layer — every call to the FastAPI backend goes
 * through this file.
 *
 * In development, Vite's proxy forwards /api → http://localhost:8000
 * In production, set VITE_API_BASE_URL in your .env file
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,  // 2 min — Gemini calls can take time
})

// Log outgoing requests in development
api.interceptors.request.use(config => {
  if (import.meta.env.DEV) {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
  }
  return config
})

// Normalise error messages from FastAPI's detail field
api.interceptors.response.use(
  res => res,
  err => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'An unknown error occurred'
    return Promise.reject(new Error(message))
  }
)

/**
 * Generate clinical notes from pasted conversation text.
 * POST /api/generate-notes
 */
export async function generateNotesFromText({ conversation, patientName, visitDate }) {
  const { data } = await api.post('/api/generate-notes', {
    conversation,
    patient_name: patientName || null,
    visit_date:   visitDate   || null,
  })
  return data
}

/**
 * Generate clinical notes from an uploaded audio file.
 * POST /api/generate-notes/audio  (multipart/form-data)
 */
export async function generateNotesFromAudio({ audioFile, patientName, visitDate, onProgress }) {
  const form = new FormData()
  form.append('audio_file', audioFile)
  if (patientName) form.append('patient_name', patientName)
  if (visitDate)   form.append('visit_date',   visitDate)

  const { data } = await api.post('/api/generate-notes/audio', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: event => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    },
  })
  return data
}

/**
 * Transcribe audio without generating a note.
 * POST /api/transcribe
 */
export async function transcribeAudio(audioFile) {
  const form = new FormData()
  form.append('audio_file', audioFile)
  const { data } = await api.post('/api/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Semantic search over stored notes.
 * GET /api/search-notes?query=...&k=5
 */
export async function searchNotes(query, k = 5) {
  const { data } = await api.get('/api/search-notes', { params: { query, k } })
  return data
}