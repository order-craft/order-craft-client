import React from 'react'
import { useSelector } from 'react-redux'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import { CIcon } from '@coreui/icons-react'
import { cilDescription } from '@coreui/icons'
import translations from '../../../app/Language'
import DashboardSectionHeader from '../../../components/DashboardSectionHeader'
import BillForCurrentUser from './BillForCurrentUser'
import TransactionsCards from './TransactionsTimeline'

const Bill = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <>
      <DashboardSectionHeader
        icon={cilDescription}
        accent="#3d7a5c"
        title={Language.bills}
        subtitle={Language.billsHubDesc}
      />

      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center">
          <CIcon icon={cilDescription} className="me-2" />
          <strong>{Language.OrderCraftBill}</strong>
        </CCardHeader>
        <CCardBody>
          <BillForCurrentUser />
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center">
          <CIcon icon={cilDescription} className="me-2" />
          <strong>{Language.BillHistoryPayment}</strong>
        </CCardHeader>
        <CCardBody>
          <TransactionsCards />
        </CCardBody>
      </CCard>
    </>
  )
}

export default Bill
