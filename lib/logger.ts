/**
 * Professional logging utility
 * Replaces console.log with structured logging
 */

/**
 * Log level constants
 * Using const object instead of enum following project style guide
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const

export type LogLevelValue = typeof LogLevel[keyof typeof LogLevel]
export type LogLevelName = keyof typeof LogLevel

interface LogEntry {
  level: LogLevelValue
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: Error
}

class Logger {
  private minLevel: LogLevelValue

  constructor() {
    // In production, only show WARN and ERROR
    this.minLevel =
      process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG
  }

  private shouldLog(level: LogLevelValue): boolean {
    return level >= this.minLevel
  }

  private formatMessage(entry: LogEntry): string {
    // Find the level name by value
    const levelName = (Object.keys(LogLevel) as LogLevelName[]).find(
      key => LogLevel[key] === entry.level
    ) as LogLevelName
    const contextStr = entry.context
      ? ` ${JSON.stringify(entry.context)}`
      : ''
    const errorStr = entry.error ? `\nError: ${entry.error.message}` : ''
    return `[${entry.timestamp}] [${levelName}] ${entry.message}${contextStr}${errorStr}`
  }

  private log(level: LogLevelValue, message: string, context?: Record<string, unknown>, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    }

    const formatted = this.formatMessage(entry)

    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(formatted)
        break
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(formatted)
        break
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(formatted)
        break
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(formatted)
        if (error && process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error(error.stack)
        }
        break
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, context, error)
  }
}

export const logger = new Logger()

