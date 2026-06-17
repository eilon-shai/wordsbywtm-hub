import { describe, it, expect } from 'vitest';
import { buildShareLink, buildInviteText } from './invite';

describe('invite helpers', () => {
  it('builds a share link with occasion + viral-attribution UTM', () => {
    const link = buildShareLink('https://wordsbywtm.com', 'tok123', 'memorial');
    expect(link).toBe('https://wordsbywtm.com/c/tok123?occasion=memorial&src=invite');
  });

  it('tolerates a trailing slash on the origin', () => {
    const link = buildShareLink('https://wordsbywtm.com/', 'tok123', 'memorial');
    expect(link).toBe('https://wordsbywtm.com/c/tok123?occasion=memorial&src=invite');
  });

  it('url-encodes the param values', () => {
    const link = buildShareLink('https://x.com', 't', 'a b');
    expect(link).toContain('occasion=a%20b');
  });

  it('builds paste-ready invite text containing the honoree name and link', () => {
    const text = buildInviteText('Jane Doe', 'https://x.com/c/t?occasion=memorial&src=invite');
    expect(text).toContain('Jane Doe');
    expect(text).toContain('https://x.com/c/t?occasion=memorial&src=invite');
  });
});
