import { UUID_PATTERN } from './secureId.js';

export const CERTIFICATION_LINK_SLOTS = Array.from(
  { length: 6 },
  (_, index) => 'slot-' + (index + 1)
);
export const CERTIFICATION_LINK_MAX = 2048;
export const CERTIFICATION_LINK_PAGE_SIZE = 20;

const hostnamePattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

export function certificationLinkUrl(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (
    !/^https:\/\/[^/?#@\\\s]/i.test(value) ||
    value.length > CERTIFICATION_LINK_MAX ||
    /[\s\\]/.test(value) ||
    Array.from(value).some((character) => {
      const code = character.codePointAt(0);
      return code < 32 || code === 127;
    })
  )
    return null;
  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.port ||
      /^https:\/\/[^/?#]*@/i.test(value) ||
      !hostnamePattern.test(url.hostname) ||
      url.href.length > CERTIFICATION_LINK_MAX
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function certificationLinkError(code) {
  return Object.assign(new Error(code), { certificationLinkCode: code });
}

export function certificationLinkEdit(current, command) {
  const { slot, id, revision } = command;
  const url = certificationLinkUrl(command.url);
  if (!url) throw certificationLinkError('url');
  if (
    !CERTIFICATION_LINK_SLOTS.includes(slot) ||
    typeof id !== 'string' ||
    !id.startsWith(slot + '_') ||
    !UUID_PATTERN.test(id.slice(slot.length + 1)) ||
    !Number.isSafeInteger(revision) ||
    revision < 0
  )
    throw certificationLinkError('invalid');
  if (current?.id === id && current.revision === revision + 1 && current.url === url) return null;
  if (
    (current?.revision || 0) !== revision ||
    (current && (current.url ? current.id !== id : current.id === id))
  )
    throw certificationLinkError('conflict');
  return { id, url, revision: revision + 1 };
}

export function certificationLinkRemoval(current, { id, revision }) {
  if (current?.id === id && current.url === null && current.revision === revision + 1) return null;
  if (!current?.url || current.id !== id || current.revision !== revision)
    throw certificationLinkError('conflict');
  return { id, url: null, revision: revision + 1 };
}
