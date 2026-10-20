import React from 'react'
import { useSelector } from 'react-redux'
import { cilListRich } from '@coreui/icons'
import translations from '../../../app/Language'
import DashboardSectionHeader from '../../../components/DashboardSectionHeader'
import OrderStatusOverview from './OrderStatusOverview'
import AverageProcessingTime from './AverageProcessingTime'
import AverageOrderValue from './AverageOrderValue'
import RevenuePerTable from './RevenuePerTable'

const OrderManagement = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <>
      <DashboardSectionHeader
        icon={cilListRich}
        accent="#c15a76"
        title={Language.orderManagement}
        subtitle={Language.orderHubDesc}
      />
      <RevenuePerTable />
      <OrderStatusOverview />
      <AverageProcessingTime />
      <AverageOrderValue />
    </>
  )
}

export default OrderManagement
