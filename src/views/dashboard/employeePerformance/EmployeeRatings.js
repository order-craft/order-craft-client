import React from 'react'
import { useSelector } from 'react-redux'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilStar } from '@coreui/icons'
import translations from '../../../app/Language'

const EmployeeRatings = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center">
        <CIcon icon={cilStar} className="me-2" />
        <strong>{Language.EmployeeRatings}</strong>
      </CCardHeader>
      <CCardBody>
        <div className="oc-soon">
          <CIcon icon={cilStar} size="xl" />
          <div className="oc-soon-title">{Language.employeeRatingsComingSoon}</div>
          <div className="oc-soon-body">{Language.employeeRatingsComingSoonBody}</div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default EmployeeRatings
