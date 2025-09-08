import DOMPurify from 'dompurify';

/**
 * Security utility for sanitizing HTML content to prevent XSS attacks
 */
export const sanitizer = {
  /**
   * Sanitizes HTML content for safe rendering
   * @param dirty Potentially unsafe HTML string
   * @returns Safe HTML string
   */
  sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'span', 'div', 'p'],
      ALLOWED_ATTR: ['href', 'title', 'class'],
      ALLOW_DATA_ATTR: false,
    });
  },

  /**
   * Sanitizes CSS for safe injection
   * @param css CSS string to sanitize
   * @returns Safe CSS string
   */
  sanitizeCss(css: string): string {
    // Remove any potential script injections or dangerous properties
    return css
      .replace(/javascript:/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/import\s/gi, '')
      .replace(/@import/gi, '')
      .replace(/url\s*\(/gi, '');
  },

  /**
   * Strips all HTML tags from a string
   * @param html HTML string to strip
   * @returns Plain text string
   */
  stripHtml(html: string): string {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  },
};