import { describe, it, expect } from 'vitest';
import { 
  getLinkDisplayTitle, 
  getLinkDisplaySubtitle, 
  getLinkDisplayBadges, 
  getLinkExternalOpenUrl 
} from './linkDisplayMeta';
import { ArchivedFormat } from "@linkwarden/types/global";

describe('linkDisplayMeta', () => {
  describe('getLinkDisplayTitle', () => {
    it('should return trimmed name if available', () => {
      expect(getLinkDisplayTitle({ name: '  My Link  ' })).toBe('My Link');
    });

    it('should return hostname if name is missing but url has hostname', () => {
      expect(getLinkDisplayTitle({ name: '', url: 'https://example.com/path' })).toBe('example.com');
      expect(getLinkDisplayTitle({ url: 'http://sub.domain.org' })).toBe('sub.domain.org');
    });

    it('should return hostname for schemeless url', () => {
      expect(getLinkDisplayTitle({ url: 'example.com/path' })).toBe('example.com');
    });

    it('should return raw url if hostname cannot be parsed', () => {
      expect(getLinkDisplayTitle({ url: 'invalid-url-without-dots' })).toBe('invalid-url-without-dots');
    });

    it('should return empty string if both name and url are missing', () => {
      expect(getLinkDisplayTitle({})).toBe('');
    });
  });

  describe('getLinkDisplaySubtitle', () => {
    it('should return hostname if url is valid', () => {
      expect(getLinkDisplaySubtitle({ url: 'https://example.com/path' })).toBe('example.com');
      expect(getLinkDisplaySubtitle({ url: 'example.com/path' })).toBe('example.com');
    });

    it('should return description if url is missing or invalid but description exists', () => {
      expect(getLinkDisplaySubtitle({ url: 'invalid-url', description: '  A brief description  ' })).toBe('A brief description');
      expect(getLinkDisplaySubtitle({ description: 'A brief description' })).toBe('A brief description');
    });

    it('should return empty string if neither url nor description provides text', () => {
      expect(getLinkDisplaySubtitle({ url: 'invalid-url' })).toBe('');
      expect(getLinkDisplaySubtitle({})).toBe('');
    });
  });

  describe('getLinkDisplayBadges', () => {
    it('should handle missing collection, tags and formats', () => {
      expect(getLinkDisplayBadges({})).toEqual([]);
    });

    it('should return collection badge', () => {
      const badges = getLinkDisplayBadges({
        collection: { id: 1, name: 'My Collection' } as any
      });
      expect(badges).toContainEqual({ type: 'collection', label: 'My Collection' });
    });

    it('should return multiple tag badges', () => {
      const badges = getLinkDisplayBadges({
        tags: [{ id: 1, name: 'tag1' } as any, { id: 2, name: 'tag2' } as any]
      });
      expect(badges).toContainEqual({ type: 'tag', label: 'tag1' });
      expect(badges).toContainEqual({ type: 'tag', label: 'tag2' });
    });

    it('should return format badges', () => {
      const badges = getLinkDisplayBadges({
        monolith: 'available',
        image: 'screenshot.png',
        pdf: 'available',
        readable: 'available'
      });
      expect(badges).toContainEqual({ type: 'format', label: 'Webpage', format: ArchivedFormat.monolith });
      expect(badges).toContainEqual({ type: 'format', label: 'Screenshot', format: ArchivedFormat.png });
      expect(badges).toContainEqual({ type: 'format', label: 'PDF', format: ArchivedFormat.pdf });
      expect(badges).toContainEqual({ type: 'format', label: 'Readable', format: ArchivedFormat.readability });
    });

    it('should not return badges for unavailable formats', () => {
      const badges = getLinkDisplayBadges({
        monolith: 'unavailable',
        image: undefined,
        pdf: null,
        readable: ''
      } as any);
      expect(badges).toEqual([]);
    });
  });

  describe('getLinkExternalOpenUrl', () => {
    it('should return unchanged url if http/https is present', () => {
      expect(getLinkExternalOpenUrl('https://example.com')).toBe('https://example.com');
      expect(getLinkExternalOpenUrl('http://example.com')).toBe('http://example.com');
    });

    it('should prepend https:// if missing protocol but looks like domain', () => {
      expect(getLinkExternalOpenUrl('example.com/path')).toBe('https://example.com/path');
    });

    it('should return empty string for invalid or empty urls', () => {
      expect(getLinkExternalOpenUrl('')).toBe('');
      expect(getLinkExternalOpenUrl(null)).toBe('');
      expect(getLinkExternalOpenUrl('invalid-url-no-domain')).toBe('');
    });
  });
});
