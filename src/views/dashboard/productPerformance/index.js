import React from 'react'
import MostSoldProducts from './MostSoldProducts'
import RevenuePerProduct from './RevenuePerProduct'
import ProductsRate from './ProductsRate'

const Sales = () => {
  return (
    <>
      <RevenuePerProduct />
      <MostSoldProducts />
      <ProductsRate />
    </>
  )
}

export default Sales
