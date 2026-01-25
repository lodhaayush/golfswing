// Debug logger that sends logs to the dev server which writes them to a file

const LOG_ENDPOINT = '/__debug_log'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: unknown
}

class DebugLogger {
  private queue: LogEntry[] = []
  private flushing = false

  private safeStringify(data: unknown): string {
    try {
      // Handle DOM elements
      if (data instanceof HTMLElement) {
        return `<${data.tagName.toLowerCase()}${data.id ? ` id="${data.id}"` : ''}>`
      }
      // Handle other non-serializable objects
      return JSON.stringify(data, (_key, value) => {
        if (value instanceof HTMLElement) {
          return `<${value.tagName.toLowerCase()}>`
        }
        if (typeof value === 'function') {
          return '[Function]'
        }
        return value
      })
    } catch {
      return String(data)
    }
  }

  private formatEntry(entry: LogEntry): string {
    const dataStr = entry.data !== undefined ? ` | ${this.safeStringify(entry.data)}` : ''
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${dataStr}`
  }

  private async flush() {
    if (this.flushing || this.queue.length === 0) return
    this.flushing = true

    const entries = [...this.queue]
    this.queue = []

    try {
      const logText = entries.map(e => this.formatEntry(e)).join('\n')
      await fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: logText,
      })
    } catch (err) {
      // If server logging fails, fallback to console
      entries.forEach(e => console.log(this.formatEntry(e)))
    }

    this.flushing = false

    // Flush any entries that came in while we were flushing
    if (this.queue.length > 0) {
      this.flush()
    }
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }

    // Also log to console for immediate visibility
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    consoleMethod(`[${level.toUpperCase()}] ${message}`, data !== undefined ? data : '')

    this.queue.push(entry)
    this.flush()
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data)
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data)
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data)
  }
}

export const logger = new DebugLogger()
