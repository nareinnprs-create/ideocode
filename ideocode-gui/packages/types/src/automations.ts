import { z } from "zod"

const idSchema = z.string().trim().min(1).max(160)
const timestampSchema = z.number().int().nonnegative()
const nullableTimestampSchema = timestampSchema.nullable()
const timezoneSchema = z.string().trim().min(1).max(120).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date(0))
    return true
  } catch {
    return false
  }
}, "Expected a valid IANA timezone")

export const automationStateSchema = z.enum(["active", "inactive", "needs_attention", "archived"])
export type AutomationState = z.infer<typeof automationStateSchema>

export const automationRunStatusSchema = z.enum([
  "queued", "claimed", "running", "succeeded", "failed", "cancelled", "skipped",
])
export type AutomationRunStatus = z.infer<typeof automationRunStatusSchema>

export const automationRunTriggerSchema = z.enum(["scheduled", "recovery", "manual"])
export type AutomationRunTrigger = z.infer<typeof automationRunTriggerSchema>

export const automationScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("once"), timezone: timezoneSchema, at: timestampSchema }),
  z.object({
    kind: z.literal("daily"),
    timezone: timezoneSchema,
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }),
  z.object({
    kind: z.literal("weekly"),
    timezone: timezoneSchema,
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7)
      .transform((days) => [...new Set(days)].sort((left, right) => left - right)),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }),
])
export type AutomationSchedule = z.infer<typeof automationScheduleSchema>

export const automationModelSchema = z.object({
  providerId: idSchema,
  modelId: idSchema,
  variant: z.string().trim().min(1).max(60).nullable().optional(),
})
export type AutomationModel = z.infer<typeof automationModelSchema>

export const automationActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("agent"),
    instructions: z.string().trim().min(1).max(100_000),
    model: automationModelSchema,
  }).strict(),
  z.object({
    kind: z.literal("saved_script"),
    script: z.object({
      pluginId: idSchema,
      configObjectId: idSchema,
      configObjectVersionId: idSchema,
    }).strict(),
    input: z.unknown().optional(),
  }).strict(),
])
export type AutomationAction = z.infer<typeof automationActionSchema>

export const AUTOMATION_FREE_MODEL = {
  providerId: "opencode",
  modelId: "big-pickle",
  providerName: "OpenCode Zen",
  modelName: "Big Pickle",
} as const

export const automationNeedsAttentionReasonSchema = z.object({
  code: z.enum([
    "owner_membership_lost",
    "model_access_lost",
    "provider_unavailable",
    "connect_access_unavailable",
    "execution_runtime_unavailable",
  ]),
  message: z.string().trim().min(1).max(2_000),
  occurredAt: timestampSchema,
})
export type AutomationNeedsAttentionReason = z.infer<typeof automationNeedsAttentionReasonSchema>

export const automationSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  ownerMemberId: idSchema,
  name: z.string().trim().min(1).max(120),
  state: automationStateSchema,
  currentRevisionId: idSchema,
  nextDueAt: nullableTimestampSchema,
  latestRunAt: nullableTimestampSchema,
  latestSuccessfulRunId: idSchema.nullable().optional(),
  latestSuccessfulResult: z.unknown().optional(),
  needsAttentionReason: automationNeedsAttentionReasonSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  archivedAt: nullableTimestampSchema,
})
export type Automation = z.infer<typeof automationSchema>

export const automationRevisionSchema = z.object({
  id: idSchema,
  automationId: idSchema,
  version: z.number().int().positive(),
  instructions: z.string().trim().min(1).max(100_000),
  schedule: automationScheduleSchema,
  model: automationModelSchema,
  action: automationActionSchema.optional(),
  executionTarget: z.enum(["desktop", "cloud"]).optional(),
  maximumRuntimeMs: z.number().int().min(10_000).max(60 * 60 * 1_000),
  digest: z.string().trim().min(16).max(128),
  createdAt: timestampSchema,
})
export type AutomationRevision = z.infer<typeof automationRevisionSchema>

