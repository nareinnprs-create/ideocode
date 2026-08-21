import { z } from "zod"

export const skillCreatedPayloadSchema = z.object({
  name: z.string(),
  description: z.string(),
  skillId: z.string(),
  pluginId: z.string(),
  mode: z.enum(["created", "updated"]),
  libraryUrl: z.string().url().optional(),
})
export type SkillCreatedPayload = z.infer<typeof skillCreatedPayloadSchema>
