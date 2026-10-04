import React, { useEffect, useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormCheck,
  CRow,
  CCol,
  CSpinner,
} from '@coreui/react'
import { GetToken } from '../../helpers/GetToken'
import { BaseUrl } from '../../helpers/BaseUrl'
import axios from 'axios'
import './ProductSelectionModal.css'
const ProductSelectionModal = ({
  visible,
  onClose,
  products,
  orderId,
  refetchData,
  paymentMethods = [],
  onShowToast,
  isTakeaway
}) => {
  const [selectedProducts, setSelectedProducts] = useState([]) // Track selected instances
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const token = GetToken()

  const handleConfirmPayment = async (orderId, productIds, paymentMethod) => {
    setLoading(true)

    try {
      let response = null;
      if (isTakeaway) {
        response = await axios.put(
          `${BaseUrl}/order/confirm/confirm-notdinein-products-payment`,
          { orderId, productIds, paymentMethod },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        )
      } else {
        response = await axios.put(
          `${BaseUrl}/order/confirm/confirm-products-payment`,
          { orderId, productIds, paymentMethod },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        )
      }

      if (response.status === 200) {
        const { message, warnings = [] } = response.data

        // Reset states and refetch data
        setSelectedProducts([])
        refetchData()
        setSelectedPaymentMethod('')

        // Show success message
        onShowToast(message || 'Payment confirmed successfully', 'success')

        // Show warnings if any
        if (warnings.length > 0) {
          warnings.forEach((warning) => {
            setTimeout(() => {
              onShowToast(warning, 'warning')
            }, 500) // Small delay to avoid overwhelming
          })
        }
      } else {
        // Handle non-200 status codes
        onShowToast('Failed to confirm payment', 'danger')
        console.error('Failed to confirm payment')
      }
    } catch (error) {
      // Handle different types of errors
      let errorMessage = 'Failed to confirm payment'

      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection.'
      }

      onShowToast(errorMessage, 'danger')
      console.error('Failed to confirm payment:', error)
    } finally {
      setLoading(false)
    }
  }

  // Expand products based on their quantity, assigning each instance a unique instanceId
  const expandedProducts = products.flatMap((product, productIndex) =>
    Array.from({ length: product.quantity }, (_, instanceIndex) => ({
      ...product,
      instanceId: `${product.product._id}-${instanceIndex}`,
      isPaid: instanceIndex < product.payedQuantity, // Flag instances as paid based on payedQuantity
    })),
  )

  const handleProductSelection = (instanceId) => {
    setSelectedProducts((prevSelected) => {
      if (prevSelected.includes(instanceId)) {
        return prevSelected.filter((p) => p !== instanceId)
      } else {
        return [...prevSelected, instanceId] // Store only the instanceId for confirmation
      }
    })
  }

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allProducts = expandedProducts
        .filter((product) => !product.isPaid) // Only select unpaid products
        .map((product) => product.instanceId) // Collect only instanceIds
      setSelectedProducts(allProducts)
    } else {
      setSelectedProducts([]) // Deselect all
    }
  }

  const calculateSelectedTotal = () => {
    return selectedProducts
      .reduce((acc, instanceId) => {
        const product = expandedProducts.find((p) => p.instanceId === instanceId)
        const discount =
          product.product.discountPercentage > 0
            ? (product.product.discountPercentage / 100) * product.product.price
            : 0
        const discountedPrice = product.product.price - discount
        return acc + discountedPrice
      }, 0)
      .toFixed(2)
  }

  useEffect(() => {
    if (!visible) {
      setSelectedProducts([]) // Reset selection when modal is closed
    }
  }, [visible])

  return (
    <CModal visible={visible} onClose={onClose} className="select-products-modal">
      <CModalHeader className="bg-primary text-white">
        <CModalTitle>Select Products</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        <div className="mb-3">
          <label className="form-label fw-bold">Payment Method</label>
          <select
            className="form-select"
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          >
            <option value="">Select a payment method</option>
            {paymentMethods.map((method) => (
              <option key={method._id} value={method._id}>
                {method.name} {method.description ? ` - ${method.description}` : ''}
              </option>
            ))}
          </select>
        </div>
        {/* Select All Checkbox */}
        <div className="d-flex align-items-center mb-3">
          <CFormCheck
            id="selectAll"
            label="Select All"
            className="me-3"
            checked={selectedProducts.length === expandedProducts.filter((p) => !p.isPaid).length}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
          <span className="small text-muted">Select all unpaid items</span>
        </div>

        {/* Product List with Scrollable Area */}
        <div
          className="product-list"
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            background: '#f8f9fa',
          }}
        >
          {expandedProducts.map((product) => (
            <CRow
              key={product.instanceId}
              className={`align-items-center my-2 p-2 rounded product-item ${product.isPaid ? 'paid-product-item' : ''}`}
            >
              <CCol xs={9}>
                <div className="product-details">
                  <strong style={{ color: 'black' }}>{product.product.name}</strong>
                  <div className="small" style={{ color: 'black' }}>
                    {product.product.discountPercentage > 0
                      ? product.product.price -
                      (product.product.discountPercentage / 100) * product.product.price
                      : product.product.price}{' '}
                    TND
                  </div>
                  {product.isPaid && <span className="paid-badge">Paid</span>}
                </div>
              </CCol>
              <CCol xs={3} className="text-end">
                <CFormCheck
                  checked={selectedProducts.includes(product.instanceId)}
                  onChange={() => handleProductSelection(product.instanceId)}
                  disabled={product.isPaid} // Disable instances where payedQuantity is reached
                  className="custom-checkbox"
                />
              </CCol>
            </CRow>
          ))}
        </div>

        {/* Total Selected Price */}
        <div className="mt-4 text-center total-selected">
          <strong>Total Selected: {calculateSelectedTotal()} TND</strong>
        </div>
      </CModalBody>

      {/* Modal Footer with Buttons */}
      <CModalFooter className="d-flex justify-content-between">
        <CButton
          color="secondary"
          className="cancel-button"
          onClick={() => {
            setSelectedProducts([]) // Reset selection on close
            onClose()
          }}
        >
          Close
        </CButton>
        <CButton
          color="primary"
          className="confirm-button"
          onClick={() => {
            handleConfirmPayment(orderId, selectedProducts, selectedPaymentMethod) // Send selected instanceIds
            onClose()
          }}
          disabled={selectedProducts.length === 0 || selectedPaymentMethod == ''}
        >
          {loading ? (<CSpinner />) : (<></>)}
          Confirm Selection
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ProductSelectionModal
