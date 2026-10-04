import { CCol, CRow, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { CIcon } from '@coreui/icons-react'
import { cilCalendar } from '@coreui/icons'
import OrderProcessingEfficiency from './OrderProcessingEfficiency'
import RevenueByClient from './RevenuePerWaiter'
import RevenueByWaiterAndPeriod from './RevenueByWaiterAndPeriod'
import EmployeeRatings from './EmployeeRatings'
import ShiftReports from './ShiftReports'
import DailyRevenuePerWaiter from './DailyRevenuePerWaiter'

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

const EmployeePerformance = () => {
  return (
    <>
      {/* <CContainer className="d-flex flex-column align-items-center"> */}
      {/* <RevenueCard icon={cilCalendar} title="Order Processing Efficiency"> */}
      <OrderProcessingEfficiency />
      {/* </RevenueCard> */}
      {/* <RevenueCard icon={cilCalendar} title="Sales by Employee"> */}
      <RevenueByClient />
      <RevenueByWaiterAndPeriod />
      <DailyRevenuePerWaiter />
      {/* </RevenueCard> */}
      <RevenueCard icon={cilCalendar} title=" Employee Ratings">
        <EmployeeRatings />
      </RevenueCard>
      <RevenueCard icon={cilCalendar} title=" Shift Reports">
        <ShiftReports />
      </RevenueCard>
      {/* </CContainer> */}
    </>
  )
}

export default EmployeePerformance
