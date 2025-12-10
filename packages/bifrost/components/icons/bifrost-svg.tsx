import { FC } from "react"

interface BifrostSVGProps {
  theme: "dark" | "light"
  scale?: number
}

/**
 * YGGDRASIL Tree Logo - The World Tree
 * Represents the cosmic tree that connects all realms
 */
export const BifrostSVG: FC<BifrostSVGProps> = ({ theme, scale = 1 }) => {
  const strokeColor = theme === "dark" ? "#fff" : "#000"
  const fillColor = theme === "dark" ? "#000" : "#fff"
  const accentColor = theme === "dark" ? "#10B981" : "#059669" // Emerald

  return (
    <svg
      width={180 * scale}
      height={200 * scale}
      viewBox="0 0 180 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Tree trunk */}
      <path
        d="M90 180 L90 80"
        stroke={strokeColor}
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* Roots - three main roots representing the three wells */}
      <path
        d="M90 180 Q60 190 40 195"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M90 180 Q90 195 90 200"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M90 180 Q120 190 140 195"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Main branches */}
      <path
        d="M90 80 Q60 60 30 40"
        stroke={strokeColor}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M90 80 Q90 50 90 20"
        stroke={strokeColor}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M90 80 Q120 60 150 40"
        stroke={strokeColor}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Secondary branches */}
      <path
        d="M60 70 Q40 55 25 60"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M120 70 Q140 55 155 60"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M90 50 Q70 35 55 25"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M90 50 Q110 35 125 25"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Leaves/canopy - emerald green */}
      <circle cx="30" cy="40" r="15" fill={accentColor} opacity="0.9" />
      <circle cx="90" cy="20" r="18" fill={accentColor} opacity="0.9" />
      <circle cx="150" cy="40" r="15" fill={accentColor} opacity="0.9" />
      <circle cx="25" cy="60" r="10" fill={accentColor} opacity="0.8" />
      <circle cx="155" cy="60" r="10" fill={accentColor} opacity="0.8" />
      <circle cx="55" cy="25" r="12" fill={accentColor} opacity="0.8" />
      <circle cx="125" cy="25" r="12" fill={accentColor} opacity="0.8" />
      <circle cx="60" cy="50" r="10" fill={accentColor} opacity="0.7" />
      <circle cx="120" cy="50" r="10" fill={accentColor} opacity="0.7" />

      {/* Central glow representing wisdom */}
      <circle cx="90" cy="100" r="8" fill={accentColor} opacity="0.6" />
    </svg>
  )
}

// Keep old name as alias for backwards compatibility
export const ChatbotUISVG = BifrostSVG
