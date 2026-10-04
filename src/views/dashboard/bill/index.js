import React from 'react'
import { CCol, CRow, CCard, CCardBody, CCardHeader, CContainer } from '@coreui/react'
import { CIcon } from '@coreui/icons-react'
import { cilCalendar, cilChart } from '@coreui/icons'
import BillForCurrentUser from './BillForCurrentUser'
import TransactionsCards from './TransactionsTimeline'

// Reusable Card Component to avoid repetition
const RevenueCard = ({ icon, title, children }) => (
  <CRow className="w-100 mb-4 justify-content-center">
    <CCol xs={12} md={8} lg={8}>
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-center">
          <CIcon icon={icon} className="me-2" />
          <strong>{title}</strong>
        </CCardHeader>
        <CCardBody>{children}</CCardBody>
      </CCard>
    </CCol>
  </CRow>
)

const Sales = () => {
  return (
    <CContainer className="d-flex flex-column align-items-center">
      <RevenueCard icon={cilChart} title="Order Craft Bill">
        <BillForCurrentUser />
      </RevenueCard>
      <RevenueCard icon={cilChart} title="Bill History Payment">
        <TransactionsCards />
      </RevenueCard>
    </CContainer>
  )
}

export default Sales
