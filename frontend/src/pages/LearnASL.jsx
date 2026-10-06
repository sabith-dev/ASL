import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import HandSkeleton from '../components/HandSkeleton'
import { ASL_LANDMARKS } from '../data/asl_landmarks'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const LETTER_GUIDE = [
  ['A', 'closed fist, thumb beside fingers'],
  ['B', 'flat hand, fingers together, thumb folded in'],
  ['C', 'hand curved like a cup, fingers together'],
  ['D', 'index up, ring, middle & pinky curled to thumb'],
  ['E', 'fingers curled down to thumb — like a fist with fingertips touching'],
  ['F', 'thumb touches index tip, other fingers straight up'],
  ['G', 'flat palm with index forward, thumb beside it'],
  ['H', 'index & middle together out front, thumb tucked'],
  ['I', 'pinky raised, fist closed'],
  ['J', 'start like I, trace a J in the air'],
  ['K', 'index & middle up, thumb between them'],
  ['L', 'thumb up, index forward — an L shape'],
  ['M', 'index, middle & ring curl down to thumb'],
  ['N', 'index & middle curl down to thumb'],
  ['O', 'fingers touch thumb in a circle — an O'],
  ['P', 'index & middle down, thumb out front, palm angled'],
  ['Q', 'index down, thumb beside it'],
  ['R', 'index & middle crossed'],
  ['S', 'closed fist, thumb crossed over fingers'],
  ['T', 'thumb between index & middle, fist closed'],
  ['U', 'index & middle up together'],
  ['V', 'index & middle spread apart'],
  ['W', 'index, middle & ring up together'],
  ['X', 'index bent like a hook'],
  ['Y', 'thumb & pinky out, fist closed'],
  ['Z', 'index up, palm flat, trace a Z in the air'],
]

export default function LearnASL() {
  return (
    <div className="max-w-6xl mx-auto pb-20">
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center mb-10">
        <div className="chip mx-auto mb-4">
          <Sparkles size={14} className="text-accent-amber" />
          Alphabet Reference
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl">
          Learn the <span className="text-gradient">ASL Alphabet</span>
        </h1>
        <p className="text-white/45 mt-3 max-w-xl mx-auto">
          Every handshape rendered from real MediaPipe hand landmarks.
          Practice each pose, then hold it steady in the camera —
          SignBridge AI recognizes the same letters it draws here.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LETTER_GUIDE.map(([letter, tip], i) => (
          <motion.div
            key={letter}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: i * 0.03 }}
            className="glass p-5 flex items-center gap-4 hover:bg-white/[0.06] transition-colors"
          >
            <div className="w-[84px] h-[84px] shrink-0 rounded-2xl bg-gradient-to-br from-accent-violet/20 to-accent-cyan/10 border border-accent-violet/25 flex items-center justify-center overflow-hidden">
              <HandSkeleton landmarks={ASL_LANDMARKS[letter]} pad={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-2xl text-gradient">{letter}</span>
                <span className="text-[10px] uppercase tracking-wider text-white/35 font-semibold">
                  Sign {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <p className="text-sm text-white/60 leading-snug mt-1">{tip}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" className="mt-8 glass px-6 py-4 rounded-2xl flex items-center gap-3 text-sm text-white/50">
        <Sparkles size={15} className="text-accent-cyan shrink-0" />
        Tip: the skeletons show the same 21 landmark points your camera tracks —
        hold a shape steady for about a third of a second so the stabilizer can commit it.
      </motion.div>
    </div>
  )
}