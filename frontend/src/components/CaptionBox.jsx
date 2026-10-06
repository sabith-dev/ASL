import { useState } from 'react'
import { Sparkles, Trash2, Volume2, Copy, Check, Delete } from 'lucide-react'

export default function CaptionBox({ caption, onClear, onRemoveLast, onSpeak }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    if (!caption) return
    navigator.clipboard.writeText(caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="glass p-6 flex-1 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-white/40 font-semibold flex items-center gap-2">
          <Sparkles size={14} className="text-accent-amber" />
          Completed Sign Text (Together)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSpeak}
            disabled={!caption.trim()}
            className="p-2 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 hover:bg-accent-cyan/30 text-accent-cyan transition-colors disabled:opacity-30 disabled:hover:bg-accent-cyan/15"
            title="Listen (Read text aloud)"
          >
            <Volume2 size={16} />
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={!caption.trim()}
            className="p-2 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/15 text-white/70 transition-colors disabled:opacity-30"
            title="Copy text"
          >
            {copied ? <Check size={16} className="text-accent-cyan" /> : <Copy size={16} />}
          </button>
          <button
            type="button"
            onClick={onRemoveLast}
            disabled={!caption.length}
            className="p-2 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/15 text-white/70 transition-colors disabled:opacity-30"
            title="Backspace (Remove last letter)"
          >
            <Delete size={16} />
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!caption.length}
            className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-30"
            title="Clear all text"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main text container */}
      <div className="flex-1 min-h-[120px] rounded-2xl bg-base-900/80 border border-accent-violet/30 p-5 flex flex-col justify-center shadow-inner">
        {caption ? (
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-accent-cyan/80 uppercase tracking-widest font-bold">
              Assembled Message:
            </div>
            <p className="font-display font-extrabold text-white text-2xl sm:text-3xl tracking-wide leading-tight break-words">
              {caption}
              <span className="inline-block w-1 h-6 bg-accent-pink ml-1.5 animate-blink align-middle" />
            </p>
          </div>
        ) : (
          <p className="text-white/30 text-sm italic font-mono text-center">
            Sign letters with your hand — each letter will freeze, store, and build the completed word together here.
          </p>
        )}
      </div>
    </div>
  )
}