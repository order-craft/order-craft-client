import React from 'react'
import { CSpinner, CContainer } from '@coreui/react'

const Loading = () => {
  return (
    <CContainer
      className="d-flex justify-content-center align-items-center"
      style={{ height: '100vh' }}
    >
      <CSpinner color="primary" style={{ width: '3rem', height: '3rem' }} />
      <span className="ms-3">Loading...</span>
    </CContainer>
  )
}

export default Loading
