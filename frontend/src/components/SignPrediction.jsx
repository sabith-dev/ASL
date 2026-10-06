import { useState } from 'react'
import { Activity, Lock, CheckCircle2, Move, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'


function ConfidenceRing({ value }) {
  const r = 28, c = 2 * Math.PI * r
  const offset = c - ((value || 0) / 100) * c
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="url(#cg)" strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-150" />
        <defs>
          <linearGradient id="cg">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#7c6cff" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-mono text-xs font-semibold text-white/90">{value || 0}%</span>
    </div>
  )
}

function SignImage({ letter, size = 72 }) {
  const [imgError, setImgError] = useState(false)

  if (!letter) {
    return (
      <div
        className="rounded-2xl bg-base-900/60 border border-white/[0.07] flex-none flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-2xl font-display font-bold text-white/20">?</span>
      </div>
    )
  }
  const isSpace = letter === ' ' || letter.toLowerCase() === 'space'
  const isWordSign = letter.length > 1 && !isSpace
  const imgSrc = isSpace ? '/signs/space.jpg' : `/signs/${letter.toUpperCase()}.jpg`

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-base-900/60 border border-accent-violet/30 flex-none"
      style={{ width: size, height: size }}
      title={`ASL sign ${letter}`}
    >
      {/* Image or word-sign label */}
      {isWordSign || imgError ? (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(124,108,255,0.25)',
          padding: '4px',
        }}>
          <span style={{
            fontFamily: 'Sora, system-ui, sans-serif', fontWeight: 700,
            fontSize: size > 60 ? '20px' : '14px',
            color: '#22d3ee', textAlign: 'center',
            lineHeight: 1.1, wordBreak: 'break-all',
          }}>
            {isSpace ? 'SPACE' : letter}
          </span>
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={`ASL sign ${letter}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      )}
      {/* Letter label always visible at bottom-right */}
      <span style={{
        position: 'absolute', bottom: '3px', right: '5px',
        fontFamily: 'Sora, system-ui, sans-serif', fontWeight: 700,
        fontSize: '11px', color: 'rgba(255,255,255,0.95)',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        lineHeight: 1,
      }}>
        {isSpace ? 'SPC' : letter?.toUpperCase()}
      </span>
    </div>
  )
}

export default function SignPrediction({
  current,
  stable,
  committed,
  frozenLetter,
  letters = [],
  caption = '',
  isMotionActive = false,
  motionSpeed = 0,
  motionTrajectory = 'STATIONARY',
  onFreezeLetter,
  onAddSpace,
}) 
{
  const words = caption.split(/\s+/).filter(Boolean)
  const wordCount = words.length || (letters.length ? '…' : 0)

  return (
    <div className="space-y-4">
      {/* Current Detection & Motion Tracking Feedback */}
      <div className="glass p-6 relative overflow-hidden">
        {/* Frozen toast */}
        <AnimatePresence>
          {frozenLetter && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-2 inset-x-2 py-1.5 px-3 rounded-xl bg-gradient-to-r from-accent-cyan/90 to-accent-violet/90 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg z-20"
            >
              <CheckCircle2 size={15} /> FROZEN & STORED: '{frozenLetter === 'space' ? 'SPACE' : frozenLetter}'
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between text-xs text-white/40 font-semibold uppercase tracking-wider mb-4">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-accent-cyan" />
            Live Sign & Motion Recognition
          </div>
          {isMotionActive ? (
            <span className="text-accent-pink font-mono text-[10px] flex items-center gap-1 animate-pulse bg-accent-pink/10 px-2 py-0.5 rounded-full border border-accent-pink/30">
              <Zap size={11} /> Hand Motion Tracked ({motionTrajectory})
            </span>
          ) : stable ? (
            <span className="text-accent-cyan font-mono text-[10px] flex items-center gap-1 animate-pulse">
              <Lock size={11} /> Holding & Freezing...
            </span>
          ) : (
            <span className="text-white/30 font-mono text-[10px] flex items-center gap-1">
              <Move size={11} /> Hand Motion Engine Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-5">
          <SignImage letter={current?.prediction} size={72} />
          <ConfidenceRing value={current?.confidence} />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-4xl tracking-tight text-gradient">
              {current?.prediction || '—'}
            </div>
            {current?.is_motion ? (
              <div className="text-accent-cyan text-xs mt-1 font-mono flex items-center gap-1">
                <Zap size={12} /> Dynamic Word Motion Detected
              </div>
            ) : current?.confidence < 50 && current?.confidence > 0 ? (
              <div className="text-accent-pink text-xs mt-1 font-mono">Low confidence</div>
            ) : null}
          </div>
        </div>

        {/* Action button to freeze current letter/word */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => current?.prediction && onFreezeLetter && onFreezeLetter(current.prediction, true)}
            disabled={!current?.prediction}
            className="btn-gradient flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent-cyan/20 disabled:opacity-40 disabled:hover:transform-none transition-all hover:scale-[1.02]"
          >
            <Lock size={15} /> Freeze Sign '{current?.prediction === 'space' ? 'SPACE' : (current?.prediction || '—')}'
          </button>
          {onAddSpace && (
            <button
              type="button"
              onClick={() => onAddSpace('space', true)}
              className="py-3 px-3.5 rounded-xl glass hover:bg-white/[0.1] text-xs font-semibold text-white/80 transition-colors shrink-0 flex items-center gap-1.5"
              title="Insert Space"
            >
              ␣ Space
            </button>
          )}
        </div>

        {/* Top predictions */}
        {current?.top5?.length > 0 && (
          <div className="mt-4 space-y-1">
            {current.top5.slice(0, 3).map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/50 font-mono">
                <span className="w-5 h-5 rounded bg-white/[0.06] flex items-center justify-center font-bold text-[10px] text-white/40">{i+1}</span>
                <span className="font-semibold text-white/70">{t.label}</span>
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent-violet to-accent-cyan rounded-full transition-all duration-150"
                    style={{ width: `${t.confidence}%` }} />
                </div>
                <span className="text-white/40">{t.confidence.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Frozen / Stored Letters & Word Signs Chain */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-3 text-xs text-white/40 font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Lock size={13} className="text-accent-cyan" />
            Stored Sign Sequence ({letters.length})
          </div>
          <span className="text-[10px] font-mono text-white/30">{wordCount} word{wordCount === 1 ? '' : 's'}</span>
        </div>

        {letters.length === 0 ? (
          <div className="py-5 text-center text-white/25 text-xs font-mono border border-dashed border-white/10 rounded-xl">
            Click "Freeze Sign" or press Spacebar/Enter to store signs here
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 max-h-28 overflow-y-auto pr-1">
              {letters.map((ch, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`px-3 py-1.5 rounded-xl border font-display font-bold text-sm shadow-md flex items-center gap-1 ${
                    ch === '␣'
                      ? 'bg-white/[0.06] border-white/[0.12] text-white/40'
                      : 'bg-accent-violet/20 border-accent-violet/40 text-accent-cyan'
                  }`}
                  title={ch === '␣' ? 'Space' : `Sign ${ch}`}
                >
                  <span>{ch === '␣' ? '·' : ch}</span>
                  <span className="text-[9px] text-white/30 font-mono">#{idx + 1}</span>
                </motion.div>
              ))}
            </div>

            {/* Built word chips */}
            {words.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {words.map((w, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan font-mono text-xs font-bold">
                    {w}
                  </span>
                ))}
              </div>
            )}

            {/* Live assembled text readout */}
            <div className="mt-3 rounded-xl bg-base-900/80 border border-accent-violet/25 px-4 py-3 flex items-center justify-center min-h-[44px]">
              {caption ? (
                <p className="font-display font-extrabold text-white text-lg sm:text-xl tracking-wide text-center break-words">
                  {caption}
                  <span className="inline-block w-0.5 h-4 bg-accent-pink ml-1 animate-blink align-text-bottom" />
                </p>
              ) : (
                <p className="text-white/25 text-[11px] italic font-mono">Signed text will assemble here</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}