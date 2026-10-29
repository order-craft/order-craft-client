import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CRow,
  CModal,
  CFormInput,
  CFormSelect,
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
  cilCalendar,
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
  const [takeawayRange, setTakeawayRange] = useState('today')
  const [takeawayFrom, setTakeawayFrom] = useState('')
  const [takeawayTo, setTakeawayTo] = useState('')

  // Keep the latest fetchOrders available to the socket handler without
  // re-subscribing on every state change.
  const fetchOrdersRef = useRef(null)
  const fetchTablesRef = useRef(null)

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
      showToast(
        err.response?.data?.error || Language.fetchError || 'Could not load tables',
        'danger',
      )
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
    // Guard: don't fetch until the user has picked both dates for a custom range.
    if (takeawayRange === 'custom' && (!takeawayFrom || !takeawayTo)) {
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ range: takeawayRange })
      if (takeawayRange === 'custom' && takeawayFrom && takeawayTo) {
        params.set('from', takeawayFrom)
        params.set('to', takeawayTo)
      }
      const { data } = await axios.get(`${BaseUrl}/order/takeaway?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setOrders(data.data || [])
    } catch (err) {
      showToast(
        err.response?.data?.error ||
          err.response?.data?.message ||
          Language.fetchError ||
          'Could not load takeaway orders',
        'danger',
      )
      setOrders([])
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
      console.error('Error fetching payment methods:', err)
    }
  }

  fetchOrdersRef.current = fetchOrders
  fetchTablesRef.current = fetchTables

  // Data fetch — depends on the takeaway range too
  useEffect(() => {
    if (isTakeAway) {
      fetchOrders()
      fetchMethods()
    } else {
      fetchPlans()
      fetchTables()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTakeAway, takeawayRange, takeawayFrom, takeawayTo])

  // Socket — stays mounted across range changes
  useEffect(() => {
    const socket = io(BaseUrl, { auth: { token } })
    socket.on(isTakeAway ? 'newOrder' : 'tableUpdated', () => {
      if (isTakeAway) fetchOrdersRef.current?.()
      else fetchTablesRef.current?.()
    })
    return () => socket.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTakeAway, token])

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

  // Whether we're waiting on the user to pick both custom dates.
  const waitingForCustomRange =
    isTakeAway && takeawayRange === 'custom' && (!takeawayFrom || !takeawayTo)

  /* ---------- render ---------- */
  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="tl-page">
            {/* ── Header ──────────────────────────────────────── */}
            <div className="tl-page-head">
              <div className="tl-page-head-left">
                <h1 className="tl-page-title">
                  {isTakeAway
                    ? Language.takeawayDeliveryOnly || 'Takeaway orders'
                    : Language.tables || 'Tables'}
                </h1>
                <p className="tl-page-subtitle">
                  {isTakeAway
                    ? `${filteredOrders.length} ${
                        filteredOrders.length === 1 ? 'order' : 'orders'
                      } · ${describeRange()}`
                    : `${filteredTables.length} ${
                        filteredTables.length === 1 ? 'table' : 'tables'
                      } · ${busyCount} occupied`}
                </p>
              </div>

              <div className="tl-page-head-right">
                <div className="tl-switch" role="tablist" aria-label="View mode">
                  <button
                    type="button"
                    className={`tl-switch-btn ${!isTakeAway ? 'is-active' : ''}`}
                    onClick={() => setIsTakeAway(false)}
                    aria-pressed={!isTakeAway}
                  >
                    <CIcon icon={cilTablet} />
                    <span>{Language.tables || 'Tables'}</span>
                  </button>
                  <button
                    type="button"
                    className={`tl-switch-btn ${isTakeAway ? 'is-active' : ''}`}
                    onClick={() => setIsTakeAway(true)}
                    aria-pressed={isTakeAway}
                  >
                    <CIcon icon={cilRestaurant} />
                    <span>{Language.takeawayDeliveryOnly || 'Takeaway'}</span>
                  </button>
                </div>

                {!isTakeAway && (
                  <CButton
                    color="primary"
                    className="tl-primary-action"
                    onClick={() => setShowOrderModal(true)}
                  >
                    <CIcon icon={cilPlus} className="me-2" />
                    {Language.newTogo || 'New to-go'}
                  </CButton>
                )}
              </div>
            </div>

            {/* ── Filter bar ──────────────────────────────────── */}
            <div className="tl-page-filters">
              <div className="tl-page-filters-left">
                <div className="tl-search tl-search--fixed">
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

                {!isTakeAway && (
                  <div className="tl-select">
                    <CIcon icon={cilLayers} className="tl-select-icon" />
                    <select
                      value={selectedPlanFilter}
                      onChange={(e) => setSelectedPlanFilter(e.target.value)}
                      aria-label="Filter by plan"
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

                {isTakeAway && (
                  <>
                    <div className="tl-select">
                      <CIcon icon={cilFilter} className="tl-select-icon" />
                      <select
                        value={orderTypeFilter}
                        onChange={(e) => setOrderTypeFilter(e.target.value)}
                        aria-label="Order type"
                      >
                        <option value="all">{Language.allTypes || 'All types'}</option>
                        <option value="to-go">{Language.togo || 'To-go'}</option>
                        <option value="delivery">{Language.delivery || 'Delivery'}</option>
                      </select>
                    </div>

                    <div className="tl-segmented" role="tablist" aria-label="Range">
                      {[
                        { key: 'today', label: Language.takeawayRangeToday || 'Today' },
                        {
                          key: 'thisWeek',
                          label: Language.takeawayRangeThisWeek || 'This week',
                        },
                        { key: 'all', label: Language.takeawayRangeAll || 'All time' },
                        {
                          key: 'custom',
                          label: Language.takeawayCustomRange || 'Custom',
                        },
                      ].map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          className={`tl-segmented-btn ${
                            takeawayRange === r.key ? 'is-active' : ''
                          }`}
                          onClick={() => setTakeawayRange(r.key)}
                          aria-pressed={takeawayRange === r.key}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>

                    <CFormSwitch
                      id="tl-paid-toggle"
                      label={Language.showPaidOrders || 'Show paid'}
                      checked={showPaidOrders}
                      onChange={(e) => setShowPaidOrders(e.target.checked)}
                      className="tl-paid-switch"
                    />
                  </>
                )}
              </div>

              {!isTakeAway && isSuperClient && (
                <div className="tl-page-filters-right">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => setShowCreateModal(true)}
                    className="tl-action-btn"
                  >
                    <CIcon icon={cilPlus} className="me-2" />
                    {Language.table || 'New table'}
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => setShowPlanModal(true)}
                    className="tl-action-btn"
                  >
                    <CIcon icon={cilLayers} className="me-2" />
                    {Language.managePlans || 'Manage plans'}
                  </CButton>
                </div>
              )}
            </div>

            {/* ── Custom date picker row (only in custom mode) ── */}
            {isTakeAway && takeawayRange === 'custom' && (
              <div className="tl-date-row">
                <div className="tl-date">
                  <CIcon icon={cilCalendar} className="tl-date-icon" />
                  <input
                    type="date"
                    value={takeawayFrom}
                    max={takeawayTo || undefined}
                    onChange={(e) => setTakeawayFrom(e.target.value)}
                    aria-label={Language.takeawayFrom || 'From'}
                  />
                </div>
                <span className="tl-date-sep">→</span>
                <div className="tl-date">
                  <CIcon icon={cilCalendar} className="tl-date-icon" />
                  <input
                    type="date"
                    value={takeawayTo}
                    min={takeawayFrom || undefined}
                    onChange={(e) => setTakeawayTo(e.target.value)}
                    aria-label={Language.takeawayTo || 'To'}
                  />
                </div>
              </div>
            )}

            {/* ── Content ─────────────────────────────────────── */}
            <CCardBody className="tl-page-body">
              {/* Takeaway: waiting for the user to pick both dates */}
              {waitingForCustomRange ? (
                <div className="tl-empty">
                  <div className="tl-empty-icon">
                    <CIcon icon={cilCalendar} size="xl" />
                  </div>
                  <div className="tl-empty-title">{Language.pickRange || 'Pick a date range'}</div>
                  <div className="tl-empty-body">
                    {Language.pickRangeHint ||
                      'Choose a start and end date above to see the orders.'}
                  </div>
                </div>
              ) : loading && isTakeAway && orders.length === 0 ? (
                <div className="tl-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div className="tl-skeleton-card" key={i} />
                  ))}
                </div>
              ) : loading && !isTakeAway && tables.length === 0 ? (
                <div className="tl-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div className="tl-skeleton-card" key={i} />
                  ))}
                </div>
              ) : isTakeAway ? (
                /* Takeaway grid */
                filteredOrders.length > 0 ? (
                  <CRow className="g-3">
                    {filteredOrders.map((order) => (
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
                    ))}
                  </CRow>
                ) : orders.length > 0 ? (
                  <div className="tl-empty">
                    <div className="tl-empty-icon">
                      <CIcon icon={cilWarning} size="xl" />
                    </div>
                    <div className="tl-empty-title">
                      {Language.noOrdersMatch || 'No orders match'}
                    </div>
                    <div className="tl-empty-body">
                      {Language.noOrdersMatchHint || 'Try a different search or filter.'}
                    </div>
                  </div>
                ) : (
                  <div className="tl-empty">
                    <div className="tl-empty-icon">
                      <CIcon icon={cilRestaurant} size="xl" />
                    </div>
                    <div className="tl-empty-title">
                      {Language.noOrdersToday || 'No takeaway orders'}
                    </div>
                    <div className="tl-empty-body">
                      {Language.noOrdersTodayHint ||
                        'New takeaway and delivery orders will appear here.'}
                    </div>
                    <CButton
                      color="primary"
                      className="tl-empty-cta"
                      onClick={() => setShowOrderModal(true)}
                    >
                      <CIcon icon={cilPlus} className="me-2" />
                      {Language.newTogo || 'New to-go'}
                    </CButton>
                  </div>
                )
              ) : /* Tables grid */
              filteredTables.length > 0 ? (
                <div className="tl-grid">
                  {filteredTables.map((table) => (
                    <TableCard
                      key={table._id}
                      table={table}
                      plans={plans}
                      isSuperClient={isSuperClient}
                      onOpen={() => handleCardClick(table._id)}
                      onDownloadQR={() => downloadQRCode(table.number, table.qrCode)}
                      onMoveOrders={() => {
                        setSelectedTable(table)
                        setShowMoveOrdersModal(true)
                      }}
                      onDelete={() => handleDeleteTable(table._id, table.unpaidOrders)}
                      Language={Language}
                    />
                  ))}
                </div>
              ) : tables.length > 0 ? (
                <div className="tl-empty">
                  <div className="tl-empty-icon">
                    <CIcon icon={cilWarning} size="xl" />
                  </div>
                  <div className="tl-empty-title">
                    {Language.noTablesMatch || 'No tables match'}
                  </div>
                  <div className="tl-empty-body">
                    {Language.noTablesMatchHint || 'Try a different search term or plan.'}
                  </div>
                </div>
              ) : (
                <div className="tl-empty">
                  <div className="tl-empty-icon">
                    <CIcon icon={cilTablet} size="xl" />
                  </div>
                  <div className="tl-empty-title">{Language.noTablesYet || 'No tables yet'}</div>
                  <div className="tl-empty-body">
                    {Language.noTablesHint ||
                      'Start by creating a plan for your floor, then add tables to it.'}
                  </div>
                  <CButton
                    color="primary"
                    className="tl-empty-cta"
                    onClick={() => setShowPlanModal(true)}
                  >
                    <CIcon icon={cilLayers} className="me-2" />
                    {Language.managePlans || 'Manage plans'}
                  </CButton>
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
          <div className="tm-header-icon">
            <CIcon icon={cilSwapHorizontal} />
          </div>
          <div className="tm-header-text">
            <h5 className="tm-header-title">{Language.moveOrdersToAnotherTable}</h5>
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
      </CModal>

      {/* Create Table modal */}
      <CModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        backdrop="static"
        className="tm-modal"
      >
        <div className="tm-header">
          <div className="tm-header-icon">
            <CIcon icon={cilPlus} />
          </div>
          <div className="tm-header-text">
            <h5 className="tm-header-title">
              {Language.create} {Language.table}
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
          <div className="tm-header-icon">
            <CIcon icon={cilLayers} />
          </div>
          <div className="tm-header-text">
            <h5 className="tm-header-title">{Language.manageTablePlans}</h5>
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
                          <span className="tm-plan-card-badge">
                            {usageCount} {Language.tables}
                          </span>
                        </div>
                        <div className="tm-plan-card-actions">
                          <CButton
                            color="secondary"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPlan(plan)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="outline"
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
          <div className="tm-header-icon">
            <CIcon icon={cilPencil} />
          </div>
          <div className="tm-header-text">
            <h5 className="tm-header-title">{Language.editPlan || 'Edit plan'}</h5>
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
          <CButton color="primary" onClick={handleUpdatePlan}>
            {Language.updatePlan}
          </CButton>
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
        onClose={() => {
          // CModal passes the event to onClose when the backdrop is clicked or
          // Escape is pressed. Coerce to a boolean to avoid setting state to an
          // Event object (which is truthy and would keep the modal open).
          setShowProdSelectModal(false)
          setSelectedOrderProducts([])
          setSelectedOrderId('')
        }}
        products={selectedOrderProducts}
        orderId={selectedOrderId}
        paymentMethods={paymentMethods}
        refetchData={fetchOrders}
        onShowToast={showToast}
        isTakeaway={true}
      />
    </>
  )

  // ── Small helper used in the header ──────────────────────
  function describeRange() {
    if (takeawayRange === 'today') return Language.takeawayRangeToday || 'Today'
    if (takeawayRange === 'thisWeek') return Language.takeawayRangeThisWeek || 'This week'
    if (takeawayRange === 'all') return Language.takeawayRangeAll || 'All time'
    if (takeawayRange === 'custom') {
      if (!takeawayFrom || !takeawayTo) return Language.pickRange || 'Pick a range'
      return `${takeawayFrom} → ${takeawayTo}`
    }
    return ''
  }
}

// ─────────────────────────────────────────────────────────────
// TableCard — the individual table tile
// ─────────────────────────────────────────────────────────────
const TableCard = ({
  table,
  plans,
  isSuperClient,
  onOpen,
  onDownloadQR,
  onMoveOrders,
  onDelete,
  Language,
}) => {
  const busy = table.orderCount > 0
  const planName = plans.find((p) => p._id === table.plan)?.name || 'No plan'

  return (
    <div
      className={`tl-card ${busy ? 'is-busy' : ''}`}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (e.target.closest('.tl-card-menu')) return
        if (e.target.closest('.dropdown-menu')) return
        onOpen()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="tl-card-top">
        <div className="tl-card-number-wrap">
          <div className={`tl-card-number ${busy ? 'is-busy' : ''}`}>{table.number}</div>
          <span className={`tl-card-status ${busy ? 'is-busy' : 'is-free'}`} aria-hidden="true" />
        </div>

        <CDropdown variant="btn-group" className="tl-card-menu">
          <CDropdownToggle
            color="transparent"
            caret={false}
            className="tl-card-menu-btn"
            // onClick={(e) => e.stopPropagation()}
            aria-label="Actions"
          >
            <CIcon icon={cilOptions} />
          </CDropdownToggle>
          <CDropdownMenu className="tl-card-menu-items" placement="bottom-end">
            <CDropdownItem onClick={onDownloadQR}>
              <CIcon icon={cilCloudDownload} className="me-2" />
              {Language.downloadQR || 'Download QR'}
            </CDropdownItem>
            <CDropdownItem onClick={onMoveOrders}>
              <CIcon icon={cilSwapHorizontal} className="me-2" />
              {Language.switchTable || 'Move orders'}
            </CDropdownItem>
            {isSuperClient && (
              <CDropdownItem onClick={onDelete}>
                <CIcon icon={cilTrash} className="me-2 text-danger" />
                <span className="text-danger">{Language.deleteTable || 'Delete table'}</span>
              </CDropdownItem>
            )}
          </CDropdownMenu>
        </CDropdown>
      </div>

      <div className="tl-card-body">
        <div className="tl-card-plan">{planName}</div>
        {busy ? (
          <div className="tl-card-meta">
            <span className="tl-card-orders">
              {table.orderCount} {table.orderCount === 1 ? 'order' : 'orders'}
            </span>
            <span className="tl-card-total">{table.totalPrice.toFixed(2)} TND</span>
          </div>
        ) : (
          <span className="tl-card-free">{Language.available || 'Available'}</span>
        )}
      </div>
    </div>
  )
}

export default TablesDashboard
