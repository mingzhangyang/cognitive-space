const renderInlineMarkdown = (text: string): string => {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
};

export const renderSimpleMarkdown = (text: string): string => {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^### /.test(trimmed)) return `<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`;
      if (/^## /.test(trimmed)) return `<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`;
      if (/^# /.test(trimmed)) return `<h1>${renderInlineMarkdown(trimmed.slice(2))}</h1>`;
      if (/^[-*] /.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .map((line) => `<li>${renderInlineMarkdown(line.replace(/^[-*] /, ''))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      if (/^\d+\. /.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .map((line) => `<li>${renderInlineMarkdown(line.replace(/^\d+\. /, ''))}</li>`)
          .join('');
        return `<ol>${items}</ol>`;
      }
      return `<p>${renderInlineMarkdown(trimmed.replace(/\n/g, '<br/>'))}</p>`;
    })
    .join('');
};
