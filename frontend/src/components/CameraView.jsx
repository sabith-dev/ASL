import { Hand, Camera } from 'lucide-react'

function HandSkeletonSVG({ landmarksList }) {
  if (!landmarksList || !landmarksList.length) return null

  const hands = Array.isArray(landmarksList[0]) ? landmarksList : [landmarksList]
  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17],
  ]

  return (
    <svg className="w-full h-full" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gconn0" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.8" />
          <stop offset="1" stopColor="#7c6cff" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="gconn1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5fa2" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {hands.map((landmarks, hIdx) => {
        if (!landmarks || landmarks.length < 21) return null
        const pts = landmarks.map(p => [p.x * 260, p.y * 260])
        const gradId = hIdx === 0 ? "url(#gconn0)" : "url(#gconn1)"
        const dotColor = hIdx === 0 ? '#22d3ee' : '#ff5fa2'

        return (
          <g key={hIdx}>
            {connections.map(([a,b], i) => (
              <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]}
                stroke={gradId} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
            ))}
            {pts.map(([x,y], i) => (
              <circle key={i} cx={x} cy={y} r={i === 0 ? 4 : i < 5 ? 2.5 : 2}
                fill={i < 5 ? '#7c6cff' : dotColor} opacity="0.9" />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

export default function CameraView({ videoRef, cameraOn, onToggle, status, handPresent, detections, compact = false, subtitle }) {
  const color = handPresent ? '#22d3ee' : '#ff5fa2'
  const detectedLandmarksList = handPresent && detections && detections.landmarks ? detections.landmarks : null
  const numHandsDetected = detectedLandmarksList ? detectedLandmarksList.length : 0

  const statusText =
    status === 'loading' ? 'Loading model…'
      : status === 'error' ? 'Model error'
        : !cameraOn ? 'Camera off'
          : handPresent ? (numHandsDetected > 1 ? `Both hands detected (2 Hands)` : 'Hand detected (1 Hand)') : 'Show your hand(s)'

  if (compact) {
    return (
      <div>
        <div className="relative aspect-video rounded-xl overflow-hidden bg-base-900 border border-white/[0.06]">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover video-feed" playsInline muted />
          {!cameraOn && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-xs font-mono">
              Camera disabled
            </div>
          )}
          {cameraOn && handPresent && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="w-full h-full" style={{ transform: 'scaleX(-1)' }}>
                <HandSkeletonSVG landmarksList={detectedLandmarksList} />
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cameraOn && handPresent ? 'bg-accent-cyan animate-blink' : 'bg-white/20'}`} />
            <span className="text-[10px] font-mono text-white/50">
              {cameraOn ? (handPresent ? `${numHandsDetected} Hand(s)` : 'No hand') : 'Offline'}
            </span>
          </div>
        </div>
        {subtitle !== undefined && (
          <div className="mt-2 rounded-xl bg-base-900/90 border border-white/[0.07] px-4 py-2.5 min-h-[42px] flex items-center justify-center">
            {subtitle ? (
              <p className="font-mono text-white/90 text-sm leading-snug text-center break-words">
                {subtitle}
                <span className="inline-block w-0.5 h-3.5 bg-accent-pink ml-1 animate-blink align-text-bottom" />
              </p>
            ) : (
              <p className="text-white/25 text-[11px] italic font-mono text-center">
                Fingerspell to build text here…
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative rounded-3xl overflow-hidden glass-strong">
      <div className="aspect-video bg-base-900 relative">
        <video ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover video-feed"
          playsInline muted
        />

        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-base-950/80 z-10">
            <div className="w-20 h-20 rounded-full bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center">
              <Hand size={36} className="text-accent-violet" />
            </div>
            <div className="text-center">
              <div className="font-display font-semibold text-xl">Camera Offline</div>
              <div className="text-white/40 text-sm mt-1">Enable your webcam for 1-hand or 2-hand sign recognition</div>
            </div>
            <button onClick={() => onToggle(true)}
              className="btn-gradient px-6 py-3 rounded-2xl flex items-center gap-2 mt-2 text-sm">
              <Camera size={18} /> Enable Camera
            </button>
          </div>
        )}

        {cameraOn && handPresent && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="w-full h-full" style={{ transform: 'scaleX(-1)' }}>
              <HandSkeletonSVG landmarksList={detectedLandmarksList} />
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${cameraOn ? 'bg-accent-cyan animate-blink' : 'bg-accent-pink'}`} />
            <span className="text-xs font-semibold font-mono">
              {cameraOn ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="glass px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Status</span>
            <span className="font-mono text-xs" style={{ color }}>
              {statusText}
            </span>
          </div>
        </div>

        {cameraOn && (
          <button onClick={() => onToggle(false)}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-xl glass hover:bg-white/[0.1] text-xs font-semibold transition-colors">
            Turn Off
          </button>
        )}
      </div>

      {subtitle !== undefined && (
        <div className="px-5 py-3.5 bg-base-900/95 border-t border-white/[0.06] flex items-center justify-center min-h-[56px]">
          {subtitle ? (
            <p className="font-mono text-white/90 text-lg sm:text-xl font-medium leading-snug text-center break-words">
              {subtitle}
              <span className="inline-block w-1 h-5 bg-accent-pink ml-1.5 animate-blink align-text-bottom" />
            </p>
          ) : (
            <p className="text-white/25 text-xs italic font-mono text-center">
              The text you sign will appear here, letter by letter…
            </p>
          )}
        </div>
      )}
    </div>
  )
}