import { z } from "zod"

export const connectionActionPayloadSchema = z.object({
  connectionName: z.string(),
  state: z.enum(["connected", "needs_connection", "reauth_required", "provider_error"]),
  message: z.string(),
  actor: z.enum(["member", "organization_admin", "provider_admin", "network_admin", "openwork"]).optional(),
  action: z.object({
    label: z.string(),
    url: z.string().url().optional(),
    surface: z.enum([
      "openwork_your_connections",
      "openwork_organization_connections",
      "provider_admin_console",
      "network_infrastructure",
      "openwork_support",
    ]),
  }).optional(),
})
export type ConnectionActionPayload = z.infer<typeof connectionActionPayloadSchema>
