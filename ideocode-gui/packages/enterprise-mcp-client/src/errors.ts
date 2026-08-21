import type { EnterpriseMcpOperationPhase, EnterpriseMcpRequestPhase } from "./contracts"

export class EnterpriseMcpClientError extends Error {
  readonly operationPhase: EnterpriseMcpOperationPhase
  readonly requestPhase: EnterpriseMcpRequestPhase | null
  readonly cause?: unknown

  constructor(input: {
    operationPhase: EnterpriseMcpOperationPhase
    requestPhase: EnterpriseMcpRequestPhase | null
    cause?: unknown
  }) {
    const message = input.cause instanceof Error
      ? input.cause.message
      : `Enterprise MCP client error during ${input.operationPhase}`
    super(message)
    this.name = "EnterpriseMcpClientError"
    this.operationPhase = input.operationPhase
    this.requestPhase = input.requestPhase
    this.cause = input.cause
  }
}

export class EnterpriseMcpLifecycleDeadlineError extends Error {
  readonly operationPhase: EnterpriseMcpOperationPhase

  constructor(operationPhase: EnterpriseMcpOperationPhase) {
    super(`The ${operationPhase} operation exceeded its lifecycle deadline.`)
    this.name = "EnterpriseMcpLifecycleDeadlineError"
    this.operationPhase = operationPhase
  }
}

export class EnterpriseMcpToolResultError extends Error {
  readonly toolName: string

  constructor(toolName: string, message: string) {
    super(message)
    this.name = "EnterpriseMcpToolResultError"
    this.toolName = toolName
  }
}
