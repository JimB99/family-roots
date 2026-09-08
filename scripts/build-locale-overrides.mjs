#!/usr/bin/env node
/**
 * Applies Spanish and German translations to locale JSON files.
 * Run after adding keys to en-GB: node scripts/build-locale-overrides.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = path.join(root, 'src/locales')

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {}
      deepMerge(target[key], value)
    } else {
      target[key] = value
    }
  }
  return target
}

const esOverrides = {
  app: {
    home: {
      heading: 'Árboles familiares',
      subtitle: 'Explore un árbol familiar o inicie sesión para crear el suyo.',
      emptyTitle: 'Aún no hay árboles familiares',
      emptyDescription: 'Inicie sesión para crear el primer árbol y empezar a añadir personas.',
      signInToCreate: 'Iniciar sesión para crear uno',
      viewTree: 'Ver árbol',
    },
    login: {
      welcomeBack: 'Bienvenido de nuevo',
      createAccount: 'Cree su cuenta',
      signInSubtitle: 'Inicie sesión para editar sus árboles familiares.',
      signUpSubtitle: 'Empiece a construir y compartir su historia familiar.',
      firebaseHint: 'Copie .env.example a .env.local y añada las claves de Firebase.',
      createAccountButton: 'Crear cuenta',
      toggleToSignUp: '¿Necesita una cuenta? Regístrese',
      toggleToSignIn: '¿Ya tiene cuenta? Inicie sesión',
    },
  },
}

const deOverrides = {
  app: {
    home: {
      heading: 'Familienstammbäume',
      subtitle: 'Stöbern Sie in einem Stammbaum oder melden Sie sich an, um Ihren eigenen zu erstellen.',
      emptyTitle: 'Noch keine Stammbäume',
      emptyDescription: 'Melden Sie sich an, um den ersten Stammbaum zu erstellen und Personen hinzuzufügen.',
      signInToCreate: 'Anmelden und erstellen',
      viewTree: 'Stammbaum ansehen',
    },
    login: {
      welcomeBack: 'Willkommen zurück',
      createAccount: 'Konto erstellen',
      signInSubtitle: 'Melden Sie sich an, um Ihre Stammbäume zu bearbeiten.',
      signUpSubtitle: 'Beginnen Sie, Ihre Familiengeschichte aufzubauen und zu teilen.',
      firebaseHint: 'Kopieren Sie .env.example nach .env.local und fügen Sie Ihre Firebase-Schlüssel hinzu.',
      createAccountButton: 'Konto erstellen',
      toggleToSignUp: 'Noch kein Konto? Registrieren',
      toggleToSignIn: 'Bereits ein Konto? Anmelden',
    },
  },
}

for (const [lang, overrides] of [
  ['es-ES', esOverrides],
  ['de-AT', deOverrides],
]) {
  for (const [ns, patch] of Object.entries(overrides)) {
    const file = path.join(localesDir, lang, `${ns}.json`)
    const base = JSON.parse(fs.readFileSync(path.join(localesDir, 'en-GB', `${ns}.json`), 'utf8'))
    const en = JSON.parse(fs.readFileSync(file, 'utf8'))
    const merged = deepMerge({ ...base, ...en }, patch)
    fs.writeFileSync(file, JSON.stringify(merged, null, 2) + '\n')
  }
}

console.log('Applied partial locale overrides. Run full translation pass for remaining keys.')
