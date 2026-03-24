export type ContentType = 'pain' | 'insight' | 'capability' | 'proof' | 'update';

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
  platform: string;
  seed: Seed;
  content: string;
}

export interface SocialDraft {
  product: string;
  generatedAt: string;
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
