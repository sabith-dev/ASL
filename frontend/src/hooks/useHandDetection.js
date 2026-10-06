import { useRef, useEffect, useState, useCallback } from 'react'
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'

const WASM_URL = '/wasm'
const MODEL_URL = '/models/hand_landmarker.task'
const POSE_MODEL_URL = '/models/pose_landmarker_full.task'

export default function useHandDetection({ numHands = 2 } = {}) {
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const poseLmRef = useRef(null)
  const rafRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [detections, setDetections] = useState([])
  const [handPresent, setHandPresent] = useState(false)
  const [poseAvailable, setPoseAvailable] = useState(false)

  const onResultsRef = useRef(() => {})

  useEffect(() => {
    let cancelled = false
    let landmarker
    let poseLm

    async function init() {
      setStatus('loading')
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL)

        try {
          poseLm = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numPoses: 1,
            minDetectionConfidence: 0.4,
            minTrackingConfidence: 0.4,
          })
          if (cancelled) { poseLm.close(); return }
          poseLmRef.current = poseLm
          setPoseAvailable(true)
        } catch (poseErr) {
          console.warn('PoseLandmarker unavailable, hands-only mode:', poseErr)
          setPoseAvailable(false)
        }

        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        })
        if (cancelled) { landmarker.close(); return }
        landmarkerRef.current = landmarker
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        console.error('HandLandmarker init failed:', err)
        setStatus('error')
        setDetections({ fatal: String(err && err.message ? err.message : err) })
      }
    }

    init()
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (landmarker) landmarker.close()
      if (poseLm) poseLm.close()
      landmarkerRef.current = null
      poseLmRef.current = null
    }
  }, [numHands])

  useEffect(() => {
    if (status !== 'ready') return
    const video = videoRef.current
    if (!video) return

    let lastVideoTime = -1
    let lastTimestamp = 0

    const loop = () => {
      const lm = landmarkerRef.current
      const poseLm = poseLmRef.current
      if (lm && video.currentTime !== lastVideoTime && video.readyState >= 2 && !video.paused) {
        lastVideoTime = video.currentTime
        const timestamp = performance.now()
        if (timestamp <= lastTimestamp) { lastTimestamp += 1 } else { lastTimestamp = timestamp }
        try {
          let pose = null
          let poseWorld = null
          if (poseLm) {
            try {
              const poseRes = poseLm.detectForVideo(video, lastTimestamp || 1)
              pose = (poseRes.landmarks || []).map(ps => ps.map(p => ({
                x: p.x, y: p.y, z: p.z, visibility: typeof p.visibility === 'number' ? p.visibility : 0,
              })))
              poseWorld = (poseRes.worldLandmarks || []).map(ps => ps.map(p => ({
                x: p.x, y: p.y, z: p.z, visibility: typeof p.visibility === 'number' ? p.visibility : 0,
              })))
            } catch {}
          }
          const result = lm.detectForVideo(video, lastTimestamp)
          result.pose = pose
          result.poseWorld = poseWorld
          if (result.landmarks && result.landmarks.length) {
            setHandPresent(true)
            setDetections({
              landmarks: result.landmarks,
              handedness: (result.handednesses || []),
              pose,
              poseWorld,
            })
            onResultsRef.current(result)
          } else {
            setHandPresent(false)
            setDetections([])
          }
        } catch (err) {
          if (String(err).includes('handedness')) {
            // transient
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [status])

  const startCamera = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    if (video.srcObject) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      video.srcObject = stream
      await video.play()
    } catch (err) {
      console.error('startCamera error:', err)
      setStatus('error')
      setDetections({ fatal: `Camera permission denied: ${err.message}` })
    }
  }, [])

  const stopCamera = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop())
      video.srcObject = null
    }
  }, [])

  const setOnResults = useCallback((cb) => {
    onResultsRef.current = cb
  }, [])

  return {
    videoRef,
    status,
    handPresent,
    poseAvailable,
    detections,
    startCamera,
    stopCamera,
    setOnResults,
  }
}