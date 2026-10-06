import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Hand, Mic, MessagesSquare, Home, BookOpen, Database } from 'lucide-react'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/speak', label: 'Speak → Sign', icon: Mic },
  { to: '/sign', label: 'Sign → Text', icon: Hand },
  { to: '/conversation', label: 'Conversation', icon: MessagesSquare },
  { to: '/learn', label: 'Learn ASL', icon: BookOpen },
  { to: '/train', label: 'Train Signs', icon: Database },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const close = () => setOpen(false)

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 pt-4">
      <div className="max-w-6xl mx-auto glass-strong !rounded-2xl px-5 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={close}>
          <div className="relative w-10 h-10 rounded-xl btn-gradient flex items-center justify-center font-display font-extrabold text-lg shrink-0">
            S
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-cyan animate-blink" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold tracking-tight">
              SignBridge <span className="text-gradient">AI</span>
            </div>
            <div className="text-[11px] text-white/40 font-medium tracking-widest uppercase">
              Communication Bridge
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.07] text-white shadow-inner border border-white/10'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => navigate('/conversation')}
          className="hidden md:inline-flex btn-gradient px-5 py-2.5 rounded-xl text-sm"
        >
          Launch Live Mode
        </button>

        <button className="md:hidden text-white/80" onClick={() => setOpen(o => !o)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="md:hidden mt-2 glass-strong !rounded-2xl p-3 flex flex-col gap-1"
          >
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive ? 'bg-white/[0.08] text-white' : 'text-white/50'
                  }`
                }
              >
                <Icon size={18} className="text-accent-violet" />
                {label}
              </NavLink>
            ))}
            <button
              onClick={() => { close(); navigate('/conversation') }}
              className="btn-gradient mt-2 px-4 py-3 rounded-xl text-sm"
            >
              Launch Live Mode
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}