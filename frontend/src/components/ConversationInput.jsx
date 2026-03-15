/**
 * ConversationInput.jsx
 * =====================
 * Mobile fix: patient metadata grid-cols-2 → grid-cols-1 sm:grid-cols-2
 * so inputs aren't too narrow on phones.
 * All other logic unchanged.
 */

import React, { useState, useRef } from 'react'
import {
  FileText, Mic, Upload, User, Calendar,
  ChevronRight, AlertCircle, X,
} from 'lucide-react'

const SAMPLE = `Doctor: Good morning. What brings you in today?
Patient: I've been having a really bad headache for the past three days. It started on the left side and now covers my whole head.
Doctor: On a scale of 1-10, how bad is the pain?
Patient: Around a 7. It's throbbing and gets worse when I move or look at bright lights. I also feel nauseous.
Doctor: Any fever, neck stiffness, or vision changes?
Patient: No fever, but I noticed some blurred vision yesterday. No neck stiffness.
Doctor: Have you taken anything for it?
Patient: Ibuprofen 400mg, but it only gives me a couple hours of relief.
Doctor: This looks like a migraine with aura. I'm prescribing sumatriptan 50mg — one tablet at onset. If the headache persists beyond 2 hours, take a second dose. Rest in a dark room and keep a headache diary to identify triggers. Return in 4 weeks, or sooner if headaches worsen or you notice any neurological symptoms.
Patient: Should I continue the ibuprofen?
Doctor: Use it as a backup if sumatriptan isn't available, but try sumatriptan first to avoid rebound headaches.`

const INPUT =
  'w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 ' +
  'bg-slate-50 placeholder-slate-400 font-sans ' +
  'focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all'

export default function ConversationInput({ onSubmitText, onSubmitAudio, isLoading }) {
  const [tab, setTab]                   = useState('text')
  const [conversation, setConversation] = useState('')
  const [patientName, setPatientName]   = useState('')
  const [visitDate, setVisitDate]       = useState('')
  const [audioFile, setAudioFile]       = useState(null)
  const [dragOver, setDragOver]         = useState(false)
  const fileRef = useRef(null)

  const handleTextSubmit = e => {
    e.preventDefault()
    if (conversation.trim()) onSubmitText({ conversation, patientName, visitDate })
  }

  const handleAudioSubmit = e => {
    e.preventDefault()
    if (audioFile) onSubmitAudio({ audioFile, patientName, visitDate })
  }

  const onDrop = e => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setAudioFile(f)
  }

  const fmtSize = b =>
    b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`

  const submitCls = disabled =>
    'w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl ' +
    'text-sm font-semibold text-white tracking-wide transition-all duration-200 ' +
    (disabled
      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
      : 'bg-linear-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 ' +
        'shadow-lg shadow-teal-700/20 hover:shadow-teal-600/25 active:scale-[0.98] cursor-pointer')

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5 sm:p-8">

      {/* Card header */}
      <div className="mb-6">
        <h2 className="font-display text-xl sm:text-2xl text-teal-900 mb-1.5">New Consultation</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Paste the conversation or upload an audio recording to generate structured clinical notes.
        </p>
      </div>

      {/* Patient metadata — 1 col on mobile, 2 cols on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wide">
            <User size={11} /> Patient Name
            <span className="normal-case font-normal text-slate-400 tracking-normal">(optional)</span>
          </label>
          <input className={INPUT} placeholder="e.g. Jane Smith"
            value={patientName} onChange={e => setPatientName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wide">
            <Calendar size={11} /> Visit Date
            <span className="normal-case font-normal text-slate-400 tracking-normal">(optional)</span>
          </label>
          <input type="date" className={INPUT}
            value={visitDate} onChange={e => setVisitDate(e.target.value)} />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100 mb-5">
        {[
          { id: 'text',  label: 'Text Input',   Icon: FileText },
          { id: 'audio', label: 'Audio Upload', Icon: Mic      },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg ' +
              'text-sm font-medium transition-all duration-200 cursor-pointer ' +
              (tab === id
                ? 'bg-white text-teal-800 font-semibold shadow-sm'
                : 'text-slate-500 hover:text-slate-700')
            }
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Text tab ─────────────────────────────────────────── */}
      {tab === 'text' && (
        <form onSubmit={handleTextSubmit}>
          <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <textarea
              className="w-full px-4 py-4 bg-transparent border-none resize-y text-sm leading-relaxed text-slate-900 placeholder-slate-400 focus:outline-none min-h-48 sm:min-h-56 font-sans"
              placeholder={"Paste the doctor-patient conversation here…\n\nDoctor: Good morning, what brings you in today?\nPatient: I've been having chest pain…"}
              value={conversation}
              onChange={e => setConversation(e.target.value)}
              rows={12}
              required
            />
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-white">
              <span className="text-[0.72rem] text-slate-400">{conversation.length} chars</span>
              <button
                type="button"
                className="text-[0.72rem] font-medium text-teal-600 underline decoration-dotted hover:text-teal-700 transition-colors cursor-pointer"
                onClick={() => setConversation(SAMPLE)}
              >
                Load sample
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !conversation.trim()}
            className={submitCls(isLoading || !conversation.trim())}
          >
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating Notes…</>
            ) : (
              <>Generate Clinical Notes <ChevronRight size={17} /></>
            )}
          </button>
        </form>
      )}

      {/* ── Audio tab ─────────────────────────────────────────── */}
      {tab === 'audio' && (
        <form onSubmit={handleAudioSubmit}>
          <div
            onClick={() => !audioFile && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={
              'mb-3 border-2 border-dashed rounded-xl p-6 sm:p-9 text-center transition-all duration-200 ' +
              (audioFile
                ? 'border-teal-300 bg-teal-50 cursor-default'
                : dragOver
                  ? 'border-teal-400 bg-teal-50 cursor-copy'
                  : 'border-slate-200 bg-slate-50 cursor-pointer hover:border-teal-300 hover:bg-teal-50/60')
            }
          >
            <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => setAudioFile(e.target.files[0])} />

            {audioFile ? (
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                  <Mic size={22} className="text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{audioFile.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{fmtSize(audioFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setAudioFile(null) }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center">
                  <Upload size={26} className="text-teal-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 text-sm">Drop audio file here</p>
                  <p className="text-slate-400 text-xs mt-1">or click to browse · MP3, WAV, M4A, WebM · Max 20 MB</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 text-[0.75rem] text-slate-500 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2.5 mb-4">
            <AlertCircle size={13} className="text-teal-600 mt-px shrink-0" />
            <span>
              Audio is transcribed using{' '}
              <strong className="text-teal-700">Gemini's native multimodal API</strong>{' '}
              — no separate transcription service required.
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading || !audioFile}
            className={submitCls(isLoading || !audioFile)}
          >
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing Audio…</>
            ) : (
              <>Transcribe & Generate Notes <ChevronRight size={17} /></>
            )}
          </button>
        </form>
      )}
    </div>
  )
}