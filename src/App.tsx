import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminHomePage } from './pages/AdminHomePage'
import { FamilyAdminPage } from './pages/FamilyAdminPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PersonPage } from './pages/PersonPage'
import { SearchPage } from './pages/SearchPage'
import { TreePage } from './pages/TreePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/families/:slug" element={<TreePage />} />
        <Route path="/families/:slug/search" element={<SearchPage />} />
        <Route path="/families/:slug/person/:personId" element={<PersonPage />} />
        <Route path="/families/:slug/admin" element={<FamilyAdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminHomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
