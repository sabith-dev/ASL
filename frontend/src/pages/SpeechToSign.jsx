import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, Type, Ear, Sparkles } from 'lucide-react'
import { translateText } from '../services/api'
import SpeechInput from '../components/SpeechInput'
import SignPlayer from '../components/SignPlayer'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function SpeechToSign() {
  const [typed, setTyped] = useState('')
  const [sentence, setSentence] = useState('')
  const [gloss, setGloss] = useState([])
  const [letters, setLetters] = useState([])
  const [translating, setTranslating] = useState(false)

  const runTranslation = async (text) => {
    if (!text.trim()) return
    setTranslating(true)
    try {
      const res = await translateText(text)
      const newGloss = res.gloss || []
      const seq = (res.sequence || []).flatMap(item => {
        if (typeof item === 'string') return [item]
        if (item.type === 'word') return item.value.split('')
        if (item.type === 'space') return ['space']
        if (item.type === 'letter') return [item.value]
        return [item.value]
      })
      setGloss(newGloss)
      setLetters(seq)
      setSentence(text)
    } catch (err) {
      console.error('Translation error:', err)
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center mb-10">
        <div className="chip mx-auto mb-4">
          <Mic size={14} className="text-accent-pink" />
          Voice Mode
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl">
          Speak to <span className="text-gradient">Sign</span>
        </h1>
        <p className="text-white/45 mt-3 max-w-lg mx-auto">
          Say a sentence or type it below — it is translated into natural ASL gloss,
          then each letter and word sign is displayed step by step.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ── Input panel ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <SpeechInput onTranslate={runTranslation} translating={translating} text={typed} setText={setTyped} />
        </motion.div>

        {/* ── Sign output panel ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="glass p-6 lg:sticky lg:top-28">

          {/* Panel header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-white/40 font-semibold uppercase tracking-wider flex items-center gap-2">
              <Type size={13} className="text-accent-violet" /> Sign Sequence
            </div>
            {letters.length > 0 && (
              <span className="font-mono text-xs text-white/35">
                {letters.length} {letters.length === 1 ? 'sign' : 'signs'}
              </span>
            )}
          </div>

          {/* ASL Gloss chips */}
          {gloss.length > 0 && (
            <div className="mb-5">
              <div className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Ear size={13} className="text-accent-cyan" /> ASL Gloss
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gloss.map((w, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan font-mono text-xs font-semibold"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sign player — rendered directly, no motion wrapper to avoid opacity issues */}
          {letters.length > 0 ? (
            <SignPlayer
              key={sentence + '||' + letters.join('|')}
              sequence={letters}
              sentence={sentence}
            />
          ) : (
            <div className="py-14 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent-violet/10 border border-accent-violet/25 flex items-center justify-center">
                <Sparkles size={26} className="text-accent-violet" />
              </div>
              <p className="text-white/30 text-xs max-w-[240px]">
                Speak or type a sentence to generate the ASL gloss and sign sequence
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}