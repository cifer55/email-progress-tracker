/**
 * Browser Compatibility Utilities
 * Detects browser capabilities and provides fallbacks
 * Requirements: 21.3 - Cross-browser compatibility
 */

export interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
  warnings: string[];
}

/**
 * Detect the current browser
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  const warnings: string[] = [];
  
  // Detect browser name and version
  let name = 'Unknown';
  let version = 'Unknown';
  let isSupported = true;
  
  if (ua.includes('Chrome') && !ua.includes('Edge')) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.includes('Firefox')) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.includes('Edg')) {
    name = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else {
    isSupported = false;
    warnings.push('Browser not officially supported. Please use Chrome, Firefox, Safari, or Edge.');
  }
  
  return { name, version, isSupported, warnings };
}

/**
 * Check if required browser features are available
 */
export function checkBrowserFeatures(): {
  supported: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  // Check Canvas API
  if (!document.createElement('canvas').getContext) {
    missing.push('Canvas API');
  }
  
  // Check LocalStorage
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
  } catch (e) {
    missing.push('LocalStorage');
  }
  
  // Check requestAnimationFrame
  if (!window.requestAnimationFrame) {
    missing.push('requestAnimationFrame');
  }
  
  // Check Date API
  if (!Date.now) {
    missing.push('Date.now()');
  }
  
  // Check Array methods
  if (!Array.prototype.find || !Array.prototype.filter || !Array.prototype.map) {
    missing.push('Modern Array methods');
  }
  
  return {
    supported: missing.length === 0,
    missing,
  };
}

/**
 * Get device pixel ratio for high-DPI displays
 */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}

/**
 * Check if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get viewport dimensions
 */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    ),
    height: Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    ),
  };
}

/**
 * Check if browser supports smooth scrolling
 */
export function supportsSmoothScroll(): boolean {
  return 'scrollBehavior' in document.documentElement.style;
}

/**
 * Polyfill for requestAnimationFrame (for older browsers)
 */
export function ensureRequestAnimationFrame(): void {
  if (!window.requestAnimationFrame) {
    (window as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
      return window.setTimeout(callback, 1000 / 60);
    };
  }
  
  if (!window.cancelAnimationFrame) {
    (window as any).cancelAnimationFrame = (id: number) => {
      clearTimeout(id);
    };
  }
}

/**
 * Get browser compatibility report
 */
export function getBrowserCompatibilityReport(): {
  browser: BrowserInfo;
  features: ReturnType<typeof checkBrowserFeatures>;
  device: {
    isTouch: boolean;
    isMobile: boolean;
    pixelRatio: number;
    viewport: ReturnType<typeof getViewportSize>;
  };
  recommendations: string[];
} {
  const browser = detectBrowser();
  const features = checkBrowserFeatures();
  const recommendations: string[] = [];
  
  // Add recommendations based on browser and features
  if (!browser.isSupported) {
    recommendations.push('Consider upgrading to a modern browser for the best experience.');
  }
  
  if (!features.supported) {
    recommendations.push(
      `Your browser is missing required features: ${features.missing.join(', ')}`
    );
  }
  
  if (isMobileDevice() && getViewportSize().width < 768) {
    recommendations.push('Using mobile layout. Some features may be optimized for larger screens.');
  }
  
  const pixelRatio = getDevicePixelRatio();
  if (pixelRatio > 1) {
    recommendations.push(`High-DPI display detected (${pixelRatio}x). Canvas will be scaled for clarity.`);
  }
  
  return {
    browser,
    features,
    device: {
      isTouch: isTouchDevice(),
      isMobile: isMobileDevice(),
      pixelRatio,
      viewport: getViewportSize(),
    },
    recommendations,
  };
}
