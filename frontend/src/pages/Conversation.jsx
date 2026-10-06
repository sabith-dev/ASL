import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Camera, CameraOff, MessagesSquare, Hand,
  ArrowRight, Volume2, Sparkles, Ear, Lock, Delete, Trash2,
} from 'lucide-react'
import useHandDetection from '../hooks/useHandDetection'
import useSignPredictor from '../hooks/useSignPredictor'
import { translateText } from '../services/api'
import ConversationPanel from '../components/ConversationPanel'
import CameraView from '../components/CameraView'
import SpeechInput from '../components/SpeechInput'
import SignPlayer from '../components/SignPlayer'
import WordPredictions from '../components/WordPredictions'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function Conversation() {
  const hand = useHandDetection({ numHands: 2 })
  const { videoRef, startCamera, stopCamera, status: camStatus, handPresent, detections, setOnResults } = hand
  const predictor = useSignPredictor()
  const { current, caption, letters, ingest, commitLetter, removeLast, applyPhrase, clear: clearCaption } = predictor

  const [cameraOn, setCameraOn] = useState(false)
  const [messages, setMessages] = useState([])
  const [speakerText, setSpeakerText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [activeSigns, setActiveSigns] = useState({ sequence: [], sentence: '', gloss: [] })
  const transcriptRef = useRef(null)

  const loadMessages = () => {
    try {
      const stored = localStorage.getItem('signbridge_messages')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  }

  useEffect(() => {
    setMessages(loadMessages())
  }, [])

  useEffect(() => {
    localStorage.setItem('signbridge_messages', JSON.stringify(messages.slice(-50)))
  }, [messages])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (cameraOn) startCamera()
    else stopCamera()
  }, [cameraOn, startCamera, stopCamera])

  useEffect(() => {
    const handler = async (result) => {
      if (result.landmarks && result.landmarks.length) {
        await ingest({ landmarks: result.landmarks, pose: result.pose || null })
      }
    }
    setOnResults(handler)
  }, [setOnResults, ingest])

  const timestamp = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const pushSpeaker = async (textToSend) => {
    const raw = textToSend || speakerText
    if (!raw || !raw.trim()) return
    const text = raw.trim()
    setTranslating(true)
    let gloss = []
    let sequence = []
    try {
      const res = await translateText(text)
      gloss = res.gloss || []
      sequence = (res.sequence || []).flatMap(item => {
        if (typeof item === 'string') return [item]
        if (item.type === 'word') return item.value.split('')
        if (item.type === 'space') return ['space']
        if (item.type === 'letter') return [item.value]
        return [item.value]
      })
    } catch {}

    setActiveSigns({ sequence, sentence: text, gloss })
    setMessages(m => [...m, { id: Date.now(), role: 'speaker', text, gloss, sequence, time: timestamp() }])
    setSpeakerText('')
    setTranslating(false)
  }

  const pushSigner = () => {
    const text = caption.trim()
    if (!text) return
    setMessages(m => [...m, { id: Date.now(), role: 'signer', text, gloss: [text], time: timestamp() }])
    clearCaption()
  }

  const clearAll = () => {
    setMessages([])
    clearCaption()
    setActiveSigns({ sequence: [], sentence: '', gloss: [] })
    localStorage.removeItem('signbridge_messages')
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center mb-8">
        <div className="chip mx-auto mb-4">
          <MessagesSquare size={14} className="text-accent-cyan" />
          Live Conversation
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl">
          Two-Way <span className="text-gradient">Conversation</span>
        </h1>
        <p className="text-white/45 mt-3 max-w-xl mx-auto">
          One person speaks or types, the other signs. Messages alternate in a live
          transcript — voice/text displays ASL signs on screen, hand signs become captions.
        </p>
      </motion.div>

      {/* Transcript */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <ConversationPanel messages={messages} onClear={clearAll} innerRef={transcriptRef} />
      </motion.div>

      {/* Consoles */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* SPEAKER CONSOLE */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-white/40 font-semibold uppercase tracking-wider">
              <Volume2 size={14} className="text-accent-cyan" /> Speaker Console
            </div>
            <span className="text-[10px] font-mono text-white/30">Voice / text → ASL sign screen</span>
          </div>

          {/* Same input procedure as the Speak → Sign page */}
          <SpeechInput
            onTranslate={(text) => pushSpeaker(text)}
            translating={translating}
            text={speakerText}
            setText={setSpeakerText}
          />

          {/* Active Sign Screen — same output as the Speak → Sign page */}
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
            {activeSigns.gloss.length > 0 && (
              <div>
                <div className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Ear size={12} className="text-accent-cyan" /> ASL Gloss
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeSigns.gloss.map((w, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan font-mono text-xs font-semibold">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeSigns.sequence.length > 0 && (
              <div>
                <div className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-accent-cyan" /> Screen Displaying Sign
                </div>
                <SignPlayer
                  key={activeSigns.sentence + '||' + activeSigns.sequence.join('|')}
                  sequence={activeSigns.sequence}
                  sentence={activeSigns.sentence}
                  speed={850}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* SIGNER CONSOLE */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="glass p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-xs text-white/40 font-semibold uppercase tracking-wider">
              <Hand size={14} className="text-accent-pink" /> Signer Console
            </div>
            {!cameraOn ? (
              <button onClick={() => setCameraOn(true)}
                className="flex items-center gap-1.5 text-xs btn-gradient px-3 py-1.5 rounded-lg">
                <Camera size={12} /> Enable camera
              </button>
            ) : (
              <button onClick={() => setCameraOn(false)}
                className="flex items-center gap-1.5 text-xs bg-red-500/80 px-3 py-1.5 rounded-lg">
                <CameraOff size={12} /> Stop
              </button>
            )}
          </div>

          <CameraView
            compact
            videoRef={videoRef}
            cameraOn={cameraOn}
            onToggle={setCameraOn}
            status={camStatus}
            handPresent={handPresent}
            detections={detections}
            subtitle={caption}
          />

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-base-900/60 border border-white/[0.06] py-2.5">
              <div className="text-[9px] uppercase text-white/35 font-semibold">Current</div>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                {current?.prediction && current.prediction !== 'space' && (
                  <img src={`/signs/${current.prediction.toUpperCase()}.jpg`} alt={current.prediction}
                    className="w-8 h-8 rounded-lg object-cover border border-accent-violet/30"
                    onError={(e) => { e.currentTarget.style.display = 'none' }} />
                )}
                <span className="font-display font-bold text-xl text-gradient">
                  {current?.prediction || '—'}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-base-900/60 border border-white/[0.06] py-2.5">
              <div className="text-[9px] uppercase text-white/35 font-semibold">Confidence</div>
              <div className="font-mono text-sm text-accent-cyan mt-1">{(current?.confidence || 0).toFixed(0)}%</div>
            </div>
            <div className="rounded-xl bg-base-900/60 border border-white/[0.06] py-2.5">
              <div className="text-[9px] uppercase text-white/35 font-semibold">Signs</div>
              <div className="font-mono text-sm text-white/70 mt-1">{caption.length}</div>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-base-900/60 border border-white/[0.06] p-3 h-[64px] overflow-hidden">
            <p className="font-mono text-sm text-white/85 leading-snug break-words">
              {caption || <span className="text-white/25 italic text-xs">Fingerspell to build a message…</span>}
            </p>
          </div>

          {/* Stored sign sequence */}
          {letters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {letters.map((ch, idx) => (
                <span key={idx}
                  className={`px-2 py-1 rounded-lg border font-mono text-xs font-bold ${
                    ch === '␣'
                      ? 'bg-white/[0.06] border-white/[0.12] text-white/40'
                      : 'bg-accent-violet/20 border-accent-violet/40 text-accent-cyan'
                  }`}>
                  {ch === '␣' ? '·' : ch}
                </span>
              ))}
            </div>
          )}

          {/* Live sign-to-text controls */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => current?.prediction && commitLetter(current.prediction, true)}
              disabled={!current?.prediction}
              className="btn-gradient py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:transform-none shadow-lg shadow-accent-pink/15 transition-all hover:scale-[1.02]"
              title="Freeze currently detected sign"
            >
              <Lock size={13} /> Freeze Sign
            </button>
            <button
              type="button"
              onClick={() => commitLetter('space', true)}
              className="py-2.5 rounded-xl glass hover:bg-white/[0.1] text-xs font-semibold text-white/80 transition-colors"
              title="Insert space"
            >
              ␣ Space
            </button>
            <button
              type="button"
              onClick={removeLast}
              disabled={!letters.length}
              className="py-2.5 rounded-xl glass hover:bg-white/[0.1] text-xs font-semibold text-white/80 transition-colors disabled:opacity-30 flex items-center justify-center gap-1"
              title="Backspace (remove last sign)"
            >
              <Delete size={13} /> Backspace
            </button>
          </div>

          {/* Predict the rest */}
          <div className="mt-3">
            <WordPredictions text={caption} onPick={applyPhrase} />
          </div>

          <button onClick={pushSigner}
            disabled={!caption.trim()}
            className="btn-gradient w-full mt-3 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:transform-none shadow-lg shadow-accent-pink/15">
            <ArrowRight size={15} /> Send caption to transcript
          </button>

          {caption && (
            <button onClick={clearCaption}
              className="w-full mt-2 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-red-500/20 transition-colors"
              title="Clear caption"
            >
              <Trash2 size={13} /> Clear caption
            </button>
          )}
        </motion.div>
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-white/35 font-mono">
        <span>Speaker: voice/text → ASL gloss → sign screen</span>
        <span>Signer: hand → landmarks → caption</span>
      </motion.div>
    </div>
  )
}