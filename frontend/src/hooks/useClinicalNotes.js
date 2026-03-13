/**
 * hooks/useClinicalNotes.js
 * =========================
 * Custom React hook — manages all state and async logic for
 * generating clinical notes. Keeps components purely presentational.
 *
 * State machine:
 *   idle → loading → success
 *                ↘ error
 */

import { useState, useCallback } from 'react'
import { generateNotesFromText, generateNotesFromAudio } from '../utils/api'

const INITIAL = {
  status:         'idle',  // 'idle' | 'loading' | 'success' | 'error'
  result:         null,
  error:          null,
  uploadProgress: 0,
}

export function useClinicalNotes() {
  const [state, setState] = useState(INITIAL)

  const setLoading = () =>
    setState(s => ({ ...s, status: 'loading', error: null, uploadProgress: 0 }))

  const setSuccess = result =>
    setState(s => ({ ...s, status: 'success', result, error: null }))

  const setError = err =>
    setState(s => ({ ...s, status: 'error', error: err.message || String(err) }))

  const reset = useCallback(() => setState(INITIAL), [])

  const generateFromText = useCallback(async params => {
    setLoading()
    try   { setSuccess(await generateNotesFromText(params)) }
    catch (err) { setError(err) }
  }, [])

  const generateFromAudio = useCallback(async params => {
    setLoading()
    try {
      setSuccess(await generateNotesFromAudio({
        ...params,
        onProgress: pct => setState(s => ({ ...s, uploadProgress: pct })),
      }))
    } catch (err) { setError(err) }
  }, [])

  return {
    isIdle:    state.status === 'idle',
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError:   state.status === 'error',
    result:         state.result,
    error:          state.error,
    uploadProgress: state.uploadProgress,
    generateFromText,
    generateFromAudio,
    reset,
  }
}