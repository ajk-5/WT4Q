export function truncateWords(text = '', count = 50): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= count) {
    return text.trim();
  }
  return words.slice(0, count).join(' ') + '...';
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
