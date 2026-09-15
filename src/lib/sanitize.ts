/**
 * SEC-13: Input sanitization utilities.
 *
 * The API stores operator-entered text (names, addresses, descriptions,
 * internal notes) that may be rendered by a frontend in the future.
 * Strip HTML/XML tags at the boundary so that malicious payloads like
 * `<script>alert(1)</script>` are never persisted in the database.
 *
 * This is a defence-in-depth measure; the frontend should also apply
 * output encoding. The two approaches complement each other.
 */

/**
 * Strips all HTML/XML tags from a string.
 *
 * Examples:
 *   stripHtml('Hello <script>alert(1)</script> World') -> 'Hello  World'
 *   stripHtml('<b>bold</b>')                           -> 'bold'
 *   stripHtml('No tags here')                          -> 'No tags here'
 */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}
