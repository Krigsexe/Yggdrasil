"use client"

import { BifrostContext } from "@/context/context"
import { useContext } from "react"

export default function WorkspacePage() {
  const { selectedWorkspace } = useContext(BifrostContext)

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <div className="text-4xl">{selectedWorkspace?.name}</div>
    </div>
  )
}
