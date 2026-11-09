import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CRow,
  CCol,
  CModal,
  CInputGroup,
  CFormInput,
  CFormSelect,
  CBadge,
  CFormSwitch,
  CToaster,
  CToast,
  CToastHeader,
  CToastBody,
  CSpinner,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import Loading from '../../helpers/Loading'
import { io } from 'socket.io-client'
import { GetToken } from '../../helpers/GetToken'
import { saveAs } from 'file-saver'
import CIcon from '@coreui/icons-react'

import {
  cilCloudDownload,
  cilQrCode,
  cilTrash,
  cilSave,
  cilList,
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
} from '@coreui/icons'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './TableList.css'
import ManualOrderModal from './OrderModal'
import OrderCard from './OrderCard'
import ProductSelectionModal from './ProductSelectionModal'
import { useAuth } from '../../context/AuthContext'

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
  const [billFilter, setBillFilter] = useState('all')

  const token = GetToken()
  const { role } = useAuth()
  const isSuperClient = role === 'superClient'

  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const navigate = useNavigate()

  /* ---------- toasts ---------- */
  const [toasts, setToasts] = useState([])
  const showToast = (msg, color = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, msg, color }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 5000)
  }
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }

  /* ---------- data fetching ---------- */
  const fetchTables = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const tablesWithTotalPrice = response.data.map((table) => {
        const totalPrice = table.orders.reduce((acc, order) => acc + order.totalPrice, 0)
        return { ...table, totalPrice }
      })
      setTables(tablesWithTotalPrice)
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
      setLoading(true)
      const res = await axios.get(`${BaseUrl}/payment-methods`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      setPaymentMethods(res.data)
    } catch (err) {
      setError('Error fetching tables')
    } finally {
      setLoading(false)
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
  }, [isTakeAway])

  const handleCardClick = (tableId) => {
    navigate(`/tables/${tableId}`)
  }

  const handlePlaceTogoOrder = () => {
    showToast(Language.togoOrderSuccess || 'Order placed', 'success')
  }

  /* ---------- handlers ---------- */
  const handleCreateTable = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post(
        `${BaseUrl}/tables`,
        { number: tableNumber, plan: selectedPlan },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      showToast(Language.tableCreated || 'Table created successfully', 'success')
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
      showToast(Language.planCreated || 'Plan created successfully', 'success')
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
      showToast(Language.planUpdated || 'Plan updated successfully', 'success')
      setShowEditPlanModal(false)
    } catch (err) {
      showToast('Error updating plan', 'danger')
    }
  }

  const handleDeletePlan = async (planId) => {
    if (
      window.confirm(
        'Are you sure you want to delete this plan? Tables using this plan will not be deleted.',
      )
    ) {
      try {
        await axios.delete(`${BaseUrl}/tables/plans/${planId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        fetchPlans()
        showToast(Language.planDeleted || 'Plan deleted successfully', 'success')
      } catch (err) {
        showToast('Error deleting plan', 'danger')
      }
    }
  }

  const downloadQRCode = (tableNumber, qrCodeURL) => {
    saveAs(qrCodeURL, `Table-${tableNumber}-QRCode.png`)
  }

  const handleDeleteTable = async (tableId, unpaidOrders) => {
    if (unpaidOrders) {
      showToast('Cannot delete a table with unpaid orders.', 'danger')
      return
    }
    if (
      window.confirm(
        'By deleting the table you are going to delete also any orders assigned to it?',
      )
    ) {
      setLoading(true)
      try {
        await axios.delete(`${BaseUrl}/tables/${tableId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        showToast(Language.tableDeleted || 'Table deleted successfully', 'success')
        fetchTables()
      } catch (err) {
        showToast('Error deleting table', 'danger')
      } finally {
        setLoading(false)
      }
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
      showToast(Language.ordersMoved || 'Orders moved successfully', 'success')
      setShowMoveOrdersModal(false)
      fetchTables()
    } catch (err) {
      showToast('Error moving orders', 'danger')
    } finally {
      setLoading(false)
    }
  }

  /* ---------- filters ---------- */
  const filteredTables = tables.filter((table) => {
    const matchesSearch = table.number.toString().includes(searchTerm)
    const matchesPlan = selectedPlanFilter === 'all' || table.plan === selectedPlanFilter
    return matchesSearch && matchesPlan
  })

  const filteredOrders = orders.filter((order) => {
    const matchesPayStatus = showPaidOrders || !order.payed
    const matchesSearch = order.orderNumber.toString().includes(searchTerm)
    const matchesType = orderTypeFilter === 'all' || order.orderType === orderTypeFilter
    return matchesSearch && matchesType && matchesPayStatus
  })

  const hundleTargetTableChange = (e) => {
    setTargetTable(e.target.value)
    setTargetTableNumber(e.target.value)
  }

  const moveOrdersTargets = tables.filter(
    (table) =>
      table.number.toString().includes(targetTableNumber) &&
      table._id !== selectedTable?._id &&
      (modalPlanFilter === 'all' || table.plan === modalPlanFilter),
  )

  /* ---------- floor view ---------- */
  const openTables = filteredTables.filter((t) => t.unpaidOrders)
  const outstanding = openTables.reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0)
  const shownTables = filteredTables.filter((t) =>
    billFilter === 'open' ? t.unpaidOrders : billFilter === 'free' ? !t.unpaidOrders : true,
  )
  const byNumber = (a, b) => (Number(a.number) || 0) - (Number(b.number) || 0)
  // Group by area in the order areas were created; tables without an area last.
  const floorGroups = (() => {
    const groups = new Map()
    shownTables.forEach((t) => {
      const key = t.plan || '__none__'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(t)
    })
    const known = plans.map((p) => p._id).filter((id) => groups.has(id))
    const rest = [...groups.keys()].filter((k) => !known.includes(k))
    return [...known, ...rest].map((key) => ({
      key,
      name: plans.find((p) => p._id === key)?.name || Language.tlNoArea || 'No area',
      tables: groups.get(key).sort(byNumber),
      open: groups.get(key).filter((t) => t.unpaidOrders).length,
    }))
  })()

  return (
    <>
      <CToaster position="top-end">
        {toasts.map(({ id, msg, color }) => (
          <CToast
            key={id}
            autohide
            delay={5000}
            color={color}
            visible
            onClose={() => removeToast(id)}
          >
            <CToastHeader closeButton>{color === 'danger' ? 'Error' : 'Notification'}</CToastHeader>
            <CToastBody>{msg}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <div className="oc-stack">
        {/* ---- Toolbar ---- */}
        <div className="oc-toolbar">
          <div className="oc-toolbar-group">
            <div className="oc-seg" role="group" aria-label="View">
              <button
                type="button"
                className={!isTakeAway ? 'is-active' : ''}
                onClick={() => setIsTakeAway(false)}
              >
                <CIcon icon={cilTablet} width={15} />
                {Language.tables || 'Tables'}
              </button>
              <button
                type="button"
                className={isTakeAway ? 'is-active' : ''}
                onClick={() => setIsTakeAway(true)}
              >
                <CIcon icon={cilRestaurant} width={15} />
                {Language.takeawayDeliveryOnly || 'Takeaway'}
              </button>
            </div>

            {!isTakeAway && (
              <div className="oc-seg" role="group" aria-label="Bill status">
                {[
                  ['all', Language.tlAll || 'All', filteredTables.length],
                  ['open', Language.hmOpenBills || 'Open bills', openTables.length],
                  ['free', Language.tlFree || 'Free', filteredTables.length - openTables.length],
                ].map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    className={billFilter === key ? 'is-active' : ''}
                    onClick={() => setBillFilter(key)}
                  >
                    {label}
                    <span className="oc-seg-count">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="oc-toolbar-group">
            <label className="oc-search">
              <CIcon icon={cilSearch} width={15} />
              <input
                type="text"
                placeholder={
                  isTakeAway
                    ? Language.searchByOrderNumber || 'Search order number'
                    : Language.searchByTableNumber || 'Search table number'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search"
              />
            </label>

            {isTakeAway ? (
              <>
                <select
                  className="oc-select"
                  value={orderTypeFilter}
                  onChange={(e) => setOrderTypeFilter(e.target.value)}
                  aria-label="Order type"
                >
                  <option value="all">{Language.allTypes || 'All types'}</option>
                  <option value="to-go">{Language.togo}</option>
                  <option value="delivery">{Language.delivery}</option>
                </select>
                <CFormSwitch
                  id="toggleViewSwitch1"
                  label={Language.showPaidOrders || 'Show paid'}
                  checked={showPaidOrders}
                  onChange={(e) => setShowPaidOrders(e.target.checked)}
                  className="tl-paid-switch"
                />
              </>
            ) : (
              <select
                className="oc-select"
                value={selectedPlanFilter}
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
                aria-label="Area"
              >
                <option value="all">{Language.allPlans || 'All areas'}</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            )}

            {isSuperClient && !isTakeAway && (
              <button
                type="button"
                className="btn btn-outline-secondary tl-tool-btn"
                onClick={() => setShowPlanModal(true)}
              >
                <CIcon icon={cilLayers} className="me-2" />
                {Language.managePlans || 'Areas'}
              </button>
            )}
            {!isTakeAway && (
              <button
                type="button"
                className="btn btn-outline-secondary tl-tool-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <CIcon icon={cilPlus} className="me-2" />
                {Language.table || 'Table'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary tl-tool-btn"
              onClick={() => setShowOrderModal(true)}
            >
              <CIcon icon={cilPlus} className="me-2" />
              {Language.tlNewTogo || 'To-go order'}
            </button>
          </div>
        </div>

        {/* ---- Summary ---- */}
        <div className="oc-summary">
          {isTakeAway ? (
            <span>
              <strong>{filteredOrders.length}</strong>{' '}
              {filteredOrders.length === 1
                ? Language.hmOrder || 'order'
                : Language.hmOrders || 'orders'}
            </span>
          ) : (
            <>
              <span>
                <strong>{filteredTables.length}</strong> {Language.hmTables || 'tables'}
              </span>
              <span className={openTables.length ? 'is-alert' : ''}>
                <strong>{openTables.length}</strong>{' '}
                {Language.tlWithOpenBill || 'with an open bill'}
              </span>
              {outstanding > 0 && (
                <span>
                  <strong>{outstanding.toFixed(2)} TND</strong>{' '}
                  {Language.tlOutstanding || 'outstanding'}
                </span>
              )}
            </>
          )}
          {loading && <CSpinner size="sm" color="primary" />}
        </div>

        {error && <div className="alert alert-danger mb-0">{error}</div>}

        {/* ---- Body ---- */}
        {isTakeAway ? (
          filteredOrders.length === 0 && !loading ? (
            <div className="oc-panel oc-empty">
              <span className="oc-empty-icon">
                <CIcon icon={cilRestaurant} />
              </span>
              <span className="oc-empty-title">{Language.tlNoTogo || 'No take-away orders'}</span>
              <span className="oc-empty-body">
                {Language.tlNoTogoHint ||
                  'To-go and delivery orders placed today show up here until they are paid.'}
              </span>
            </div>
          ) : (
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
          )
        ) : floorGroups.length === 0 ? (
          <div className="oc-panel oc-empty">
            <span className="oc-empty-icon">
              <CIcon icon={cilTablet} />
            </span>
            <span className="oc-empty-title">
              {tables.length === 0
                ? Language.tlNoTables || 'No tables yet'
                : Language.tlNoMatch || 'No tables match'}
            </span>
            <span className="oc-empty-body">
              {tables.length === 0
                ? Language.tlNoTablesHint ||
                  'Add your first table to generate its QR code and start taking orders.'
                : Language.tlNoMatchHint || 'Try another search, area or bill filter.'}
            </span>
          </div>
        ) : (
          floorGroups.map((group) => (
            <section key={group.key} className="tl-area">
              <header className="tl-area-head">
                <h3 className="tl-area-title">{group.name}</h3>
                <span className="tl-area-meta">
                  {group.tables.length} {Language.hmTables || 'tables'}
                  {group.open > 0 && (
                    <>
                      {' · '}
                      <b>
                        {group.open} {Language.tlOpen || 'open'}
                      </b>
                    </>
                  )}
                </span>
              </header>
              <div className="tl-floor">
                {group.tables.map((table) => {
                  const open = !!table.unpaidOrders
                  const count = (table.orders || []).length
                  return (
                    <div
                      key={table._id}
                      className={`tc-card ${open ? 'tc-card-unpaid' : ''}`}
                      onClick={() => handleCardClick(table._id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCardClick(table._id)
                      }}
                      aria-label={`${Language.table || 'Table'} ${table.number}`}
                    >
                      <div className="tc-card-top">
                        <div className="tc-id">
                          <span className="tc-label">{Language.table || 'Table'}</span>
                          <span className="tc-number">{table.number}</span>
                        </div>
                        <CDropdown className="tc-menu" onClick={(e) => e.stopPropagation()}>
                          <CDropdownToggle
                            caret={false}
                            className="tc-menu-toggle"
                            aria-label={Language.actions || 'Actions'}
                          >
                            <CIcon icon={cilOptions} width={14} />
                          </CDropdownToggle>
                          <CDropdownMenu>
                            <CDropdownItem
                              onClick={() => downloadQRCode(table.number, table.qrCode)}
                            >
                              <CIcon icon={cilCloudDownload} className="me-2" />
                              {Language.downloadQR}
                            </CDropdownItem>
                            <CDropdownItem
                              onClick={() => {
                                setSelectedTable(table)
                                setShowMoveOrdersModal(true)
                              }}
                            >
                              <CIcon icon={cilSwapHorizontal} className="me-2" />
                              {Language.switchTable}
                            </CDropdownItem>
                            {isSuperClient && (
                              <CDropdownItem
                                className="text-danger"
                                onClick={() => handleDeleteTable(table._id, table.unpaidOrders)}
                              >
                                <CIcon icon={cilTrash} className="me-2" />
                                {Language.deleteTable}
                              </CDropdownItem>
                            )}
                          </CDropdownMenu>
                        </CDropdown>
                      </div>

                      {open ? (
                        <div className="tc-bill">
                          <span className="tc-amount">
                            {(table.totalPrice || 0) > 0
                              ? `${table.totalPrice.toFixed(2)} TND`
                              : Language.tlOpenBill || 'Open bill'}
                          </span>
                          <span className="tc-sub">
                            {count}{' '}
                            {count === 1
                              ? Language.hmOrder || 'order'
                              : Language.hmOrders || 'orders'}{' '}
                            {Language.tlUnpaid || 'unpaid'}
                          </span>
                        </div>
                      ) : (
                        <div className="tc-bill is-free">
                          <span className="tc-free">{Language.tlFree || 'Free'}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* ============================= Create Table ============================= */}
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
                <div className="tm-hint">No plans yet — create one from “Manage Plans”.</div>
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

      {/* ============================= Move Orders ============================= */}
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
              <div className="tm-search" style={{ marginBottom: 0 }}>
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
              </div>
            </CCol>
            <CCol md={4}>
              <div className="tm-field" style={{ marginBottom: 0 }}>
                <label htmlFor="tm-target-plan">{Language.plan}</label>
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
                        {plans.find((p) => p._id === table.plan)?.name || 'No Plan'}
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

      {/* ============================= Manage Plans ============================= */}
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
            {/* Left: create form */}
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

            {/* Right: existing plans */}
            <div>
              <div className="tm-plans-section-title">
                {Language.existingPlans || 'Existing plans'}
              </div>

              {plans.length === 0 ? (
                <div className="tm-plans-empty">
                  <CIcon icon={cilInfo} size="xl" />
                  <div className="mt-2">{Language.noPlansCreatedYet || 'No plans created yet'}</div>
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

      {/* ============================= Edit Plan ============================= */}
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

      {/* ============================= Manual order modal (unchanged) ============================= */}
      <ManualOrderModal
        visible={showOrderModal}
        onClose={setShowOrderModal}
        onOrderPlaced={handlePlaceTogoOrder}
        enableOrderType={true}
      />

      {/* ============================= Product selection modal (unchanged) ============================= */}
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
