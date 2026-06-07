'use client'

export function LogoSVG({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 680 680"
      className={className}
      role="img"
      aria-label="LOVE AI FITNESS"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="gold2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5D07A" />
          <stop offset="40%" stopColor="#D4A017" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
        <linearGradient id="goldText" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5E098" />
          <stop offset="50%" stopColor="#D4A017" />
          <stop offset="100%" stopColor="#9A7010" />
        </linearGradient>
        <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="50%" stopColor="#F5D07A" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
      </defs>

      {/* L */}
      <rect x="160" y="120" width="18" height="180" fill="url(#gold2)" rx="2" />
      <rect x="160" y="282" width="80" height="18" fill="url(#gold2)" rx="2" />

      {/* A */}
      <polygon points="295,120 340,120 400,300 382,300 340,165 297,300 279,300" fill="url(#gold2)" />
      <rect x="299" y="232" width="62" height="14" fill="url(#gold2)" rx="2" />

      {/* F */}
      <rect x="428" y="120" width="18" height="180" fill="url(#gold2)" rx="2" />
      <rect x="428" y="120" width="72" height="16" fill="url(#gold2)" rx="2" />
      <rect x="428" y="188" width="58" height="14" fill="url(#gold2)" rx="2" />

      {/* Separator */}
      <rect x="160" y="332" width="360" height="1.5" fill="url(#goldLine)" />

      {/* LOVE AI */}
      <text
        x="340" y="402"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="64"
        fontWeight="700"
        letterSpacing="14"
        fill="url(#goldText)"
      >
        LOVE AI
      </text>

      {/* — FITNESS — */}
      <rect x="160" y="428" width="90" height="1.5" fill="url(#goldLine)" opacity="0.7" />
      <text
        x="340" y="448"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="22"
        fontWeight="400"
        letterSpacing="10"
        fill="url(#goldText)"
      >
        FITNESS
      </text>
      <rect x="430" y="428" width="90" height="1.5" fill="url(#goldLine)" opacity="0.7" />
    </svg>
  )
}

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="160 120 360 310" className={className} role="img" aria-label="LAF">
      <defs>
        <linearGradient id="gm2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5D07A" />
          <stop offset="40%" stopColor="#D4A017" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
        <linearGradient id="gmLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="50%" stopColor="#F5D07A" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
      </defs>
      <rect x="160" y="120" width="18" height="180" fill="url(#gm2)" rx="2" />
      <rect x="160" y="282" width="80" height="18" fill="url(#gm2)" rx="2" />
      <polygon points="295,120 340,120 400,300 382,300 340,165 297,300 279,300" fill="url(#gm2)" />
      <rect x="299" y="232" width="62" height="14" fill="url(#gm2)" rx="2" />
      <rect x="428" y="120" width="18" height="180" fill="url(#gm2)" rx="2" />
      <rect x="428" y="120" width="72" height="16" fill="url(#gm2)" rx="2" />
      <rect x="428" y="188" width="58" height="14" fill="url(#gm2)" rx="2" />
      <rect x="160" y="332" width="360" height="1.5" fill="url(#gmLine)" />
    </svg>
  )
}
