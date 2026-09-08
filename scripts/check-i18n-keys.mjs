import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesDir = join(__dirname, '../src/locales')
const baseLocale = 'en-GB'
const otherLocales = ['es-ES', 'de-AT']

function collectKeys(obj, prefix = '') {
  const keys = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectKeys(value, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

async function loadNamespace(locale, namespace) {
  const file = join(localesDir, locale, `${namespace}.json`)
  const raw = await readFile(file, 'utf8')
  return JSON.parse(raw)
}

async function listNamespaces(locale) {
  const dir = join(localesDir, locale)
  const files = await readdir(dir)
  return files.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
}

let failed = false

const namespaces = await listNamespaces(baseLocale)

for (const ns of namespaces) {
  const base = await loadNamespace(baseLocale, ns)
  const baseKeys = collectKeys(base).sort()

  for (const locale of otherLocales) {
    let target
    try {
      target = await loadNamespace(locale, ns)
    } catch {
      console.error(`Missing namespace ${locale}/${ns}.json`)
      failed = true
      continue
    }

    const targetKeys = new Set(collectKeys(target))
    const missing = baseKeys.filter((key) => !targetKeys.has(key))
    const extra = [...targetKeys].filter((key) => !baseKeys.includes(key))

    if (missing.length > 0) {
      failed = true
      console.error(`\n${locale}/${ns}.json missing ${missing.length} key(s):`)
      for (const key of missing) console.error(`  - ${key}`)
    }

    if (extra.length > 0) {
      failed = true
      console.error(`\n${locale}/${ns}.json has ${extra.length} extra key(s):`)
      for (const key of extra) console.error(`  + ${key}`)
    }
  }
}

if (failed) {
  console.error('\ni18n key check failed.')
  process.exit(1)
}

console.log(`i18n keys OK (${namespaces.length} namespaces, ${otherLocales.join(', ')})`)
