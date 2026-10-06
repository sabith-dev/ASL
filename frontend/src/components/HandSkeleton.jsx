const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
]

export default function HandSkeleton({ landmarks, pad = 18, palm = false }) {
  if (!landmarks || landmarks.length < 21) return null

  const pts = landmarks.map(p => [p[0], p[1]])
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 1e-4)
  const spanY = Math.max(maxY - minY, 1e-4)
  const size = 100
  const scale = Math.min((size - 2 * pad) / spanX, (size - 2 * pad) / spanY)
  const offX = (size - scale * spanX) / 2 - minX * scale
  const offY = (size - scale * spanY) / 2 - minY * scale
  const map = ([x, y]) => [x * scale + offX, y * scale + offY]

  return (
    <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hs-conn" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.75" />
          <stop offset="1" stopColor="#7c6cff" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      {CONNECTIONS.map(([a, b], i) => {
        const [x1, y1] = map(pts[a])
        const [x2, y2] = map(pts[b])
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="url(#hs-conn)" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        )
      })}
      {pts.map((p, i) => {
        const [x, y] = map(p)
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={i === 0 ? 3.2 : i < 5 ? 2.1 : 1.7}
              fill={i < 5 ? '#7c6cff' : '#22d3ee'} opacity="0.95" />
            {i < 5 && (
              <circle cx={x} cy={y} r={4.2} stroke="#7c6cff" strokeOpacity="0.35" fill="none" />
            )}
          </g>
        )
      })}
    </svg>
  )
}