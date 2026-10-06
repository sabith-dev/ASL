import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Zap, Volume2, ArrowRight } from 'lucide-react'
import useHandDetection from '../hooks/useHandDetection'
import useSignPredictor from '../hooks/useSignPredictor'
import CameraView from '../components/CameraView'
import SignPrediction from '../components/SignPrediction'
import CaptionBox from '../components/CaptionBox'
import WordPredictions from '../components/WordPredictions'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function SignToText() {
  const { videoRef, startCamera, stopCamera, status: camStatus, handPresent, detections, setOnResults } = useHandDetection({ numHands: 2 })
  const predictor = useSignPredictor()
  const {
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
    applyPhrase,
    clear,
    removeLast,
    speakCaption,
  } = predictor

  const [cameraOn, setCameraOn] = useState(false)
  const lastLandmarks = useRef(null)

  // Keyboard shortcut: Spacebar or Enter freezes current detected letter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        if (current?.prediction) {
          commitLetter(current.prediction, true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [current, commitLetter])

  useEffect(() => {
    if (cameraOn) startCamera()
    else stopCamera()
  }, [cameraOn, startCamera, stopCamera])

  useEffect(() => {
    const handler = async (result) => {
      if (result.landmarks && result.landmarks.length) {
        lastLandmarks.current = result.landmarks
        await ingest({ landmarks: result.landmarks, pose: result.pose || null })
      }
    }
    setOnResults(handler)
  }, [setOnResults, ingest])

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center mb-10">
        <div className="chip mx-auto mb-4">
          <Camera size={14} className="text-accent-cyan" />
          Dual-Hand Live Camera Mode
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl">
          Sign to <span className="text-gradient">Text</span>
        </h1>
        <p className="text-white/45 mt-3 max-w-lg mx-auto">
          Show <strong>1 or 2 hands</strong> to the camera. Click <strong>Freeze Sign</strong> or press <strong>Spacebar</strong> to freeze and store signs into complete text!
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-3">
          <CameraView
            videoRef={videoRef}
            cameraOn={cameraOn}
            onToggle={setCameraOn}
            status={camStatus}
            handPresent={handPresent}
            detections={detections}
            subtitle={caption}
          />
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2 flex flex-col gap-5">
          <SignPrediction
            current={current}
            stable={stable}
            committed={committed}
            frozenLetter={frozenLetter}
            letters={letters}
            caption={caption}
            isMotionActive={isMotionActive}
            motionSpeed={motionSpeed}
            motionTrajectory={motionTrajectory}
            onFreezeLetter={(lbl) => commitLetter(lbl, true)}
            onAddSpace={(spaceLbl) => commitLetter(spaceLbl, true)}
          />
          <WordPredictions text={caption} onPick={applyPhrase} />
          <CaptionBox
            caption={caption}
            onClear={clear}
            onRemoveLast={removeLast}
            onSpeak={speakCaption}
          />
        </motion.div>
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" className="mt-6 glass px-5 py-3.5 rounded-2xl flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-white/40">
        <span className="flex items-center gap-1.5"><Zap size={12} className="text-accent-cyan" /> Tracks <strong>both hands</strong> simultaneously with high accuracy</span>
        <span className="flex items-center gap-1.5"><Volume2 size={12} className="text-accent-pink" /> Calibrated confidence scores reflect true prediction accuracy</span>
        <span className="flex items-center gap-1.5"><ArrowRight size={12} className="text-accent-amber" /> Click speaker button to read sentence aloud</span>
      </motion.div>
    </div>
  )
}