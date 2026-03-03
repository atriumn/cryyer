import { describe, it, expect } from 'vitest';
import { buildDraftWorkflowContent, buildSendWorkflowContent } from '../init.js';

describe('buildDraftWorkflowContent', () => {
  it('generates valid YAML with correct structure', () => {
    const content = buildDraftWorkflowContent('acme-cli', 'anthropic');
    expect(content).toContain('name: Draft Email');
    expect(content).toContain('on:');
    expect(content).toContain('pull_request:');
    expect(content).toContain("types: [opened, synchronize]");
  });

  it('uses release-please branch conditional', () => {
    const content = buildDraftWorkflowContent('acme-cli', 'anthropic');
    expect(content).toContain("if: startsWith(github.head_ref, 'release-please--')");
  });

  it('references the composite action', () => {
    const content = buildDraftWorkflowContent('acme-cli', 'anthropic');
    expect(content).toContain('uses: atriumn/cryyer/.github/actions/draft-file@v0');
  });

  it('includes version extraction from PR title', () => {
    const content = buildDraftWorkflowContent('acme-cli', 'anthropic');
    expect(content).toContain('Extract version from PR title');
    expect(content).toContain('grep -oP');
  });

  it('uses ANTHROPIC_API_KEY secret for anthropic provider', () => {
    const content = buildDraftWorkflowContent('my-product', 'anthropic');
    expect(content).toContain('secrets.ANTHROPIC_API_KEY');
    expect(content).toContain('llm-provider: anthropic');
    expect(content).toContain('product: my-product');
  });

  it('uses OPENAI_API_KEY secret for openai provider', () => {
    const content = buildDraftWorkflowContent('my-product', 'openai');
    expect(content).toContain('secrets.OPENAI_API_KEY');
    expect(content).toContain('llm-provider: openai');
    expect(content).not.toContain('ANTHROPIC_API_KEY');
  });

  it('uses GEMINI_API_KEY secret for gemini provider', () => {
    const content = buildDraftWorkflowContent('my-product', 'gemini');
    expect(content).toContain('secrets.GEMINI_API_KEY');
    expect(content).toContain('llm-provider: gemini');
    expect(content).not.toContain('ANTHROPIC_API_KEY');
  });

  it('includes commit and push step', () => {
    const content = buildDraftWorkflowContent('acme-cli', 'anthropic');
    expect(content).toContain('Commit draft');
    expect(content).toContain('git push');
  });

  it('uses the product ID in the action inputs', () => {
    const content = buildDraftWorkflowContent('tokencost', 'openai');
    expect(content).toContain('product: tokencost');
  });
});

describe('buildSendWorkflowContent', () => {
  it('generates valid YAML with correct structure', () => {
    const content = buildSendWorkflowContent('acme-cli', 'resend', 'json');
    expect(content).toContain('name: Send Email');
    expect(content).toContain('on:');
    expect(content).toContain('release:');
    expect(content).toContain("types: [published]");
  });

  it('references the composite action', () => {
    const content = buildSendWorkflowContent('acme-cli', 'resend', 'json');
    expect(content).toContain('uses: atriumn/cryyer/.github/actions/send-file@v0');
  });

  it('includes version extraction from tag', () => {
    const content = buildSendWorkflowContent('acme-cli', 'resend', 'json');
    expect(content).toContain('Extract version from tag');
    expect(content).toContain('github.event.release.tag_name');
  });

  it('includes resend credentials for resend provider', () => {
    const content = buildSendWorkflowContent('acme-cli', 'resend', 'json');
    expect(content).toContain('email-provider: resend');
    expect(content).toContain('secrets.RESEND_API_KEY');
    expect(content).not.toContain('GMAIL_REFRESH_TOKEN');
  });

  it('includes gmail credentials for gmail provider', () => {
    const content = buildSendWorkflowContent('acme-cli', 'gmail', 'json');
    expect(content).toContain('email-provider: gmail');
    expect(content).toContain('secrets.GMAIL_REFRESH_TOKEN');
    expect(content).not.toContain('RESEND_API_KEY');
  });

  it('includes no store credentials for json store', () => {
    const content = buildSendWorkflowContent('acme-cli', 'resend', 'json');
    expect(content).toContain('subscriber-store: json');
    expect(content).not.toContain('SUPABASE_URL');
    expect(content).not.toContain('GOOGLE_SHEETS');
  });

  it('includes supabase credentials for supabase store', () => {
    const content = buildSendWorkflowContent('acme-cli', 'resend', 'supabase');
    expect(content).toContain('subscriber-store: supabase');
    expect(content).toContain('secrets.SUPABASE_URL');
    expect(content).toContain('secrets.SUPABASE_SERVICE_KEY');
  });

  it('includes google sheets credentials for google-sheets store', () => {
    const content = buildSendWorkflowContent('acme-cli', 'resend', 'google-sheets');
    expect(content).toContain('subscriber-store: google-sheets');
    expect(content).toContain('secrets.GOOGLE_SHEETS_SPREADSHEET_ID');
    expect(content).toContain('secrets.GOOGLE_SERVICE_ACCOUNT_EMAIL');
    expect(content).toContain('secrets.GOOGLE_PRIVATE_KEY');
  });

  it('uses the product ID in the action inputs', () => {
    const content = buildSendWorkflowContent('tokencost', 'resend', 'json');
    expect(content).toContain('product: tokencost');
  });

  it('includes FROM_EMAIL secret', () => {
    const content = buildSendWorkflowContent('acme-cli', 'resend', 'json');
    expect(content).toContain('secrets.FROM_EMAIL');
  });
});
