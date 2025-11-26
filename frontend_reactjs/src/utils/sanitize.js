/**
 * PUBLIC_INTERFACE
 * sanitizeHtml
 * Very basic sanitize: strips script tags and on* attributes.
 * Note: For production, consider a robust sanitizer like DOMPurify.
 */
export function sanitizeHtml(html) {
  if (!html) return '';
  let safe = String(html);
  // remove script tags
  safe = safe.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  // remove on* attributes
  safe = safe.replace(/\s(on\w+)=["'][\s\S]*?["']/gi, '');
  return safe;
}
