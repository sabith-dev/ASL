import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react'

// ─── Sign image lookup ───────────────────────────────────────────────────────
function getImgSrc(ch) {
  if (!ch) return ''
  const low = typeof ch === 'string' ? ch.toLowerCase() : ''
  if (low === 'space' || ch === ' ') return '/signs/space.jpg'
  if (ch.length === 1 && /[a-zA-Z]/.test(ch)) return `/signs/${ch.toUpperCase()}.jpg`
  return `/signs/${ch}.jpg`
}

function displayLabel(ch) {
  if (!ch) return '—'
  const low = typeof ch === 'string' ? ch.toLowerCase() : ''
  if (low === 'space' || ch === ' ') return 'SPACE'
  return ch.toUpperCase()
}

function isSpaceToken(ch) {
  return ch === ' ' || (typeof ch === 'string' && ch.toLowerCase() === 'space')
}

/* ─── Guarantee a real sign image for every step ───────────────────────────────
   Only A-Z have ASL handshape imagery, so any multi-character token (a whole
   word, or a raw {type, value} action from the API) is fingerspelled here. This
   keeps the write path letter-by-letter no matter which caller feeds it.        */
function expandSequence(seq) {
  const out = []
  for (const item of seq) {
    const token = typeof item === 'string' ? item : (item && item.value) || ''
    if (!token) continue
    if (isSpaceToken(token) || token.length === 1) {
      out.push(isSpaceToken(token) ? 'space' : token)
      continue
    }
    for (const ch of token) {
      if (/[A-Za-z]/.test(ch)) out.push(ch.toUpperCase())
    }
  }
  return out
}

