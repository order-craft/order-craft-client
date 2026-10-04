import React from 'react'
import DailyRevenue from './DailyReveue'
import YearlyRevenue from './YearlyRevenue'
import CurrentMonthRevenue from './MonthlyRevenue'
import CurrentWeekRevenue from './WeeklyRevenue'
import RevenueBetweenDates from './RevenueBetweenDates'

const Sales = () => {
  return (
    <>
      <DailyRevenue />

      <CurrentWeekRevenue />

      <CurrentMonthRevenue />

      <YearlyRevenue />

      <RevenueBetweenDates className="w-100 mb-4 justify-content-center" />
    </>
  )
}

export default Sales
