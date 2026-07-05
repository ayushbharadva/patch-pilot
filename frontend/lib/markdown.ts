/**
 * Cognee's LLM answers come back as raw markdown (headings, bold, lists,
 * links, code spans). The UI renders these as plain sans-serif text, not a
 * markdown document, so leftover syntax like `#`/`**`/`` ` `` shows up as
 * literal symbols. This resolves markdown to plain readable text instead of
 * rendering or stripping to nothing -- headings/emphasis keep their content,
 * just without the markup characters.
 */
export function resolveMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/```(\w*\n)?/g, '').trim(),
    )
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
