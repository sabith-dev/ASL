const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.error || JSON.stringify(body)
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}

export function getInfo() {
  return request('/info/')
}

export function getWords() {
  return request('/words/')
}

// ── Custom sign training ──────────────────────────────────────────────────────

export function getTrainSummary() {
  return request('/train/')
}

export function saveTrainSample(label, frames) {
  return request('/train/', {
    method: 'POST',
    body: JSON.stringify({ label, frames }),
  })
}

export function deleteTrainClass(label) {
  return request(`/train/?label=${encodeURIComponent(label)}`, {
    method: 'DELETE',
  })
}

export function getTrainModelStatus() {
  return request('/train/model/')
}

export function trainCustomModel() {
  return request('/train/model/', {
    method: 'POST',
  })
}

export function predictFeatures(features, model = 'svm') {
  return request('/predict/', {
    method: 'POST',
    body: JSON.stringify({ features, model }),
  })
}

export function predictLandmarks(landmarks22, model = 'svm') {
  const landmarks = landmarks22.slice(0, 21).map(p => [p.x, p.y])
  return request('/predict/', {
    method: 'POST',
    body: JSON.stringify({ landmarks, model }),
  })
}

export function predictSequence(landmarkFrames, model = 'svm') {
  const sequence = landmarkFrames.map(frame => {
    // Rich frame objects {hands, pose} — used by live Sign-to-Text so the
    // custom-sign model can also see full-body motion.
    if (frame && typeof frame === 'object' && !Array.isArray(frame)) {
      const handsRaw = Array.isArray(frame.hands) ? frame.hands : (frame.h ? [frame.h] : [])
      const primary = Array.isArray(handsRaw[0]) ? handsRaw[0] : null
      return {
        h: primary ? primary.slice(0, 21).map(p => [p.x ?? p[0], p.y ?? p[1]]) : null,
        p: Array.isArray(frame.pose) ? frame.pose.slice(0, 33).map(pt => [pt.x ?? pt[0], pt.y ?? pt[1], pt.z ?? (pt[2] ?? 0)]) : null,
      }
    }
    // Legacy frame: a hand (21 points), [hand], or [hand1, hand2].
    const first = Array.isArray(frame) ? frame[0] : null
    const hand = Array.isArray(first) && first.length >= 21 ? first : frame
    if (!Array.isArray(hand)) return hand
    return hand.slice(0, 21).map(p => [p.x ?? p[0], p.y ?? p[1]])
  }).filter(Boolean)
  return request('/predict/', {
    method: 'POST',
    body: JSON.stringify({ sequence, model }),
  })
}


const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were',
  'to', 'of', 'and', 'or', 'in', 'on', 'at', 'for',
  'do', 'does', 'did', 'be', 'been',
])

const GLOSS_HINTS = {
  bye: ['BYE'], goodbye: ['BYE'], hello: ['HELLO'], hi: ['HI'],
  thanks: ['THANK', 'YOU'], thank: ['THANK', 'YOU'], please: ['PLEASE'],
  sorry: ['SORRY'], yes: ['YES'], no: ['NO'], ok: ['OK'], okay: ['OK'],
  help: ['HELP'], water: ['WATER'], food: ['FOOD'], eat: ['EAT'],
  home: ['HOME'], house: ['HOME'], school: ['SCHOOL'], college: ['SCHOOL'],
  hospital: ['HOSPITAL'], doctor: ['DOCTOR'], name: ['NAME'], what: ['WHAT'],
  who: ['WHO'], where: ['WHERE'], when: ['WHEN'], why: ['WHY'], how: ['HOW'],
  good: ['GOOD'], bad: ['BAD'], fine: ['GOOD'], happy: ['HAPPY'], sad: ['SAD'],
  love: ['LOVE'], friend: ['FRIEND'], family: ['FAMILY'], i: ['I'], you: ['YOU'],
  me: ['ME'], we: ['WE'], they: ['THEY'], go: ['GO'], going: ['GO'], come: ['COME'],
  want: ['WANT'], need: ['NEED'], live: ['LIVE'], work: ['WORK'], sleep: ['SLEEP'],
  learn: ['LEARN'], sign: ['SIGN'], language: ['LANGUAGE'], today: ['TODAY'],
  tomorrow: ['TOMORROW'], yesterday: ['YESTERDAY'], morning: ['MORNING'],
  night: ['NIGHT'], understand: ['UNDERSTAND'], hear: ['HEAR'], speak: ['SPEAK'],
  talk: ['TALK'], give: ['GIVE'], take: ['TAKE'], see: ['SEE'], now: ['NOW'],
}

export function localTranslate(text) {
  const words = text.trim().split(/\s+/)
  const gloss = []
  const sequence = []

  words.forEach(w => {
    const clean = w.replace(/[^A-Za-z]/g, '').toLowerCase()
    if (!clean) return
    const mapped = GLOSS_HINTS[clean] || [clean.toUpperCase()]
    gloss.push(...mapped)
  })

  const finalGloss = gloss.length > 0 ? gloss : words.map(w => w.replace(/[^A-Za-z]/g, '').toUpperCase()).filter(Boolean)

  finalGloss.forEach((g, idx) => {
    if (idx > 0) {
      sequence.push({ type: 'space', value: 'space' })
    }
    const chars = g.split('')
    chars.forEach(ch => {
      sequence.push({ type: 'letter', value: ch.toUpperCase() })
    })
  })

  return {
    original: text,
    gloss: finalGloss,
    sequence: sequence,
  }
}

export async function translateText(text) {
  try {
    return await request('/translate/', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    console.warn('Backend translate unavailable, using local translator:', err)
    return localTranslate(text)
  }
}