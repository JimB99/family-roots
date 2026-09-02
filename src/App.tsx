import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AdminHomePage } from './pages/AdminHomePage'
import { FamilyAdminPage } from './pages/FamilyAdminPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PeoplePage } from './pages/PeoplePage'
import { PersonPage } from './pages/PersonPage'
import { DataHealthPage } from './pages/DataHealthPage'
import { TreePage } from './pages/TreePage'

function SearchRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/families/${slug}/people`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/families/:slug/health" element={<DataHealthPage />} />
        <Route path="/families/:slug" element={<TreePage />} />
        <Route path="/families/:slug/people" element={<PeoplePage />} />
        <Route path="/families/:slug/search" element={<SearchRedirect />} />
        <Route path="/families/:slug/person/:personId" element={<PersonPage />} />
        <Route path="/families/:slug/admin" element={<FamilyAdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminHomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
