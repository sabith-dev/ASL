import { useCallback, useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'

const WASM_URL = '/wasm'
const HAND_MODEL = '/models/hand_landmarker.task'
const POSE_MODEL = '/models/pose_landmarker_full.task'

function plm(p) {
  return { x: p.x, y: p.y, z: p.z }
}

function plmVis(p) {
  return [p.x, p.y, p.z, typeof p.visibility === 'number' ? p.visibility : 0]
}

function buildFrame(handRes, poseRes) {
  const hands = (handRes?.landmarks || []).map(h => h.map(plm))
  const handedness = (handRes?.handednesses || []).map(hs => (
    hs && hs[0] && hs[0].categoryName ? hs[0].categoryName : 'Unknown'
  ))
  const pose = (poseRes?.landmarks || []).map(ps => ps.map(plmVis))
  const poseWorld = (poseRes?.worldLandmarks || []).map(ps => ps.map(plmVis))
  return { hands, handedness, pose, pose_world: poseWorld }
}

export default function useTrainCapture({ numHands = 2, numPoses = 1 } = {}) {
  const videoRef = useRef(null)
  const handLmRef = useRef(null)
  const poseLmRef = useRef(null)
  const rafRef = useRef(null)
  const onFrameRef = useRef(() => {})
  const cameraOnRef = useRef(false)
  const lastVideoTimeRef = useRef(-1)
  const lastTsRef = useRef(0)
  const lastPersistRef = useRef(0)

  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [cameraOn, setCameraOn] = useState(false)
  const [handPresent, setHandPresent] = useState(false)
  const [posePresent, setPosePresent] = useState(false)
  const [lastFrame, setLastFrame] = useState(null)
  const [fatal, setFatal] = useState(null)
  const [poseAvailable, setPoseAvailable] = useState(false)

  const setCameraOnBoth = useCallback((on) => {
    cameraOnRef.current = on
    setCameraOn(on)
    if (!on) {
      lastVideoTimeRef.current = -1
      onFrameRef.current({ reset: true })
    }
  }, [])

  // Load both MediaPipe models once.
  useEffect(() => {
    let cancelled = false
    let handLm
    let poseLm

    async function init() {
      setStatus('loading')
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL)

        try {
          poseLm = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numPoses,
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

        handLm = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        })
        if (cancelled) { handLm.close(); return }
        handLmRef.current = handLm
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        console.error('Train capture init failed:', err)
        setStatus('error')
        setFatal(String(err && err.message ? err.message : err))
      }
    }

    init()
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      try { poseLm && poseLm.close() } catch {}
      try { handLm && handLm.close() } catch {}
      handLmRef.current = null
      poseLmRef.current = null
    }
  }, [numHands, numPoses])

  // Camera loop — detect hands + body pose and emit one normalized frame.
  useEffect(() => {
    if (status !== 'ready') return
    const video = videoRef.current
    if (!video) return

    const loop = () => {
      const lmHand = handLmRef.current
      const lmPose = poseLmRef.current
      const camOn = cameraOnRef.current

      if (camOn && video.readyState >= 2 && !video.paused && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime
        let ts = performance.now()
        if (ts <= lastTsRef.current) ts = lastTsRef.current + 1
        lastTsRef.current = ts

        let handRes = null
        let poseRes = null
        if (lmHand) { try { handRes = lmHand.detectForVideo(video, ts) } catch {} }
        if (lmPose) { try { poseRes = lmPose.detectForVideo(video, ts) } catch {} }

        const hands = handRes?.landmarks || []
        const poses = poseRes?.landmarks || []
        setHandPresent(prev => (hands.length > 0) !== prev ? hands.length > 0 : prev)
        setPosePresent(prev => (poses.length > 0) !== prev ? poses.length > 0 : prev)

        const frame = buildFrame(handRes, poseRes)
        onFrameRef.current(frame)

        // Persist a lightweight snapshot for the UI at ~4fps (visuals are drawn
        // imperatively by the page from onFrame, so no per-frame re-renders).
        if (performance.now() - lastPersistRef.current > 250) {
          lastPersistRef.current = performance.now()
          setLastFrame(frame)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
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
      setCameraOnBoth(true)
      setFatal(null)
    } catch (err) {
      console.error('Train camera start error:', err)
      setFatal(`Camera permission denied: ${err.message}`)
    }
  }, [setCameraOnBoth])

  const stopCamera = useCallback(() => {
    const video = videoRef.current
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop())
      video.srcObject = null
    }
    setCameraOnBoth(false)
  }, [setCameraOnBoth])

  const setOnFrame = useCallback((cb) => {
    onFrameRef.current = cb
  }, [])

  return {
    videoRef,
    status,
    cameraOn,
    handPresent,
    posePresent,
    poseAvailable,
    lastFrame,
    fatal,
    startCamera,
    stopCamera,
    setOnFrame,
  }
}