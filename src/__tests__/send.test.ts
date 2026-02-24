import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../send.js';

describe('markdownToHtml', () => {
  it('converts headers', () => {
    expect(markdownToHtml('# Title')).toContain('<h1>Title</h1>');
    expect(markdownToHtml('## Subtitle')).toContain('<h2>Subtitle</h2>');
    expect(markdownToHtml('### Section')).toContain('<h3>Section</h3>');
  });

  it('converts bold text', () => {
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>');
  });

  it('converts italic text', () => {
    expect(markdownToHtml('*italic*')).toContain('<em>italic</em>');
  });

  it('converts links', () => {
    const result = markdownToHtml('[click here](https://example.com)');
    expect(result).toContain('<a href="https://example.com">click here</a>');
  });

  it('converts unordered list items and wraps in <ul>', () => {
    const result = markdownToHtml('- item one\n- item two');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>item one</li>');
    expect(result).toContain('<li>item two</li>');
    expect(result).toContain('</ul>');
  });

  it('wraps plain text in <p> tags', () => {
    const result = markdownToHtml('Hello world');
    expect(result).toContain('<p>Hello world</p>');
  });

  it('does not double-wrap block elements', () => {
    const result = markdownToHtml('# Title');
    expect(result).not.toContain('<p><h1>');
  });
});
