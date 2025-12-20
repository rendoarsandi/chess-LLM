export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'silent'

class Logger {
  private level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

  setLevel(level: LogLevel) {
    this.level = level
  }

  private shouldLog(target: LogLevel): boolean {
    if (this.level === 'silent') return false
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(target) >= levels.indexOf(this.level)
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      const cleanArgs = args.map(arg => {
        if (arg instanceof Error) {
          return this.level === 'debug' ? arg.stack : arg.message
        }
        return arg
      })
      console.error(`[ERROR] ${message}`, ...cleanArgs)
    }
  }
}

export const logger = new Logger()
