import { z } from "zod"

export const enterpriseMcpAuthorizationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("api-key"),
    token: z.string().min(1),
  }),
  z.object({
    type: z.literal("oauth"),
    configuration: z.object({
      applicationType: z.enum(["web", "native"]),
      clientMetadataUrl: z.string().url().optional(),
      authorizationServerIssuer: z.string().url().optional(),
      requestedScopes: z.array(z.string().min(1)).max(128).optional(),
    }).optional(),
    persistence: z.enum(["memory", "disk"]).default("memory"),
  }),
])
export type EnterpriseMcpAuthorization = z.infer<typeof enterpriseMcpAuthorizationSchema>

export const enterpriseMcpConnectionSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  serverUrl: z.string().trim().url(),
  enabled: z.boolean().default(true),
  authorization: enterpriseMcpAuthorizationSchema,
})
export type EnterpriseMcpConnection = z.infer<typeof enterpriseMcpConnectionSchema>

export type EnterpriseMcpOperationPhase =
  | "configuration"
  | "connect"
  | "tool-discovery"
  | "tool-execution"
  | "resource-discovery"
  | "resource-read"
  | "shutdown"

export type EnterpriseMcpRequestPhase =
  | "mcp-initialize"
  | "mcp-tool-discovery"
  | "mcp-tool-execution"
  | "mcp-resource-discovery"
  | "mcp-resource-read"
  | "endpoint-request"
  | "oauth-authorize"
  | "oauth-token"

export interface EnterpriseMcpConnectInput {
  connection: EnterpriseMcpConnection
  redirectUri: string
  authorizationId?: string
}

export interface EnterpriseMcpConnectResult {
  tools: Array<{ name: string; description?: string; inputSchema?: unknown }>
}

export interface EnterpriseMcpCallToolInput {
  connection: EnterpriseMcpConnection
  redirectUri: string
  name: string
  arguments?: Record<string, unknown>
}

export interface EnterpriseMcpCallToolResult {
  content: Array<{ type: string; text?: string }>
}

export interface EnterpriseMcpClientOptions {
  operationTimeoutMs?: number
  closeTimeoutMs?: number
  authorizationTransactionTtlMs?: number
  expirationSkewMs?: number
  clientName?: string
  clientVersion?: string
  clock?: EnterpriseMcpClock
  fetch?: EnterpriseMcpFetch
  lifecycle?: EnterpriseMcpLifecycle
  diagnosticSink?: (event: EnterpriseMcpDiagnosticEvent) => void
}

export interface EnterpriseMcpClock {
  now(): number
}

export type EnterpriseMcpFetch = typeof globalThis.fetch

export interface EnterpriseMcpLifecycle {
  expiresAt: number
  signal: AbortSignal
}

export interface EnterpriseMcpDiagnosticEvent {
  kind: string
  connectionId: string
  operationPhase: EnterpriseMcpOperationPhase
  requestPhase?: EnterpriseMcpRequestPhase | null
  outcome?: string
  durationMs?: number
  httpStatus?: number
  invalidToken?: boolean
  bearerChallenge?: boolean
  insufficientScope?: boolean
  responseBodyExcerpt?: string
  protocolVersionFallback?: string
}

export interface EnterpriseMcpClient {
  connect(input: EnterpriseMcpConnectInput): Promise<EnterpriseMcpConnectResult>
  callTool(input: EnterpriseMcpCallToolInput): Promise<EnterpriseMcpCallToolResult>
  close(): Promise<void>
}
