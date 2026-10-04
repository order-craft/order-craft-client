import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

// routes config
import routes from '../routes'

const AppContent = () => {
  // Check if the routes array contains the /dashboard path
  const hasDashboardRoute = routes.some((route) => route.path === '/dashboard')

  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={<route.element />}
                />
              )
            )
          })}

          {/* Conditional check for /dashboard or /tables/tablesList */}
          {hasDashboardRoute ? (
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          ) : (
            <Route path="/" element={<Navigate to="/tables/tablesList" replace />} />
          )}
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
