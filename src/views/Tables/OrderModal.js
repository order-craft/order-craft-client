// ManualOrderModal.jsx
import { useState, useEffect } from 'react'
import {
    CButton,
    CModal,
    CModalBody,
    CModalFooter,
    CModalHeader,
    CModalTitle,
    CFormInput,
    CFormCheck,
    CInputGroup,
    CInputGroupText,
    CPagination,
    CPaginationItem,
    CSpinner,
    CAlert,
    CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCart, cilSearch, cilCheck, cilX, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'

const ManualOrderModal = ({ visible, onClose, tableId, onOrderPlaced, enableOrderType = false }) => {
    const [modalProducts, setModalProducts] = useState([])
    const [productSearchQuery, setProductSearchQuery] = useState('')
    const [selectedProducts, setSelectedProducts] = useState([])
    const [orderType, setOrderType] = useState('to-go')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const token = GetToken()
    const t = useSelector((state) => state.language)
    const Language = translations[t]

    const resetForm = () => {
        setProductSearchQuery('');
        setSelectedProducts([]);
        setOrderType('to-go');
        setCurrentPage(1);
    }

    useEffect(() => {
        if (visible) fetchProducts()
    }, [visible])

    const fetchProducts = async () => {
        setError(null)
        try {
            const { data } = await axios.get(`${BaseUrl}/products`, { headers: { Authorization: `Bearer ${token}` } })
            setModalProducts(data)
        } catch (err) {
            console.error('Error fetching products', err)
            setError(Language.errorFetchingProducts || 'Error fetching products')
        }
    }

    const filteredProducts = modalProducts.filter((p) => p.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
    const indexOfLastProduct = currentPage * itemsPerPage
    const indexOfFirstProduct = indexOfLastProduct - itemsPerPage
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct)
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

    const paginate = (pageNumber) => setCurrentPage(pageNumber)

    const handleProductSelect = (id) => {
        setSelectedProducts((prev) => {
            const exists = prev.find((p) => p.productId === id)
            if (exists) return prev.filter((p) => p.productId !== id)
            return [...prev, { productId: id, quantity: 1 }]
        })
    }

    const handleProductChange = (id, quantity) => {
        setSelectedProducts((prev) => prev.map((p) => (p.productId === id ? { ...p, quantity } : p)))
    }

    const handlePlaceOrder = async () => {
        setError(null)
        setLoading(true)
        try {
            const products = selectedProducts.map((p) => ({ product: p.productId, quantity: p.quantity }))
            const payload = { products, orderType: 'dine-in' }
            if (enableOrderType) {
                payload.orderType = orderType
            } else if (tableId) {
                payload.tableId = tableId
            }
            // console.log(payload)
            await axios.post(`${BaseUrl}/order/manual`, payload, { headers: { Authorization: `Bearer ${token}` } })
            // pass orderType back if enabled
            onOrderPlaced(enableOrderType ? orderType : undefined)
            resetForm()
            onClose()
        } catch (err) {
            console.error('Error placing order', err)
            const msg = err.response?.data?.error || Language.errorPlacingOrder || 'Error placing order'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <CModal visible={visible} onClose={onClose} size="lg" backdrop="static" className="responsive-touch-modal">
            <CModalHeader className="bg-gradient-primary text-white py-3">
                <CModalTitle className="fs-4 fw-bold d-flex align-items-center">
                    <CIcon icon={cilCart} className="me-2" />
                    <span className="d-none d-sm-inline">{Language.selectProducts}</span>
                    <span className="d-inline d-sm-none">Products</span>
                </CModalTitle>
                <CButton color="transparent" onClick={onClose} className="text-white fs-4 p-0" aria-label="Close">
                    &times;
                </CButton>
            </CModalHeader>

            <CModalBody className="p-2 p-md-4">
                {error && <CAlert color="danger">{error}</CAlert>}
                {enableOrderType && (
                    <CInputGroup className="mb-3">
                        <CInputGroupText>{Language.orderType}</CInputGroupText>
                        <CFormSelect value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                            <option value="to-go">{Language.togo}</option>
                            <option value="delivery">{Language.delivery}</option>
                        </CFormSelect>
                    </CInputGroup>
                )}
                {/* Responsive Search */}
                <CInputGroup className="mb-3 mb-md-4 shadow-sm">
                    <CInputGroupText className="bg-white d-none d-md-flex">
                        <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                        placeholder={`${Language.search} ${Language.products}`}
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="py-2 py-md-3"
                        aria-label="Search Products"
                    />
                    <CButton color="primary" className="d-md-none">
                        <CIcon icon={cilSearch} />
                    </CButton>
                </CInputGroup>

                {/* Responsive Product List */}
                <div className="product-list" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    {currentProducts.length ? (
                        currentProducts.map((product) => (
                            <div
                                key={product._id}
                                className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center p-2 p-md-3 mb-2 rounded shadow-sm bg-light-hover"
                            >
                                <div className="d-flex align-items-center gap-2 gap-md-3 w-100 mb-2 mb-md-0">
                                    <CFormCheck
                                        checked={!!selectedProducts.find((p) => p.productId === product._id)}
                                        onChange={() => handleProductSelect(product._id)}
                                        aria-label={`Select ${product.name}`}
                                        className="form-check-lg flex-shrink-0"
                                        style={{ transform: 'scale(1.3)', marginRight: '10px' }}
                                    />
                                    <div className="flex-grow-1 text-truncate">
                                        <div className="fw-bold fs-6 fs-md-5 text-primary text-truncate">{product.name}</div>
                                        {product.description && <div className="text-muted small text-truncate">{product.description}</div>}
                                    </div>
                                </div>

                                {/* Responsive Quantity Controls */}
                                <div className="d-flex align-items-center ms-auto">
                                    <CButton
                                        color="danger"
                                        onClick={() => handleProductChange(product._id, Math.max(1, (selectedProducts.find((p) => p.productId === product._id)?.quantity || 1) - 1))}
                                        className="quantity-btn fs-5 fs-md-4 px-2 px-md-3 py-0"
                                        size="sm"
                                    >
                                        -
                                    </CButton>

                                    <CFormInput
                                        type="number"
                                        min="1"
                                        value={selectedProducts.find((p) => p.productId === product._id)?.quantity || ''}
                                        onChange={(e) => handleProductChange(product._id, +e.target.value)}
                                        className="text-center mx-1 mx-md-2 fs-6 fs-md-5"
                                        style={{ width: '60px', height: '40px', minWidth: '60px' }}
                                        aria-label={`Quantity for ${product.name}`}
                                    />

                                    <CButton
                                        color="success"
                                        onClick={() => handleProductChange(product._id, (selectedProducts.find((p) => p.productId === product._id)?.quantity || 0) + 1)}
                                        className="quantity-btn fs-5 fs-md-4 px-2 px-md-3 py-0"
                                        size="sm"
                                    >
                                        +
                                    </CButton>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 py-md-5">
                            <CIcon icon={cilWarning} className="text-muted fs-2 fs-md-1" />
                            <p className="text-muted fs-5 fs-md-4 mt-2 mt-md-3">{Language.noProductsFound}</p>
                        </div>
                    )}
                </div>

                {/* Responsive Pagination */}
                {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-3 mt-md-4">
                        <CPagination aria-label="Product Pagination">
                            <CPaginationItem disabled={currentPage === 1} onClick={() => paginate(currentPage - 1)} className="px-3 px-md-4 py-1 py-md-2 fs-6 fs-md-5">
                                <span className="d-none d-md-inline">&laquo; Prev</span><span className="d-inline d-md-none">&laquo;</span>
                            </CPaginationItem>
                            {Array.from({ length: Math.min(3, totalPages) }).map((_, index) => {
                                let pageNum
                                if (totalPages <= 3) pageNum = index + 1
                                else if (currentPage <= 2) pageNum = index + 1
                                else if (currentPage >= totalPages - 1) pageNum = totalPages - 2 + index
                                else pageNum = currentPage - 1 + index
                                return (
                                    <CPaginationItem key={pageNum} active={pageNum === currentPage} onClick={() => paginate(pageNum)} className="px-3 px-md-4 py-1 py-md-2 fs-6 fs-md-5">
                                        {pageNum}
                                    </CPaginationItem>
                                )
                            })}
                            <CPaginationItem disabled={currentPage === totalPages} onClick={() => paginate(currentPage + 1)} className="px-3 px-md-4 py-1 py-md-2 fs-6 fs-md-5">
                                <span className="d-none d-md-inline">Next &raquo;</span><span className="d-inline d-md-none">&raquo;</span>
                            </CPaginationItem>
                        </CPagination>
                    </div>
                )}
            </CModalBody>

            <CModalFooter className="bg-light d-flex flex-column flex-md-row justify-content-between py-2 py-md-3 gap-2">
                <CButton disabled={loading || !selectedProducts.length} color="primary" onClick={handlePlaceOrder} className="fs-6 fs-md-5 py-2 py-md-3 px-3 d-flex align-items-center justify-content-center flex-grow-1 w-100 w-md-auto">
                    {loading ? (<><CSpinner size="sm" className="me-2" />{Language.loading}</>) : (<><CIcon icon={cilCheck} className="me-1 me-md-2" />{Language.place} {Language.order}</>)}
                </CButton>
                <CButton color="secondary" onClick={onClose} className="fs-6 fs-md-5 py-2 py-md-3 px-3 w-100 w-md-auto">
                    <CIcon icon={cilX} className="me-1 me-md-2" />{Language.close}
                </CButton>
            </CModalFooter>
        </CModal>
    )
}

export default ManualOrderModal