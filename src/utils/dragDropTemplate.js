// GitHub Actions expressions are source code, not answer-slot placeholders.
export function dragDropTemplateParts(template) {
  const parts = [];
  let previous = 0;
  for (const match of template.matchAll(/(?<!\$)\{\{([^{}]+)\}\}/g)) {
    if (match.index > previous) parts.push({ text: template.slice(previous, match.index) });
    parts.push({ slotId: match[1] });
    previous = match.index + match[0].length;
  }
  if (previous < template.length) parts.push({ text: template.slice(previous) });
  return parts;
}
