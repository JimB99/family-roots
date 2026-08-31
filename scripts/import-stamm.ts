import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { parseStammGrid, toPersonInputs, toRelationshipDrafts } from '../src/lib/stamm-parser.ts'
import { commitViaClientAuth } from './import-via-client.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultXls = 'C:/Users/Jim/Downloads/STAMM.xls'

function loadGrid(xlsPath: string): string[][] {
  const workbook = XLSX.readFile(xlsPath, { cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  })
  return rows.map((row) => row.map((cell) => String(cell ?? '').trim()))
}

function initAdmin() {
  if (getApps().length > 0) return getFirestore()

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
    initializeApp({ credential: cert(serviceAccount) })
    return getFirestore()
  }

  initializeApp({ credential: applicationDefault(), projectId: 'roots-atlas' })
  return getFirestore()
}

async function commitToFirestore(
  familyId: string,
  familyName: string,
  people: ReturnType<typeof toPersonInputs>,
  relationships: ReturnType<typeof toRelationshipDrafts>,
) {
  const db = initAdmin()
  const keyToId = new Map<string, string>()

  for (const person of people) {
    const ref = db.collection('people').doc()
    keyToId.set(person.importKey, ref.id)
    await ref.set({
      ...person,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  for (const rel of relationships) {
    await db.collection('relationships').doc().set({
      ...rel,
      personAId: keyToId.get(rel.personAId) ?? rel.personAId,
      personBId: keyToId.get(rel.personBId) ?? rel.personBId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  const familyRef = db.collection('families').doc(familyId)
  const familySnap = await familyRef.get()
  if (!familySnap.exists) {
    await familyRef.set({
      name: familyName,
      slug: familyId,
      editorUids: [],
      pendingInviteEmails: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const commit = args.includes('--commit')
  const xlsArg = args.find((a) => !a.startsWith('--'))
  const xlsPath = xlsArg ? path.resolve(xlsArg) : defaultXls
  const familyId = process.env.IMPORT_FAMILY_SLUG ?? args.find((a) => a.startsWith('--slug='))?.slice(7) ?? ''
  const familyName = process.env.IMPORT_FAMILY_NAME ?? args.find((a) => a.startsWith('--name='))?.slice(7) ?? familyId

  const grid = loadGrid(xlsPath)
  const report = parseStammGrid(grid)
  if (commit && !familyId) {
    throw new Error('Pass --slug=your-family-slug (and optional --name=Display Name) for --commit')
  }

  const people = toPersonInputs(report.people, familyId || 'preview')
  const pseudoKeyToId = new Map(report.people.map((p) => [p.importKey, p.importKey]))
  const relationships = toRelationshipDrafts(report.relationships, familyId || 'preview', pseudoKeyToId)

  const output = {
    source: xlsPath,
    counts: {
      people: people.length,
      relationships: relationships.length,
      lowConfidence: relationships.filter((r) => r.confidence === 'low').length,
    },
    warnings: report.warnings,
    people: report.people,
    relationships: report.relationships,
  }

  const reportPath = path.join(__dirname, '..', 'import-report.json')
  writeFileSync(reportPath, JSON.stringify(output, null, 2), 'utf8')
  console.log(`Wrote ${reportPath}`)
  console.log(`People: ${people.length}, relationships: ${relationships.length}`)

  if (!commit) {
    console.log('Dry run only. Re-run with --commit --slug=your-slug [--name=Display Name].')
    console.log('Auth: FIREBASE_SERVICE_ACCOUNT JSON path, or IMPORT_EMAIL + IMPORT_PASSWORD in .env.local')
    return
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    await commitToFirestore(familyId, familyName, people, relationships)
    console.log('Import committed to Firestore (admin SDK).')
    return
  }

  const result = await commitViaClientAuth(people, report.relationships, familyId)
  console.log(
    `Import committed to Firestore (client auth): ${result.people} people, ${result.relationships} relationships.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
