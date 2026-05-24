export const logError = (error: unknown, context?: string) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[ERROR]${context ? ` [${context}]` : ''}: ${message}`)
}

export const logInfo = (message: string, data?: unknown) => {
  console.log(`[INFO]: ${message}`, data || '')
}

export default { logError, logInfo }
