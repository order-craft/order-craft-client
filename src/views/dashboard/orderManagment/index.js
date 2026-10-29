import OrderKpiStrip from './OrderKpiStrip'
import AverageProcessingTime from './AverageProcessingTime'
import AverageOrderValue from './AverageOrderValue'
import RevenuePerTable from './RevenuePerTable'

const OrderManagement = () => {
  return (
    <>
      <OrderKpiStrip />
      <RevenuePerTable />
      <AverageProcessingTime />
      <AverageOrderValue />
    </>
  )
}

export default OrderManagement
