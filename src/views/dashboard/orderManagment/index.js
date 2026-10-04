import OrderStatusOverview from './OrderStatusOverview'
import AverageProcessingTime from './AverageProcessingTime'
import AverageOrderValue from './AverageOrderValue'
import RevenuePerTable from './RevenuePerTable'

const Sales = () => {
  return (
    <>
      <RevenuePerTable />
      <OrderStatusOverview />
      <AverageProcessingTime />
      <AverageOrderValue />
    </>
  )
}

export default Sales
