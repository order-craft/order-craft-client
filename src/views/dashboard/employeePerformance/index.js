import React from 'react'
import { useSelector } from 'react-redux'
import { cilPeople } from '@coreui/icons'
import translations from '../../../app/Language'
import DashboardSectionHeader from '../../../components/DashboardSectionHeader'
import OrderProcessingEfficiency from './OrderProcessingEfficiency'
import RevenueByClient from './RevenuePerWaiter'
import RevenueByWaiterAndPeriod from './RevenueByWaiterAndPeriod'
import EmployeeRatings from './EmployeeRatings'
import ShiftReports from './ShiftReports'
import DailyRevenuePerWaiter from './DailyRevenuePerWaiter'

const EmployeePerformance = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <>
      <DashboardSectionHeader
        icon={cilPeople}
        accent="#2e7f8c"
        title={Language.navStaffInsights || Language.EmployeePerformance}
        subtitle={Language.employeeHubDesc}
      />
      <OrderProcessingEfficiency />
      <RevenueByClient />
      <RevenueByWaiterAndPeriod />
      <DailyRevenuePerWaiter />
      <EmployeeRatings />
      <ShiftReports />
    </>
  )
}

export default EmployeePerformance
