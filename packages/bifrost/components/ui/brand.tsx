"use client"

import Link from "next/link"
import { FC } from "react"
import { BifrostSVG } from "../icons/bifrost-svg"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <Link
      className="flex cursor-pointer flex-col items-center hover:opacity-50"
      href="https://github.com/Krigsexe/yggdrasil"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="mb-2">
        <BifrostSVG theme={theme === "dark" ? "dark" : "light"} scale={0.3} />
      </div>

      <div className="text-4xl font-bold tracking-wide">Bifrost</div>
      <div className="text-sm text-muted-foreground">YGGDRASIL Interface</div>
    </Link>
  )
}
