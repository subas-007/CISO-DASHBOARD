import { Worker } from 'bullmq'
import { env } from '../config/env.js'
import {
  upsertVuln,
  ingestEvent,
  normalizeTenableVuln,
  normalizeQualysVuln,
  normalizeCrowdStrikeAlert,
  normalizeQRadarEvent,
} from '../services/ingest.service.js'
import type { IngestJobData } from '../config/queues.js'

const connection = { url: env.REDIS_URL }

export const ingestWorker = new Worker<IngestJobData>(
  'ingest',
  async (job) => {
    const { type, source, payload } = job.data as { type: string; source: string; payload: unknown }

    if (type === 'webhook') {
      const raw = payload as Record<string, unknown>

      switch (source) {
        case 'tenable': {
          const vulns: unknown[] = Array.isArray(raw['vulnerabilities']) ? raw['vulnerabilities'] : [raw]
          for (const v of vulns) {
            upsertVuln(normalizeTenableVuln(v as Record<string, unknown>))
          }
          return { processed: vulns.length }
        }
        case 'qualys': {
          const vulns: unknown[] = Array.isArray(raw['detections']) ? raw['detections'] : [raw]
          for (const v of vulns) {
            upsertVuln(normalizeQualysVuln(v as Record<string, unknown>))
          }
          return { processed: vulns.length }
        }
        case 'crowdstrike': {
          const events: unknown[] = Array.isArray(raw['detects']) ? raw['detects'] : [raw]
          for (const e of events) {
            ingestEvent(normalizeCrowdStrikeAlert(e as Record<string, unknown>))
          }
          return { processed: events.length }
        }
        case 'qradar': {
          const offenses: unknown[] = Array.isArray(raw['offenses']) ? raw['offenses'] : [raw]
          for (const o of offenses) {
            ingestEvent(normalizeQRadarEvent(o as Record<string, unknown>))
          }
          return { processed: offenses.length }
        }
        case 'sentinel': {
          const incidents: unknown[] = Array.isArray(raw['value']) ? raw['value'] : [raw]
          for (const i of incidents) {
            const inc = i as Record<string, unknown>
            const props = (inc['properties'] as Record<string, unknown>) ?? inc
            ingestEvent({
              source: 'sentinel' as const,
              eventType: String(props['incidentNumber'] ? 'incident' : 'alert'),
              severity: String(props['severity'] ?? 'medium').toLowerCase(),
              title: String(props['title'] ?? 'Sentinel Incident'),
              description: props['description'] ? String(props['description']) : undefined,
              mitreTactic: props['tactics']
                ? (props['tactics'] as string[])[0]
                : undefined,
              occurredAt: props['createdTimeUtc'] ? String(props['createdTimeUtc']) : undefined,
              rawData: i,
            })
          }
          return { processed: incidents.length }
        }
        default:
          console.warn(`Unknown webhook source: ${source}`)
          return { processed: 0 }
      }
    }

    return { processed: 0 }
  },
  {
    connection,
    concurrency: 5,
  }
)

ingestWorker.on('completed', (job, result) => {
  console.log(`✅ Ingest job ${job.id} (${job.data.source}) — processed: ${(result as { processed: number }).processed}`)
})

ingestWorker.on('failed', (job, err) => {
  console.error(`❌ Ingest job ${job?.id} failed:`, err.message)
})
