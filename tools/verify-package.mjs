// Validate the exact artifact that will be uploaded to Partner Center:
// manifest parsing, referenced-file existence, locale key parity, PNG headers.
//
// The zip is unpacked by the caller (tools/build-package.cmd + a PowerShell
// extract step) because the file sandbox forbids spawning piped child
// processes; this script only reads the extracted directory.
import { readFileSync } from 'node:fs'

const tmp = process.argv[2]

const problems = []
const ok = (msg) => console.log('OK   ' + msg)

const manifest = JSON.parse(readFileSync(`${tmp}/manifest.json`, 'utf8'))
ok(`manifest.json parses (name=${manifest.name}, version=${manifest.version}, default_locale=${manifest.default_locale})`)

if (!manifest.name.startsWith('__MSG_') || !manifest.description.startsWith('__MSG_')) {
  problems.push('manifest name/description must use __MSG_ placeholders for locale detection')
}
if (!manifest.default_locale) problems.push('default_locale missing')

// every file the manifest points at must exist
const refs = [
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  manifest.options_page,
  manifest.action?.default_title ? null : null,
  ...Object.values(manifest.icons ?? {}),
].filter(Boolean)
for (const ref of refs) {
  try {
    readFileSync(`${tmp}/${ref}`)
    ok(`referenced file exists: ${ref}`)
  } catch {
    problems.push(`referenced file MISSING: ${ref}`)
  }
}

// icons must be real PNGs
for (const ref of Object.values(manifest.icons ?? {})) {
  const head = readFileSync(`${tmp}/${ref}`).subarray(0, 8)
  const isPng = head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (!isPng) problems.push(`not a PNG: ${ref}`)
}
ok('icon files carry PNG signatures')

// locale key parity
const locales = manifest.default_locale
const readLocale = (name) => JSON.parse(readFileSync(`${tmp}/_locales/${name}/messages.json`, 'utf8'))
const base = readLocale(locales)
const other = readLocale('zh_CN')
const baseKeys = Object.keys(base).sort()
const otherKeys = Object.keys(other).sort()
ok(`default locale (${locales}) has ${baseKeys.length} keys`)
if (baseKeys.join() !== otherKeys.join()) {
  const missing = baseKeys.filter((k) => !otherKeys.includes(k))
  const extra = otherKeys.filter((k) => !baseKeys.includes(k))
  problems.push(`locale key mismatch: missing in zh_CN=[${missing}] extra=[${extra}]`)
} else {
  ok('locale keys match across en / zh_CN')
}

// every t('key') used in the page scripts must exist in the default locale
for (const file of ['sidepanel.js', 'options.js']) {
  const code = readFileSync(`${tmp}/${file}`, 'utf8')
  const used = [...code.matchAll(/\bt\('([A-Za-z0-9_]+)'/g)].map((m) => m[1])
  const unknown = [...new Set(used)].filter((k) => !(k in base))
  if (unknown.length) problems.push(`${file} uses unknown i18n keys: ${unknown.join(', ')}`)
  else ok(`${file} i18n keys all exist`)
}

// data-i18n attributes in HTML must exist too
for (const file of ['sidepanel.html', 'options.html']) {
  const html = readFileSync(`${tmp}/${file}`, 'utf8')
  const used = [...html.matchAll(/data-i18n(?:-placeholder|-title)?="([A-Za-z0-9_]+)"/g)].map((m) => m[1])
  const unknown = [...new Set(used)].filter((k) => !(k in base))
  if (unknown.length) problems.push(`${file} uses unknown i18n keys: ${unknown.join(', ')}`)
  else ok(`${file} data-i18n keys all exist`)
}

console.log('\n' + (problems.length ? 'PROBLEMS:\n- ' + problems.join('\n- ') : 'ALL CHECKS PASSED'))
process.exit(problems.length ? 1 : 0)
