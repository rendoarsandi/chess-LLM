export class StockfishPlayerService {
  private worker: Worker | null = null
  private isEngineReady: boolean = false
  private activeRequest: {
    resolve: (move: string) => void
    reject: (reason: unknown) => void
    fen: string
    depth: number
    skillLevel: number
    movetime?: number
  } | null = null
  private nextRequest: {
    resolve: (move: string) => void
    reject: (reason: unknown) => void
    fen: string
    depth: number
    skillLevel: number
    movetime?: number
  } | null = null
  private isSearching: boolean = false
  private isTerminated: boolean = false
  private currentSkillLevel: number | null = null

  constructor(existingWorker?: Worker) {
    this.init(existingWorker)
  }

  private init(existingWorker?: Worker) {
    console.log(
      '[StockfishPlayerService] Initializing worker. Origin:',
      window.location.origin,
      'Isolated:',
      window.crossOriginIsolated,
    )
    if (typeof Worker === 'undefined' && !existingWorker) {
      console.error('[StockfishPlayerService] Web Workers are not supported in this environment.')
      this.isTerminated = true
      return
    }
    try {
      console.log(
        '[StockfishPlayerService] Attempting to create Worker from /stockfish/stockfish.js',
      )
      const workerUrl = '/stockfish/stockfish.js'

      // Pre-flight check to see if the script is accessible
      if (!existingWorker) {
        fetch(workerUrl, { method: 'HEAD' })
          .then((resp) => {
            console.log(
              '[StockfishPlayerService] Pre-flight check status:',
              resp.status,
              resp.statusText,
            )
            if (!resp.ok)
              console.error('[StockfishPlayerService] Worker script might not be accessible!')
          })
          .catch((err) => console.error('[StockfishPlayerService] Pre-flight check failed:', err))
      }

      this.worker = existingWorker || new Worker(workerUrl)
      console.log('[StockfishPlayerService] Worker object created successfully')

      this.worker.onerror = (err) => {
        console.error('[StockfishPlayerService] Worker error event:', err)
        const errorMsg = `[StockfishPlayerService] Worker.onerror: ${err.message || 'Unknown message'} at ${err.filename || 'unknown'}:${err.lineno || 0}`
        console.error(errorMsg)
        if (err.error) console.error('[StockfishPlayerService] Error object:', err.error)
      }
      this.worker.onmessage = (e) => this.handleMessage(e.data)

      // Small delay before first command
      setTimeout(() => {
        this.sendMessage('uci')
      }, 100)
    } catch (error) {
      console.error('[StockfishPlayerService] Failed to initialize worker:', error)
      this.isTerminated = true
    }
  }

  private handleMessage(message: string) {
    if (this.isTerminated || typeof message !== 'string') return

    if (message.startsWith('uciok')) {
      console.log('[StockfishPlayerService] Engine UCI ready')
      this.sendMessage('setoption name Threads value 1')
      this.sendMessage('setoption name Hash value 32')
      this.sendMessage('ucinewgame')
      this.sendMessage('isready')
    } else if (message.startsWith('readyok')) {
      console.log('[StockfishPlayerService] Engine Ready (readyok)')
      this.isEngineReady = true
      this.processQueue()
    } else if (message.startsWith('bestmove')) {
      const parts = message.split(' ')
      if (parts.length >= 2) {
        const move = parts[1]
        this.isSearching = false

        if (this.activeRequest) {
          const resolve = this.activeRequest.resolve
          this.activeRequest = null
          // If we had a next request waiting, it will be started in processQueue
          resolve(move)
        }

        this.processQueue()
      }
    }
  }

  private sendMessage(command: string) {
    if (this.worker && !this.isTerminated) {
      try {
        this.worker.postMessage(command)
      } catch (e) {
        console.error('[StockfishPlayerService] Failed to send message:', e)
        this.terminate()
      }
    }
  }

  private processQueue() {
    if (!this.isEngineReady || this.isSearching) return

    // Pick the latest request
    const request = this.nextRequest
    if (!request) return

    this.nextRequest = null
    this.activeRequest = request
    this.isSearching = true

    const { fen, depth, skillLevel, movetime } = request

    // Apply skill level if it has changed
    if (this.currentSkillLevel !== skillLevel) {
      this.sendMessage(`setoption name Skill Level value ${skillLevel}`)
      this.currentSkillLevel = skillLevel
    }

    this.sendMessage(`position fen ${fen}`)

    let goCommand = `go depth ${depth}`
    if (movetime) {
      goCommand += ` movetime ${movetime}`
    }
    this.sendMessage(goCommand)
  }

  public calculateMove(
    fen: string,
    depth: number = 18,
    skillLevel: number = 20,
    movetime?: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.isTerminated) {
        reject(new Error('Service is terminated'))
        return
      }

      // If already searching, we queue this as the NEXT request and stop the current search
      if (this.isSearching) {
        if (this.nextRequest) {
          this.nextRequest.reject(new Error('Request cancelled by a newer move request'))
        }
        this.nextRequest = { resolve, reject, fen, depth, skillLevel, movetime }
        this.sendMessage('stop')
      } else {
        this.nextRequest = { resolve, reject, fen, depth, skillLevel, movetime }
        this.processQueue()
      }
    })
  }

  public terminate() {
    this.isTerminated = true
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }

  public getIsTerminated(): boolean {
    return this.isTerminated
  }
}
