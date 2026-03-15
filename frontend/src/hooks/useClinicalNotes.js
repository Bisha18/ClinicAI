import { useState, useCallback } from 'react'
import { generateFromText, generateFromAudio } from '../utils/api'

/**
 * useClinicalNotes
 * ─────────────────
 * State machine for the note-generation flow.
 *
 * States:  idle → loading → success
 *                        ↘ error
 *
 * Returned:
 *   isIdle / isLoading / isSuccess / isError
 *   result, error, progress
 *   genText(params), genAudio(params), reset()
 */

const INIT = { status: 'idle', result: null, error: null, progress: 0 }

export function useClinicalNotes() {
  const [state, setState] = useState(INIT)

  const reset = useCallback(() => setState(INIT), [])

  const genText = useCallback(async params => {
    setState({ status: 'loading', result: null, error: null, progress: 0 })
    try {
      const result = await generateFromText(params)
      setState({ status: 'success', result, error: null, progress: 0 })
    } catch (err) {
      setState({ status: 'error', result: null, error: err.message, progress: 0 })
    }
  }, [])

  const genAudio = useCallback(async params => {
    setState({ status: 'loading', result: null, error: null, progress: 0 })
    try {
      const result = await generateFromAudio({
        ...params,
        onProgress: p => setState(s => ({ ...s, progress: p })),
      })
      setState({ status: 'success', result, error: null, progress: 100 })
    } catch (err) {
      setState({ status: 'error', result: null, error: err.message, progress: 0 })
    }
  }, [])

  return {
    isIdle:    state.status === 'idle',
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError:   state.status === 'error',
    result:   state.result,
    error:    state.error,
    progress: state.progress,
    genText,
    genAudio,
    reset,
  }
}