import { z } from "zod"

export const pluginFlowPayloadSchema = z.object({
  mode: z.enum(["marketplace_plugin_added", "plugin_access_granted", "marketplace_access_granted"]),
  pluginId: z.string().optional(),
  marketplaceId: z.string().optional(),
  recipient: z.object({
    kind: z.enum(["member", "team", "org_wide"]),
    id: z.string().nullable(),
    role: z.string().optional(),
  }).optional(),
})
export type PluginFlowPayload = z.infer<typeof pluginFlowPayloadSchema>
