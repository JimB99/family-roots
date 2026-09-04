import { createBrowserRouter, Navigate, RouterProvider, useParams } from 'react-router-dom'
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

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/families/:slug/health', element: <DataHealthPage /> },
  { path: '/families/:slug', element: <TreePage /> },
  { path: '/families/:slug/people', element: <PeoplePage /> },
  { path: '/families/:slug/search', element: <SearchRedirect /> },
  { path: '/families/:slug/person/:personId', element: <PersonPage /> },
  { path: '/families/:slug/admin', element: <FamilyAdminPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/admin', element: <AdminHomePage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
