/**
 * src/utils/api.js
 * ─────────────────
 * Axios instance with:
 *   • Auto Bearer token injection from localStorage
 *   • FastAPI error message normalisation
 *
 * All API calls are exported as named functions so components
 * never touch axios or fetch directly.
 */
import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({ baseURL: BASE, timeout: 120000 })

// Attach JWT on every outgoing request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Flatten FastAPI validation / detail errors into a single string
api.interceptors.response.use(
  res => res,
  err => {
    const raw = err.response?.data?.detail || err.message || 'Unknown error'
    const msg = Array.isArray(raw) ? raw.map(e => e.msg).join(', ') : String(raw)
    return Promise.reject(new Error(msg))
  }
)

// ── Auth ─────────────────────────────────────────────────────
export const signup = body => api.post('/api/auth/signup', body).then(r => r.data)
export const login  = body => api.post('/api/auth/login',  body).then(r => r.data)
export const getMe  = ()   => api.get('/api/auth/me').then(r => r.data)

// ── Note generation ──────────────────────────────────────────
export const generateFromText = ({ conversation, patientName, visitDate }) =>
  api.post('/api/notes/generate', {
    conversation,
    patient_name: patientName || null,
    visit_date:   visitDate   || null,
  }).then(r => r.data)

export const generateFromAudio = ({ audioFile, patientName, visitDate, onProgress }) => {
  const fd = new FormData()
  fd.append('audio_file', audioFile)
  if (patientName) fd.append('patient_name', patientName)
  if (visitDate)   fd.append('visit_date',   visitDate)
  return api.post('/api/notes/generate/audio', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onProgress && e.total) onProgress(Math.round(e.loaded / e.total * 100))
    },
  }).then(r => r.data)
}

// ── Records ──────────────────────────────────────────────────
export const getDashboard = () =>
  api.get('/api/records/dashboard').then(r => r.data)

export const getRecords = (page = 1, limit = 10, search = '') =>
  api.get('/api/records', {
    params: { page, limit, search: search || undefined },
  }).then(r => r.data)

export const getRecord    = id => api.get(`/api/records/${id}`).then(r => r.data)
export const deleteRecord = id => api.delete(`/api/records/${id}`)