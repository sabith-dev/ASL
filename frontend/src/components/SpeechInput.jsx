import { useEffect } from 'react'
import { Mic, MicOff, Volume2, ArrowRight, Sparkles, RotateCcw } from 'lucide-react'
import useSpeechRecognition from '../hooks/useSpeechRecognition'

const SUGGESTIONS = [
  'Hello, how are you?',
  'I am happy today',
  'Please help me',
  'Thank you very much',
  'What is your name?',
  'Nice to meet you',
]

export default function SpeechInput({ onTranslate, translating, text, setText }) {
  const speech = useSpeechRecognition({ continuous: false, interim: true })
  const { supported, listening, start, stop, finalText, interimText, reset } = speech

  // Sync spoken text into input box when speech completes
  useEffect(() => {
    if (finalText) {
      setText(prev => (prev ? `${prev.trim()} ${finalText}`.trim() : finalText))
      reset()
    }
  }, [finalText, setText, reset])

  const toggleMic = () => {
    if (listening) {
      stop()
    } else {
      reset()
      start()
    }
  }

  const clearAll = () => {
    reset()
    setText('')
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (text.trim() && !translating) {
      onTranslate(text.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-5">
      <div className="glass p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-xs text-white/40 font-semibold uppercase tracking-wider">
            <Volume2 size={14} className="text-accent-pink" />
            Voice & Text Input
          </div>
          <span className="text-[10px] font-mono text-white/30">Press Enter or click Sign It</span>
        </div>

        {/* Mic button */}
        <div className="flex flex-col items-center justify-center py-3 mb-2">
          <button
            type="button"
            onClick={toggleMic}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              listening
                ? 'recording-pulse bg-accent-pink text-white shadow-lg shadow-accent-pink/30'
                : supported
                  ? 'btn-gradient hover:scale-105'
                  : 'bg-white/[0.07] text-white/40 cursor-not-allowed'
            }`}
            title={supported ? (listening ? 'Stop listening' : 'Click to Speak') : 'Speech recognition not supported in this browser'}
          >
            {listening ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <span className="text-xs font-mono text-white/50 mt-3">
            {listening ? 'Listening... Speak now' : 'Click mic to speak or type text below'}
          </span>
        </div>

        {!supported && (
          <p className="text-center text-xs text-accent-pink mb-3">
            Speech recognition isn't supported here — try Chrome or Edge, or type below.
          </p>
        )}

        {/* Text Input Box */}
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="relative rounded-2xl bg-base-900/80 border border-white/10 focus-within:border-accent-pink/50 transition-colors p-4">
            <textarea
              value={listening ? (text ? `${text} ${interimText}` : interimText) : text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your sentence here, e.g., Hello how are you..."
              rows={3}
              className="w-full bg-transparent text-white font-mono text-sm leading-relaxed placeholder:text-white/25 focus:outline-none resize-none"
            />
            {listening && interimText && (
              <div className="text-xs text-accent-pink font-mono animate-pulse mt-1">
                Transcribing: {interimText}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              type="submit"
              disabled={!text.trim() || translating}
              className="btn-gradient flex-1 px-5 py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:transform-none shadow-lg shadow-accent-pink/15"
            >
              {translating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Translating…
                </>
              ) : (
                <>
                  Sign It & Display <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="p-3.5 rounded-xl glass hover:bg-white/[0.08] transition-colors"
              title="Reset Input"
            >
              <RotateCcw size={16} className="text-white/50" />
            </button>
          </div>
        </form>
      </div>

      {/* Suggestion chips */}
      <div className="glass p-5">
        <div className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Sparkles size={13} className="text-accent-amber" /> Quick Phrases
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setText(s)
                onTranslate(s)
              }}
              className="chip hover:bg-accent-violet/30 hover:border-accent-violet/50 hover:text-white transition-all text-xs !px-3 !py-1.5 text-white/70"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}