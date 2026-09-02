import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=')
    return [key, value ?? 'true']
  }),
)

const slug = args.slug
const commit = args.commit === 'true'

if (!slug) {
  console.error('Usage: npx tsx scripts/migrate-family-ids.ts --slug=<family-slug> [--commit]')
  process.exit(1)
}

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccount) throw new Error('Set FIREBASE_SERVICE_ACCOUNT to a service account JSON path')
  initializeApp({
    credential: cert(JSON.parse(readFileSync(serviceAccount, 'utf8')) as object),
  })
}

const db = getFirestore()
const familySnap = await db.collection('families').where('slug', '==', slug).limit(1).get()
if (familySnap.empty) {
  console.error('Family not found')
  process.exit(1)
}
const familyId = familySnap.docs[0].id

const peopleWrong = await db.collection('people').where('familyId', '==', slug).get()
const relsWrong = await db.collection('relationships').where('familyId', '==', slug).get()

console.log(
  `Family ${familyId}: ${peopleWrong.size} people and ${relsWrong.size} relationships use slug as familyId`,
)

if (!commit) {
  console.log('Dry run only. Re-run with --commit to apply fixes.')
  process.exit(0)
}

const batch = db.batch()
peopleWrong.docs.forEach((doc) => batch.update(doc.ref, { familyId }))
relsWrong.docs.forEach((doc) => batch.update(doc.ref, { familyId }))
await batch.commit()
console.log('Migration complete.')
