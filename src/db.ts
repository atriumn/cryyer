import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { BetaTester, Product } from './types.js';

export function createDbClient(url: string, key: string): SupabaseClient {
  return createClient(url, key);
}

export async function getProducts(db: SupabaseClient): Promise<Product[]> {
  const { data, error } = await db.from('products').select('*');
  if (error) throw error;
  return data as Product[];
}

export async function getBetaTesters(db: SupabaseClient, productId?: string): Promise<BetaTester[]> {
  let query = db.from('beta_testers').select('*');
  if (productId) {
    query = db.from('beta_testers').select('*').contains('productIds', [productId]);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as BetaTester[];
}

export async function recordEmailSent(
  db: SupabaseClient,
  testerId: string,
  productId: string,
  weekOf: string
): Promise<void> {
  const { error } = await db.from('email_log').insert({
    tester_id: testerId,
    product_id: productId,
    week_of: weekOf,
    sent_at: new Date().toISOString(),
  });
  if (error) throw error;
}
