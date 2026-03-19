import { query } from './client';
import { NotificationJobType, NotificationRunStats } from '../types';

const STALE_MINUTES = 30;

function serializeStats(stats: NotificationRunStats): string {
  return JSON.stringify(stats);
}

export async function claimRun(jobType: NotificationJobType, runDate: string): Promise<boolean> {
  const result = await query(
    `
      INSERT INTO notification_runs (
        job_type, run_date, status, started_at, updated_at, details
      ) VALUES ($1, $2, 'running', NOW(), NOW(), '{}'::jsonb)
      ON CONFLICT (job_type, run_date)
      DO UPDATE SET
        status = 'running',
        started_at = NOW(),
        finished_at = NULL,
        updated_at = NOW(),
        error_message = NULL,
        details = '{}'::jsonb
      WHERE notification_runs.status <> 'success'
        AND (
          notification_runs.status <> 'running'
          OR notification_runs.started_at < NOW() - ($3 * INTERVAL '1 minute')
        )
      RETURNING job_type
    `,
    [jobType, runDate, STALE_MINUTES]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function completeRun(
  jobType: NotificationJobType,
  runDate: string,
  stats: NotificationRunStats
): Promise<void> {
  await query(
    `
      UPDATE notification_runs
      SET status = 'success',
          finished_at = NOW(),
          updated_at = NOW(),
          details = $3::jsonb,
          error_message = NULL
      WHERE job_type = $1 AND run_date = $2
    `,
    [jobType, runDate, serializeStats(stats)]
  );
}

export async function failRun(
  jobType: NotificationJobType,
  runDate: string,
  errorMessage: string,
  stats: NotificationRunStats
): Promise<void> {
  await query(
    `
      UPDATE notification_runs
      SET status = 'failed',
          finished_at = NOW(),
          updated_at = NOW(),
          details = $3::jsonb,
          error_message = $4
      WHERE job_type = $1 AND run_date = $2
    `,
    [jobType, runDate, serializeStats(stats), errorMessage.slice(0, 1000)]
  );
}
