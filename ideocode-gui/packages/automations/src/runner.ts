import { AUTOMATION_DESKTOP_RUNNER_PRESENCE_WINDOW_MS } from "@ideocode/types/automations"

export const AUTOMATION_MIN_CLAIM_WINDOW_MS = 60_000

export function desktopClaimDeadline(input: {
  now: number
  windowMs: number
  nextDueAt: number | null
}): number {
  const requested = input.now + input.windowMs
  const bounded = input.nextDueAt === null ? requested : Math.min(requested, input.nextDueAt)
  const floor = input.now + Math.min(input.windowMs, AUTOMATION_MIN_CLAIM_WINDOW_MS)
  return Math.max(floor, bounded)
}

export function desktopRunnerConnected(input: { lastSeenAt: number | null; now: number }): boolean {
  return input.lastSeenAt !== null
    && input.now - input.lastSeenAt <= AUTOMATION_DESKTOP_RUNNER_PRESENCE_WINDOW_MS
}

export function missedDesktopRunMessage(input: {
  busy: boolean
  lastSeenAt: number | null
  now: number
}): string {
  if (input.busy) return "Missed — the desktop was busy with another Automation run."
  return desktopRunnerConnected(input)
    ? "Missed — the connected desktop did not pick this up in time."
    : "Missed — no desktop was connected."
}
