import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }
  return databaseUrl;
}

function getPool(): Pool {
  if (!pool) {
    const useSsl = process.env.DATABASE_SSL !== 'false';
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  return getPool().query(text, params);
}

export async function initializeDatabase(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      school_code TEXT NOT NULL,
      region_code TEXT NOT NULL,
      allergens JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS push_subscriptions_school_idx
    ON push_subscriptions (region_code, school_code)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS push_subscriptions_updated_at_idx
    ON push_subscriptions (updated_at DESC)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS meal_cache (
      region_code TEXT NOT NULL,
      school_code TEXT NOT NULL,
      meal_date TEXT NOT NULL,
      meals JSONB NOT NULL,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (region_code, school_code, meal_date)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS meal_cache_fetched_at_idx
    ON meal_cache (fetched_at DESC)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notification_runs (
      job_type TEXT NOT NULL,
      run_date TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      error_message TEXT NULL,
      PRIMARY KEY (job_type, run_date)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS notification_runs_status_idx
    ON notification_runs (status, updated_at DESC)
  `);
}
