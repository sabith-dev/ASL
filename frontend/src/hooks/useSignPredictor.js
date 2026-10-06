import { useEffect, useRef, useState, useCallback } from 'react'
import { predictFeatures, predictSequence, getInfo } from '../services/api'

const WINDOW = 12
const CONFIDENCE = 40
const VOTE_NEEDED = 6
const HOLD_MS = 350
const SEQUENCE_BUFFER_SIZE = 45

function normalize2Hands(landmarksInput) {
  let h1 = null, h2 = null

  if (Array.isArray(landmarksInput) && landmarksInput.length > 0) {
    if (landmarksInput.length >= 2 && Array.isArray(landmarksInput[0])) {
      h1 = landmarksInput[0].slice(0, 21).map(p => ({ x: p.x, y: p.y }))
      h2 = landmarksInput[1].slice(0, 21).map(p => ({ x: p.x, y: p.y }))
    } else if (Array.isArray(landmarksInput[0]) && landmarksInput[0].length >= 21) {
      h1 = landmarksInput[0].slice(0, 21).map(p => ({ x: p.x, y: p.y }))
    } else if (landmarksInput.length >= 21) {
      h1 = landmarksInput.slice(0, 21).map(p => ({ x: p.x, y: p.y }))
    }
  }

  if (!h1) return new Array(84).fill(0)

  const w1x = h1[0].x, w1y = h1[0].y
  const h1Moved = h1.map(p => ({ x: p.x - w1x, y: p.y - w1y }))
  let scale1 = 0
  for (const p of h1Moved) {
    const d = Math.hypot(p.x, p.y)
    if (d > scale1) scale1 = d
  }

  const h1Norm = scale1 > 0 ? h1Moved.flatMap(p => [p.x / scale1, p.y / scale1]) : h1Moved.flatMap(p => [p.x, p.y])

  let h2Norm
  if (h2 && h2.length >= 21) {
    const h2Moved = h2.map(p => ({ x: p.x - w1x, y: p.y - w1y }))
    h2Norm = scale1 > 0 ? h2Moved.flatMap(p => [p.x / scale1, p.y / scale1]) : h2Moved.flatMap(p => [p.x, p.y])
  } else {
    h2Norm = new Array(42).fill(0)
  }

  return [...h1Norm, ...h2Norm]
}

