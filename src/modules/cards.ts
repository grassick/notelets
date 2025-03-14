import type { Card, RichTextCard, FileCard, ImageCard } from '../types'

/**
 * Gets a display title for any card type
 * @param card The card to get the title for
 * @param maxLength Maximum length of the generated title (default: 60)
 * @returns A string to use as the card's display title
 */
export function getCardTitle(card: Card, maxLength: number = 60): string {
  // Use explicit title if available
  if (card.title) return card.title

  // Generate title based on card type and content
  switch (card.type) {
    case 'richtext': {
      const firstLine = card.content.markdown
        .split('\n')[0] // Get first line
        .replace(/^[#*]+\s*/, '') // Remove leading hashes and asterisks
        .replace(/[*]+$/, '') // Remove trailing asterisks and spaces
        .trim() // Remove extra spaces

      if (!firstLine) return 'Untitled Note'
      return firstLine.slice(0, maxLength) + (firstLine.length > maxLength ? '...' : '')
    }

    case 'file':
      return card.content.filename || 'Untitled File'

    case 'image':
      return card.content.alt || 'Untitled Image'

    default:
      return 'Untitled Card'
  }
} 

/**
 * Gets the searchable content of a card
 * @param card The card to get the content for
 * @returns The searchable content of the card
 */
export function getCardSearchableContent(card: Card): string {
  switch (card.type) {
    case 'richtext':
      return card.content.markdown
    case 'file':
      return card.content.filename
  }

  return ""
}