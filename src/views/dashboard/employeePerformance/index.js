import RevenueByClient from './RevenuePerWaiter'
import RevenueByWaiterAndPeriod from './RevenueByWaiterAndPeriod'
// import EmployeeRatings from './EmployeeRatings'
// import ShiftReports from './ShiftReports'
import DailyRevenuePerWaiter from './DailyRevenuePerWaiter'

const EmployeePerformance = () => {
  return (
    <>
      <RevenueByWaiterAndPeriod />
      <DailyRevenuePerWaiter />
      <RevenueByClient />
      {/* </RevenueCard> */}
      {/* <EmployeeRatings />
      <ShiftReports /> */}
      {/* </CContainer> */}
    </>
  )
}

export default EmployeePerformance
