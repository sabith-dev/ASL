import { useMemo } from 'react'
import { Wand2 } from 'lucide-react'

const PHRASE_LIBRARY = {
  how: ['how are you', 'how old are you', 'how are you today', 'how much', 'how many', 'how about you'],
  what: ['what is your name', 'what time is it', 'what do you want', 'what are you doing'],
  where: ['where are you', 'where do you live', 'where is the bathroom', 'where are you from'],
  who: ['who are you', 'who is that'],
  when: ['when is the party', 'when will you come'],
  why: ['why not', 'why are you sad', 'why do you ask'],
  please: ['please help me', 'please wait', 'please come here'],
  thank: ['thank you', 'thank you very much', 'thank you so much'],
  good: ['good morning', 'good night', 'good afternoon', 'good luck'],
  hello: ['hello how are you', 'hello nice to meet you'],
  hi: ['hi how are you', 'hi nice to meet you'],
  i: ['i am happy', 'i am fine', 'i am sorry', 'i love you', 'i want water', 'i need help'],
  you: ['you are welcome', 'you are good', 'you are my friend'],
  we: ['we are happy', 'we will go'],
  my: ['my name is', 'my family', 'my friend'],
  your: ['your name', 'your family'],
  nice: ['nice to meet you', 'nice to see you'],
  see: ['see you later', 'see you tomorrow'],
  live: ['i live here', 'where do you live'],
  want: ['i want water', 'i want food', 'i want to go home'],
  need: ['i need help', 'i need water', 'i need to go'],
  love: ['i love you', 'i love my family'],
  happy: ['i am happy today', 'you are happy'],
  sad: ['i am sad', 'why are you sad'],
  help: ['please help me', 'help me', 'i need help'],
  water: ['i want water', 'give me water'],
  food: ['i want food', 'food please'],
  home: ['i go home', 'go home', 'i am going home'],
  school: ['go to school', 'i go to school'],
  name: ['my name is', 'what is your name'],
  go: ['go home', 'go to school', 'i will go'],
  come: ['come here', 'please come'],
  yes: ['yes please', 'yes thank you'],
  no: ['no thank you', 'no problem'],
  sorry: ['i am sorry', 'sorry please'],
  ok: ['ok thank you', 'ok fine'],
  today: ['i am happy today', 'today is a good day'],
  tomorrow: ['see you tomorrow', 'i will go tomorrow'],
  morning: ['good morning'],
  night: ['good night'],
  friend: ['my friend', 'you are my friend'],
  family: ['my family', 'i love my family'],
  eat: ['i want to eat', 'eat food'],
  drink: ['i want to drink', 'drink water'],
  sleep: ['i want to sleep', 'go to sleep'],
  work: ['i go to work', 'go to work'],
  understand: ['i understand', 'do you understand'],
  hear: ['i cannot hear', 'do you hear me'],
  speak: ['speak slowly please', 'please speak again'],
  give: ['give me water', 'give me food'],
  take: ['take me home', 'take your time'],
}

export default function WordPredictions({ text = '', onPick }) {
  const { token, suggestions } = useMemo(() => {
    const trimmed = (text || '').trim()
    const tokens = trimmed ? trimmed.split(/\s+/) : []
    const token = tokens.length ? tokens[tokens.length - 1].toLowerCase().replace(/[^a-z]/g, '') : ''
    if (!token) return { token: '', suggestions: [] }

    const found = []
    for (const [word, phrases] of Object.entries(PHRASE_LIBRARY)) {
      if (word.startsWith(token)) found.push(...phrases)
    }
    return { token, suggestions: [...new Set(found)].slice(0, 4) }
  }, [text])

  if (!token || !suggestions.length || !onPick) return null

  return (
    <div className="rounded-2xl bg-accent-violet/[0.06] border border-accent-violet/25 p-3">
      <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Wand2 size={11} className="text-accent-violet" />
        Predict the rest
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => onPick(phrase)}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 hover:border-accent-violet/50 hover:bg-accent-violet/20 text-white/80 text-xs font-mono transition-all text-left"
            title={`Write: ${phrase}`}
          >
            {phrase}
          </button>
        ))}
      </div>
    </div>
  )
}