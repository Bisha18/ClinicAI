/**
 * Header.jsx
 * ==========
 * Sticky top navigation bar.
 * Uses Tailwind v4 custom tokens: bg-teal-900, text-teal-400, etc.
 * The `animate-pulse-dot` utility is defined in index.css via @utility.
 */

import React from 'react'
import { Activity } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-teal-900/95 backdrop-blur-md border-b border-teal-700/30">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">

        {/* Logo mark */}
        <div className="w-10 h-10 rounded-xl bg-teal-400/10 border border-teal-400/25 flex items-center justify-center shrink-0">
          <Activity size={20} className="text-teal-400" strokeWidth={2.2} />
        </div>

        {/* Brand */}
        <div className="flex flex-col leading-none gap-0.5">
          <span className="font-display text-white text-xl tracking-wide">ClinicalAI</span>
          <span className="text-teal-300 text-[0.62rem] font-semibold uppercase tracking-[0.18em]">
            Clinical Notes Generator
          </span>
        </div>

        {/* Status badge */}
        <div className="ml-auto flex items-center gap-2 bg-teal-400/10 border border-teal-400/20 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-dot" />
          <span className="text-teal-300 text-[0.68rem] font-semibold tracking-wide">
            Gemini Powered
          </span>
        </div>

      </div>
    </header>
  )
}