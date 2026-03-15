/**
 * RecordsPage.jsx
 * ===============
 * Mobile fix: The fixed grid-cols-[2fr_3fr_1fr_1fr_auto] table is unreadable
 * on small screens. Solution: show a card-style list on mobile, table on md+.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, FileText, Stethoscope, ChevronRight, ChevronLeft,
  Mic, Trash2, Loader2, AlertTriangle, PlusCircle,
} from 'lucide-react'
import { getRecords, deleteRecord } from '../utils/api'

const LIMIT = 10

export default function RecordsPage() {
  const [records, setRecords] = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [input,   setInput]   = useState('')
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchRecords = useCallback((p, q) => {
    setLoading(true)
    setError('')
    getRecords(p, LIMIT, q)
      .then(data => { setRecords(data.records); setTotal(data.total) })
      .catch(err  => setError(err.message))
      .finally(()  => setLoading(false))
  }, [])

  useEffect(() => { fetchRecords(page, query) }, [page, query, fetchRecords])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    setQuery(input)
  }

  function clearSearch() {
    setInput('')
    setQuery('')
    setPage(1)
  }

  async function handleDelete(id, e) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Permanently delete this record?')) return
    try {
      await deleteRecord(id)
      fetchRecords(page, query)
    } catch (err) {
      alert(err.message)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-slate-900">Patient Records</h1>
          <p className="text-slate-400 text-sm mt-1">{total} record{total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/generate"
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-700 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-card transition-all"
        >
          <PlusCircle size={15} />
          New Note
        </Link>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient, diagnosis, or symptoms…"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
        </div>
        <button type="submit" className="px-4 sm:px-5 py-2.5 bg-brand-700 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer">
          Search
        </button>
        {query && (
          <button type="button" onClick={clearSearch} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors cursor-pointer">
            Clear
          </button>
        )}
      </form>

      {/* Records container */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 size={26} className="text-brand-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-14">
            <AlertTriangle size={26} className="text-red-400 mb-3" />
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <FileText size={32} className="text-slate-200 mb-4" />
            <p className="text-slate-500 text-sm font-medium">
              {query ? 'No records match your search' : 'No records yet'}
            </p>
            {!query && (
              <Link to="/generate" className="mt-3 text-brand-600 text-sm font-semibold hover:text-brand-700 transition-colors">
                Generate your first note →
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop table (md+) ──────────────────────────── */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[2fr_3fr_1fr_1fr_auto] gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <span>Patient</span><span>Diagnosis</span><span>Date</span><span>Mode</span><span></span>
              </div>
              {records.map(record => {
                const date = record.visit_date || new Date(record.created_at).toLocaleDateString('en-GB')
                return (
                  <Link
                    key={record.id}
                    to={`/records/${record.id}`}
                    className="grid grid-cols-[2fr_3fr_1fr_1fr_auto] gap-3 items-center px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <Stethoscope size={12} className="text-brand-600" />
                      </div>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {record.patient_name || <span className="text-slate-400 font-normal italic">Unknown</span>}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{record.diagnosis}</p>
                    <p className="text-sm text-slate-400">{date}</p>
                    <span className={`inline-flex items-center gap-1 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${record.input_mode === 'audio' ? 'bg-violet-100 text-violet-600' : 'bg-brand-100 text-brand-700'}`}>
                      {record.input_mode === 'audio' && <Mic size={8} />}
                      {record.input_mode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => handleDelete(record.id, e)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* ── Mobile card list (< md) ──────────────────────── */}
            <div className="md:hidden divide-y divide-slate-100">
              {records.map(record => {
                const date = record.visit_date || new Date(record.created_at).toLocaleDateString('en-GB')
                return (
                  <Link
                    key={record.id}
                    to={`/records/${record.id}`}
                    className="flex items-start gap-3 px-4 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Stethoscope size={14} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {record.patient_name || <span className="text-slate-400 font-normal italic">Unknown patient</span>}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{record.diagnosis}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-400">{date}</span>
                        <span className={`inline-flex items-center gap-1 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${record.input_mode === 'audio' ? 'bg-violet-100 text-violet-600' : 'bg-brand-100 text-brand-700'}`}>
                          {record.input_mode === 'audio' && <Mic size={8} />}
                          {record.input_mode}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => handleDelete(record.id, e)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages} · {total} records
          </p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
              <ChevronLeft size={13} /> Prev
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}