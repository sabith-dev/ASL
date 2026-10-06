export default function BackgroundFX() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_140%_100%_at_50%_0%,#14142b_0%,#0b0b18_55%,#070712_100%)]" />

      {/* aurora blobs */}
      <div className="absolute -top-40 -left-40 w-[42rem] h-[42rem] rounded-full bg-accent-violet/20 blur-[140px] animate-float-y" />
      <div className="absolute top-1/3 -right-52 w-[38rem] h-[38rem] rounded-full bg-accent-cyan/15 blur-[140px] animate-float-y" style={{ animationDelay: '-2.2s' }} />
      <div className="absolute -bottom-56 left-1/4 w-[44rem] h-[44rem] rounded-full bg-accent-pink/10 blur-[160px] animate-float-y" style={{ animationDelay: '-4s' }} />

      {/* grid + noise */}
      <div className="absolute inset-0 grid-bg" />
      <div className="noise-overlay" />
    </div>
  )
}