// ─── Single sign display card ─────────────────────────────────────────────────
function SignCard({ letter, index, total }) {
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => { setImgFailed(false) }, [letter])

  const label = displayLabel(letter)
  const src = getImgSrc(letter)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      width: '100%',
      maxWidth: '280px',
    }}>
      {/* ── Sign image / letter fallback ── */}
      <div style={{
        width: '220px',
        height: '200px',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'rgba(124,108,255,0.08)',
        border: '1.5px solid rgba(124,108,255,0.30)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
      }}>
        {!imgFailed ? (
          <img
            key={letter}
            src={src}
            alt={`ASL sign for ${label}`}
            onError={() => setImgFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <span style={{
            fontSize: '96px',
            fontWeight: 900,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #7c6cff 0%, #22d3ee 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            userSelect: 'none',
          }}>
            {isSpaceToken(letter) ? '␣' : label}
          </span>
        )}
      </div>

      {/* ── Letter label pill ── always visible ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '8px 20px',
        borderRadius: '14px',
        background: 'rgba(0,0,0,0.75)',
        border: '1px solid rgba(255,255,255,0.18)',
        width: '100%',
      }}>
        <span style={{
          fontSize: '26px',
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '0.06em',
          lineHeight: 1,
          fontFamily: 'Sora, Inter, system-ui, sans-serif',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.35)',
          fontFamily: 'monospace',
        }}>
          {index + 1} / {total}
        </span>
      </div>
    </div>
  )
}

// ─── Main SignPlayer ──────────────────────────────────────────────────────────
export default function SignPlayer({ sequence = [], sentence = '', speed = 850, autoPlay = true }) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef(null)
  const tokens = useMemo(() => expandSequence(sequence), [sequence])
  const seqKey = tokens.join('|')

  // Reset when sequence changes
  useEffect(() => {
    setIndex(0)
    setPlaying(autoPlay && tokens.length > 0)
  }, [seqKey]) // eslint-disable-line

  // Interval playback
  useEffect(() => {
    clearInterval(timerRef.current)
    if (!playing || tokens.length === 0) return
    timerRef.current = setInterval(() => {
      setIndex(i => {
        if (i >= tokens.length - 1) { setPlaying(false); return i }
        return i + 1
      })
    }, speed)
    return () => clearInterval(timerRef.current)
  }, [playing, tokens.length, speed])

  const has = tokens.length > 0
  const letter = tokens[index] || ''

  // Build highlighted sentence
  const renderSentence = () => {
    if (!sentence) return null
    if (!has) return <span style={{ color: 'rgba(255,255,255,0.75)' }}>{sentence}</span>
    const pos = Math.min(index, sentence.length - 1)
    return (
      <>
        <span style={{ color: 'rgba(255,255,255,0.60)' }}>{sentence.slice(0, pos)}</span>
        <span style={{
          color: '#22d3ee', fontWeight: 700,
          textDecoration: 'underline',
          textDecorationColor: 'rgba(34,211,238,0.45)',
          textUnderlineOffset: '3px',
        }}>{sentence[pos]}</span>
        <span style={{ color: 'rgba(255,255,255,0.45)' }}>{sentence.slice(pos + 1)}</span>
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ════ SCREEN ════ */}
      <div style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        background: '#07070f',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px -10px rgba(0,0,0,0.7)',
      }}>
        {/* Fixed-height sign area — never collapses */}
        <div style={{
          height: '320px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse 70% 70% at 50% 45%, #22183f 0%, #07070f 75%)',
          padding: '16px',
          position: 'relative',
        }}>

          {has && letter ? (
            <SignCard letter={letter} index={index} total={tokens.length} />
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✋</div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                Speak or type a message to play sign language on screen
              </div>
            </div>
          )}

          {/* Status badge — top left */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '8px',
            background: 'rgba(11,11,24,0.85)', border: '1px solid rgba(255,255,255,0.10)',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: playing ? '#ff5fa2' : 'rgba(255,255,255,0.20)',
              animation: playing ? 'blink 1.2s ease-in-out infinite' : 'none',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, color: 'rgba(255,255,255,0.60)' }}>
              {playing ? 'PLAYING SIGNS' : has ? 'PAUSED' : 'READY'}
            </span>
          </div>

          {/* Current letter badge — top right */}
          {has && letter && (
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              padding: '4px 14px', borderRadius: '12px',
              background: 'rgba(124,108,255,0.20)', border: '1px solid rgba(124,108,255,0.40)',
              fontSize: '18px', fontWeight: 700, color: '#22d3ee',
              fontFamily: 'Sora, Inter, system-ui, sans-serif',
              minWidth: '52px', textAlign: 'center',
            }}>
              {displayLabel(letter)}
            </div>
          )}

          {/* Progress chips — bottom */}
          {has && (
            <div style={{
              position: 'absolute', bottom: '10px', left: '10px', right: '10px',
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
              gap: '4px', maxHeight: '48px', overflow: 'hidden',
            }}>
              {tokens.map((ch, i) => (
                <span key={i} style={{
                  width: '20px', height: '20px', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontFamily: 'monospace',
                  fontWeight: i === index ? 700 : 400,
                  background: i === index
                    ? '#ff5fa2'
                    : i < index ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                  color: i === index
                    ? '#fff'
                    : i < index ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.25)',
                  transform: i === index ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  boxShadow: i === index ? '0 2px 8px rgba(255,95,162,0.4)' : 'none',
                }}>
                  {isSpaceToken(ch) ? '␣' : ch}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════ SENTENCE STRIP ════ */}
      <div style={{
        borderRadius: '16px',
        background: 'rgba(11,11,24,0.70)',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 20px',
        minHeight: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {sentence ? (
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '15px',
            lineHeight: 1.4,
            textAlign: 'center',
            wordBreak: 'break-word',
            margin: 0,
          }}>
            {renderSentence()}
            <span style={{
              display: 'inline-block',
              width: '2px', height: '16px',
              background: '#22d3ee',
              marginLeft: '4px',
              verticalAlign: 'text-bottom',
              animation: 'blink 1.2s ease-in-out infinite',
            }} />
          </p>
        ) : (
          <p style={{
            color: 'rgba(255,255,255,0.25)',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontStyle: 'italic',
            textAlign: 'center',
            margin: 0,
          }}>
            The sentence will appear here after translation
          </p>
        )}
      </div>

      {/* ════ CONTROLS ════ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}>
        {/* Restart */}
        <button
          onClick={() => { clearInterval(timerRef.current); setPlaying(false); setIndex(0) }}
          disabled={!has}
          title="Restart"
          style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.60)', cursor: has ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: has ? 1 : 0.35, transition: 'all 0.15s',
          }}
        >
          <RotateCcw size={14} />
        </button>

        {/* Prev */}
        <button
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={!has}
          title="Previous"
          style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.60)', cursor: has ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: has ? 1 : 0.35, transition: 'all 0.15s',
          }}
        >
          <SkipBack size={14} />
        </button>

        {/* Play / Pause */}
        <button
          onClick={() => has && setPlaying(p => !p)}
          disabled={!has}
          title={playing ? 'Pause' : 'Play'}
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: playing
              ? '#ff5fa2'
              : 'linear-gradient(135deg, #7c6cff 0%, #22d3ee 50%, #ff5fa2 100%)',
            border: 'none',
            color: '#fff', cursor: has ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: has ? 1 : 0.35, transition: 'all 0.2s',
            boxShadow: playing ? '0 0 0 0 rgba(255,95,162,0.6)' : '0 4px 16px rgba(124,108,255,0.4)',
            animation: playing ? 'pulseRing 1.6s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
          }}
        >
          {playing ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
        </button>

        {/* Next */}
        <button
          onClick={() => setIndex(i => Math.min(tokens.length - 1, i + 1))}
          disabled={!has}
          title="Next"
          style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.60)', cursor: has ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: has ? 1 : 0.35, transition: 'all 0.15s',
          }}
        >
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  )
}