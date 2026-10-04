import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CForm,
  CFormInput,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CSpinner,
  CBadge,
  CAlert,
} from '@coreui/react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import {
  cilPencil,
  cilTrash,
  cilSearch,
  cilWarning,
  cilPlus,
  cilCloudUpload,
  cilFastfood,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './product.css'

const CategoryDetails = () => {
  // Language
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const { id } = useParams()

  // State
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalMode, setModalMode] = useState(null) // 'add' or 'edit'
  const [currentProductId, setCurrentProductId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
  const [tempSrc, setTempSrc] = useState(null)

  // Form data
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    discountPercentage: 0,
    img: '',
  })

  // Fetch category details and products
  const fetchCategoryDetails = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BaseUrl}/categories/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setCategory(response.data.category)
      setProducts(response.data.products)
      setFilteredProducts(response.data.products)
    } catch (err) {
      console.error('Error fetching category details', err)
      handleErrorDisplay(err.response?.data?.error || 'Failed to fetch category details')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCategoryDetails()
  }, [id])

  // Filter products based on search query
  useEffect(() => {
    setFilteredProducts(
      products.filter((product) => product.name.toLowerCase().includes(searchQuery.toLowerCase())),
    )
  }, [searchQuery, products])

  // Handle error display
  const handleErrorDisplay = (error) => {
    setErrorMsg(error)
    setTimeout(() => {
      setErrorMsg(null)
    }, 3000)
  }

  // Reset form and modal state
  const resetForm = () => {
    setProductData({
      name: '',
      description: '',
      price: '',
      discountPercentage: 0,
      img: '',
    })
    setTempSrc(null)
    setCurrentProductId(null)
    setModalMode(null)
  }

  // Handle modal close
  const handleModalClose = () => {
    resetForm()
  }

  // Open modal in add mode
  const openAddModal = () => {
    setModalMode('add')
  }

  // Open modal in edit mode
  const openEditModal = (product) => {
    setProductData({
      name: product.name,
      description: product.description,
      price: product.price,
      discountPercentage: product.discountPercentage || 0,
      img: product.img || '',
    })
    setTempSrc(product.img || null)
    setCurrentProductId(product._id)
    setModalMode('edit')
  }

  // Save product (handles both add and edit)
  const handleSaveProduct = async () => {
    if (!productData.name || !productData.price) {
      handleErrorDisplay('Name and price are required')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const url =
        modalMode === 'add' ? `${BaseUrl}/products` : `${BaseUrl}/products/${currentProductId}`

      const method = modalMode === 'add' ? 'post' : 'put'

      await axios[method](
        url,
        {
          ...productData,
          categoryId: id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      resetForm()
      fetchCategoryDetails()
    } catch (err) {
      handleErrorDisplay(err.response?.data?.error || 'Operation failed')
      console.error('Error saving product', err)
    } finally {
      setLoading(false)
    }
  }

  // Delete a product
  const handleDeleteProduct = async (productId) => {
    if (
      window.confirm(
        Language.confirmDeleteProduct || 'Are you sure you want to delete this product?',
      )
    ) {
      try {
        const token = localStorage.getItem('token')
        await axios.delete(`${BaseUrl}/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        fetchCategoryDetails()
      } catch (err) {
        handleErrorDisplay(err.response?.data?.error || 'Failed to delete product')
        console.error('Error deleting product', err)
      }
    }
  }

  // Handle file upload for product image
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setTempSrc(reader.result)
      setProductData((prev) => ({
        ...prev,
        img: reader.result,
      }))
    }
  }

  if (loading && !modalMode) return <CSpinner color="primary" />

  return (
    <div className="category-details-container">
      {/* Header and Search */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{category?.name}</h1>
        <CInputGroup style={{ width: '300px' }}>
          <CInputGroupText>
            <CIcon icon={cilSearch} />
          </CInputGroupText>
          <CFormInput
            placeholder={Language.searchProducts || 'Search products...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CInputGroup>
      </div>

      {/* Add Product Button */}
      <div className="d-flex justify-content-end mb-4">
        <CButton color="success" onClick={openAddModal}>
          <CIcon icon={cilPlus} className="me-2" />
          {Language.addNewProduct}
        </CButton>
      </div>

      {/* Products Grid */}
      <CRow className="g-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-5">
            <CIcon icon={cilWarning} size="xxl" className="text-muted mb-3" />
            <h3 className="text-muted">{Language.noProductsFound || 'No products found'}</h3>
            <p className="text-muted">
              {Language.tryAdjustSearch || 'Try adjusting your search or add new products'}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <CCol key={product._id} xs={12} sm={6} md={4} lg={3}>
              <CCard className="product-card h-100 border-0">
                {/* Product Image with Badges */}
                <div className="product-image-container position-relative">
                  {product.img ? (
                    <img src={product.img} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-image-placeholder">
                      <CIcon icon={cilFastfood} size="xxl" className="text-light opacity-50" />
                    </div>
                  )}

                  {/* Discount Badge */}
                  {product.discountPercentage > 0 && (
                    <div className="discount-badge">-{product.discountPercentage}%</div>
                  )}

                  {/* Quick Actions (hover) */}
                  <div className="product-actions">
                    <CButton
                      color="light"
                      shape="rounded-pill"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(product)
                      }}
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton
                      color="light"
                      shape="rounded-pill"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProduct(product._id)
                      }}
                    >
                      <CIcon icon={cilTrash} className="text-danger" />
                    </CButton>
                  </div>
                </div>

                <CCardBody>
                  {/* Product Title */}
                  <h5 className="product-title mb-2">
                    {product.name}
                    {product.isPopular && (
                      <CBadge color="warning" className="ms-2">
                        {Language.popular || 'Popular'}
                      </CBadge>
                    )}
                  </h5>

                  {/* Product Description */}
                  <p className="product-description text-muted small mb-3">
                    {product.description || Language.noDescription || 'No description available'}
                  </p>

                  {/* Pricing */}
                  <div className="product-pricing">
                    {product.discountPercentage > 0 ? (
                      <>
                        <span className="original-price text-muted text-decoration-line-through me-2">
                          {product.price} {Language.currency || 'TND'}
                        </span>
                        <span className="discounted-price text-danger fw-bold">
                          {(product.price * (1 - product.discountPercentage / 100)).toFixed(2)}{' '}
                          {Language.currency || 'TND'}
                        </span>
                      </>
                    ) : (
                      <span className="current-price fw-bold">
                        {product.price} {Language.currency || 'TND'}
                      </span>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="product-meta d-flex justify-content-between mt-3">
                    {product.category && (
                      <CBadge color="light" className="text-dark">
                        {product.category}
                      </CBadge>
                    )}
                    {product.stock !== undefined && (
                      <small className={product.stock < 5 ? 'text-warning' : 'text-success'}>
                        {product.stock} {Language.inStock || 'in stock'}
                      </small>
                    )}
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          ))
        )}
      </CRow>

      {/* Unified Product Modal */}
      <CModal
        visible={!!modalMode}
        onClose={handleModalClose}
        className="product-modal"
        backdrop="static"
      >
        <CModalHeader className="border-0 pb-0">
          <CModalTitle className="modal-title">
            <CIcon icon={modalMode === 'edit' ? cilPencil : cilPlus} className="me-2" />
            {modalMode === 'edit' ? Language.editProduct : Language.addProduct}
          </CModalTitle>
        </CModalHeader>

        {errorMsg && (
          <CAlert
            color="danger"
            className="alert-dismissible fade show mx-3 mb-0 mt-2"
            closeButton
            onClose={() => setErrorMsg(null)}
          >
            <CIcon icon={cilWarning} className="me-2" />
            {errorMsg}
          </CAlert>
        )}

        <CModalBody className="pt-4">
          <CForm className="row g-3">
            {/* Name Field */}
            <div className="col-md-12">
              <CFormInput
                required
                label={
                  <>
                    {Language.name} <span className="text-danger">*</span>
                  </>
                }
                value={productData.name}
                onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                placeholder={Language.enterProductName || 'Enter product name'}
                className="form-control-lg"
              />
            </div>

            {/* Description Field */}
            <div className="col-md-12">
              <CFormTextarea
                label={Language.description}
                value={productData.description}
                onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                placeholder={Language.enterProductDescription || 'Enter product description'}
                rows={3}
              />
            </div>

            {/* Price & Discount Fields */}
            <div className="col-md-6">
              <CFormInput
                required
                label={
                  <>
                    {Language.price} <span className="text-danger">*</span>
                  </>
                }
                type="number"
                value={productData.price}
                onChange={(e) => setProductData({ ...productData, price: e.target.value })}
                placeholder="0.00"
                className="form-control-lg"
                min="0"
                step="0.01"
              />
            </div>

            <div className="col-md-6">
              <CFormInput
                label={Language.discountPercentage}
                type="number"
                value={productData.discountPercentage || 0}
                onChange={(e) =>
                  setProductData({
                    ...productData,
                    discountPercentage: parseFloat(e.target.value),
                  })
                }
                placeholder="0"
                min="0"
                max="100"
                addon="%"
              />
            </div>

            {/* Image Upload */}
            <div className="col-md-12">
              <div className="image-upload-container">
                <label className="form-label">{Language.image}</label>
                <div className="image-upload-card">
                  <CFormInput
                    type="file"
                    name="img"
                    onChange={handleFileChange}
                    className="d-none"
                    id="productImageUpload"
                    accept="image/*"
                  />
                  <label htmlFor="productImageUpload" className="upload-area">
                    {tempSrc ? (
                      <div className="image-preview-container">
                        <img src={tempSrc} alt="Product Preview" className="image-preview" />
                        <div className="image-overlay">
                          <CIcon icon={cilCloudUpload} size="xl" />
                          <span>{Language.changeImage || 'Change Image'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <CIcon icon={cilCloudUpload} size="xl" />
                        <span>{Language.clickToUpload || 'Click to upload product image'}</span>
                        <small className="text-muted d-block mt-2">
                          {Language.recommendedSize || 'Recommended size: 800x800px'}
                        </small>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </CForm>
        </CModalBody>

        <CModalFooter className="border-0">
          <CButton color="light" onClick={handleModalClose} className="px-4" disabled={loading}>
            {Language.cancel}
          </CButton>
          <CButton
            color="primary"
            onClick={handleSaveProduct}
            className="px-4"
            disabled={loading || !productData.name || !productData.price}
          >
            {loading ? (
              <CSpinner size="sm" />
            ) : modalMode === 'edit' ? (
              Language.saveChanges
            ) : (
              Language.addProduct
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default CategoryDetails
