import { z } from "zod"

export const workflowStepSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.enum(["agent", "tool", "condition", "parallel"]),
  label: z.string().trim().min(1).optional(),
})
export type WorkflowStep = z.infer<typeof workflowStepSchema>

export const workflowSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2_000).optional(),
  steps: z.array(workflowStepSchema).min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
})
export type Workflow = z.infer<typeof workflowSchema>
