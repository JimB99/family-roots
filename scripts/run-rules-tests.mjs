import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const MIN_JAVA_MAJOR = 21
const FIREBASE_CLI = join(process.cwd(), 'node_modules/firebase-tools/lib/bin/firebase.js')
const RULES_TEST_SCRIPT = 'npx vitest run --config vitest.rules.config.ts'

function javaExecutable(javaHome) {
  return join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
}

function jdkMajorVersion(javaHome) {
  const result = spawnSync(javaExecutable(javaHome), ['-version'], { encoding: 'utf8' })
  if (result.status !== 0) return 0
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  const match = /version "(\d+)/.exec(output)
  return match ? Number.parseInt(match[1], 10) : 0
}

function findWorkspaceJdk(minMajor = MIN_JAVA_MAJOR) {
  const toolRoots = [
    resolve(process.cwd(), '../.tools'),
    resolve(process.cwd(), '.tools'),
  ]
  let best = null
  for (const toolsDir of toolRoots) {
    if (!existsSync(toolsDir)) continue
    for (const jdkDirName of readdirSync(toolsDir).filter((name) => name.startsWith('jdk-'))) {
      const javaHome = join(toolsDir, jdkDirName)
      const javaBin = javaExecutable(javaHome)
      if (!existsSync(javaBin)) continue
      const major = jdkMajorVersion(javaHome)
      if (major < minMajor) continue
      if (!best || major > best.major) best = { javaHome, major }
    }
  }
  return best
}

function hasJava(javaBin = 'java') {
  const result = spawnSync(javaBin, ['-version'], { encoding: 'utf8' })
  return result.status === 0
}

function emulatorEnv(javaHome) {
  const javaBinDir = join(javaHome, 'bin')
  const pathSeparator = process.platform === 'win32' ? ';' : ':'
  const prependPath = (existing = '') =>
    existing.includes(javaBinDir) ? existing : `${javaBinDir}${pathSeparator}${existing}`
  const env = { ...process.env, JAVA_HOME: javaHome }
  if (process.platform === 'win32') {
    env.Path = prependPath(process.env.Path ?? process.env.PATH ?? '')
    env.PATH = env.Path
    env.PATHEXT = process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC'
  } else {
    env.PATH = prependPath(process.env.PATH ?? '')
  }
  return env
}

function resolveJavaHome() {
  if (process.env.JAVA_HOME && existsSync(javaExecutable(process.env.JAVA_HOME))) {
    const major = jdkMajorVersion(process.env.JAVA_HOME)
    if (major >= MIN_JAVA_MAJOR) return { javaHome: process.env.JAVA_HOME, major }
    console.warn(
      `JAVA_HOME is Java ${major}; Firestore rules emulator tests require Java ${MIN_JAVA_MAJOR}+.`,
    )
  }

  const workspaceJdk = findWorkspaceJdk()
  if (workspaceJdk) return workspaceJdk

  if (hasJava()) {
    const major = jdkMajorVersion(process.env.JAVA_HOME ?? '')
    if (major >= MIN_JAVA_MAJOR && process.env.JAVA_HOME) {
      return { javaHome: process.env.JAVA_HOME, major }
    }
  }

  return null
}

const resolved = resolveJavaHome()
if (!resolved) {
  console.warn(
    `Java ${MIN_JAVA_MAJOR}+ not found — skipping Firestore rules emulator tests.\n` +
      'Install a JDK under ../.tools/jdk-21* or set JAVA_HOME to a Java 21+ install.',
  )
  process.exit(0)
}

console.log(`Using Java ${resolved.major} at ${resolved.javaHome}`)

if (!existsSync(FIREBASE_CLI)) {
  console.error('firebase-tools is not installed. Run npm install first.')
  process.exit(1)
}

const env = emulatorEnv(resolved.javaHome)
const result = spawnSync(
  process.execPath,
  [FIREBASE_CLI, 'emulators:exec', '--only', 'firestore', RULES_TEST_SCRIPT],
  { stdio: 'inherit', env },
)

if (result.error) {
  console.error(result.error.message)
}

process.exit(result.status ?? 1)
