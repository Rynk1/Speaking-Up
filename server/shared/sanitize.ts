import sanitizeHtml from 'sanitize-html';

/**
 * Strips dangerous HTML tags and scripts from text inputs
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return sanitizeHtml(text, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    allowedAttributes: {
      'a': ['href', 'title', 'target', 'rel']
    },
    transformTags: {
      'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
    }
  }).trim();
}

/**
 * Strictly converts input to plain text without any HTML tags
 */
export function sanitizePlainText(text: string): string {
  if (!text) return '';
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();
}
