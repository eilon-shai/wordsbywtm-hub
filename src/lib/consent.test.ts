import { describe, it, expect } from 'vitest';
import { isSensitivePath, grantedConsentState } from './consent';

// MF-1 regression net: memorial is a sensitive-category (grief) route, so even
// after the visitor accepts, ad_personalization + ad_user_data must stay denied
// (no remarketing/Customer Match audience built from grief traffic). Conversion
// measurement (ad_storage + analytics_storage) is still granted everywhere.
describe('consent — sensitive-route rule (MF-1)', () => {
  describe('isSensitivePath', () => {
    it('is true for the memorial landing and any memorial sub-route', () => {
      expect(isSensitivePath('/memorial')).toBe(true);
      expect(isSensitivePath('/memorial/start')).toBe(true);
      expect(isSensitivePath('/memorial/result')).toBe(true);
    });

    it('is false for every other occasion and the hub', () => {
      expect(isSensitivePath('/')).toBe(false);
      expect(isSensitivePath('/wedding')).toBe(false);
      expect(isSensitivePath('/retirement/start')).toBe(false);
      expect(isSensitivePath('/anniversary/result')).toBe(false);
    });

    it('does not treat a look-alike prefix as memorial', () => {
      // Guards against `startsWith('/memorial')` false positives.
      expect(isSensitivePath('/memorial-foo')).toBe(false);
      expect(isSensitivePath('/memorialize')).toBe(false);
    });

    it('is false for null/undefined (no path yet)', () => {
      expect(isSensitivePath(null)).toBe(false);
      expect(isSensitivePath(undefined)).toBe(false);
    });
  });

  describe('grantedConsentState', () => {
    it('DENIES personalization signals on memorial routes even on Accept', () => {
      const s = grantedConsentState('/memorial/start');
      expect(s.ad_personalization).toBe('denied');
      expect(s.ad_user_data).toBe('denied');
      // …but conversion measurement still works.
      expect(s.ad_storage).toBe('granted');
      expect(s.analytics_storage).toBe('granted');
    });

    it('GRANTS all four signals on non-memorial (celebratory) routes', () => {
      for (const p of ['/', '/wedding', '/retirement/start', '/anniversary/result']) {
        const s = grantedConsentState(p);
        expect(s, p).toEqual({
          ad_storage: 'granted',
          analytics_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
        });
      }
    });
  });
});
