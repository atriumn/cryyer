// @deprecated Use subscriber-store.ts (SubscriberStore) instead. This module is kept for backwards compatibility.
import { SupabaseClient } from '@supabase/supabase-js';

export interface Subscriber {
  email: string;
  name?: string;
}

export async function getSubscribers(
  db: SupabaseClient,
  product: string
): Promise<Subscriber[]> {
  const { data, error } = await db
    .from('beta_testers')
    .select('email, name')
    .eq('product', product)
    .is('unsubscribed_at', null);

  if (error) throw error;

  const subscribers = (data ?? []) as Subscriber[];

  if (subscribers.length === 0) {
    console.warn(`[subscribers] No active subscribers found for product: ${product}`);
  }

  return subscribers;
}
