import { spawnSync } from 'node:child_process'

function hasJava() {
  const result = spawnSync('java', ['-version'], { encoding: 'utf8' })
  return result.status === 0
}

if (!hasJava()) {
  console.warn('Java not found — skipping Firestore rules emulator tests.')
  process.exit(0)
}

const result = spawnSync(
  'firebase',
  ['emulators:exec', '--only', 'firestore', 'vitest run tests/rules'],
  { stdio: 'inherit', shell: true },
)

process.exit(result.status ?? 1)
