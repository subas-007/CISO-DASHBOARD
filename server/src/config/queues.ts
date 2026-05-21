import { Queue } from 'bullmq'
import { env } from './env.js'

const connection = { url: env.REDIS_URL }

export const ingestQueue = new Queue('ingest', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const pollQueue = new Queue('poll', {
  connection,
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
