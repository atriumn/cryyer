export interface Product {
  id: string;
  name: string;
  voice: string;
  githubRepo: string;
  emailSubjectTemplate: string;
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
