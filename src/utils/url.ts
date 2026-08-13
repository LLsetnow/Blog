/**
 * Return `url` only if it is safe to bind to an `href`, otherwise `undefined`.
 *
 * Vue does not filter `href` bindings, so a `javascript:` or `data:` URL coming
 * from an external feed would execute on click. News items are aggregated from
 * third-party sources and Bilibili favourites come from their API, so neither
 * is fully under our control.
 *
 * Returning `undefined` (rather than `''`) makes Vue drop the attribute
 * entirely, leaving a non-clickable element instead of a link back to the
 * current page.
 *
 * Relative URLs are resolved against a sentinel base purely so they parse; the
 * original string is always what gets returned.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const { protocol } = new URL(url, 'https://blog.invalid')
    return protocol === 'https:' || protocol === 'http:' ? url : undefined
  } catch {
    return undefined
  }
}
