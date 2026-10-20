import React from 'react'
import { useSelector } from 'react-redux'
import { cilChartLine } from '@coreui/icons'
import translations from '../../../app/Language'
import DashboardSectionHeader from '../../../components/DashboardSectionHeader'
import DailyRevenue from './DailyReveue'
import YearlyRevenue from './YearlyRevenue'
import CurrentMonthRevenue from './MonthlyRevenue'
import CurrentWeekRevenue from './WeeklyRevenue'
import RevenueBetweenDates from './RevenueBetweenDates'
import ProfitSummaryCard from './ProfitSummaryCard'
import ProfitOverTimeCard from './ProfitOverTimeCard'

const Sales = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <>
      <DashboardSectionHeader
        icon={cilChartLine}
        accent="#b5502b"
        title={Language.salesStatistic}
        subtitle={Language.salesHubDesc}
      />
      <DailyRevenue />
      <CurrentWeekRevenue />
      <CurrentMonthRevenue />
      <YearlyRevenue />
      <RevenueBetweenDates className="w-100 mb-4 justify-content-center" />

      <ProfitSummaryCard />
      <ProfitOverTimeCard />
    </>
  )
}

export default Sales
