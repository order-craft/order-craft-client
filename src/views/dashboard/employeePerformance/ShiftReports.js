import React from 'react'
import { useSelector } from 'react-redux'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendarCheck } from '@coreui/icons'
import translations from '../../../app/Language'

const ShiftReports = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center">
        <CIcon icon={cilCalendarCheck} className="me-2" />
        <strong>{Language.ShiftReports}</strong>
      </CCardHeader>
      <CCardBody>
        <div className="oc-soon">
          <CIcon icon={cilCalendarCheck} size="xl" />
          <div className="oc-soon-title">{Language.shiftReportsComingSoon}</div>
          <div className="oc-soon-body">{Language.shiftReportsComingSoonBody}</div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default ShiftReports
