'use client'

export function Drip({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute top-0 left-0 w-[60px] h-[200px] bg-teal opacity-70 pointer-events-none ${className}`}
      style={{
        clipPath: 'polygon(0 0,65% 0,55% 35%,72% 55%,38% 70%,48% 85%,25% 95%,15% 100%,0 100%)',
      }}
    />
  )
}

export function OrbTR({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute top-[-20px] right-[-20px] w-[130px] h-[130px] pointer-events-none ${className}`}>
      <div className="absolute top-5 right-0 w-[100px] h-[100px] rounded-full bg-gradient-to-br from-[#8a9e22] to-olive" />
      <div className="absolute top-3 right-[55px] w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#f0c030] to-yellow z-[2]" />
    </div>
  )
}

export function StripeR() {
  return (
    <div className="fixed right-0 top-[40%] w-5 h-[240px] flex flex-col gap-[3px] pointer-events-none z-50">
      <span className="flex-1 bg-lime opacity-60" />
      <span className="flex-1 bg-teal opacity-50" />
      <span className="flex-[2] bg-lime opacity-60" />
      <span className="flex-1 bg-teal opacity-50" />
      <span className="flex-1 bg-lime opacity-60" />
      <span className="flex-1 bg-teal opacity-50" />
    </div>
  )
}

export function LiveDot() {
  return (
    <span className="w-2 h-2 rounded-full bg-success animate-pulse-glow block" />
  )
}
