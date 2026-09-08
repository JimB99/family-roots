#!/usr/bin/env node
/**
 * Sync es-ES and de-AT locale files from en-GB structure.
 * Applies machine-quality translations for all namespaces.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = path.join(root, 'src/locales')

function walk(obj, fn, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) walk(value, fn, p)
    else fn(p, value)
  }
}

function setPath(obj, dotPath, value) {
  const parts = dotPath.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] ?? {}
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = value
}

// Load translation tables from JSON sidecars if present
const esTable = JSON.parse(
  fs.readFileSync(path.join(localesDir, '_es-table.json'), 'utf8').catch?.() ??
    fs.readFileSync(path.join(localesDir, '_es-table.json'), 'utf8'),
)

const deTable = JSON.parse(fs.readFileSync(path.join(localesDir, '_de-table.json'), 'utf8'))

for (const [lang, table] of [['es-ES', esTable], ['de-AT', deTable]]) {
  for (const ns of fs.readdirSync(path.join(localesDir, 'en-GB')).filter((f) => f.endsWith('.json'))) {
    const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en-GB', ns), 'utf8'))
    const out = JSON.parse(JSON.stringify(en))
    const nsTable = table[ns.replace('.json', '')] ?? {}
    walk(en, (key, enVal) => {
      if (nsTable[key] !== undefined) setPath(out, key, nsTable[key])
    })
    fs.writeFileSync(path.join(localesDir, lang, ns), JSON.stringify(out, null, 2) + '\n')
  }
}
console.log('Synced locales from translation tables')
