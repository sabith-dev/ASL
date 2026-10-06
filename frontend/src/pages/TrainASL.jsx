import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Video, Camera, CameraOff, Database, Trash2, Wand2,
  CircleDot, Save, RotateCcw, CheckCircle2, Loader2, Brain,
} from 'lucide-react'
import useTrainCapture from '../hooks/useTrainCapture'
import {
  deleteTrainClass, getTrainModelStatus, getTrainSummary,
  saveTrainSample, trainCustomModel,
} from '../services/api'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

// MediaPipe PoseLandmarker 33-point topology
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
]

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

function drawSkeleton(ctx, pts, connections, W, H, color) {
  if (!pts || pts.length === 0) return
  const p = pts.map(q => [W - q.x * W, q.y * H])
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const [a, b] of connections) {
    if (p[a] && p[b]) {
      ctx.moveTo(p[a][0], p[a][1])
      ctx.lineTo(p[b][0], p[b][1])
    }
  }
  ctx.stroke()
  ctx.fillStyle = color
  for (let i = 0; i < p.length; i++) {
    ctx.beginPath()
    ctx.arc(p[i][0], p[i][1], i < 5 ? 3.5 : 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

export default function TrainASL() {
  const { videoRef, status, cameraOn, handPresent, posePresent, poseAvailable, fatal,
    startCamera, stopCamera, setOnFrame } = useTrainCapture({ numHands: 2, numPoses: 1 })

  const [labelDraft, setLabelDraft] = useState('')
  const [labels, setLabels] = useState([])
  const [duration, setDuration] = useState(2)
  const [autoRepeat, setAutoRepeat] = useState(false)
  const [recording, setRecording] = useState(false)
  const [framesCollected, setFramesCollected] = useState(0)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)
  const [stats, setStats] = useState({ classes: [], num_classes: 0, total_samples: 0 })
  const [model, setModel] = useState(null)
  const [training, setTraining] = useState(false)
  const [trainMsg, setTrainMsg] = useState(null)

  const canvasRef = useRef(null)
  const inputRef = useRef(null)
  const recorderRef = useRef({ active: false, frames: [], endAt: 0, pending: null })
  const statsTimerRef = useRef(null)
  const ctxRef = useRef(null)
  const autoRepeatRef = useRef(autoRepeat)
  const durationRef = useRef(duration)
  const startRecordingRef = useRef(null)

  autoRepeatRef.current = autoRepeat
  durationRef.current = duration

  const refreshStats = useCallback(async () => {
    try {
      setStats(await getTrainSummary())
    } catch (err) {
      setStats({ classes: [], num_classes: 0, total_samples: 0 })
      setStatusMsg({ type: 'error', text: `Stats unavailable: ${err.message}` })
    }
  }, [])

  const refreshModel = useCallback(async () => {
    try {
      setModel(await getTrainModelStatus())
    } catch (err) {
      setModel({ trained: false })
    }
  }, [])

  const trainModel = useCallback(async () => {
    if (training) return
    setTraining(true)
    setTrainMsg(null)
    try {
      const report = await trainCustomModel()
      setModel(report)
      const acc = report.overall_accuracy != null ? ` · validation accuracy ${report.overall_accuracy}%` : ''
      setTrainMsg({ type: 'ok', text: `Model trained on ${report.total_samples} samples across ${report.num_classes} signs${acc} — ready in Sign-to-Text & Conversation.` })
    } catch (err) {
      setTrainMsg({ type: 'error', text: `Training failed: ${err.message}` })
    } finally {
      setTraining(false)
    }
  }, [training])

  useEffect(() => { refreshStats(); refreshModel() }, [refreshStats, refreshModel])

  const saveSingle = useCallback(async (labelToSave, frames) => {
    try {
      await saveTrainSample(labelToSave, frames)
      return true
    } catch (err) {
      return false
    }
  }, [])

  const addLabel = useCallback(() => {
    const clean = labelDraft.trim().toUpperCase().replace(/\s+/g, ' ')
    if (!clean) return
    setLabels(prev => prev.includes(clean) ? prev : [...prev, clean])
    setLabelDraft('')
  }, [labelDraft])

  const removeLabel = useCallback((i) => {
    setLabels(prev => prev.filter((_, idx) => idx !== i))
  }, [])

  const cancelRecording = useCallback(() => {
    const rec = recorderRef.current
    rec.active = false
    rec.frames = []
    rec.pending = null
    setRecording(false)
    setFramesCollected(0)
  }, [])

  const startRecording = useCallback((list) => {
    if (!list || !list.length) return
    const clean = [...new Set(list.map(l => l.trim().toUpperCase()).filter(Boolean))]
    if (!clean.length) return
    const rec = recorderRef.current
    rec.frames = []
    rec.pending = clean
    rec.active = true
    rec.endAt = performance.now() + (durationRef.current * 1000)
    setRecording(true)
    setFramesCollected(0)
    setStatusMsg(null)
  }, [])

  startRecordingRef.current = startRecording

  // Size the overlay canvas to match the video element.
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const fit = () => {
      if (canvas && video) {
        const rect = video.getBoundingClientRect()
        canvas.width = Math.max(2, Math.round(rect.width))
        canvas.height = Math.max(2, Math.round(rect.height))
        ctxRef.current = canvas.getContext('2d')
      }
    }
    if (cameraOn) {
      fit()
      window.addEventListener('resize', fit)
      return () => window.removeEventListener('resize', fit)
    }
  }, [cameraOn, videoRef])

  // Imperative overlay drawing — called on every detected frame.
  useEffect(() => {
    const draw = (frame) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = ctxRef.current
      if (!ctx) return
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)
      if (frame.reset) return
      if (frame.pose && frame.pose.length) {
        drawSkeleton(ctx, frame.pose[0], POSE_CONNECTIONS, W, H, 'rgba(34,211,238,0.9)')
      }
      if (frame.hands && frame.hands.length) {
        frame.hands.forEach((h, i) => {
          drawSkeleton(ctx, h, HAND_CONNECTIONS, W, H, i === 0 ? 'rgba(255,95,162,0.95)' : 'rgba(251,191,36,0.95)')
        })
      }
    }
    setOnFrame(draw)
  }, [setOnFrame])

  // Recording core: accumulate frames while active, auto-save at deadline.
  useEffect(() => {
    let finishing = false
    const handleFrame = (frame) => {
      if (frame.reset) return
      const rec = recorderRef.current
      if (!rec.active || finishing) return
      const now = performance.now()
      if ((frame.hands && frame.hands.length) || (frame.pose && frame.pose.length)) {
        rec.frames.push({
          hands: frame.hands || [],
          handedness: frame.handedness || [],
          pose: frame.pose || [],
          pose_world: frame.pose_world || [],
        })
        setFramesCollected(rec.frames.length)
      }
      if (now >= rec.endAt) {
        finishing = true
        rec.active = false
        const frames = rec.frames.slice()
        const lbls = rec.pending
        rec.frames = []
        rec.pending = null
        setRecording(false)
        setFramesCollected(0)
        if (!lbls || !lbls.length || frames.length < 3) {
          setStatusMsg({ type: 'error', text: 'Not enough frames captured (need a hand or body in view).' })
          return
        }
        setSaving(true)
        Promise.all(lbls.map(l => saveSingle(l, frames))).then(results => {
          setSaving(false)
          const any = results.some(Boolean)
          const ok = results.every(Boolean)
          setStatusMsg(any
            ? { type: ok ? 'ok' : 'error', text: ok ? `Saved 1 sample × ${lbls.length} → ${lbls.join(', ')}` : 'Some signs failed to save' }
            : { type: 'error', text: 'Save failed — is the backend running?' })
          if (statsTimerRef.current) clearTimeout(statsTimerRef.current)
          statsTimerRef.current = setTimeout(() => { refreshStats(); refreshModel() }, 250)
          if (ok && autoRepeatRef.current) {
            // Auto-repeat: keep the same labels and roll straight into the
            // next take so samples stack up for those signs.
            statsTimerRef.current = setTimeout(() => startRecordingRef.current(lbls), 500)
          } else if (ok) {
            // One-shot: the labels have been used up, so clear them and
            // refocus the input — type the next word and record it right away.
            setLabels([])
            setLabelDraft('')
            setTimeout(() => { if (inputRef.current) inputRef.current.focus() }, 50)
          }
        })
      }
    }
    setOnFrame(handleFrame)
  }, [refreshStats, refreshModel, saveSingle, setOnFrame])

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center mb-8">
        <div className="chip mx-auto mb-4">
          <Wand2 size={14} className="text-accent-cyan" />
          Data Collection Studio
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl">
          Train New <span className="text-gradient">Signs</span>
        </h1>
        <p className="text-white/45 mt-3 max-w-2xl mx-auto">
          Teach the system your own signs. Type a word, press <strong className="text-white/70">Record</strong>, and it saves
          1 sample from your <strong className="text-white/70">full-body pose</strong> +{' '}
          <strong className="text-white/70">hand landmarks</strong> into{' '}
          <code className="text-accent-cyan font-mono">dataset/signs/&lt;label&gt;/</code> — then type the next word and record again.
          When you have at least 2 signs, hit <strong className="text-white/70">Train</strong> to make them work in Sign-to-Text &amp; Conversation.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* CAMERA / RECORD */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-3">
          <div className="glass p-5">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-base-900 border border-white/[0.06]">
              <video ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover video-feed"
                playsInline muted
              />
              <canvas ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />
              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-base-950/80 z-20">
                  <div className="w-16 h-16 rounded-full bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center">
                    <Video size={28} className="text-accent-cyan" />
                  </div>
                  <div className="text-center">
                    <div className="font-display font-semibold">Camera Offline</div>
                    <div className="text-white/40 text-sm mt-1">Enable webcam to record sign samples</div>
                  </div>
                  <button onClick={startCamera}
                    className="btn-gradient px-6 py-3 rounded-2xl flex items-center gap-2 mt-1 text-sm">
                    <Camera size={18} /> Enable Camera
                  </button>
                </div>
              )}
              {recording && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/90 text-white text-xs font-bold font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" /> REC · {framesCollected}
                </div>
              )}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-[10px] font-mono text-white/60">
                <span className={`w-1.5 h-1.5 rounded-full ${cameraOn && handPresent ? 'bg-accent-pink animate-blink' : 'bg-white/20'}`} />
                HAND {handPresent ? '✓' : '—'}
                <span className={`w-1.5 h-1.5 rounded-full ${cameraOn && posePresent ? 'bg-accent-cyan animate-blink' : 'bg-white/20'}`} />
                BODY {posePresent ? '✓' : '—'}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-base-900/60 border border-white/[0.06] py-2.5 col-span-2 sm:col-span-1">
                <div className="text-[9px] uppercase text-white/35 font-semibold">Hand Landmarks</div>
                <div className="font-mono text-sm text-accent-pink mt-1">{handPresent ? 'DETECTED' : 'none'}</div>
              </div>
              <div className="rounded-xl bg-base-900/60 border border-white/[0.06] py-2.5 col-span-2 sm:col-span-1">
                <div className="text-[9px] uppercase text-white/35 font-semibold">Body Motion</div>
                <div className="font-mono text-sm text-accent-cyan mt-1">
                  {poseAvailable ? (posePresent ? 'DETECTED' : 'none') : 'no pose model'}
                </div>
              </div>
              <div className="rounded-xl bg-base-900/60 border border-white/[0.06] py-2.5">
                <div className="text-[9px] uppercase text-white/35 font-semibold">Samples Stored</div>
                <div className="font-mono text-sm text-white/80 mt-1">{stats.total_samples}</div>
              </div>
              <div className="rounded-xl bg-base-900/60 border border-white/[0.06] py-2.5">
                <div className="text-[9px] uppercase text-white/35 font-semibold">Sign Classes</div>
                <div className="font-mono text-sm text-accent-cyan mt-1">{stats.num_classes}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CONTROL PANEL */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2 flex flex-col gap-5">
          <div className="glass p-5">
            <div className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <CircleDot size={13} className="text-accent-pink" /> Sign Labels
            </div>
            <p className="text-[10px] font-mono text-white/30 mb-2">
              Type a word and press <strong className="text-white/50">Enter</strong> (or + Add), then Record.
              Add several words to record them all at once — after each save the list clears so the next word is ready.
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value.toUpperCase().slice(0, 40))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel() } }}
                placeholder="Type a sign name, e.g. HELLO"
                className="flex-1 rounded-xl bg-base-900/80 border border-white/10 px-4 py-3 text-white font-mono text-sm placeholder:text-white/25 focus:outline-none focus:border-accent-pink/50"
              />
              <button
                onClick={addLabel}
                disabled={!labelDraft.trim()}
                className="px-4 rounded-xl glass hover:bg-white/[0.08] text-xs font-bold text-white/80 transition-colors disabled:opacity-30"
                title="Add label"
              >
                + Add
              </button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {labels.map((l, i) => (
                  <span key={l} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-violet/20 border border-accent-violet/40 text-white font-mono text-xs font-bold">
                    {l}
                    <button
                      onClick={() => removeLabel(i)}
                      className="text-white/40 hover:text-red-400 transition-colors text-sm leading-none"
                      title={`Remove ${l}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setLabels([])}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-white/30 hover:text-accent-pink transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
            {saving && <p className="text-xs text-accent-pink font-mono mt-2 animate-pulse">Saving samples…</p>}
            {statusMsg && (
              <p className={`text-xs font-mono mt-2 ${statusMsg.type === 'ok' ? 'text-emerald-400' : 'text-accent-pink'}`}>
                {statusMsg.text}
              </p>
            )}
            {fatal && (
              <p className="text-xs font-mono mt-2 text-accent-pink">{fatal}</p>
            )}
          </div>

          <div className="glass p-5">
            <div className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">Recording Settings</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-white/60">
                Seconds
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="rounded-lg bg-base-900 border border-white/10 px-2 py-1.5 text-white text-xs font-mono focus:outline-none"
                >
                  {[1, 1.5, 2, 2.5, 3].map(d => <option key={d} value={d}>{d.toFixed(1)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRepeat}
                  onChange={(e) => setAutoRepeat(e.target.checked)}
                  className="accent-accent-cyan"
                />
                Keep recording (stack samples on the same signs)
              </label>
            </div>

            <button
              onClick={() => recording ? cancelRecording() : startRecording(labels)}
              disabled={!labels.length || status !== 'ready' || saving}
              className="btn-gradient w-full mt-4 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:transform-none shadow-lg shadow-accent-pink/15 transition-all hover:scale-[1.02]"
              title={!labels.length ? 'Type a sign name first' : ''}
            >
              {recording ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              {recording ? `Stop · ${framesCollected} frames` : `Record ${labels.length} Sample${labels.length > 1 ? 's' : ''}`}
            </button>

            <p className="text-[10px] font-mono text-white/30 mt-3 leading-relaxed">
              {recording
                ? 'Perform the sign now — every added label receives the same captured sequence.'
                : autoRepeat
                  ? 'Auto-repeat is on: after each take it records again for the same labels until you press Stop.'
                  : 'Type a word → Record → it saves 1 sample and clears the label, so you can type the next word and record it right away.'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* CLASSES */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="mt-6 glass p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-white/40 font-semibold uppercase tracking-wider flex items-center gap-2">
            <Database size={13} className="text-accent-cyan" /> Recorded Signs · dataset/signs/
          </div>
          <button onClick={refreshStats}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-accent-cyan transition-colors">
            <RotateCcw size={12} /> Refresh
          </button>
        </div>

        {/* TRAIN MODEL */}
        <div className="rounded-2xl border border-accent-violet/30 bg-accent-violet/10 p-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent-violet/20 border border-accent-violet/40 flex items-center justify-center shrink-0">
                <Brain size={20} className="text-accent-violet" />
              </div>
              <div>
                <div className="font-display font-bold text-white">Train the Recognizer</div>
                <p className="text-xs text-white/45 mt-1 leading-relaxed max-w-xl">
                  {model?.trained
                    ? <>Model trained: <strong className="text-accent-cyan">{model.num_classes} signs</strong> · {model.total_samples} samples
                    {model.overall_accuracy != null && <> · validation {model.overall_accuracy}%</>} · {model.trained_at || ''}
                    <span className="text-emerald-400/90 block mt-1">✓ Live in Sign-to-Text &amp; Conversation now.</span></>
                    : <>Newly recorded signs are <strong>not</strong> recognized until you train. Record at least <strong>2 different signs</strong> (a few samples each), then click Train to make them work in Sign-to-Text &amp; Conversation.</>}
                </p>
              </div>
            </div>
            <button
              onClick={trainModel}
              disabled={training || stats.num_classes < 2}
              className="btn-gradient px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:transform-none shadow-lg shadow-accent-violet/15 transition-all hover:scale-[1.02] shrink-0"
              title={stats.num_classes < 2 ? 'Record at least 2 different signs first' : 'Train a new recognizer from your samples'}
            >
              {training ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {training ? 'Training…' : model?.trained ? 'Retrain' : 'Train Custom Model'}
            </button>
          </div>
          {trainMsg && (
            <p className={`text-xs font-mono mt-3 ${trainMsg.type === 'ok' ? 'text-emerald-400' : 'text-accent-pink'}`}>
              {trainMsg.text}
            </p>
          )}
        </div>

        {stats.classes.length === 0 ? (
          <div className="text-center py-8 text-white/25 text-sm font-mono">
            No trained signs yet — record your first one above.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.classes.map(c => (
              <div key={c.label} className="rounded-xl bg-base-900/60 border border-white/[0.07] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-bold text-white truncate">{c.label}</div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Delete all ${c.count} samples for "${c.label}"?`)) return
                      try {
                        await deleteTrainClass(c.label)
                        setStatusMsg({ type: 'ok', text: `Deleted "${c.label}" (${c.count} samples)` })
                        refreshStats()
                        refreshModel()
                      } catch (err) {
                        setStatusMsg({ type: 'error', text: err.message })
                      }
                    }}
                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title={`Delete ${c.label}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-xs text-accent-cyan">{c.count} {c.count === 1 ? 'sample' : 'samples'}</span>
                  <span className="text-[10px] font-mono text-white/30">{c.samples.length} files</span>
                </div>
                <div className="mt-2 overflow-hidden max-h-8">
                  <div className="flex flex-wrap gap-1">
                    {c.samples.slice(0, 8).map(f => (
                      <span key={f} className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[9px] font-mono text-white/40">{f}</span>
                    ))}
                    {c.samples.length > 8 && <span className="text-[9px] font-mono text-white/30">+{c.samples.length - 8} more</span>}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-mono">
                  {model?.trained && (model.classes || []).includes(c.label) ? (
                    <span className="text-emerald-400/90 flex items-center gap-1"><CheckCircle2 size={11} /> in trained model</span>
                  ) : (
                    <span className="text-amber-300/80 flex items-center gap-1"><Wand2 size={11} /> recorded — train to enable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}