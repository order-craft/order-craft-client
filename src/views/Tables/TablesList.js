import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CRow,
  CModal,
  CInputGroup,
  CFormInput,
  CFormSelect,
  CBadge,
  CFormSwitch,
  CSpinner,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { io } from 'socket.io-client'
import { GetToken } from '../../helpers/GetToken'
import { saveAs } from 'file-saver'
import CIcon from '@coreui/icons-react'
import {
  cilCloudDownload,
  cilQrCode,
  cilTrash,
  cilSave,
  cilInfo,
  cilLayers,
  cilPencil,
  cilPlus,
  cilCheck,
  cilX,
  cilSearch,
  cilSwapHorizontal,
  cilTablet,
  cilRestaurant,
  cilFilter,
  cilOptions,
  cilWarning,
} from '@coreui/icons'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './TableList.css'
import ManualOrderModal from './OrderModal'
import OrderCard from './OrderCard'
import ProductSelectionModal from './ProductSelectionModal'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/toast/ToastProvider'

const TablesDashboard = () => {
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMoveOrdersModal, setShowMoveOrdersModal] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [selectedTable, setSelectedTable] = useState(null)
  const [targetTable, setTargetTable] = useState('')
  const [targetTableNumber, setTargetTableNumber] = useState('')
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState('')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanDescription, setNewPlanDescription] = useState('')
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('all')
  const [showEditPlanModal, setShowEditPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [editPlanName, setEditPlanName] = useState('')
  const [editPlanDescription, setEditPlanDescription] = useState('')
  const [modalPlanFilter, setModalPlanFilter] = useState('all')
  const [orderTypeFilter, setOrderTypeFilter] = useState('all')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [isTakeAway, setIsTakeAway] = useState(false)
  const [showProdSelectModal, setShowProdSelectModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedOrderProducts, setSelectedOrderProducts] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [showPaidOrders, setShowPaidOrders] = useState(false)

  const token = GetToken()
  const { role } = useAuth()
  const isSuperClient = role === 'superClient'

  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const navigate = useNavigate()
  const { showToast } = useToast()

  /* ---------- data fetching ---------- */
  const fetchTables = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const withTotal = response.data.map((table) => {
        const openOrders = (table.orders || []).filter((o) => o.status !== 'archived')
        const totalPrice = openOrders.reduce((acc, order) => acc + Number(order.totalPrice || 0), 0)
        return {
          ...table,
          orderCount: openOrders.length,
          totalPrice,
        }
      })
      setTables(withTotal)
    } catch (err) {
      setError('Error fetching tables')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${BaseUrl}/tables/get/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPlans(response.data)
      if (response.data.length > 0) {
        setSelectedPlan(response.data[0]._id)
      }
    } catch (err) {
      console.error('Error fetching plans:', err)
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${BaseUrl}/order/dineIn/today`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setOrders(data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMethods = async () => {
    try {
      const res = await axios.get(`${BaseUrl}/payment-methods`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      setPaymentMethods(res.data)
    } catch (err) {
      setError('Error fetching payment methods')
    }
  }

  useEffect(() => {
    if (isTakeAway) {
      fetchOrders()
      fetchMethods()
    } else {
      fetchPlans()
      fetchTables()
    }

    const socket = io(BaseUrl, { auth: { token } })
    socket.on(isTakeAway ? 'newOrder' : 'tableUpdated', () => {
      isTakeAway ? fetchOrders() : fetchTables()
    })
    return () => socket.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTakeAway])

  const handleCardClick = (tableId) => {
    navigate(`/tables/${tableId}`)
  }

  const handlePlaceTogoOrder = () => {
    showToast(Language.togoOrderSuccess || 'Order placed', 'success')
  }

  /* ---------- table / plan handlers ---------- */
  const handleCreateTable = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post(
        `${BaseUrl}/tables`,
        { number: tableNumber, plan: selectedPlan },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      showToast(Language.tableCreated || 'Table created', 'success')
      setShowCreateModal(false)
      setTableNumber('')
      fetchTables()
    } catch (err) {
      const msg = err.response?.data?.error || 'Error creating table'
      showToast(msg, 'danger')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async () => {
    try {
      const response = await axios.post(
        `${BaseUrl}/tables/plans`,
        { name: newPlanName, description: newPlanDescription },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setPlans([...plans, response.data])
      setNewPlanName('')
      setNewPlanDescription('')
      showToast(Language.planCreated || 'Plan created', 'success')
    } catch (err) {
      showToast('Error creating plan', 'danger')
    }
  }

  const handleEditPlan = (plan) => {
    setEditingPlan(plan)
    setEditPlanName(plan.name)
    setEditPlanDescription(plan.description || '')
    setShowEditPlanModal(true)
  }

  const handleUpdatePlan = async () => {
    try {
      await axios.put(
        `${BaseUrl}/tables/plans/${editingPlan._id}`,
        { name: editPlanName, description: editPlanDescription },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      fetchPlans()
      showToast(Language.planUpdated || 'Plan updated', 'success')
      setShowEditPlanModal(false)
    } catch (err) {
      showToast('Error updating plan', 'danger')
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Delete this plan? Tables using it will not be deleted.')) return
    try {
      await axios.delete(`${BaseUrl}/tables/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchPlans()
      showToast(Language.planDeleted || 'Plan deleted', 'success')
    } catch (err) {
      showToast('Error deleting plan', 'danger')
    }
  }

  const downloadQRCode = (number, url) => {
    saveAs(url, `Table-${number}-QRCode.png`)
  }

  const handleDeleteTable = async (tableId, unpaidOrders) => {
    if (unpaidOrders) {
      showToast('Cannot delete a table with unpaid orders.', 'danger')
      return
    }
    if (!window.confirm('Deleting the table will also delete any orders assigned to it. Continue?'))
      return
    setLoading(true)
    try {
      await axios.delete(`${BaseUrl}/tables/${tableId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      showToast(Language.tableDeleted || 'Table deleted', 'success')
      fetchTables()
    } catch (err) {
      showToast('Error deleting table', 'danger')
    } finally {
      setLoading(false)
    }
  }

  const handleMoveOrders = async () => {
    if (!targetTable) {
      showToast('Please select a target table.', 'danger')
      return
    }
    setLoading(true)
    try {
      await axios.post(
        `${BaseUrl}/tables/move-orders`,
        { sourceTableId: selectedTable._id, targetTableId: targetTable },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      showToast(Language.ordersMoved || 'Orders moved', 'success')
      setShowMoveOrdersModal(false)
      fetchTables()
    } catch (err) {
      showToast('Error moving orders', 'danger')
    } finally {
      setLoading(false)
    }
  }

  /* ---------- filters ---------- */
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch = table.number.toString().includes(searchTerm)
      const matchesPlan = selectedPlanFilter === 'all' || table.plan === selectedPlanFilter
      return matchesSearch && matchesPlan
    })
  }, [tables, searchTerm, selectedPlanFilter])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesPayStatus = showPaidOrders || !order.payed
      const matchesSearch = order.orderNumber.toString().includes(searchTerm)
      const matchesType = orderTypeFilter === 'all' || order.orderType === orderTypeFilter
      return matchesSearch && matchesType && matchesPayStatus
    })
  }, [orders, searchTerm, orderTypeFilter, showPaidOrders])

  const moveOrdersTargets = useMemo(() => {
    return tables.filter(
      (table) =>
        table.number.toString().includes(targetTableNumber) &&
        table._id !== selectedTable?._id &&
        (modalPlanFilter === 'all' || table.plan === modalPlanFilter),
    )
  }, [tables, targetTableNumber, selectedTable, modalPlanFilter])

  const busyCount = filteredTables.filter((t) => t.orderCount > 0).length

  /* ---------- render ---------- */
  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <div className="tl-header">
              {/* Title row */}
              <div className="tl-header-top">
                <div>
                  <h5 className="tl-title">
                    {isTakeAway
                      ? Language.ordersToday || 'Orders today'
                      : Language.tables || 'Tables'}
                  </h5>
                  <div className="tl-subtitle">
                    {isTakeAway ? (
                      <>
                        <strong>{filteredOrders.length}</strong>{' '}
                        {filteredOrders.length === 1 ? 'order' : 'orders'}
                      </>
                    ) : (
                      <>
                        <strong>{filteredTables.length}</strong>{' '}
                        {filteredTables.length === 1 ? 'table' : 'tables'}
                        {' · '}
                        <strong>{busyCount}</strong> busy
                      </>
                    )}
                  </div>
                </div>

                <div className="tl-top-right">
                  <div className="tl-segments" role="tablist">
                    <button
                      type="button"
                      className={`tl-segment ${!isTakeAway ? 'is-active' : ''}`}
                      onClick={() => setIsTakeAway(false)}
                    >
                      <CIcon icon={cilTablet} />
                      {Language.tables || 'Tables'}
                    </button>
                    <button
                      type="button"
                      className={`tl-segment ${isTakeAway ? 'is-active' : ''}`}
                      onClick={() => setIsTakeAway(true)}
                    >
                      <CIcon icon={cilRestaurant} />
                      {Language.takeawayDeliveryOnly || 'Takeaway'}
                    </button>
                  </div>

                  {/* Primary action */}
                  {isTakeAway ? null : (
                    <CButton color="primary" onClick={() => setShowOrderModal(true)}>
                      <CIcon icon={cilPlus} className="me-2" />
                      {Language.newTogo || 'New to-go'}
                    </CButton>
                  )}
                </div>
              </div>

              {/* Filter row */}
              <div className="tl-header-controls">
                <div className="tl-controls-left">
                  <div className="tl-search">
                    <CIcon icon={cilSearch} className="tl-search-icon" />
                    <input
                      type="text"
                      placeholder={
                        isTakeAway
                          ? Language.searchByOrderNumber || 'Search by order number'
                          : Language.searchByTableNumber || 'Search by table number'
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search"
                    />
                  </div>

                  {isTakeAway ? (
                    <>
                      <div className="tl-filter">
                        <CIcon icon={cilFilter} className="tl-filter-icon" />
                        <select
                          value={orderTypeFilter}
                          onChange={(e) => setOrderTypeFilter(e.target.value)}
                          aria-label="Order type"
                        >
                          <option value="all">{Language.allTypes || 'All types'}</option>
                          <option value="to-go">{Language.togo}</option>
                          <option value="delivery">{Language.delivery}</option>
                        </select>
                      </div>
                      <CFormSwitch
                        id="tl-paid-toggle"
                        label={Language.showPaidOrders || 'Show paid'}
                        checked={showPaidOrders}
                        onChange={(e) => setShowPaidOrders(e.target.checked)}
                        className="tl-paid-switch"
                      />
                    </>
                  ) : (
                    <div className="tl-filter">
                      <CIcon icon={cilFilter} className="tl-filter-icon" />
                      <select
                        value={selectedPlanFilter}
                        onChange={(e) => setSelectedPlanFilter(e.target.value)}
                        aria-label="Plan"
                      >
                        <option value="all">{Language.allPlans || 'All plans'}</option>
                        {plans.map((plan) => (
                          <option key={plan._id} value={plan._id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {!isTakeAway && isSuperClient && (
                  <div className="tl-controls-right">
                    <CButton
                      color="secondary"
                      variant="outline"
                      onClick={() => setShowCreateModal(true)}
                      className="tl-action-btn"
                    >
                      <CIcon icon={cilPlus} className="me-2" />
                      {Language.table || 'Table'}
                    </CButton>
                    <CButton
                      color="secondary"
                      variant="outline"
                      onClick={() => setShowPlanModal(true)}
                      className="tl-action-btn"
                    >
                      <CIcon icon={cilLayers} className="me-2" />
                      {Language.managePlans || 'Plans'}
                    </CButton>
                  </div>
                )}
              </div>
            </div>

            <CCardBody>
              {error && <div className="alert alert-danger mb-3">{error}</div>}

              {/* Skeleton loading */}
              {loading && tables.length === 0 && !isTakeAway && (
                <CRow className="g-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <CCol xs={12} sm={6} md={4} lg={3} xl={2} key={i}>
                      <div className="tl-skeleton-card" />
                    </CCol>
                  ))}
                </CRow>
              )}

              {/* Takeaway skeleton */}
              {loading && orders.length === 0 && isTakeAway && (
                <CRow className="g-3">
                  {[1, 2, 3, 4].map((i) => (
                    <CCol xs={12} sm={6} md={6} lg={4} key={i}>
                      <div className="tl-skeleton-card" />
                    </CCol>
                  ))}
                </CRow>
              )}

              {/* Content */}
              {!loading || tables.length > 0 || orders.length > 0 ? (
                <CRow className="g-3">
                  {isTakeAway
                    ? filteredOrders.map((order) => (
                        <OrderCard
                          key={order._id}
                          order={order}
                          onClick={() => {
                            setSelectedOrderId(order._id)
                            setSelectedOrderProducts(order.products)
                            setShowProdSelectModal(true)
                          }}
                          paymentMethods={paymentMethods}
                          refreshOrders={fetchOrders}
                          onShowToast={showToast}
                        />
                      ))
                    : filteredTables.map((table) => {
                        const busy = table.orderCount > 0
                        return (
                          <CCol xs={12} sm={6} md={4} lg={3} xl={2} key={table._id}>
                            <div
                              className={`tl-card ${busy ? 'is-busy' : ''}`}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                // ignore clicks that originated from the menu
                                if (e.target.closest('.tl-card-menu-btn')) return
                                if (e.target.closest('.dropdown-menu')) return
                                handleCardClick(table._id)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  handleCardClick(table._id)
                                }
                              }}
                            >
                              <div className="tl-card-top">
                                <div className={`tl-card-number ${busy ? 'is-busy' : ''}`}>
                                  {table.number}
                                </div>

                                <CDropdown variant="btn-group" className="tl-card-dropdown">
                                  {' '}
                                  <CDropdownToggle
                                    color="transparent"
                                    caret={false}
                                    className="tl-card-menu-btn"
                                  >
                                    <CIcon icon={cilOptions} />
                                  </CDropdownToggle>
                                  <CDropdownMenu className="tl-card-menu" placement="bottom-end">
                                    <CDropdownItem
                                      onClick={(e) => {
                                        downloadQRCode(table.number, table.qrCode)
                                      }}
                                    >
                                      <CIcon icon={cilCloudDownload} className="me-2" />
                                      {Language.downloadQR || 'Download QR'}
                                    </CDropdownItem>
                                    <CDropdownItem
                                      onClick={(e) => {
                                        setSelectedTable(table)
                                        setShowMoveOrdersModal(true)
                                      }}
                                    >
                                      <CIcon icon={cilSwapHorizontal} className="me-2" />
                                      {Language.switchTable || 'Move orders'}
                                    </CDropdownItem>
                                    {isSuperClient && (
                                      <CDropdownItem
                                        onClick={(e) => {
                                          handleDeleteTable(table._id, table.unpaidOrders)
                                        }}
                                      >
                                        <CIcon icon={cilTrash} className="me-2 text-danger" />
                                        <span className="text-danger">
                                          {Language.deleteTable || 'Delete table'}
                                        </span>
                                      </CDropdownItem>
                                    )}
                                  </CDropdownMenu>
                                </CDropdown>
                              </div>

                              <div className="tl-card-body">
                                <div className="tl-card-plan">
                                  {plans.find((p) => p._id === table.plan)?.name || 'No plan'}
                                </div>
                                <div className="tl-card-meta">
                                  {busy ? (
                                    <>
                                      <span className="tl-card-orders">
                                        {table.orderCount}{' '}
                                        {table.orderCount === 1 ? 'order' : 'orders'}
                                      </span>
                                      <span className="tl-card-total">
                                        {table.totalPrice.toFixed(2)} TND
                                      </span>
                                    </>
                                  ) : (
                                    <span className="tl-card-free">Available</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CCol>
                        )
                      })}
                </CRow>
              ) : null}

              {/* Empty state - no tables */}
              {!loading && !isTakeAway && tables.length === 0 && (
                <div className="tl-empty">
                  <CIcon icon={cilTablet} size="xl" />
                  <div className="tl-empty-title">{Language.noTablesYet || 'No tables yet'}</div>
                  <div className="tl-empty-body">
                    {Language.noTablesHint ||
                      'Start by creating a plan for your floor, then add tables to it.'}
                  </div>
                  <CButton color="primary" onClick={() => setShowPlanModal(true)}>
                    <CIcon icon={cilLayers} className="me-2" />
                    {Language.managePlans || 'Manage plans'}
                  </CButton>
                </div>
              )}

              {/* Empty state - no matching tables */}
              {!loading && !isTakeAway && tables.length > 0 && filteredTables.length === 0 && (
                <div className="tl-empty">
                  <CIcon icon={cilWarning} size="xl" />
                  <div className="tl-empty-title">
                    {Language.noTablesMatch || 'No tables match'}
                  </div>
                  <div className="tl-empty-body">
                    {Language.noTablesMatchHint || 'Try a different search term or plan.'}
                  </div>
                </div>
              )}

              {/* Empty state - no orders today */}
              {!loading && isTakeAway && orders.length === 0 && (
                <div className="tl-empty">
                  <CIcon icon={cilRestaurant} size="xl" />
                  <div className="tl-empty-title">
                    {Language.noOrdersToday || 'No takeaway orders today'}
                  </div>
                  <div className="tl-empty-body">
                    {Language.noOrdersTodayHint ||
                      'New takeaway and delivery orders will appear here.'}
                  </div>
                  <CButton color="primary" onClick={() => setShowOrderModal(true)}>
                    <CIcon icon={cilPlus} className="me-2" />
                    {Language.newTogo || 'New to-go'}
                  </CButton>
                </div>
              )}

              {/* Empty state - no matching orders */}
              {!loading && isTakeAway && orders.length > 0 && filteredOrders.length === 0 && (
                <div className="tl-empty">
                  <CIcon icon={cilWarning} size="xl" />
                  <div className="tl-empty-title">
                    {Language.noOrdersMatch || 'No orders match'}
                  </div>
                  <div className="tl-empty-body">
                    {Language.noOrdersMatchHint || 'Try a different search or filter.'}
                  </div>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Move Orders modal */}
      <CModal
        visible={showMoveOrdersModal}
        onClose={() => setShowMoveOrdersModal(false)}
        size="lg"
        backdrop="static"
        className="tm-modal"
      >
        <div className="tm-header">
          <div>
            <h5 className="tm-header-title">
              <CIcon icon={cilSwapHorizontal} />
              {Language.moveOrdersToAnotherTable}
            </h5>
            <div className="tm-header-sub">
              Source: {Language.table} {selectedTable?.number}
            </div>
          </div>
          <button
            className="tm-close"
            onClick={() => setShowMoveOrdersModal(false)}
            aria-label="Close"
            type="button"
          >
            &times;
          </button>
        </div>

        <div className="tm-body">
          <CRow className="g-3">
            <CCol md={8}>
              <div className="tm-field" style={{ marginBottom: 0 }}>
                <label htmlFor="tm-target-search">
                  {Language.searchByTableNumber || 'Search by table number'}
                </label>
                <CInputGroup>
                  <CFormInput
                    id="tm-target-search"
                    type="text"
                    placeholder="12"
                    value={targetTableNumber}
                    onChange={(e) => {
                      setTargetTableNumber(e.target.value)
                      setTargetTable('')
                    }}
                  />
                </CInputGroup>
              </div>
            </CCol>
            <CCol md={4}>
              <div className="tm-field" style={{ marginBottom: 0 }}>
                <label htmlFor="tm-target-plan">{Language.plan || 'Plan'}</label>
                <CFormSelect
                  id="tm-target-plan"
                  value={modalPlanFilter}
                  onChange={(e) => setModalPlanFilter(e.target.value)}
                >
                  <option value="all">{Language.allPlans}</option>
                  {plans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            </CCol>
          </CRow>

          <div className="tm-list">
            {moveOrdersTargets.length === 0 ? (
              <div className="tm-plans-empty" style={{ margin: 14 }}>
                {Language.noTablesFound || 'No matching tables'}
              </div>
            ) : (
              moveOrdersTargets.map((table) => {
                const isSelected = targetTable === table._id
                return (
                  <div
                    key={table._id}
                    className={`tm-row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setTargetTable(table._id)
                      setTargetTableNumber(table.number)
                    }}
                  >
                    <div>
                      <p className="tm-row-title">
                        {Language.table} {table.number}
                      </p>
                      <div className="tm-row-meta">
                        {plans.find((p) => p._id === table.plan)?.name || 'No plan'}
                      </div>
                    </div>
                    <span className="tm-row-tag">
                      {isSelected ? Language.selected || 'Selected' : Language.select || 'Select'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="tm-footer">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => setShowMoveOrdersModal(false)}
          >
            <CIcon icon={cilX} className="me-2" />
            {Language.cancel}
          </CButton>
          <div className="tm-footer-right">
            <CButton color="primary" onClick={handleMoveOrders} disabled={!targetTable || loading}>
              {loading ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  {Language.loading}
                </>
              ) : (
                <>
                  <CIcon icon={cilSwapHorizontal} className="me-2" />
                  {Language.moveOrders}
                </>
              )}
            </CButton>
          </div>
        </div>
      </CModal>

      {/* Create Table modal */}
      <CModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        backdrop="static"
        className="tm-modal"
      >
        <div className="tm-header">
          <div>
            <h5 className="tm-header-title">
              <CIcon icon={cilPlus} />
              {Language.create} {Language.new} {Language.table}
            </h5>
            <div className="tm-header-sub">Give the new table a number and assign a plan.</div>
          </div>
          <button
            className="tm-close"
            onClick={() => setShowCreateModal(false)}
            aria-label="Close"
            type="button"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleCreateTable}>
          <div className="tm-body">
            <div className="tm-field">
              <label htmlFor="tm-table-number">
                {Language.table} {Language.number || 'number'}
              </label>
              <CFormInput
                id="tm-table-number"
                type="number"
                placeholder={Language.enterTableNumber}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                required
              />
            </div>

            <div className="tm-field">
              <label htmlFor="tm-table-plan">{Language.plan || 'Plan'}</label>
              <CFormSelect
                id="tm-table-plan"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name}
                  </option>
                ))}
              </CFormSelect>
              {plans.length === 0 && (
                <div className="tm-hint">No plans yet — create one from "Manage Plans".</div>
              )}
            </div>
          </div>

          <div className="tm-footer">
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={loading}
            >
              <CIcon icon={cilX} className="me-2" />
              {Language.cancel}
            </CButton>
            <div className="tm-footer-right">
              <CButton
                color="primary"
                type="submit"
                disabled={loading || !tableNumber || !selectedPlan}
              >
                {loading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    {Language.loading || 'Loading'}
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCheck} className="me-2" />
                    {Language.create} {Language.table}
                  </>
                )}
              </CButton>
            </div>
          </div>
        </form>
      </CModal>

      {/* Manage Plans modal */}
      <CModal
        visible={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        size="xl"
        backdrop="static"
        className="tm-modal"
      >
        <div className="tm-header">
          <div>
            <h5 className="tm-header-title">
              <CIcon icon={cilLayers} />
              {Language.manageTablePlans}
            </h5>
            <div className="tm-header-sub">
              Organize your floor into plans and assign tables to them.
            </div>
          </div>
          <button
            className="tm-close"
            onClick={() => setShowPlanModal(false)}
            aria-label="Close"
            type="button"
          >
            &times;
          </button>
        </div>

        <div className="tm-body">
          <div className="tm-plans-layout">
            <div>
              <div className="tm-plans-section-title">
                {Language.createNewPlan || 'Create a new plan'}
              </div>

              <div className="tm-field">
                <label htmlFor="tm-new-plan-name">{Language.planName || 'Plan name'}</label>
                <CFormInput
                  id="tm-new-plan-name"
                  placeholder="e.g., VIP Section"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                />
              </div>

              <div className="tm-field">
                <label htmlFor="tm-new-plan-desc">{Language.description || 'Description'}</label>
                <CFormInput
                  id="tm-new-plan-desc"
                  placeholder={Language.description}
                  value={newPlanDescription}
                  onChange={(e) => setNewPlanDescription(e.target.value)}
                />
              </div>

              <CButton
                color="primary"
                onClick={handleCreatePlan}
                disabled={!newPlanName.trim()}
                className="w-100"
              >
                <CIcon icon={cilSave} className="me-2" />
                {Language.createNewPlan || 'Create plan'}
              </CButton>
            </div>

            <div>
              <div className="tm-plans-section-title">
                {Language.existingPlans || 'Existing plans'}
              </div>

              {plans.length === 0 ? (
                <div className="tm-plans-empty">
                  <CIcon icon={cilInfo} size="xl" />
                  <div className="mt-2">{Language.noPlansCreatedYet || 'No plans yet'}</div>
                </div>
              ) : (
                <div className="tm-plans-list">
                  {plans.map((plan) => {
                    const usageCount = tables.filter((t) => t.plan === plan._id).length
                    return (
                      <div key={plan._id} className="tm-plan-card">
                        <div>
                          <p className="tm-plan-card-name">{plan.name}</p>
                          <p className="tm-plan-card-desc">
                            {plan.description || Language.noDescriptionProvided || 'No description'}
                          </p>
                          <CBadge color="info" className="mt-2">
                            {usageCount} {Language.tables}
                          </CBadge>
                        </div>
                        <div className="tm-plan-card-actions">
                          <CButton
                            color="outline-primary"
                            size="sm"
                            onClick={() => handleEditPlan(plan)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="outline-danger"
                            size="sm"
                            onClick={() => handleDeletePlan(plan._id)}
                            disabled={usageCount > 0}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tm-footer">
          <CButton color="secondary" variant="outline" onClick={() => setShowPlanModal(false)}>
            {Language.close}
          </CButton>
        </div>
      </CModal>

      {/* Edit Plan modal */}
      <CModal
        visible={showEditPlanModal}
        onClose={() => setShowEditPlanModal(false)}
        backdrop="static"
        className="tm-modal"
      >
        <div className="tm-header">
          <div>
            <h5 className="tm-header-title">
              <CIcon icon={cilPencil} />
              {Language.editPlan || 'Edit plan'}
            </h5>
          </div>
          <button
            className="tm-close"
            onClick={() => setShowEditPlanModal(false)}
            aria-label="Close"
            type="button"
          >
            &times;
          </button>
        </div>

        <div className="tm-body">
          <div className="tm-field">
            <label htmlFor="tm-edit-plan-name">{Language.planName}</label>
            <CFormInput
              id="tm-edit-plan-name"
              value={editPlanName}
              onChange={(e) => setEditPlanName(e.target.value)}
            />
          </div>
          <div className="tm-field">
            <label htmlFor="tm-edit-plan-desc">{Language.description}</label>
            <CFormInput
              id="tm-edit-plan-desc"
              value={editPlanDescription}
              onChange={(e) => setEditPlanDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="tm-footer">
          <CButton color="secondary" variant="outline" onClick={() => setShowEditPlanModal(false)}>
            {Language.cancel}
          </CButton>
          <div className="tm-footer-right">
            <CButton color="primary" onClick={handleUpdatePlan}>
              {Language.updatePlan}
            </CButton>
          </div>
        </div>
      </CModal>

      <ManualOrderModal
        visible={showOrderModal}
        onClose={setShowOrderModal}
        onOrderPlaced={handlePlaceTogoOrder}
        enableOrderType={true}
      />

      <ProductSelectionModal
        visible={showProdSelectModal}
        onClose={setShowProdSelectModal}
        products={selectedOrderProducts}
        orderId={selectedOrderId}
        paymentMethods={paymentMethods}
        refetchData={fetchOrders}
        onShowToast={showToast}
        isTakeaway={true}
      />
    </>
  )
}

export default TablesDashboard