export default function useSignPredictor(modelName = 'ensemble') {
  const [connecting, setConnecting] = useState(true)
  const [current, setCurrent] = useState(null)
  const [stable, setStable] = useState(null)
  const [caption, setCaption] = useState('')
  const [letters, setLetters] = useState([])
  const [committed, setCommitted] = useState(null)
  const [frozenLetter, setFrozenLetter] = useState(null)

  // Motion Detection States
  const [isMotionActive, setIsMotionActive] = useState(false)
  const [motionSpeed, setMotionSpeed] = useState(0)
  const [motionTrajectory, setMotionTrajectory] = useState('STATIONARY')

  const modelRef = useRef(modelName)
  const bufferRef = useRef([])
  const frameBufferRef = useRef([]) // Temporal landmark sequence buffer
  const stableRef = useRef(null)
  const stableSinceRef = useRef(null)
  const committedRef = useRef(null)
  const lastCommitTimeRef = useRef(0)
  const missedRef = useRef(0)
  const cooldownUntilRef = useRef(0)
  const handLostRef = useRef(true)
  const captionRef = useRef('')

  useEffect(() => { captionRef.current = caption }, [caption])

  // Initialize API check
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await getInfo()
      } catch {}
      if (!cancelled) setConnecting(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Freeze and commit a letter/word sign into the stored list and caption
  const commitLetter = useCallback((labelToCommit, isManual = false) => {
    const label = labelToCommit || stableRef.current
    if (!label) return
    const now = Date.now()

    // Auto-commit skips repeating the same letter/word while the same hand
    // is still held (no duplicates). Manual commits are always honored.
    if (!isManual && committedRef.current === label &&
        (now - lastCommitTimeRef.current < 500 || !handLostRef.current)) {
      return
    }

    lastCommitTimeRef.current = now
    committedRef.current = label
    handLostRef.current = false
    setCommitted(label)
    setFrozenLetter(label)

    // After a letter/word is confirmed, clear the live detection so the
    // confirmed sign does not stay in the "Live Sign" section.
    cooldownUntilRef.current = now + 1800
    setCurrent(null)
    setStable(null)

    const isSpace = label === 'space' || label === ' '

    setLetters(prev => [...prev, isSpace ? '␣' : label])

    setCaption(prev => {
      if (isSpace) {
        return prev && !prev.endsWith(' ') ? prev + ' ' : prev
      }
      if (label.length > 1) {
        return prev ? (prev.endsWith(' ') ? prev + label + ' ' : prev + ' ' + label + ' ') : label + ' '
      }
      return prev + label
    })

    stableRef.current = null
    stableSinceRef.current = null
    bufferRef.current = []

    setTimeout(() => {
      setFrozenLetter(null)
    }, 1500)
  }, [])

  const ingest = useCallback(async ({ landmarks, pose, prediction } = {}) => {
    // Cooldown after a confirmed letter/word: keep the live section empty
    // for a moment so the confirmed sign does not linger on screen.
    if (Date.now() < cooldownUntilRef.current) {
      setCurrent(null)
      setStable(null)
      return null
    }

    const hasHand = !!landmarks && (!Array.isArray(landmarks) || landmarks.length > 0)
    const hasPose = !!pose && pose.length > 0

    if (!hasHand && !hasPose) {
      missedRef.current += 1
      bufferRef.current = []
      frameBufferRef.current = []
      stableRef.current = null
      stableSinceRef.current = null
      if (missedRef.current >= 3) {
        committedRef.current = null
        handLostRef.current = true
      }
      setCurrent(null)
      setStable(null)
      setIsMotionActive(false)
      setMotionTrajectory('STATIONARY')
      setMotionSpeed(0)
      return null
    }
    missedRef.current = 0

    // Push a frame (hands + optional body pose) into the temporal sequence
    // buffer. Pose enables the custom-sign model to recognize full-body motion.
    frameBufferRef.current.push({
      hands: hasHand
        ? landmarks.map(h => h.slice(0, 21).map(p => [p.x ?? p[0], p.y ?? p[1]]))
        : null,
      pose: hasPose
        ? pose[0].slice(0, 33).map(p => [p.x ?? p[0], p.y ?? p[1], p.z ?? p[2]])
        : null,
    })
    if (frameBufferRef.current.length > SEQUENCE_BUFFER_SIZE) {
      frameBufferRef.current.shift()
    }

    let res = prediction

    // Predict using temporal landmark sequence if buffer has sequence frames
    if (frameBufferRef.current.length >= 4) {
      try {
        res = await predictSequence(frameBufferRef.current, modelRef.current)
      } catch (err) {
        // Static-letter fallback only makes sense when a hand is in view.
        if (!res && hasHand) {
          const feats = normalize2Hands(landmarks)
          try {
            res = await predictFeatures(feats, modelRef.current)
          } catch {}
        }
      }
    } else if (!res && hasHand) {
      const feats = normalize2Hands(landmarks)
      try {
        res = await predictFeatures(feats, modelRef.current)
      } catch (err) {
        return null
      }
    }

    if (!res) return null

    // Update Motion Tracking UI state
    if (res.is_motion !== undefined) {
      setIsMotionActive(res.is_motion)
      setMotionSpeed(res.motion_speed || 0)
      setMotionTrajectory(res.trajectory || 'STATIONARY')
    }

    setCurrent(res)

    if (res.confidence < CONFIDENCE) {
      bufferRef.current = []
      stableRef.current = null
      stableSinceRef.current = null
      setStable(null)
      return null
    }

    bufferRef.current.push(res.prediction)
    if (bufferRef.current.length > WINDOW) bufferRef.current.shift()

    // Majority vote over the window — commit only the most consistent sign.
    const counts = {}
    for (const p of bufferRef.current) counts[p] = (counts[p] || 0) + 1
    let topLabel = null
    let topCount = 0
    for (const k of Object.keys(counts)) {
      if (counts[k] > topCount) { topCount = counts[k]; topLabel = k }
    }

    if (topLabel && topCount >= VOTE_NEEDED) {
      if (stableRef.current !== topLabel) {
        stableRef.current = topLabel
        stableSinceRef.current = Date.now()
      }
      const held = Date.now() - stableSinceRef.current
      setStable({ label: topLabel, held })
      if (held >= HOLD_MS) {
        commitLetter(topLabel)
      }
    } else {
      stableRef.current = null
      stableSinceRef.current = null
      setStable(null)
    }
    return res
  }, [commitLetter])

  const removeLast = useCallback(() => {
    setLetters(prev => prev.slice(0, -1))
    setCaption(prev => prev.slice(0, -1))
  }, [])

  // Insert a full suggested phrase, replacing the partially signed last word.
  const applyPhrase = useCallback((phrase) => {
    const cur = captionRef.current.trimEnd()
    const tokens = cur ? cur.split(/\s+/) : []
    const base = tokens.length > 1 ? tokens.slice(0, -1).join(' ') : ''
    const next = (base ? `${base} ${phrase}` : phrase) + ' '
    const chars = next.split('').map(ch => (ch === ' ' ? '␣' : ch))
    setCaption(next)
    setLetters(chars)
    bufferRef.current = []
    frameBufferRef.current = []
    stableRef.current = null
    stableSinceRef.current = null
  }, [])

  const clear = useCallback(() => {
    setCaption('')
    setLetters([])
    bufferRef.current = []
    frameBufferRef.current = []
    stableRef.current = null
    stableSinceRef.current = null
    setCommitted(null)
    setFrozenLetter(null)
    committedRef.current = null
    cooldownUntilRef.current = 0
    handLostRef.current = true
    setIsMotionActive(false)
    setMotionTrajectory('STATIONARY')
    setMotionSpeed(0)
  }, [])

  const speakCaption = useCallback(() => {
    if (!caption.trim() || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(caption)
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }, [caption])

  return {
    connecting,
    current,
    stable,
    caption,
    letters,
    committed,
    frozenLetter,
    isMotionActive,
    motionSpeed,
    motionTrajectory,
    ingest,
    commitLetter,
    removeLast,
    applyPhrase,
    clear,
    speakCaption,
    normalize: normalize2Hands,
  }
}