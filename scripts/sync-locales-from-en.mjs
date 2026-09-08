import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesDir = join(__dirname, '../src/locales')
const baseLocale = 'en-GB'
const targets = ['es-ES', 'de-AT']

async function listNamespaces(locale) {
  const dir = join(localesDir, locale)
  const files = await readdir(dir)
  return files.filter((f) => f.endsWith('.json'))
}

for (const file of await listNamespaces(baseLocale)) {
  const basePath = join(localesDir, baseLocale, file)
  const base = await readFile(basePath, 'utf8')
  for (const locale of targets) {
    const targetPath = join(localesDir, locale, file)
    await writeFile(targetPath, base, 'utf8')
  }
}

console.log(`Synced ${targets.join(', ')} from ${baseLocale}`)
