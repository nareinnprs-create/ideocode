import { StrictMode, useState, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import type { z } from "zod"
import { StatusCard } from "./ui"

export function mountMcpApp<Schema extends z.ZodType>(config: {
  name: string
  waitingLabel: string
  schema: Schema
  render: (payload: z.infer<Schema>) => ReactNode
}) {
  function AppRoot() {
    const [payload] = useState<z.infer<Schema> | null>(null)
    const [resultError] = useState<string | null>(null)

    // In IDEOCODE, payloads are received via Tauri events
    // This is a simplified bridge for MCP app rendering
    if (resultError) {
      return <StatusCard>{resultError}</StatusCard>
    }
    if (!payload) {
      return <StatusCard>{config.waitingLabel}</StatusCard>
    }
    return <>{config.render(payload)}</>
  }

  const root = document.getElementById("root")
  if (!root) throw new Error(`${config.name} root element is missing.`)
  createRoot(root).render(
    <StrictMode>
      <AppRoot />
    </StrictMode>,
  )
}
