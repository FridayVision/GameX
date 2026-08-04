import { randomUUID } from 'crypto'

export type JobStatus = 'running' | 'done' | 'error'

export interface SourceProgress {
  source: string
  status: 'fetching' | 'done' | 'error'
  count: number
  error?: string
}

export interface Job {
  jobId: string
  roomId: string
  status: JobStatus
  progress: SourceProgress[]
  error?: string
  createdAt: number
}

// Store on process (same reason as socket-server.ts — webpack isolates `global` in Next.js dev)
type ProcessWithJobs = NodeJS.Process & { __jobs?: Map<string, Job> }

function getJobs(): Map<string, Job> {
  const p = process as ProcessWithJobs
  if (!p.__jobs) p.__jobs = new Map()
  return p.__jobs
}

export function createJob(roomId: string): Job {
  const job: Job = {
    jobId: randomUUID(),
    roomId,
    status: 'running',
    progress: [],
    createdAt: Date.now(),
  }
  getJobs().set(job.jobId, job)
  return job
}

export function getJob(jobId: string): Job | undefined {
  return getJobs().get(jobId)
}

export function updateJob(jobId: string, patch: Partial<Job>): void {
  const job = getJobs().get(jobId)
  if (job) Object.assign(job, patch)
}

export function deleteJob(jobId: string): void {
  getJobs().delete(jobId)
}
