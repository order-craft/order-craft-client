import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilChart, cilCalendar } from '@coreui/icons'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import MonthPieChart from '../MonthPieChart'
import MonthBarChart from '../MonthBarChart'
import RevenuePerProductPerDay from '../RevenuePerProductPerDay'
import RevenuePerProduct2dates from '../RevenuePerProduct2dates'
import './productPerformance.css'

const RevenuePerProduct = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <div>
      {/* This week — line chart */}
      <div className="pp-card">
        <div className="pp-card-header">
          <div className="pp-card-header-left">
            <h5 className="pp-card-title">
              <CIcon icon={cilChart} />
              {Language.RevenuePerProduct + ' - ' + Language.thisWeek ||
                'Revenue per product — this week'}
            </h5>
            <div className="pp-card-subtitle">{Language.dailyView || 'Day by day, this week'}</div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <RevenuePerProductPerDay />
        </div>
      </div>

      {/* Pie — year to date */}
      <MonthPieChart />

      {/* Bar — year to date, ranked */}
      <MonthBarChart />

      {/* Custom range — horizontal bar */}
      <div className="pp-card">
        <div className="pp-card-header">
          <div className="pp-card-header-left">
            <h5 className="pp-card-title">
              <CIcon icon={cilCalendar} />
              {Language.Product_sRevenueBetween2Dates || 'Revenue per product — custom range'}
            </h5>
            <div className="pp-card-subtitle">
              {Language.pickRangeHint || 'Pick a start and end date, then tap Apply.'}
            </div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <RevenuePerProduct2dates />
        </div>
      </div>
    </div>
  )
}

export default RevenuePerProduct
