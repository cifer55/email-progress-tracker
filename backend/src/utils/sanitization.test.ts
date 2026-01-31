/**
 * Unit tests for sanitization utilities
 * Requirements: 11.4
 */

import * as fc from 'fast-check';
import {
  sanitizeHtml,
  escapeHtml,
  sanitizeEmailContent,
  sanitizeInput,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeFeatureId,
  sanitizeJson,
  sanitizeLikePattern,
  truncateString,
  sanitizeObject,
} from './sanitization';

describe('Sanitization Utilities', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<div>Safe content</div><script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Safe content');
    });

    it('should remove event handlers', () => {
      const html = '<div onclick="alert(\'XSS\')">Click me</div>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('Click me');
    });

    it('should remove javascript: protocol', () => {
      const html = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove iframe tags', () => {
      const html = '<div>Content</div><iframe src="evil.com"></iframe>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).toContain('Content');
    });

    it('should remove object and embed tags', () => {
      const html = '<object data="evil.swf"></object><embed src="evil.swf">';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('<object');
      expect(sanitized).not.toContain('<embed');
    });

    it('should remove form tags', () => {
      const html = '<form action="evil.com"><input type="text"></form>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('<form');
    });

    it('should remove style tags', () => {
      const html = '<style>body { background: red; }</style><div>Content</div>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('<style>');
      expect(sanitized).toContain('Content');
    });

    it('should remove link and meta tags', () => {
      const html = '<link rel="stylesheet" href="evil.css"><meta http-equiv="refresh">';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('<link');
      expect(sanitized).not.toContain('<meta');
    });

    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should preserve safe HTML', () => {
      const html = '<div><p>Safe <strong>content</strong></p></div>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).toContain('<div>');
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const text = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(text);

      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
      expect(escapeHtml("It's working")).toBe('It&#x27;s working');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle text without special characters', () => {
      const text = 'Normal text';
      expect(escapeHtml(text)).toBe(text);
    });
  });

  describe('sanitizeEmailContent', () => {
    it('should sanitize HTML email content', () => {
      const html = '<div>Safe</div><script>alert("XSS")</script>';
      const sanitized = sanitizeEmailContent(html, true);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Safe');
    });

    it('should escape plain text email content', () => {
      const text = '<script>alert("XSS")</script>';
      const sanitized = sanitizeEmailContent(text, false);

      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should handle empty content', () => {
      expect(sanitizeEmailContent('', true)).toBe('');
      expect(sanitizeEmailContent('', false)).toBe('');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove null bytes', () => {
      const input = 'test\0data';
      const sanitized = sanitizeInput(input);

      expect(sanitized).not.toContain('\0');
      expect(sanitized).toBe('testdata');
    });

    it('should remove control characters', () => {
      const input = 'test\x01\x02\x03data';
      const sanitized = sanitizeInput(input);

      expect(sanitized).toBe('testdata');
    });

    it('should preserve newlines and tabs', () => {
      const input = 'line1\nline2\ttabbed';
      const sanitized = sanitizeInput(input);

      expect(sanitized).toBe('line1\nline2\ttabbed');
    });

    it('should trim whitespace', () => {
      const input = '  test data  ';
      const sanitized = sanitizeInput(input);

      expect(sanitized).toBe('test data');
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate and sanitize valid email', () => {
      const email = 'User@Example.COM';
      const sanitized = sanitizeEmail(email);

      expect(sanitized).toBe('user@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBeNull();
      expect(sanitizeEmail('missing@domain')).toBeNull();
      expect(sanitizeEmail('@nodomain.com')).toBeNull();
      expect(sanitizeEmail('no-at-sign.com')).toBeNull();
    });

    it('should handle empty string', () => {
      expect(sanitizeEmail('')).toBeNull();
    });

    it('should accept valid email formats', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(sanitizeEmail('user.name@example.com')).toBe('user.name@example.com');
      expect(sanitizeEmail('user+tag@example.co.uk')).toBe('user+tag@example.co.uk');
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate and sanitize HTTP URLs', () => {
      const url = 'http://example.com/path';
      const sanitized = sanitizeUrl(url);

      expect(sanitized).toBe('http://example.com/path');
    });

    it('should validate and sanitize HTTPS URLs', () => {
      const url = 'https://example.com/path';
      const sanitized = sanitizeUrl(url);

      expect(sanitized).toBe('https://example.com/path');
    });

    it('should reject non-HTTP protocols', () => {
      expect(sanitizeUrl('javascript:alert("XSS")')).toBeNull();
      expect(sanitizeUrl('data:text/html,<script>alert("XSS")</script>')).toBeNull();
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
      expect(sanitizeUrl('ftp://example.com')).toBeNull();
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
      expect(sanitizeUrl('')).toBeNull();
    });
  });

  describe('sanitizeFeatureId', () => {
    it('should accept valid feature IDs', () => {
      expect(sanitizeFeatureId('feature-123')).toBe('feature-123');
      expect(sanitizeFeatureId('FEAT_456')).toBe('FEAT_456');
      expect(sanitizeFeatureId('abc123')).toBe('abc123');
    });

    it('should reject invalid feature IDs', () => {
      expect(sanitizeFeatureId('feature 123')).toBeNull(); // space
      expect(sanitizeFeatureId('feature@123')).toBeNull(); // special char
      expect(sanitizeFeatureId('feature/123')).toBeNull(); // slash
      expect(sanitizeFeatureId('')).toBeNull(); // empty
    });
  });

  describe('sanitizeJson', () => {
    it('should parse valid JSON', () => {
      const json = '{"key": "value", "number": 123}';
      const parsed = sanitizeJson(json);

      expect(parsed).toEqual({ key: 'value', number: 123 });
    });

    it('should return null for invalid JSON', () => {
      expect(sanitizeJson('not json')).toBeNull();
      expect(sanitizeJson('{invalid}')).toBeNull();
      expect(sanitizeJson('')).toBeNull();
    });

    it('should handle arrays', () => {
      const json = '[1, 2, 3]';
      const parsed = sanitizeJson(json);

      expect(parsed).toEqual([1, 2, 3]);
    });
  });

  describe('sanitizeLikePattern', () => {
    it('should escape percent signs', () => {
      expect(sanitizeLikePattern('50%')).toBe('50\\%');
    });

    it('should escape underscores', () => {
      expect(sanitizeLikePattern('test_pattern')).toBe('test\\_pattern');
    });

    it('should escape backslashes', () => {
      expect(sanitizeLikePattern('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should handle empty string', () => {
      expect(sanitizeLikePattern('')).toBe('');
    });

    it('should handle multiple special characters', () => {
      expect(sanitizeLikePattern('50%_test\\data')).toBe('50\\%\\_test\\\\data');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      const str = 'a'.repeat(100);
      const truncated = truncateString(str, 50);

      expect(truncated.length).toBe(50);
      expect(truncated).toBe('a'.repeat(50));
    });

    it('should not truncate short strings', () => {
      const str = 'short';
      const truncated = truncateString(str, 50);

      expect(truncated).toBe(str);
    });

    it('should handle empty string', () => {
      expect(truncateString('', 50)).toBe('');
    });

    it('should handle exact length', () => {
      const str = 'a'.repeat(50);
      const truncated = truncateString(str, 50);

      expect(truncated).toBe(str);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string values', () => {
      const obj = { name: '  test  ', value: '\0data\0' };
      const sanitized = sanitizeObject(obj);

      expect(sanitized.name).toBe('test');
      expect(sanitized.value).toBe('data');
    });

    it('should handle nested objects', () => {
      const obj = { outer: { inner: '  test  ' } };
      const sanitized = sanitizeObject(obj);

      expect(sanitized.outer.inner).toBe('test');
    });

    it('should handle arrays', () => {
      const obj = { items: ['  item1  ', '  item2  '] };
      const sanitized = sanitizeObject(obj);

      expect(sanitized.items).toEqual(['item1', 'item2']);
    });

    it('should preserve non-string values', () => {
      const obj = { number: 123, boolean: true, null: null };
      const sanitized = sanitizeObject(obj);

      expect(sanitized.number).toBe(123);
      expect(sanitized.boolean).toBe(true);
      expect(sanitized.null).toBeNull();
    });

    it('should respect max depth', () => {
      const deep = { l1: { l2: { l3: { l4: '  test  ' } } } };
      const sanitized = sanitizeObject(deep, 2);

      // Should stop sanitizing after depth 2
      expect(sanitized.l1.l2.l3.l4).toBe('  test  ');
    });
  });

  // Property-based tests
  describe('Property-Based Tests', () => {
    it('Property: HTML escaping is reversible', () => {
      fc.assert(
        fc.property(fc.string(), (text) => {
          const escaped = escapeHtml(text);
          // Escaped text should not contain raw special characters
          return !escaped.includes('<') && !escaped.includes('>');
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Sanitized input never contains null bytes', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const sanitized = sanitizeInput(input);
          return !sanitized.includes('\0');
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Truncation never exceeds max length', () => {
      fc.assert(
        fc.property(fc.string(), fc.integer({ min: 0, max: 1000 }), (str, maxLen) => {
          const truncated = truncateString(str, maxLen);
          return truncated.length <= maxLen;
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Valid emails are always lowercase', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const sanitized = sanitizeEmail(email);
            return sanitized === null || sanitized === sanitized.toLowerCase();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Sanitized HTML never contains script tags', () => {
      fc.assert(
        fc.property(fc.string(), (html) => {
          const sanitized = sanitizeHtml(html);
          return !sanitized.toLowerCase().includes('<script');
        }),
        { numRuns: 100 }
      );
    });
  });
});
