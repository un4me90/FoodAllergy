import { query } from './client';
import { PushSubscriptionRecord } from '../types';

export async function upsert(record: PushSubscriptionRecord): Promise<void> {
  await query(
    `
      INSERT INTO push_subscriptions (
        endpoint, p256dh, auth, school_code, region_code, allergens
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (endpoint)
      DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        school_code = EXCLUDED.school_code,
        region_code = EXCLUDED.region_code,
        allergens = EXCLUDED.allergens,
        updated_at = NOW()
    `,
    [
      record.endpoint,
      record.p256dh,
      record.auth,
      record.schoolCode,
      record.regionCode,
      JSON.stringify(record.allergens),
    ]
  );
}

export async function getAll(): Promise<PushSubscriptionRecord[]> {
  const result = await query(
    `
      SELECT endpoint, p256dh, auth, school_code, region_code, allergens
      FROM push_subscriptions
    `
  );

  return result.rows.map(row => ({
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    schoolCode: row.school_code,
    regionCode: row.region_code,
    allergens: Array.isArray(row.allergens) ? row.allergens : JSON.parse(row.allergens || '[]'),
  }));
}

export async function deleteByEndpoint(endpoint: string): Promise<void> {
  await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}
