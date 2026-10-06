import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import BackgroundFX from './components/BackgroundFX'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import SpeechToSign from './pages/SpeechToSign'
import SignToText from './pages/SignToText'
import Conversation from './pages/Conversation'
import LearnASL from './pages/LearnASL'
import TrainASL from './pages/TrainASL'

function Page({ children }) {
  return (
    <motion.div
      key={useLocation().pathname}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <div className="min-h-screen flex flex-col relative">
      <BackgroundFX />
      <Navbar />
      <AnimatePresence mode="wait">
        <main key={location.pathname} className="flex-1 pt-28 px-4 sm:px-6">
          <Routes location={location}>
            <Route path="/" element={<Page><Home /></Page>} />
            <Route path="/speak" element={<Page><SpeechToSign /></Page>} />
            <Route path="/sign" element={<Page><SignToText /></Page>} />
            <Route path="/conversation" element={<Page><Conversation /></Page>} />
            <Route path="/learn" element={<Page><LearnASL /></Page>} />
            <Route path="/train" element={<Page><TrainASL /></Page>} />
          </Routes>
        </main>
      </AnimatePresence>
      <Footer />
    </div>
  )
}