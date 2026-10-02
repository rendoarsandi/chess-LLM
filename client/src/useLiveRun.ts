import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { LiveEvent } from '../../shared/protocol'

export type ThinkingEvent = Extract<LiveEvent, { type: 'thinking' }>

export function useLiveRun(id: string) {
  const client = useQueryClient()
  const [thinking, setThinking] = useState<ThinkingEvent | null>(null)
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    let socket: WebSocket
    let retry: ReturnType<typeof setTimeout>
    let heartbeat: ReturnType<typeof setInterval>
    let closed = false,
      failures = 0
    function connect() {
      socket = new WebSocket(
        `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/runs/${id}/live`,
      )
      socket.onopen = () => {
        failures = 0
        setConnected(true)
        heartbeat = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send('ping')
        }, 20000)
      }
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as LiveEvent
          if (event.type === 'thinking' && event.runId === id) setThinking(event)
          if (event.type === 'snapshot' && event.run.id === id) {
            client.setQueryData(['run', id], event.run)
            if (!event.run.pending || event.run.status !== 'running') setThinking(null)
            void client.invalidateQueries({ queryKey: ['attempts', id] })
            void client.invalidateQueries({ queryKey: ['runs'] })
          }
        } catch {
          /* Ignore malformed frames; HTTP refresh remains available. */
        }
      }
      socket.onclose = () => {
        setConnected(false)
        setThinking(null)
        clearInterval(heartbeat)
        if (!closed) retry = setTimeout(connect, Math.min(1000 * 2 ** failures++, 15000))
      }
      socket.onerror = () => socket.close()
    }
    connect()
    return () => {
      closed = true
      clearTimeout(retry)
      clearInterval(heartbeat)
      socket.close()
    }
  }, [id, client])
  return { thinking, connected }
}
