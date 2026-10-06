import React, { useState, useEffect } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CSpinner,
  CBadge,
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CInputGroup,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CDropdown,
  CFormSwitch,
  CFormSelect,
  CProgress,
  CAlert,
  CTooltip,
  CInputGroupText,
  CToaster,
  CToast,
  CToastHeader,
  CToastClose,
  CToastBody,
} from "@coreui/react";
import { BaseUrl } from "../../helpers/BaseUrl";
import axios from "axios";
import { io } from "socket.io-client";
import { GetToken } from "../../helpers/GetToken";
import { useSelector } from "react-redux";
import translations from "../../app/Language";
import CIcon from "@coreui/icons-react";
import {
  cilPrint,
  cilClock,
  cilFire,
  cilCheckCircle,
  cilBan,
  cilInfo,
  cilListRich,
  cilReload,
  cilFilter,
  cilTrash,
} from "@coreui/icons";
import { formatDistanceToNow } from "date-fns";
import "@coreui/coreui/dist/css/coreui.min.css";

const OrdersTable = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState(1);
  const [updatedOrders, setUpdatedOrders] = useState({});
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("all");
  const [availablePlans, setAvailablePlans] = useState([]);
  const [onlyTakeawayDelivery, setOnlyTakeawayDelivery] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("today"); // 'today', 'thisWeek', 'all'
  const token = GetToken();
  const t = useSelector((state) => state.language);
  const Language = translations[t];
  // const addToast = useToast()
  const [toasts, setToasts] = useState([]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BaseUrl}/order/orders/ordersfifo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setOrders(response.data.orders);
      setAvailablePlans(response.data.plans);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const socket = io(BaseUrl, { auth: { token } });

    socket.on("newOrder", (newOrder) => {
      setOrders((prevOrders) => {
        const existingOrderIndex = prevOrders.findIndex(
          (order) => order._id === newOrder._id,
        );
        if (existingOrderIndex > -1) {
          return prevOrders.map((order, index) =>
            index === existingOrderIndex ? newOrder : order,
          );
        }
        return [...prevOrders, newOrder];
      });

      setUpdatedOrders((prev) => ({ ...prev, [newOrder._id]: true }));
      setTimeout(() => {
        setUpdatedOrders((prev) => {
          const newState = { ...prev };
          delete newState[newOrder._id];
          return newState;
        });
      }, 10000);

      playRingtone();
    });

    socket.on("deleteOrder", (deletedOrderId) => {
      setOrders((prevOrders) =>
        prevOrders.filter((order) => order._id !== deletedOrderId),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const cancelOrder = (orderId) => {
    if (confirm(Language.confirmCancelOrder)) {
      updateOrderStatus(orderId, "cancelled");
    }
  };

  // showAlert implementation
  const showAlert = (msg, color = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, color }]);
  };

  // remove toast when it’s closed
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Your updated function
  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true);

    try {
      const response = await axios.patch(
        `${BaseUrl}/order/update-status/${orderId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 200) {
        const updatedOrder = response.data.order;

        // Update the orders state while preserving all order data
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId
              ? { ...order, status: newStatus, ...updatedOrder } // Merge existing data with updates
              : order,
          ),
        );

        showAlert(
          response.data.message || "Order status updated successfully",
          "success",
        );

        // Handle warnings if any
        if (response.data.warnings?.length > 0) {
          response.data.warnings.forEach((warning) => {
            setTimeout(() => showAlert(warning, "warning"), 500);
          });
        }

        // Handle insufficient materials if any
        if (response.data.insufficientMaterials?.length > 0) {
          const materialsText = response.data.insufficientMaterials.join(", ");
          setTimeout(
            () =>
              showAlert(
                `Insufficient stock for materials: ${materialsText}`,
                "warning",
              ),
            response.data.warnings?.length > 0 ? 1000 : 500,
          );
        }
        // Handle stock deficits if any
        if (response.data.deficits?.length > 0) {
          response.data.deficits.forEach((d, idx) => {
            const msg = `${d.rawMaterialName}: needed ${d.needed}${d.unit}, had ${d.available}${d.unit} — ${d.deficit}${d.unit} short`;
            setTimeout(
              () => showAlert(msg, "warning"),
              (response.data.warnings?.length || 0) * 500 +
                (response.data.insufficientMaterials?.length || 0) * 500 +
                500 * (idx + 1),
            );
          });
        }
      } else {
        showAlert("Failed to update order status", "danger");
      }
    } catch (error) {
      console.error("Update error:", error);
      let errorMessage = "Failed to update order status";

      if (error.response) {
        errorMessage =
          error.response.data?.error ||
          error.response.data?.message ||
          errorMessage;
        if (error.response.status === 400) {
          // If bad request, refresh data
          fetchOrders();
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      }

      showAlert(errorMessage, "danger");
    } finally {
      setLoading(false);
    }
  };

  const isToday = (isoString) => {
    const d = new Date(isoString);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const isThisWeek = (isoString) => {
    const d = new Date(isoString);
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return d >= weekStart;
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    // Apply time filter
    filtered = filtered.filter((order) => {
      if (timeFilter === "today")
        return isToday(order.timestamp || order.createdAt);
      if (timeFilter === "thisWeek")
        return isThisWeek(order.timestamp || order.createdAt);
      return true;
    });

    if (onlyTakeawayDelivery) {
      filtered = filtered.filter((o) => {
        const okType =
          typeFilter === "all"
            ? o.orderType === "to-go" || o.orderType === "delivery"
            : o.orderType === typeFilter;
        return okType;
      });
    } else {
      filtered = filtered.filter((o) => {
        if (!o.table) return false;
        return (
          selectedPlanFilter === "all" ||
          o.table.plan?._id === selectedPlanFilter
        );
      });
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  const deleteAllCancelledOrders = async () => {
    if (confirm(Language.confirmDeleteAllCancelled)) {
      setLoading(true);
      try {
        await axios.delete(`${BaseUrl}/order/delete/cancelled`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setOrders((prevOrders) =>
          prevOrders.filter((order) => order.status !== "cancelled"),
        );
      } catch (error) {
        console.error("Failed to delete cancelled orders:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const [ringtone, setRingtone] = useState(null);
  const playRingtone = () => {
    stopRingtone();
    const audio = new Audio("/newOrder.mp3");
    audio.loop = false;
    audio.play();
    setRingtone(audio);
  };

  const stopRingtone = () => {
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
  };

  /**
   * Prints a small ticket for the given order.
   */
  const handlePrint = (order) => {
    // ... (keep your existing print function)
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <CIcon icon={cilClock} className="me-1" />;
      case "preparing":
        return <CIcon icon={cilFire} className="me-1" />;
      case "completed":
        return <CIcon icon={cilCheckCircle} className="me-1" />;
      case "cancelled":
        return <CIcon icon={cilBan} className="me-1" />;
      default:
        return <CIcon icon={cilInfo} className="me-1" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "preparing":
        return "info";
      case "completed":
        return "success";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };
  function formatDuration(minutes) {
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const remainingSeconds = totalSeconds % 3600;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;

    let result = [];
    if (hours > 0) result.push(`${hours} h`);
    if (mins > 0) result.push(`${mins} min`);
    if (secs > 0 || (hours === 0 && mins === 0)) result.push(`${secs} sec`);

    return result.join(" ");
  }
  const renderOrderCard = (order) => {
    if (!order) return null;

    const tableNumber = order.table?.number || "N/A";
    const orderTypeDisplay =
      order.orderType === "to-go"
        ? Language.togo
        : order.orderType === "delivery"
          ? Language.delivery
          : order.orderType || "N/A";

    const products = order.products || [];
    const totalPrice = products
      .reduce((sum, item) => {
        const product = item.product || {};
        const price = typeof product.price === "number" ? product.price : 0;
        const discount =
          typeof product.discountPercentage === "number"
            ? product.discountPercentage
            : 0;
        const unitPrice = discount > 0 ? price * (1 - discount / 100) : price;
        return sum + unitPrice * (item.quantity || 0);
      }, 0)
      .toFixed(2);

    return (
      <CCard
        key={order._id}
        className={`mb-3 order-card ${updatedOrders[order._id] ? "order-card-updated" : ""}`}
        data-status={order.status}
      >
        <CCardBody>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h5 className="mb-1">
                <CIcon icon={cilListRich} className="me-2" />
                {order.table ? (
                  `${Language.table} ${order.table.number}`
                ) : (
                  <>
                    {order.orderType === "to-go"
                      ? Language.togo
                      : order.orderType === "delivery"
                        ? Language.delivery
                        : order.orderType}
                    {order.orderNumber && ` #${order.orderNumber}`}
                  </>
                )}
              </h5>
              <div className="d-flex align-items-center">
                <CBadge color={getStatusColor(order.status)} className="me-2">
                  {getStatusIcon(order.status)}
                  {order.status === "pending"
                    ? Language.pending
                    : order.status === "preparing"
                      ? Language.preparing
                      : order.status === "completed"
                        ? Language.completed
                        : Language.cancelled}
                </CBadge>
                {updatedOrders[order._id] && (
                  <CBadge color="primary" className="me-2">
                    {Language.updated}
                  </CBadge>
                )}
                <small className="text-muted">
                  {formatDistanceToNow(
                    new Date(order.timestamp || order.createdAt),
                    {
                      addSuffix: true,
                    },
                  )}
                </small>
              </div>
            </div>
            <div className="text-end">
              <div className="fw-bold">{totalPrice} TND</div>
              <CTooltip content={Language.printTicket}>
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={() => handlePrint(order)}
                  className="mt-1"
                >
                  <CIcon icon={cilPrint} />
                </CButton>
              </CTooltip>
            </div>
          </div>

          <CAccordion flush>
            <CAccordionItem itemKey="1">
              <CAccordionHeader>
                <span className="fw-semibold">
                  {order.products.length}{" "}
                  {order.products.length === 1 ? Language.item : Language.items}
                </span>
              </CAccordionHeader>
              <CAccordionBody>
                {order.products.map((item, idx) => {
                  const prod = item.product || {};
                  const name =
                    prod.name || item.name || Language.unknownProduct;
                  const desc = prod.description || item.description || "";
                  const qty = item.quantity || 0;
                  const price = typeof prod.price === "number" ? prod.price : 0;
                  const discount =
                    typeof prod.discountPercentage === "number"
                      ? prod.discountPercentage
                      : 0;
                  const unitPrice =
                    discount > 0 ? price * (1 - discount / 100) : price;
                  const total = (unitPrice * qty).toFixed(2);

                  return (
                    <div
                      key={idx}
                      className="d-flex justify-content-between py-2 border-bottom"
                    >
                      <div>
                        <span className="fw-medium">{name}</span>
                        {desc && <div className="small text-muted">{desc}</div>}
                        {item.notes && (
                          <div className="small text-muted">
                            <CIcon icon={cilInfo} className="me-1" />
                            {item.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <div>x{qty}</div>
                        <div>{total} TND</div>
                      </div>
                    </div>
                  );
                })}
              </CAccordionBody>
            </CAccordionItem>
          </CAccordion>

          {order.comment && (
            <div className="mt-3">
              <h6>
                <CIcon icon={cilInfo} className="me-2" />
                {Language.comment}
              </h6>
              <p className="text-muted">{order.comment}</p>
            </div>
          )}

          {order.statusDurations && (
            <div className="mt-3">
              <h6>
                <CIcon icon={cilClock} className="me-2" />
                {Language.timeSpent}
              </h6>
              {Object.entries(order.statusDurations).map(
                ([status, duration], index) => {
                  const durationInMinutes = Math.floor(
                    parseInt(duration, 10) / 60000,
                  );
                  const percentage = (durationInMinutes / 120) * 100; // Assuming 120 minutes is max for visualization

                  return (
                    <div key={index} className="mb-2">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-capitalize">
                          {status === "pending"
                            ? Language.pending
                            : status === "preparing"
                              ? Language.preparing
                              : Language.completed}
                        </span>
                        <span>
                          {formatDuration(durationInMinutes)} {Language.minutes}
                        </span>
                      </div>
                      <CProgress
                        thin
                        color={getStatusColor(status)}
                        value={Math.min(percentage, 100)}
                        className="mb-3"
                      />
                    </div>
                  );
                },
              )}
            </div>
          )}

          {order.status !== "completed" && order.status !== "cancelled" && (
            <div className="d-flex justify-content-end mt-3">
              <CButton
                color={order.status === "pending" ? "info" : "success"}
                onClick={() => {
                  const newStatus =
                    order.status === "pending" ? "preparing" : "completed";
                  updateOrderStatus(order._id, newStatus);
                }}
                disabled={loading}
                className="me-2"
              >
                {loading ? (
                  <CSpinner size="sm" />
                ) : order.status === "pending" ? (
                  <>
                    <CIcon icon={cilFire} className="me-1" />
                    {Language.moveToPreparing}
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCheckCircle} className="me-1" />
                    {Language.moveToCompleted}
                  </>
                )}
              </CButton>
              {order.status === "pending" && (
                <CButton
                  color="danger"
                  onClick={() => cancelOrder(order._id)}
                  disabled={loading}
                >
                  {loading ? (
                    <CSpinner size="sm" />
                  ) : (
                    <>
                      <CIcon icon={cilBan} className="me-1" />
                      {Language.cancelOrder}
                    </>
                  )}
                </CButton>
              )}
            </div>
          )}
        </CCardBody>
      </CCard>
    );
  };

  const getTabCount = (status) => {
    return filteredOrders.filter((order) => order.status === status).length;
  };

  return (
    <CRow>
      <CToaster position="top-end">
        {toasts.map(({ id, msg, color }, index) => (
          <CToast
            key={index}
            autohide
            delay={3000}
            color={color}
            visible
            onClose={() => removeToast(id)}
          >
            <CToastHeader closeButton>Notification</CToastHeader>
            <CToastBody>{msg}</CToastBody>
          </CToast>
        ))}
      </CToaster>
      <CCol xs={12}>
        <CCard className="mb-4 dashboard-card">
          <CCardHeader className="dashboard-card-header">
            <div className="d-flex justify-content-between align-items-center w-100">
              <h3 className="dashboard-title mb-0">
                <CIcon icon={cilListRich} className="me-2" />
                {Language.orders}
              </h3>

              <div className="d-flex align-items-center">
                <div className="time-filter-container me-2">
                  <CFormSelect
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="time-filter-select"
                  >
                    <option value="today">{Language.today || "Today"}</option>
                    <option value="thisWeek">
                      {Language.thisWeek || "This week"}
                    </option>
                    <option value="all">
                      {Language.allTime || "All Time"}
                    </option>
                  </CFormSelect>
                </div>

                <CTooltip content={Language.refresh || "Refresh"}>
                  <CButton
                    color="primary"
                    onClick={fetchOrders}
                    className="refresh-button"
                  >
                    <CIcon icon={cilReload} />
                  </CButton>
                </CTooltip>
              </div>
            </div>
          </CCardHeader>

          <CCardBody>
            <div className="filter-controls-container">
              <div className="d-flex align-items-center mb-3">
                <div className="me-3">
                  {onlyTakeawayDelivery ? (
                    <CInputGroup>
                      <CInputGroupText>
                        <CIcon icon={cilFilter} />
                      </CInputGroupText>
                      <CDropdown className="plan-dropdown">
                        <CDropdownToggle
                          color="secondary"
                          className="d-flex justify-content-between align-items-center dropdown-toggle-fixed"
                        >
                          {typeFilter === "all"
                            ? Language.allTypes
                            : typeFilter === "to-go"
                              ? Language.togo
                              : Language.delivery}
                        </CDropdownToggle>
                        <CDropdownMenu className="dropdown-menu">
                          <CDropdownItem onClick={() => setTypeFilter("all")}>
                            {Language.allTypes}
                          </CDropdownItem>
                          <CDropdownItem onClick={() => setTypeFilter("to-go")}>
                            {Language.togo}
                          </CDropdownItem>
                          <CDropdownItem
                            onClick={() => setTypeFilter("delivery")}
                          >
                            {Language.delivery}
                          </CDropdownItem>
                        </CDropdownMenu>
                      </CDropdown>
                    </CInputGroup>
                  ) : (
                    <CInputGroup>
                      <CInputGroupText>
                        <CIcon icon={cilFilter} />
                      </CInputGroupText>
                      <CDropdown className="plan-dropdown">
                        <CDropdownToggle
                          color="secondary"
                          className="d-flex justify-content-between align-items-center dropdown-toggle-fixed"
                        >
                          {selectedPlanFilter === "all"
                            ? Language.allPlans
                            : availablePlans.find(
                                (p) => p._id === selectedPlanFilter,
                              )?.name || Language.selectPlan}
                        </CDropdownToggle>
                        <CDropdownMenu className="dropdown-menu">
                          <CDropdownItem
                            onClick={() => setSelectedPlanFilter("all")}
                          >
                            {Language.allPlans}
                          </CDropdownItem>
                          {availablePlans.map((plan) => (
                            <CDropdownItem
                              key={plan._id}
                              active={selectedPlanFilter === plan._id}
                              onClick={() => setSelectedPlanFilter(plan._id)}
                            >
                              {plan.name}
                            </CDropdownItem>
                          ))}
                        </CDropdownMenu>
                      </CDropdown>
                    </CInputGroup>
                  )}
                </div>

                <CFormSwitch
                  id="takeaway-switch"
                  label={Language.takeawayDeliveryOnly}
                  checked={onlyTakeawayDelivery}
                  onChange={(e) => setOnlyTakeawayDelivery(e.target.checked)}
                  className="ms-2"
                />
              </div>
            </div>

            <CNav variant="tabs" role="tablist" className="mb-4">
              <CNavItem>
                <CNavLink
                  active={activeKey === 1}
                  onClick={() => setActiveKey(1)}
                >
                  <CIcon icon={cilClock} className="me-1" />
                  {Language.pending} ({getTabCount("pending")})
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeKey === 2}
                  onClick={() => setActiveKey(2)}
                >
                  <CIcon icon={cilFire} className="me-1" />
                  {Language.preparing} ({getTabCount("preparing")})
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeKey === 3}
                  onClick={() => setActiveKey(3)}
                >
                  <CIcon icon={cilCheckCircle} className="me-1" />
                  {Language.completed} ({getTabCount("completed")})
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeKey === 4}
                  onClick={() => setActiveKey(4)}
                >
                  <CIcon icon={cilBan} className="me-1" />
                  {Language.cancelled} ({getTabCount("cancelled")})
                </CNavLink>
              </CNavItem>
            </CNav>

            <CTabContent>
              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <p className="mt-3">{Language.loadingOrders}</p>
                </div>
              ) : (
                <>
                  <CTabPane visible={activeKey === 1}>
                    {getTabCount("pending") > 0 ? (
                      filteredOrders
                        .filter((order) => order.status === "pending")
                        .map(renderOrderCard)
                    ) : (
                      <CAlert color="info" className="text-center">
                        {Language.noPendingOrders}
                      </CAlert>
                    )}
                  </CTabPane>
                  <CTabPane visible={activeKey === 2}>
                    {getTabCount("preparing") > 0 ? (
                      filteredOrders
                        .filter((order) => order.status === "preparing")
                        .map(renderOrderCard)
                    ) : (
                      <CAlert color="info" className="text-center">
                        {Language.noPreparingOrders}
                      </CAlert>
                    )}
                  </CTabPane>
                  <CTabPane visible={activeKey === 3}>
                    {getTabCount("completed") > 0 ? (
                      filteredOrders
                        .filter((order) => order.status === "completed")
                        .map(renderOrderCard)
                    ) : (
                      <CAlert color="info" className="text-center">
                        {Language.noCompletedOrders}
                      </CAlert>
                    )}
                  </CTabPane>
                  <CTabPane visible={activeKey === 4}>
                    {getTabCount("cancelled") > 0 ? (
                      <>
                        <div className="d-flex justify-content-end mb-3">
                          <CTooltip content={Language.deleteAllCancelled}>
                            <CButton
                              color="danger"
                              onClick={deleteAllCancelledOrders}
                            >
                              <CIcon icon={cilTrash} className="me-1" />
                              {Language.deleteAll}
                            </CButton>
                          </CTooltip>
                        </div>
                        {filteredOrders
                          .filter((order) => order.status === "cancelled")
                          .map(renderOrderCard)}
                      </>
                    ) : (
                      <CAlert color="info" className="text-center">
                        {Language.noCancelledOrders}
                      </CAlert>
                    )}
                  </CTabPane>
                </>
              )}
            </CTabContent>
          </CCardBody>
        </CCard>
      </CCol>

      <style>{` /* Base card styles */
    .dashboard-card {
      border-radius: 15px;
      box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
      border: none;
      overflow: hidden;
    }
    
    .dashboard-card-header {
      background: linear-gradient(135deg, #4e73df 0%, #224abe 100%);
      color: white;
      border-bottom: none;
      padding: 1rem 1.5rem;
    }
    
    .dashboard-title {
      margin: 0;
      font-weight: 600;
      color: white;
      white-space: nowrap;
    }
    
    /* Header controls */
    .time-filter-container {
      min-width: 150px;
    }
    
    .time-filter-select {
      width: 100% !important;
    }
    
    .refresh-button {
      width: 38px;
      height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    /* Filter controls */
    .filter-controls-container {
      position: relative;
      z-index: 1;
    }
    
    .type-filter-select {
      min-width: 150px;
    }
    
    .plan-dropdown {
      min-width: 200px;
    }
    
    .dropdown-toggle-fixed {
      width: 100%;
      min-width: 200px;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .dropdown-menu-fixed {
      position: absolute !important;
      width: 100%;
      min-width: 200px;
      inset: auto auto 0px 0px !important;
      margin: 0px !important;
      transform: translate(0px, -40px) !important;
    }
    
    /* Order cards */
    .order-card {
      border-left: 4px solid;
      border-left-color: var(--cui-warning);
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
    }
    
    .order-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
    }
    
    .order-card[data-status='preparing'] {
      border-left-color: var(--cui-info);
    }
    
    .order-card[data-status='completed'] {
      border-left-color: var(--cui-success);
    }
    
    .order-card[data-status='cancelled'] {
      border-left-color: var(--cui-danger);
    }
    
    .order-card-updated {
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
    }
    
    /* Force layout stability */
    .d-flex {
      flex-shrink: 0;
    }
    
    .me-2, .me-3 {
      flex-shrink: 0;
    }
    
    .text-end {
      flex-shrink: 0;
    }
      `}</style>
    </CRow>
  );
};

export default OrdersTable;
