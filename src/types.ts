export interface ProductFilter {
  labels?: string[];
  paths?: string[];
  tag_prefix?: string;
}

export interface Product {
  id: string;
  name: string;
  tagline?: string;
  voice: string;
  repo?: string;
  githubRepo?: string; // Deprecated: use repo instead
  emailSubjectTemplate: string;
  supabase_table?: string;
  product_filter?: string; // Deprecated: use filter.labels instead
  filter?: ProductFilter;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
}

export interface BetaTester {
  id: string;
  email: string;
  name: string;
  productIds: string[];
}

export interface WeeklyUpdate {
  productId: string;
  weekOf: string;
  changes: GitHubChange[];
  draft?: string;
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
