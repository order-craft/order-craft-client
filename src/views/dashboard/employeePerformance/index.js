import RevenueByClient from './RevenuePerWaiter'
import RevenueByWaiterAndPeriod from './RevenueByWaiterAndPeriod'
import DailyRevenuePerWaiter from './DailyRevenuePerWaiter'
import PreppedVsDelivered from './PreppedVsDelivered'
import HandoffTimeChart from './HandoffTimeChart'

const EmployeePerformance = () => {
  return (
    <>
      <PreppedVsDelivered />
      <HandoffTimeChart />
      <RevenueByWaiterAndPeriod />
      <DailyRevenuePerWaiter />
      <RevenueByClient />
    </>
  )
}

export default EmployeePerformance
