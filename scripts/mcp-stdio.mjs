import { createInterface } from 'node:readline'

// Optional bridge for harnesses that support stdio MCP but cannot attach a
// participant Authorization header to a remote Streamable HTTP server.
const endpoint = process.env.GAMEBENCH_MCP_URL
const token = process.env.GAMEBENCH_MCP_TOKEN
if (!endpoint || !token) {
  process.stderr.write('Set GAMEBENCH_MCP_URL and GAMEBENCH_MCP_TOKEN.\n')
  process.exit(1)
}
const target = new URL(endpoint)
if (
  target.protocol !== 'https:' &&
  !(target.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
) {
  process.stderr.write('Use HTTPS, or HTTP on localhost.\n')
  process.exit(1)
}
const active = new Map()
let protocolVersion
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`)
const input = createInterface({ input: process.stdin, crlfDelay: Infinity })

async function forward(message) {
  if (message.method === 'notifications/cancelled') {
    active.get(message.params?.requestId)?.abort()
    return
  }
  const controller = new AbortController()
  if (message.id !== undefined) active.set(message.id, controller)
  try {
    const response = await fetch(target, {
      method: 'POST',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(protocolVersion ? { 'MCP-Protocol-Version': protocolVersion } : {}),
      },
      body: JSON.stringify(message),
    })
    if (!response.ok)
      throw new Error(
        `MCP server returned HTTP ${response.status}. Check your URL and participant credential.`,
      )
    if (response.status === 202) return
    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      const reply = await response.json()
      if (message.method === 'initialize' && reply.result?.protocolVersion)
        protocolVersion = reply.result.protocolVersion
      send(reply)
      return
    }
    // Decode streaming UTF-8 and SSE frames without buffering a whole wait call.
    let buffer = ''
    let data = []
    for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
      buffer += chunk
      let newline
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, '')
        buffer = buffer.slice(newline + 1)
        if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
        else if (!line && data.length) {
          send(JSON.parse(data.join('\n')))
          data = []
        }
      }
    }
  } catch (error) {
    if (message.id !== undefined && !controller.signal.aborted)
      send({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: error.message } })
  } finally {
    if (message.id !== undefined) active.delete(message.id)
  }
}

input.on('line', (line) => {
  try {
    const message = JSON.parse(line)
    if (!message || typeof message !== 'object' || Array.isArray(message))
      throw new Error('Invalid message')
    void forward(message)
  } catch {
    send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Expected one JSON-RPC object per line.' },
    })
  }
})
input.on('close', () => {
  for (const controller of active.values()) controller.abort()
})
