import { standings } from '../../../shared/protocol'
import type { RunStore } from '../storage/run-store'

/** Stable live-run snapshot, streamed in bounded pages instead of loading a whole run into memory. */
export function exportRun(store: RunStore): Response {
  const { run, cutoff } = store.captureExport()
  if (!run) return Response.json({ error: 'Run not found.' }, { status: 404 })
  const attempts = store.serializedAttempts(cutoff)
  const encoder = new TextEncoder()
  let first = true
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const header = JSON.stringify({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        run,
        standings: standings(run),
      })
      controller.enqueue(encoder.encode(`${header.slice(0, -1)},"attempts":[`))
    },
    pull(controller) {
      const next = attempts.next()
      if (next.done) {
        controller.enqueue(encoder.encode(']}'))
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(`${first ? '' : ','}${next.value}`))
      first = false
    },
    cancel() {
      attempts.return(undefined)
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="gamebench-${run.id}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
