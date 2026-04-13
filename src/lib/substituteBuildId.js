// Replaces the __WLC_BUILD_ID__ placeholder in a template string with the
// current build's git SHA (or "dev" in development). Shared between the
// Vite build plugin and the dev middleware so both paths agree on the
// placeholder token and substitution rules.
//
// Why this exists: service workers are only considered "updated" by the
// browser when the bytes of sw.js change. Our sw.js was previously a
// static file, so every deploy shipped byte-identical content and the
// browser never fired `updatefound`. Baking the build SHA into the file
// makes each deploy's sw.js genuinely different, which lets the update
// detection flow (→ UpdateToast → user taps Refresh) actually work.

export const BUILD_ID_PLACEHOLDER = '__WLC_BUILD_ID__'

export function substituteBuildId(template, buildId) {
  if (template == null) return ''
  const id = buildId && buildId.length > 0 ? buildId : 'dev'
  return template.split(BUILD_ID_PLACEHOLDER).join(id)
}
