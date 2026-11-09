import React from 'react'
import { AppContent, AppSidebar, AppHeader } from '../components/index'

const DefaultLayout = () => {
  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <main className="body flex-grow-1">
          <AppContent />
        </main>
      </div>
    </div>
  )
}

export default DefaultLayout
