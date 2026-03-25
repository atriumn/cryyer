export type ContentType = 'pain' | 'insight' | 'capability' | 'proof' | 'update' | 'blog';

export interface Seed {
  type: ContentType;
  text: string;
}

export interface Platform {
  id: string;
  name: string;
  maxLength: number;
  voice: string;
  threadSupport?: boolean;
  threadMaxParts?: number;
}

export interface SocialPost {
  seed: Seed;
  platform: Platform;
  text: string;
}

export interface SocialDraft {
  product: string;
  generatedAt: string;
  seeds: number;
  posts: SocialPost[];
}

export interface SocialConfig {
  platforms: string[];
  context: string;
  cta?: {
    default: string;
    link: string;
  };
}
