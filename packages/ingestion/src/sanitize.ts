/**
 * Nettoyage du HTML fourni par les flux avant stockage/rendu.
 * Aucun contenu de flux externe n'est jamais persisté ou affiché sans passer par ici.
 */

import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'b', 'strong', 'i', 'em', 'a', 'ul', 'ol', 'li', 'br', 'blockquote'];

export function sanitizeArticleHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'rel', 'target'] },
    disallowedTagsMode: 'discard',
  }).trim();
  return clean.length > 0 ? clean : null;
}

/** Version texte brut (pour description, wordCount, reading time). */
export function stripHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
  return text.length > 0 ? text : null;
}
