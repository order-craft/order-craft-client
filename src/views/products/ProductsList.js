import React, { useEffect, useState } from 'react'
import {
  CFormSwitch,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CInputGroup,
  CFormInput,
  CAlert,
  CSpinner,
  CPagination,
  CPaginationItem,
  CBadge,
  CCard,
  CCardHeader,
  CCardBody,
  CCol,
  CRow,
  CButton,
  CTooltip,
  CFormSelect,
  CInputGroupText,
} from '@coreui/react'
import axios from 'axios'
import { GetToken } from '../../helpers/GetToken'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilFilter, cilReload, cilInfo } from '@coreui/icons'

const ProductList = () => {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const token = GetToken()

  // Language
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      setError('')
      setMessage('')

      try {
        const response = await axios.get(`${BaseUrl}/products`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        setProducts(response.data)
        setFilteredProducts(response.data)
      } catch (err) {
        setError(Language.fetchError || 'Failed to fetch products')
      } finally {
        setLoading(false)
        setTimeout(() => {
          setError('')
          setMessage('')
        }, 5000)
      }
    }

    fetchProducts()
  }, [token])

  useEffect(() => {
    let result = [...products]

    // Apply search filter
    if (search) {
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          (product.description && product.description.toLowerCase().includes(search.toLowerCase())),
      )
    }

    // Apply availability filter
    if (availabilityFilter !== 'all') {
      const available = availabilityFilter === 'available'
      result = result.filter((product) => product.available === available)
    }

    setFilteredProducts(result)
    setCurrentPage(1) // Reset to first page after filtering
  }, [search, products, availabilityFilter])

  const toggleAvailability = async (productId, currentAvailability) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await axios.put(
        `${BaseUrl}/products/${productId}/availability`,
        { available: !currentAvailability },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product._id === productId ? { ...product, available: !currentAvailability } : product,
        ),
      )
      setMessage(Language.availabilityUpdated || 'Product availability updated successfully')
    } catch (err) {
      setError(Language.updateError || 'Failed to update product availability')
    } finally {
      setLoading(false)
      setTimeout(() => {
        setError('')
        setMessage('')
      }, 5000)
    }
  }

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const totalProducts = filteredProducts.length

  const getAvailabilityBadge = (available) => {
    return available ? (
      <CBadge color="success">{Language.available || 'available'}</CBadge>
    ) : (
      <CBadge color="danger">{Language.unavailable || 'unavailable'}</CBadge>
    )
  }

  return (
    <CCard>
      <CCardHeader>
        <CRow className="align-items-center">
          <CCol xs={12} md={6}>
            <h3 className="mb-0">
              <CIcon icon={cilInfo} className="me-2" />
              {Language.productManagement || 'Product Managment'}
            </h3>
          </CCol>
          <CCol xs={12} md={6} className="text-md-end">
            <CTooltip content={Language.refresh || 'refresh'}>
              <CButton color="secondary" onClick={() => window.location.reload()}>
                <CIcon icon={cilReload} />
              </CButton>
            </CTooltip>
          </CCol>
        </CRow>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="text-center py-5">
            <CSpinner color="primary" size="sm" />
            <p className="mt-3">{Language.loading || 'loading'}</p>
          </div>
        )}

        {error && (
          <CAlert color="danger" onClose={() => setError('')} dismissible>
            {error}
          </CAlert>
        )}

        {message && (
          <CAlert color="success" onClose={() => setMessage('')} dismissible>
            {message}
          </CAlert>
        )}

        <CRow className="mb-4">
          <CCol xs={12} md={6} className="mb-3">
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilSearch} />
              </CInputGroupText>
              <CFormInput
                placeholder={`${Language.search || 'search'} ${Language.products || 'products'}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </CInputGroup>
          </CCol>
          <CCol xs={12} md={6} className="mb-3">
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilFilter} />
              </CInputGroupText>
              <CFormSelect
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
              >
                <option value="all">{Language.allStatuses || 'all statuses'}</option>
                <option value="available">{Language.available || 'available'}</option>
                <option value="unavailable">{Language.unavailable || 'unavailable'}</option>
              </CFormSelect>
            </CInputGroup>
          </CCol>
          <CCol xs={12} className="mb-3 d-flex align-items-center">
            <span className="text-muted">
              {totalProducts} {Language.productsFound || 'products found'}
            </span>
          </CCol>
        </CRow>

        {filteredProducts.length === 0 ? (
          <CAlert color="info" className="text-center">
            {Language.noProductsFound || 'No Products found'}
          </CAlert>
        ) : (
          <>
            <div className="table-responsive">
              <CTable striped hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>{Language.name || 'name'}</CTableHeaderCell>
                    <CTableHeaderCell>{Language.price || 'price'}</CTableHeaderCell>
                    <CTableHeaderCell>{Language.status || 'status'}</CTableHeaderCell>
                    <CTableHeaderCell>{Language.actions || 'actions'}</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {currentItems.map((product) => (
                    <CTableRow key={product._id}>
                      <CTableDataCell>
                        <div className="fw-semibold">{product.name}</div>
                        {product.description && (
                          <div className="small text-muted">{product.description}</div>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>{product.price?.toFixed(2) || '0.00'} TND</CTableDataCell>
                      <CTableDataCell>{getAvailabilityBadge(product.available)}</CTableDataCell>
                      <CTableDataCell className="text-center ">
                        <CFormSwitch
                          className="m-2"
                          color="primary"
                          checked={product.available}
                          onChange={() => toggleAvailability(product._id, product.available)}
                          label=""
                        />
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>

            <CRow className="mt-3">
              <CCol xs={12} className="d-flex justify-content-center">
                <CPagination>
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  >
                    {Language.previous || 'previous'}
                  </CPaginationItem>
                  {[...Array(Math.min(totalPages, 5)).keys()].map((page) => {
                    // Show only 5 pages at a time
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = page + 1
                    } else if (currentPage <= 3) {
                      pageNum = page + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + page
                    } else {
                      pageNum = currentPage - 2 + page
                    }

                    return (
                      <CPaginationItem
                        key={pageNum}
                        active={pageNum === currentPage}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </CPaginationItem>
                    )
                  })}
                  <CPaginationItem
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  >
                    {Language.next || 'next'}
                  </CPaginationItem>
                </CPagination>
              </CCol>
            </CRow>

            <div className="text-center text-muted small mt-2">
              {Language.showing || 'showing'} {indexOfFirstItem + 1}-
              {Math.min(indexOfLastItem, totalProducts)} {Language.of || 'of'} {totalProducts}{' '}
              {Language.products || 'products'}
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ProductList
