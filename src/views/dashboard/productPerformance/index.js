import React from 'react'
import { useSelector } from 'react-redux'
import { cilRestaurant } from '@coreui/icons'
import translations from '../../../app/Language'
import DashboardSectionHeader from '../../../components/DashboardSectionHeader'
import MostSoldProducts from './MostSoldProducts'
import RevenuePerProduct from './RevenuePerProduct'
import ProductsRate from './ProductsRate'

const ProductPerformance = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <>
      <DashboardSectionHeader
        icon={cilRestaurant}
        accent="#7a5aa8"
        title={Language.productPerformance}
        subtitle={Language.productHubDesc}
      />
      <RevenuePerProduct />
      <MostSoldProducts />
      <ProductsRate />
    </>
  )
}

export default ProductPerformance
