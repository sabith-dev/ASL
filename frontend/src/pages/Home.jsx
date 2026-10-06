import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mic, Hand, MessagesSquare, Sparkles, ArrowRight, Brain,
  Camera, Volume2, Captions, ShieldCheck, Zap, Globe, Cpu, Ear, BookOpen,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* ============================ HERO ============================ */}
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="text-center pt-10 pb-16"
      >
        <motion.div variants={fadeUp} className="flex justify-center mb-6">
          <div className="chip">
            <Sparkles size={14} className="text-accent-cyan" />
            AI-Powered Bidirectional Communication
          </div>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.05]"
        >
          Speak.<br />
          Sign.<br />
          <span className="text-gradient">Understand each other.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-2xl mx-auto text-white/55 text-lg leading-relaxed"
        >
          SignBridge AI turns spoken language into ASL gloss and sign sequences,
          and real-time sign language into text — closing the gap between hearing
          and deaf communities with a live, two-way conversational bridge.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/speak" className="btn-gradient px-7 py-3.5 rounded-2xl text-base flex items-center gap-2">
            <Mic size={18} /> Start Speaking
          </Link>
          <Link to="/sign" className="px-7 py-3.5 rounded-2xl text-base glass flex items-center gap-2 hover:bg-white/[0.08] transition-all">
            <Hand size={18} className="text-accent-cyan" /> Start Signing
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-white/35 font-mono">
          <span>21 landmark hand tracking</span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span>3-classifier ensemble</span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span>Speech-to-text</span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span>ASL gloss engine</span>
        </motion.div>
      </motion.section>

      {/* ===================== MODE CARDS ===================== */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="grid md:grid-cols-2 gap-6 pb-20"
      >
        {/* SPEAK MODE */}
        <motion.div variants={fadeUp}>
          <Link to="/speak" className="group block gradient-border rounded-3xl p-8 hover:-translate-y-1 transition-transform duration-300 h-full">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center">
                <Volume2 size={26} className="text-accent-cyan" />
              </div>
              <ArrowRight className="text-white/25 group-hover:text-accent-cyan group-hover:translate-x-1 transition-all" size={22} />
            </div>
            <h2 className="font-display font-bold text-2xl mt-6">Speak → Sign</h2>
            <p className="text-white/45 mt-2 leading-relaxed">
              Speak naturally, and get the exact ASL gloss and sign sequence to
              express your message in American Sign Language.
            </p>
            <div className="mt-6 space-y-2.5">
              {['Voice recognition', 'English sentence detection', 'ASL gloss translation', 'Fingerspelling steps'].map(t => (
                <div key={t} className="flex items-center gap-2.5 text-sm text-white/60">
                  <span className="w-4 h-4 rounded-full bg-accent-cyan/15 border border-accent-cyan/40 flex items-center justify-center text-[9px] text-accent-cyan">✓</span>
                  {t}
                </div>
              ))}
            </div>
          </Link>
        </motion.div>

        {/* SIGN MODE */}
        <motion.div variants={fadeUp}>
          <Link to="/sign" className="group block gradient-border rounded-3xl p-8 hover:-translate-y-1 transition-transform duration-300 h-full">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center">
                <Camera size={26} className="text-accent-violet" />
              </div>
              <ArrowRight className="text-white/25 group-hover:text-accent-violet group-hover:translate-x-1 transition-all" size={22} />
            </div>
            <h2 className="font-display font-bold text-2xl mt-6">Sign → Text</h2>
            <p className="text-white/45 mt-2 leading-relaxed">
              Sign letters with your webcam. MediaPipe tracks 21 hand landmarks
              per frame and an ML ensemble decodes them into live captions.
            </p>
            <div className="mt-6 space-y-2.5">
              {['Live webcam capture', '21 hand landmark tracking', 'Real-time prediction smoothing', 'Auto-generated text caption'].map(t => (
                <div key={t} className="flex items-center gap-2.5 text-sm text-white/60">
                  <span className="w-4 h-4 rounded-full bg-accent-violet/15 border border-accent-violet/40 flex items-center justify-center text-[9px] text-accent-violet">✓</span>
                  {t}
                </div>
              ))}
            </div>
          </Link>
        </motion.div>
      </motion.section>

      {/* ===================== LEARN + CONVERSATION ===================== */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="pb-24"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-strong relative overflow-hidden p-10">
            <div className="absolute inset-0 bg-radial-violet opacity-60" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-accent-amber/15 border border-accent-amber/30 flex items-center justify-center animate-float-y">
                <BookOpen size={28} className="text-accent-amber" />
              </div>
              <h2 className="font-display font-bold text-3xl mt-6">
                Learn the <span className="text-gradient">alphabet</span>
              </h2>
              <p className="text-white/50 max-w-sm mt-3">
                All 26 ASL handshapes, described step by step so you can practice
                before opening the camera.
              </p>
              <Link to="/learn" className="btn-gradient inline-flex mt-7 px-7 py-3.5 rounded-2xl items-center gap-2">
                <BookOpen size={18} /> Open Learn ASL
              </Link>
            </div>
          </div>

          <div className="glass-strong relative overflow-hidden p-10">
            <div className="absolute inset-0 bg-radial-violet opacity-60" />
            <div className="relative">
              <div className="w-16 h-16 mx-auto rounded-2xl btn-gradient flex items-center justify-center animate-float-y">
                <MessagesSquare size={28} />
              </div>
              <h2 className="font-display font-bold text-3xl mt-6 text-center">
                Full two-way <span className="text-gradient">conversation</span>
              </h2>
              <p className="text-white/50 max-w-sm mx-auto mt-3">
                Toggle between speaking and signing in one session. Watch messages
                build into a real conversation transcript between two people.
              </p>
              <Link to="/conversation" className="btn-gradient inline-flex mt-7 px-7 py-3.5 rounded-2xl items-center gap-2">
                <MessagesSquare size={18} /> Open Live Conversation
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ===================== FEATURES GRID ===================== */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="pb-24"
      >
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-3xl">Everything inside</h2>
          <p className="text-white/40 mt-2">A complete bidirectional ASL pipeline, engineered end to end.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Hand, title: 'Static ASL recognition', desc: 'A–Z fingerspelling classification from 42 normalized landmark features.', color: 'text-accent-violet border-accent-violet/30 bg-accent-violet/10' },
            { icon: Cpu, title: '3-model ensemble', desc: 'Support Vector Machine, Random Forest & Logistic Regression compared for best accuracy.', color: 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10' },
            { icon: Volume2, title: 'Speech recognition', desc: 'Browser-native speech-to-text converts spoken sentences into clean English.', color: 'text-accent-pink border-accent-pink/30 bg-accent-pink/10' },
            { icon: Ear, title: 'ASL gloss ordering', desc: 'Sentences reorder into natural ASL grammar, e.g. "I am happy" → "I HAPPY".', color: 'text-accent-amber border-accent-amber/30 bg-accent-amber/10' },
            { icon: Captions, title: 'Live captions', desc: 'Confidence-filtered, stabilized predictions build captions you can read in real time.', color: 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10' },
            { icon: ShieldCheck, title: 'Privacy-first', desc: 'Hand landmarks never leave your machine and speech stays in your browser.', color: 'text-accent-violet border-accent-violet/30 bg-accent-violet/10' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <motion.div key={title} variants={fadeUp} className="glass p-6 hover:bg-white/[0.06] transition-colors">
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-display font-semibold text-lg mt-4">{title}</h3>
              <p className="text-white/45 text-sm mt-1.5 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ===================== PIPELINE ===================== */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="pb-24"
      >
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl">The pipeline</h2>
          <p className="text-white/40 mt-2">From sensor to sentence in microseconds.</p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-accent-violet/40 via-accent-cyan/40 to-accent-pink/40" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { icon: Camera, label: 'Capture', sub: 'Webcam frame' },
              { icon: Hand, label: 'Track', sub: '21 landmarks' },
              { icon: Brain, label: 'Normalize', sub: '42 features' },
              { icon: Zap, label: 'Predict', sub: 'ML ensemble' },
              { icon: Sparkles, label: 'Stabilize', sub: 'Smoothing' },
              { icon: Captions, label: 'Caption', sub: 'Letters → words' },
              { icon: Globe, label: 'Gloss', sub: 'ASL order' },
              { icon: Ear, label: 'Sign', sub: 'Sequence steps' },
            ].map(({ icon: Icon, label, sub }, i) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="relative flex flex-col items-center text-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl glass flex items-center justify-center relative z-10">
                  <Icon size={20} className="text-accent-cyan" />
                </div>
                <div className="font-semibold text-sm">{label}</div>
                <div className="text-xs text-white/35 font-mono">{sub}</div>
                <div className="text-[10px] font-mono text-white/20">{String(i + 1).padStart(2, '0')}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ===================== ETHOS ===================== */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="pb-12"
      >
        <div className="glass-strong relative overflow-hidden p-10 md:p-14 grid md:grid-cols-2 gap-8 items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-radial-pink opacity-70" />
            <div className="relative">
              <div className="chip mb-5">
                <Sparkles size={14} className="text-accent-pink" />
                Why it matters
              </div>
              <h2 className="font-display font-bold text-3xl leading-snug">
                Communication is a <span className="text-gradient">human right</span>.
              </h2>
              <p className="text-white/50 mt-4 leading-relaxed">
                Over 70 million deaf people worldwide use sign languages as
                their first language. SignBridge AI is a step toward removing
                the language barrier — enabling anyone to converse regardless
                of hearing ability.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              'Real-time two-way translation',
              'Gesture recognition without special hardware',
              'Accessible to anyone with a laptop & webcam',
              'Documented, reproducible ML pipeline',
            ].map((item, i) => (
              <motion.div
                key={item}
                variants={fadeUp}
                className="glass px-5 py-3.5 flex items-center gap-3 text-sm"
              >
                <span className="font-display font-bold text-gradient">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-white/70">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  )
}