export const automationErrorSchema = z.object({
  code: z.enum([
    "owner_membership_lost",
    "model_access_lost",
    "provider_unavailable",
    "connect_access_unavailable",
    "execution_runtime_unavailable",
    "execution_failed",
    "execution_timed_out",
    "runner_unavailable",
    "cancelled",
    "lease_lost",
    "internal_error",
  ]),
  message: z.string().trim().min(1).max(2_000),
  retryable: z.boolean(),
})
export type AutomationError = z.infer<typeof automationErrorSchema>

export const automationUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  costMicros: z.number().int().nonnegative().nullable(),
})
export type AutomationUsage = z.infer<typeof automationUsageSchema>

export const automationRunSchema = z.object({
  id: idSchema,
  automationId: idSchema,
  revisionId: idSchema,
  status: automationRunStatusSchema,
  trigger: automationRunTriggerSchema,
  scheduledFor: nullableTimestampSchema,
  nonce: idSchema.nullable().optional(),
  leaseOwner: idSchema.nullable().optional(),
  leaseExpiresAt: nullableTimestampSchema,
  attempt: z.number().int().nonnegative(),
  resultSummary: z.string().max(20_000).nullable(),
  usage: automationUsageSchema,
  error: automationErrorSchema.nullable(),
  engineReceipt: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  startedAt: nullableTimestampSchema,
  completedAt: nullableTimestampSchema,
})
export type AutomationRun = z.infer<typeof automationRunSchema>

export const automationRunEventSchema = z.object({
  id: idSchema,
  runId: idSchema,
  type: automationRunStatusSchema,
  payload: z.record(z.string(), z.unknown()),
  createdAt: timestampSchema,
})
export type AutomationRunEvent = z.infer<typeof automationRunEventSchema>

export const automationRunReceiptSchema = z.object({
  run: automationRunSchema,
  revision: automationRevisionSchema,
  automation: automationSchema,
  events: z.array(automationRunEventSchema),
})
export type AutomationRunReceipt = z.infer<typeof automationRunReceiptSchema>

export const automationRunEventTypeSchema = automationRunStatusSchema
export type AutomationRunEventType = AutomationRunStatus

export const AUTOMATION_DESKTOP_RUNNER_PRESENCE_WINDOW_MS = 10 * 60_000

export const automationDesktopRunnerRegistrationSchema = z.object({
  runnerId: idSchema.min(8),
  protocolVersion: z.literal(1),
  supportedExecutionTargets: z.array(z.literal("desktop")).length(1),
  capabilities: z.array(z.string()).max(1).default([]),
  appVersion: z.string().trim().min(1).max(80),
  platform: z.enum(["darwin", "win32", "linux"]),
  concurrency: z.number().int().min(1).max(4),
})
export type AutomationDesktopRunnerRegistration = z.infer<typeof automationDesktopRunnerRegistrationSchema>

export const automationDesktopRunnerPresenceSchema = z.object({
  connected: z.boolean(),
  lastSeenAt: timestampSchema.nullable(),
})
export type AutomationDesktopRunnerPresence = z.infer<typeof automationDesktopRunnerPresenceSchema>

export const automationRunnerNotificationSchema = z.object({
  type: z.enum(["automation_work_available", "automation_cancellation_available"]),
  cursor: z.string().trim().min(1),
})
export type AutomationRunnerNotification = z.infer<typeof automationRunnerNotificationSchema>

export interface CreateAutomationDefinition {
  name: string
  instructions: string
  schedule: AutomationSchedule
  model: AutomationModel
  action?: AutomationAction
  executionTarget?: "desktop" | "cloud"
  maximumRuntimeMs: number
}

export interface UpdateAutomation {
  name?: string
  instructions?: string
  schedule?: AutomationSchedule
  model?: AutomationModel
  action?: AutomationAction
  executionTarget?: "desktop" | "cloud"
  maximumRuntimeMs?: number
}
