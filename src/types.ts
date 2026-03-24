import type { SocialConfig } from './social/types.js';

export interface ProductFilter {
  labels?: string[];
  paths?: string[];
  tag_prefix?: string;
}

export interface Audience {
  id: string;
  voice: string;
  emailSubjectTemplate: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
}

export interface ResolvedAudience {
  id?: string; // undefined for single-audience (legacy) products
  voice: string;
  emailSubjectTemplate: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
}

export interface Product {
  id: string;
  name: string;
  tagline?: string;
  voice?: string;
  repo?: string;
  githubRepo?: string; // Deprecated: use repo instead
  emailSubjectTemplate?: string;
  supabase_table?: string;
  product_filter?: string; // Deprecated: use filter.labels instead
  filter?: ProductFilter;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  audiences?: Audience[];
  social?: SocialConfig;
}

export interface BetaTester {
  id: string;
  email: string;
  name: string;
  productIds: string[];
}

export interface Update {
  productId: string;
  weekOf: string;
  changes: GitHubChange[];
  draft?: string;
}

export function resolveAudiences(product: Product): ResolvedAudience[] {
  if (product.audiences?.length) {
    return product.audiences.map((a) => ({
      id: a.id,
      voice: a.voice,
      emailSubjectTemplate: a.emailSubjectTemplate,
      from_name: a.from_name ?? product.from_name,
      from_email: a.from_email ?? product.from_email,
      reply_to: a.reply_to ?? product.reply_to,
    }));
  }

  return [
    {
      voice: product.voice!,
      emailSubjectTemplate: product.emailSubjectTemplate!,
      from_name: product.from_name,
      from_email: product.from_email,
      reply_to: product.reply_to,
    },
  ];
}

export function subscriberKey(productId: string, audienceId?: string): string {
  return audienceId ? `${productId}:${audienceId}` : productId;
}

export interface GitHubChange {
  title: string;
  url: string;
  type: 'issue' | 'pr' | 'release';
  closedAt?: string;
  mergedAt?: string;
}

export interface EmailJob {
  testerId: string;
  productId: string;
  weekOf: string;
  subject: string;
  body: string;
}
