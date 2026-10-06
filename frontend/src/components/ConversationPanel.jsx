import { motion } from 'framer-motion'
import { Trash2, User, Hand, Sparkles } from 'lucide-react'
import SignPlayer from './SignPlayer'

function Bubble({ msg }) {
  const isSpeaker = msg.role === 'speaker'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isSpeaker ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`max-w-[80%] flex gap-3 ${isSpeaker ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${
          isSpeaker ? 'bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan'
            : 'bg-accent-pink/15 border border-accent-pink/30 text-accent-pink'
        }`}>
          {isSpeaker ? <User size={16} /> : <Hand size={16} />}
        </div>
        <div className={`rounded-2xl px-4 py-3 ${
          isSpeaker ? 'bg-accent-cyan/[0.08] border border-accent-cyan/20 rounded-tl-sm'
            : 'bg-accent-pink/[0.08] border border-accent-pink/20 rounded-tr-sm'
        }`}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: isSpeaker ? '#67e8f9' : '#ffb0d4' }}>
            {isSpeaker ? 'Speaker' : 'Deaf signer'}
          </div>
          <p className="text-white/90 text-sm leading-relaxed">{msg.text}</p>
          {(msg.gloss && msg.gloss.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {msg.gloss.map((g, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50 font-mono text-[10px]">
                  {g}
                </span>
              ))}
            </div>
          )}
          {(isSpeaker && msg.sequence && msg.sequence.length > 0) && (
            <div className="mt-3">
              <div className="text-[10px] text-accent-cyan/80 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles size={10} /> Screen Displaying Sign
              </div>
              <SignPlayer
                sequence={msg.sequence}
                sentence={msg.text}
                speed={750}
              />
            </div>
          )}
          <div className="text-[10px] text-white/25 font-mono mt-1.5">{msg.time}</div>
        </div>
      </div>
    </motion.div>
  )
}

export default function ConversationPanel({ messages, onClear, innerRef }) {
  return (
    <div className="glass p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-white/40 font-semibold uppercase tracking-wider">
          Transcript · {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </div>
        <button onClick={onClear}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-accent-pink transition-colors">
          <Trash2 size={13} /> Clear
        </button>
      </div>

      <div ref={innerRef} className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-white/25 text-sm font-mono">
            No messages yet. Speak below or open the camera to start a conversation.
          </div>
        ) : (
          messages.map(msg => <Bubble key={msg.id} msg={msg} />)
        )}
      </div>
    </div>
  )
}