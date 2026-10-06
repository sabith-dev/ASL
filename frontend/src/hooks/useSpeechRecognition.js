import { useRef, useState, useCallback, useEffect } from 'react'

export default function useSpeechRecognition({ continuous = false, interim = false } = {}) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [finalText, setFinalText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState(null)
  const recogRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      return
    }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = continuous
    rec.interimResults = interim || true
    rec.maxAlternatives = 1
    recogRef.current = rec

    rec.onresult = (e) => {
      let interimBuf = ''
      let finalBuf = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalBuf += t
        else interimBuf += t
      }
      if (finalBuf) setFinalText(prev => (prev ? prev.trimEnd() + ' ' : '') + finalBuf.trim())
      if (interimBuf) setInterimText(interimBuf)
    }
    rec.onerror = (e) => {
      setError(e.error)
      setListening(false)
    }
    rec.onend = () => setListening(false)

    return () => { try { rec.abort() } catch {} }
  }, [continuous, interim])

  const start = useCallback(() => {
    const rec = recogRef.current
    if (!rec) return
    setFinalText('')
    setInterimText('')
    setError(null)
    try { rec.start() } catch {}
    setListening(true)
  }, [])

  const stop = useCallback(() => {
    const rec = recogRef.current
    if (!rec) return
    try { rec.stop() } catch {}
  }, [])

  const reset = useCallback(() => {
    setFinalText('')
    setInterimText('')
    setError(null)
  }, [])

  return { supported, listening, start, stop, reset, finalText, interimText, error }
}