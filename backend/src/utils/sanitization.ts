/**
 * Input sanitization utilities
 * Requirements: 11.4
 */

import { URL } from 'url';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes script tags, event handlers, and dangerous attributes
 * 
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let sanitized = html;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object and embed tags
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');

  // Remove form tags (to prevent form injection)
  sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');

  // Remove style tags (can be used for CSS injection)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove link tags (can load external resources)
  sanitized = sanitized.replace(/<link\b[^<]*>/gi, '');

  // Remove meta tags
  sanitized = sanitized.replace(/<meta\b[^<]*>/gi, '');

  return sanitized;
}

/**
 * Escape HTML special characters
 * Converts <, >, &, ", ' to their HTML entity equivalents
 * 
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  if (!text) return '';

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Sanitize email content for safe display
 * Removes potentially dangerous content while preserving formatting
 * 
 * @param content - Email content (HTML or plain text)
 * @param isHtml - Whether the content is HTML
 * @returns Sanitized content
 */
export function sanitizeEmailContent(content: string, isHtml: boolean = false): string {
  if (!content) return '';

  if (isHtml) {
    // For HTML content, sanitize but preserve safe formatting
    return sanitizeHtml(content);
  } else {
    // For plain text, just escape HTML characters
    return escapeHtml(content);
  }
}

/**
 * Sanitize user input for database queries
 * Removes null bytes and control characters
 * 
 * @param input - User input string
 * @returns Sanitized input
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove other control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate and sanitize email address
 * 
 * @param email - Email address to validate
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const sanitized = sanitizeInput(email.toLowerCase());

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize URL
 * Only allows http and https protocols
 * 
 * @param url - URL to validate
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch (error) {
    return null;
  }
}

/**
 * Sanitize feature ID
 * Ensures it only contains alphanumeric characters, hyphens, and underscores
 * 
 * @param id - Feature ID to sanitize
 * @returns Sanitized ID or null if invalid
 */
export function sanitizeFeatureId(id: string): string | null {
  if (!id) return null;

  const sanitized = sanitizeInput(id);

  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize JSON input
 * Validates and parses JSON, returns null if invalid
 * 
 * @param jsonString - JSON string to sanitize
 * @returns Parsed JSON object or null if invalid
 */
export function sanitizeJson(jsonString: string): any | null {
  if (!jsonString) return null;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return null;
  }
}

/**
 * Sanitize SQL LIKE pattern
 * Escapes special characters used in SQL LIKE patterns
 * 
 * @param pattern - Pattern to sanitize
 * @returns Sanitized pattern
 */
export function sanitizeLikePattern(pattern: string): string {
  if (!pattern) return '';

  // Escape special LIKE characters
  return pattern
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Truncate string to maximum length
 * Useful for preventing buffer overflow attacks
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;

  return str.substring(0, maxLength);
}

/**
 * Sanitize object by applying sanitization to all string values
 * Recursively sanitizes nested objects and arrays
 * 
 * @param obj - Object to sanitize
 * @param maxDepth - Maximum recursion depth
 * @returns Sanitized object
 */
export function sanitizeObject(obj: any, maxDepth: number = 10): any {
  if (maxDepth <= 0) return obj;

  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, maxDepth - 1));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], maxDepth - 1);
      }
    }
    return sanitized;
  }

  return obj;
}
