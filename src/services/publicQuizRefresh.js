import { parseRoute } from '../utils/navigation.js';
export function publicQuizRefreshUrl(href, query, stamp = Date.now()) {
  const url = new URL(href);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported app URL');
  const route = parseRoute(url.hash);
  if (route.page !== 'library') throw new Error('Refresh requires Quiz Bank');
  const params = new URLSearchParams(route.params);
  if (query) params.set('search', query);
  else params.delete('search');
  url.hash = '/library' + (params.size ? '?' + params.toString() : '');
  url.searchParams.set('quizmos-refresh', String(stamp));
  return url.href;
}
export async function probePublicQuizRefresh(url, { fetcher = fetch, signal } = {}) {
  if (signal?.aborted) throw new DOMException('Refresh cancelled', 'AbortError');
  const response = await fetcher(url, { cache: 'no-store', credentials: 'same-origin', signal });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html'))
    throw new Error('Refresh document unavailable');
  if (response.url && new URL(response.url).origin !== new URL(url).origin)
    throw new Error('Unexpected refresh origin');
  const body = await response.text();
  if (!/id=["']app["']/.test(body)) throw new Error('Invalid app document');
  if (signal?.aborted) throw new DOMException('Refresh cancelled', 'AbortError');
  return url;
}
