import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import {
  toRelationshipDrafts,
  type ParsedRelationship,
} from '../src/lib/stamm-parser.ts'
import type { PersonInput } from '../src/types'

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
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

export async function commitViaClientAuth(
  people: Array<PersonInput & { importKey: string }>,
  parsedRelationships: ParsedRelationship[],
  familySlug: string,
) {
  loadEnvLocal()

  const email = process.env.IMPORT_EMAIL
  const password = process.env.IMPORT_PASSWORD
  if (!email || !password) {
    throw new Error('Add IMPORT_EMAIL and IMPORT_PASSWORD to .env.local (your editor account)')
  }

  const app = initializeApp(
    {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    },
    'stamm-import',
  )

  const auth = getAuth(app)
  const db = getFirestore(app)
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const userId = cred.user.uid

  const familySnap = await getDocs(query(collection(db, 'families'), where('slug', '==', familySlug)))
  if (familySnap.empty) {
    throw new Error(`Family slug "${familySlug}" not found. Create it at /admin first.`)
  }

  const familyDoc = familySnap.docs[0]
  const familyData = familyDoc.data()
  if (!familyData.editorUids?.includes(userId)) {
    throw new Error('Signed-in user is not an editor for this family tree.')
  }

  const familyId = familyDoc.id
  const peopleWithFamily = people.map((p) => ({ ...p, familyId }))
  const keyToId = new Map<string, string>()
  const peopleRefs = peopleWithFamily.map(() => doc(collection(db, 'people')))
  peopleWithFamily.forEach((person, i) => keyToId.set(person.importKey, peopleRefs[i].id))

  const relDrafts = toRelationshipDrafts(parsedRelationships, familyId, keyToId)

  let batch = writeBatch(db)
  let ops = 0
  const flush = async () => {
    if (ops === 0) return
    await batch.commit()
    batch = writeBatch(db)
    ops = 0
  }

  for (let i = 0; i < peopleWithFamily.length; i++) {
    if (ops >= 450) await flush()
    batch.set(peopleRefs[i], {
      ...peopleWithFamily[i],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
    })
    ops++
  }

  for (const rel of relDrafts) {
    if (ops >= 450) await flush()
    batch.set(doc(collection(db, 'relationships')), {
      ...rel,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    ops++
  }

  await flush()
  return { people: peopleWithFamily.length, relationships: relDrafts.length }
}
