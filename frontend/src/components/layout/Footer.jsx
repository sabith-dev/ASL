import { Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto px-4 pb-8 pt-16">
      <div className="max-w-6xl mx-auto glass px-6 py-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <div className="font-display font-semibold">
          SignBridge <span className="text-gradient">AI</span>
        </div>
        <div className="text-white/40 text-center flex items-center gap-2">
          Bridging spoken & signed worlds with
          <Heart size={14} className="text-accent-pink fill-accent-pink" />
          and machine learning
        </div>
        <div className="text-white/30 text-xs font-mono">
          MediaPipe Pipeline · scikit-learn · React
        </div>
      </div>
    </footer>
  )
}