/**
 * Tests for browser compatibility utilities
 * Requirements: 21.3 - Cross-browser compatibility
 */

import { describe, it, expect } from 'vitest';
import {
  detectBrowser,
  checkBrowserFeatures,
  getDevicePixelRatio,
  isTouchDevice,
  isMobileDevice,
  getViewportSize,
  supportsSmoothScroll,
  ensureRequestAnimationFrame,
  getBrowserCompatibilityReport,
} from './browserCompatibility';

describe('Browser Compatibility Utilities', () => {
  describe('detectBrowser', () => {
    it('should detect browser information', () => {
      const browser = detectBrowser();
      
      expect(browser).toHaveProperty('name');
      expect(browser).toHaveProperty('version');
      expect(browser).toHaveProperty('isSupported');
      expect(browser).toHaveProperty('warnings');
      expect(Array.isArray(browser.warnings)).toBe(true);
    });

    it('should return valid browser name', () => {
      const browser = detectBrowser();
      const validBrowsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Unknown'];
      
      expect(validBrowsers).toContain(browser.name);
    });
  });

  describe('checkBrowserFeatures', () => {
    it('should check for required features', () => {
      const features = checkBrowserFeatures();
      
      expect(features).toHaveProperty('supported');
      expect(features).toHaveProperty('missing');
      expect(Array.isArray(features.missing)).toBe(true);
      expect(typeof features.supported).toBe('boolean');
    });

    it('should detect Canvas API support', () => {
      const features = checkBrowserFeatures();
      
      // In test environment, Canvas should be supported
      expect(features.missing).not.toContain('Canvas API');
    });

    it('should detect LocalStorage support', () => {
      const features = checkBrowserFeatures();
      
      // LocalStorage should be available in test environment
      expect(features.missing).not.toContain('LocalStorage');
    });

    it('should detect requestAnimationFrame support', () => {
      const features = checkBrowserFeatures();
      
      // requestAnimationFrame should be available
      expect(features.missing).not.toContain('requestAnimationFrame');
    });
  });

  describe('getDevicePixelRatio', () => {
    it('should return a positive number', () => {
      const ratio = getDevicePixelRatio();
      
      expect(typeof ratio).toBe('number');
      expect(ratio).toBeGreaterThan(0);
    });

    it('should return at least 1', () => {
      const ratio = getDevicePixelRatio();
      
      expect(ratio).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isTouchDevice', () => {
    it('should return a boolean', () => {
      const isTouch = isTouchDevice();
      
      expect(typeof isTouch).toBe('boolean');
    });
  });

  describe('isMobileDevice', () => {
    it('should return a boolean', () => {
      const isMobile = isMobileDevice();
      
      expect(typeof isMobile).toBe('boolean');
    });

    it('should detect mobile user agents', () => {
      const originalUA = navigator.userAgent;
      
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
      
      const isMobile = isMobileDevice();
      expect(isMobile).toBe(true);
      
      // Restore original
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUA,
        configurable: true,
      });
    });
  });

  describe('getViewportSize', () => {
    it('should return viewport dimensions', () => {
      const viewport = getViewportSize();
      
      expect(viewport).toHaveProperty('width');
      expect(viewport).toHaveProperty('height');
      expect(typeof viewport.width).toBe('number');
      expect(typeof viewport.height).toBe('number');
    });

    it('should return positive dimensions', () => {
      const viewport = getViewportSize();
      
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.height).toBeGreaterThan(0);
    });
  });

  describe('supportsSmoothScroll', () => {
    it('should return a boolean', () => {
      const supports = supportsSmoothScroll();
      
      expect(typeof supports).toBe('boolean');
    });
  });

  describe('ensureRequestAnimationFrame', () => {
    it('should ensure requestAnimationFrame exists', () => {
      ensureRequestAnimationFrame();
      
      expect(typeof window.requestAnimationFrame).toBe('function');
      expect(typeof window.cancelAnimationFrame).toBe('function');
    });

    it('should not override existing requestAnimationFrame', () => {
      const original = window.requestAnimationFrame;
      
      ensureRequestAnimationFrame();
      
      expect(window.requestAnimationFrame).toBe(original);
    });
  });

  describe('getBrowserCompatibilityReport', () => {
    it('should return complete compatibility report', () => {
      const report = getBrowserCompatibilityReport();
      
      expect(report).toHaveProperty('browser');
      expect(report).toHaveProperty('features');
      expect(report).toHaveProperty('device');
      expect(report).toHaveProperty('recommendations');
    });

    it('should include browser information', () => {
      const report = getBrowserCompatibilityReport();
      
      expect(report.browser).toHaveProperty('name');
      expect(report.browser).toHaveProperty('version');
      expect(report.browser).toHaveProperty('isSupported');
      expect(report.browser).toHaveProperty('warnings');
    });

    it('should include feature checks', () => {
      const report = getBrowserCompatibilityReport();
      
      expect(report.features).toHaveProperty('supported');
      expect(report.features).toHaveProperty('missing');
    });

    it('should include device information', () => {
      const report = getBrowserCompatibilityReport();
      
      expect(report.device).toHaveProperty('isTouch');
      expect(report.device).toHaveProperty('isMobile');
      expect(report.device).toHaveProperty('pixelRatio');
      expect(report.device).toHaveProperty('viewport');
    });

    it('should include recommendations array', () => {
      const report = getBrowserCompatibilityReport();
      
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should provide recommendations for unsupported browsers', () => {
      const report = getBrowserCompatibilityReport();
      
      if (!report.browser.isSupported) {
        expect(report.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should provide recommendations for missing features', () => {
      const report = getBrowserCompatibilityReport();
      
      if (!report.features.supported) {
        expect(report.recommendations.length).toBeGreaterThan(0);
        expect(report.recommendations.some(r => r.includes('missing required features'))).toBe(true);
      }
    });
  });
});
