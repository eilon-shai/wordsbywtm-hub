import { describe, it, expect, afterEach } from 'vitest';
import { audioEnabled, normalizeVoice } from './audio';

const ORIG = { ...process.env };
afterEach(() => {
  process.env = { ...ORIG };
});

describe('audio gating (audioEnabled)', () => {
  it('is OFF when no ElevenLabs key is set', () => {
    delete process.env.ELEVENLABS_API_KEY;
    expect(audioEnabled()).toBe(false);
  });

  it('is ON when a key is set and not explicitly disabled', () => {
    process.env.ELEVENLABS_API_KEY = 'sk_test';
    delete process.env.DISABLE_TRIBUTE_AUDIO;
    expect(audioEnabled()).toBe(true);
  });

  it('is OFF when DISABLE_TRIBUTE_AUDIO=true even with a key (e.g. Preview)', () => {
    process.env.ELEVENLABS_API_KEY = 'sk_test';
    process.env.DISABLE_TRIBUTE_AUDIO = 'true';
    expect(audioEnabled()).toBe(false);
  });
});

describe('normalizeVoice', () => {
  it('maps male/female and defaults everything else to female', () => {
    expect(normalizeVoice('male')).toBe('male');
    expect(normalizeVoice('female')).toBe('female');
    expect(normalizeVoice('nonsense')).toBe('female');
    expect(normalizeVoice(undefined)).toBe('female');
    expect(normalizeVoice(null)).toBe('female');
  });
});
