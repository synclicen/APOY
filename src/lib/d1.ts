/**
 * D1 database client for Next.js dev server (local development).
 * Uses the Cloudflare D1 REST API to execute queries.
 * In production, the Worker uses the D1 binding directly (env.DB).
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || 'd8a5b04ca8fc4894e0541c83899f8d97';
const CF_D1_DATABASE_ID = process.env.CF_D1_DATABASE_ID || 'df3d0bd5-04f7-4a21-b928-5256193869d3';
const CF_D1_TOKEN = process.env.CF_D1_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';

export interface D1Result {
  results: Record<string, unknown>[];
  success: boolean;
  meta: Record<string, unknown>;
}

/**
 * Execute a SQL query against D1 via the REST API.
 * Returns the first result set's results array.
 */
export async function d1Query(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_D1_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    }
  );
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'D1 query failed');
  }
  // D1 REST returns an array of result sets (one per statement)
  return data.result?.[0]?.results || [];
}

/**
 * Execute a write query (INSERT/UPDATE/DELETE) and return success status.
 */
export async function d1Exec(sql: string, params: unknown[] = []): Promise<boolean> {
  await d1Query(sql, params);
  return true;
}
