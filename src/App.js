import React, { Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'

import { CSpinner } from '@coreui/react'
import './scss/style.scss'
import PrivateRoute from './helpers/PrivateRoute'
import { AuthProvider } from './context/AuthContext'
import GlobalNotification from './components/GlobalNotification'
import '@coreui/coreui/dist/css/coreui.min.css'
import { ToastProvider } from './components/toast/ToastProvider'
// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

const App = () => {
  // App is light-mode only. Force the theme on mount, in case
  // a stale value is cached in localStorage from the previous
  // color-mode toggle.
  useEffect(() => {
    document.documentElement.setAttribute('data-coreui-theme', 'light')
    document.documentElement.classList.remove('cui-theme-dark', 'dark')
    localStorage.removeItem('coreui-free-react-admin-template-theme')
  }, [])

  return (
    <HashRouter>
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route exact path="/login" name="Login Page" element={<Login />} />
              <Route exact path="/register" name="Register Page" element={<Register />} />
              <Route exact path="/404" name="Page 404" element={<Page404 />} />
              <Route exact path="/500" name="Page 500" element={<Page500 />} />
              <Route path="*" name="Home" element={<PrivateRoute element={DefaultLayout} />} />{' '}
            </Routes>
            <GlobalNotification /> {/* Always available */}
          </ToastProvider>
        </AuthProvider>
      </Suspense>
    </HashRouter>
  )
}

export default App
