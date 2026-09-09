import { createBrowserRouter, Navigate, RouterProvider, useParams } from 'react-router-dom'
import { JoinPage } from './pages/JoinPage'
import { AdminHomePage } from './pages/AdminHomePage'
import { FamilyAdminPage } from './pages/FamilyAdminPage'
import { FamilyLayout } from './pages/FamilyLayout'
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
  { path: '/families/:slug/join/:token', element: <JoinPage /> },
  {
    path: '/families/:slug',
    element: <FamilyLayout />,
    children: [
      { index: true, element: <TreePage /> },
      { path: 'health', element: <DataHealthPage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: 'search', element: <SearchRedirect /> },
      { path: 'person/:personId', element: <PersonPage /> },
      { path: 'admin', element: <FamilyAdminPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/admin', element: <AdminHomePage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
