import { Queue } from 'bullmq'
import { env } from './env.js'

const connection = { url: env.REDIS_URL }

function makeQueue(name: string, opts: object) {
  const q = new Queue(name, { connection, ...opts })
  q.on('error', (err: Error) => {
    if ((err as NodeJS.ErrnoException).code !== 'ECONNREFUSED') console.error(`[queue:${name}]`, err.message)
  })
  return q
}

export const ingestQueue = makeQueue('ingest', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const pollQueue = makeQueue('poll', {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
})

export type IngestJobData =
  | { type: 'webhook'; source: string; payload: unknown }
  | { type: 'poll'; source: 'tenable' | 'qualys' | 'crowdstrike'; integrationId: string }

export type PollJobData = {
  source: 'tenable' | 'qualys' | 'crowdstrike' | 'splunk' | 'qradar'
  integrationId: string
}
