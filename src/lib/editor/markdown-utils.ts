/**
 * Markdown Utilities
 * CMS Phase 5: Rich Text Editor
 *
 * HTML to Markdown and Markdown to HTML conversion utilities
 */

/**
 * Convert HTML to Markdown
 * Simple conversion for common HTML elements
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return ''

  let markdown = html
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Paragraphs
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    // Headers
    .replace(/<h1[^>]*>/gi, '# ')
    .replace(/<\/h1>/gi, '\n\n')
    .replace(/<h2[^>]*>/gi, '## ')
    .replace(/<\/h2>/gi, '\n\n')
    .replace(/<h3[^>]*>/gi, '### ')
    .replace(/<\/h3>/gi, '\n\n')
    .replace(/<h4[^>]*>/gi, '#### ')
    .replace(/<\/h4>/gi, '\n\n')
    .replace(/<h5[^>]*>/gi, '##### ')
    .replace(/<\/h5>/gi, '\n\n')
    .replace(/<h6[^>]*>/gi, '###### ')
    .replace(/<\/h6>/gi, '\n\n')
    // Bold
    .replace(/<strong[^>]*>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<b[^>]*>/gi, '**')
    .replace(/<\/b>/gi, '**')
    // Italic
    .replace(/<em[^>]*>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<i[^>]*>/gi, '*')
    .replace(/<\/i>/gi, '*')
    // Strikethrough
    .replace(/<del[^>]*>/gi, '~~')
    .replace(/<\/del>/gi, '~~')
    .replace(/<s[^>]*>/gi, '~~')
    .replace(/<\/s>/gi, '~~')
    // Inline code
    .replace(/<code[^>]*>/gi, '`')
    .replace(/<\/code>/gi, '`')
    // Blockquote
    .replace(/<blockquote[^>]*>/gi, '> ')
    .replace(/<\/blockquote>/gi, '\n\n')
    // Horizontal rule
    .replace(/<hr\s*\/?>/gi, '\n---\n')

  // Links: <a href="url">text</a> -> [text](url)
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)')

  // Images: <img src="url" alt="alt" /> -> ![alt](url)
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
  markdown = markdown.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)')
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')

  // Unordered lists
  markdown = markdown.replace(/<ul[^>]*>/gi, '')
  markdown = markdown.replace(/<\/ul>/gi, '\n')
  markdown = markdown.replace(/<li[^>]*>/gi, '- ')
  markdown = markdown.replace(/<\/li>/gi, '\n')

  // Ordered lists (basic)
  markdown = markdown.replace(/<ol[^>]*>/gi, '')
  markdown = markdown.replace(/<\/ol>/gi, '\n')

  // Code blocks: <pre><code class="language-xxx">...</code></pre>
  markdown = markdown.replace(
    /<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    '\n```$1\n$2\n```\n'
  )
  markdown = markdown.replace(
    /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    '\n```\n$1\n```\n'
  )

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  markdown = decodeHtmlEntities(markdown)

  // Clean up whitespace
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return markdown
}

/**
 * Convert Markdown to HTML
 * Simple conversion for common Markdown elements
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '<p></p>'

  let html = markdown

  // Escape HTML characters first (except for what we're about to convert)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks (do this first to prevent other conversions inside code)
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const language = lang || 'plaintext'
      const escapedCode = code.trim()
      return `<pre><code class="language-${language}">${escapedCode}</code></pre>`
    }
  )

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headers
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold (handle ** first, then __)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')

  // Italic (handle * and _)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>')

  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />')
  html = html.replace(/^\*\*\*$/gm, '<hr />')
  html = html.replace(/^___$/gm, '<hr />')

  // Unordered lists (basic)
  html = html.replace(/^[-*+] (.+)$/gm, '<li>$1</li>')

  // Ordered lists (basic)
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Wrap consecutive <li> tags in <ul>
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ul>$&</ul>')

  // Paragraphs (wrap lines that aren't already in tags)
  const lines = html.split('\n')
  const processedLines = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('<h') || trimmed.startsWith('<p') ||
        trimmed.startsWith('<ul') || trimmed.startsWith('<ol') ||
        trimmed.startsWith('<li') || trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<pre') || trimmed.startsWith('<hr') ||
        trimmed.startsWith('</')) {
      return trimmed
    }
    return `<p>${trimmed}</p>`
  })

  html = processedLines.filter(Boolean).join('\n')

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '')

  // If result is empty, return empty paragraph
  if (!html.trim()) {
    return '<p></p>'
  }

  return html
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&mdash;': '\u2014',
    '&ndash;': '\u2013',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&hellip;': '...',
  }

  return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity)
}

/**
 * Encode HTML entities for safety
 */
export function encodeHtmlEntities(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Strip all HTML tags from content
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

/**
 * Get plain text content (strip HTML and decode entities)
 */
export function getPlainText(html: string): string {
  const stripped = stripHtml(html)
  return decodeHtmlEntities(stripped)
}

/**
 * Count words in HTML content
 */
export function countWords(html: string): number {
  const text = getPlainText(html)
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Count characters in HTML content (excluding spaces)
 */
export function countCharacters(html: string, excludeSpaces = false): number {
  const text = getPlainText(html)
  if (!text) return 0
  if (excludeSpaces) {
    return text.replace(/\s/g, '').length
  }
  return text.length
}

/**
 * Truncate HTML content to specified length
 */
export function truncateHtml(html: string, maxLength: number, suffix = '...'): string {
  const text = getPlainText(html)
  if (text.length <= maxLength) return html
  const truncated = text.slice(0, maxLength - suffix.length) + suffix
  return `<p>${encodeHtmlEntities(truncated)}</p>`
}
