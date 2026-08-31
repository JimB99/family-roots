/**
 * One-time bulk confirm for imported relationship links.
 * Usage: npm run confirm:relationships -- --slug=aguilar
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { confirmAllRelationships, getFamilyBySlug } from '../src/lib/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const text = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { confirmAllRelationships, getFamilyBySlug } from '../src/lib/firestore'

const slug = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1]
if (!slug) {
  console.error('Usage: npm run confirm:relationships -- --slug=<family-slug>')
  process.exit(1)
}

const email = process.env.IMPORT_EMAIL
const password = process.env.IMPORT_PASSWORD
if (!email || !password) {
  console.error('Set IMPORT_EMAIL and IMPORT_PASSWORD in the environment.')
  process.exit(1)
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

initializeApp(firebaseConfig)
const auth = getAuth()

async function main() {
  await signInWithEmailAndPassword(auth, email, password)
  const family = await getFamilyBySlug(slug)
  if (!family) {
    console.error(`Family not found: ${slug}`)
    process.exit(1)
  }
  const count = await confirmAllRelationships(family.id)
  console.log(`Confirmed ${count} relationships for ${family.name} (${slug})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
