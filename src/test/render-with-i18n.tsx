import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { initTestI18n } from './i18n'

export async function renderWithI18n(ui: ReactElement, locale = 'en-GB') {
  const i18n = await initTestI18n(locale)
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}
