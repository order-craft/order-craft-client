import OrderKpiStrip from './OrderKpiStrip'
import ExceptionsPanel from './ExceptionsPanel'
import StaffOnDuty from './StaffOnDuty'
import AverageProcessingTime from './AverageProcessingTime'
import AverageOrderValue from './AverageOrderValue'
import RevenuePerTable from './RevenuePerTable'

const OrderManagement = () => {
  return (
    <>
      <OrderKpiStrip />
      <ExceptionsPanel />
      <StaffOnDuty />
      <RevenuePerTable />
      <AverageProcessingTime />
      <AverageOrderValue />
    </>
  )
}

export default OrderManagement
