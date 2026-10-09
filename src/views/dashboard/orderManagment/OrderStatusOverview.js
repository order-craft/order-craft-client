import { useState, useEffect } from "react";
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
  CProgress,
  CFormSelect,
  CAlert,
} from "@coreui/react";
import axios from "axios";
import { io } from "socket.io-client";
import { BaseUrl } from "../../../helpers/BaseUrl";
import { GetToken } from "../../../helpers/GetToken";
import CIcon from "@coreui/icons-react";
import {
  cilClock,
  cilCheckCircle,
  cilFire,
  cilInfo,
  cilListRich,
} from "@coreui/icons";
import { useSelector } from "react-redux";
import translations from "../../../app/Language";

const OrderStatusOverview = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState(1);
  const [filterOption, setFilterOption] = useState("all"); // 'all', 'today', 'thisWeek'
  const [statusFlowEnabled, setStatusFlowEnabled] = useState(true);
  const token = GetToken();

  const t = useSelector((state) => state.language);
  const Language = translations[t];

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BaseUrl}/order/orders/ordersfifo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data.orders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const socket = io(BaseUrl, { auth: { token } });

    socket.on("newOrder", fetchOrders);
    socket.on("orderUpdated", fetchOrders);
    socket.on("tenantConfigChanged", (cfg) => {
      setStatusFlowEnabled(cfg.statusFlowEnabled !== false);
      fetchOrders();
    });
    return () => socket.disconnect();
  }, []);

  const convertMinutesToDHM = (minutes) => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;

    let result = [];
    if (days > 0) result.push(`${days}d`);
    if (hours > 0) result.push(`${hours}h`);
    if (mins > 0 || (days === 0 && hours === 0)) result.push(`${mins}m`);

    return result.join(" ");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <CBadge color="warning">
            <CIcon icon={cilClock} className="me-1" /> {Language.pending}
          </CBadge>
        );
      case "preparing":
        return (
          <CBadge color="info">
            <CIcon icon={cilFire} className="me-1" /> {Language.Preparing}
          </CBadge>
        );
      case "completed":
        return (
          <CBadge color="success">
            <CIcon icon={cilCheckCircle} className="me-1" />{" "}
            {Language.completed}
          </CBadge>
        );
      default:
        return <CBadge color="secondary">{status}</CBadge>;
    }
  };

  const filterOrders = (orders) => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (filterOption === "today") return orderDate >= today;
      if (filterOption === "thisWeek") return orderDate >= weekStart;
      return true;
    });
  };

  const renderOrderCard = (order) => {
    const totalPrice = order.products
      .reduce(
        (sum, product) => sum + product.product?.price * product.quantity,
        0,
      )
      .toFixed(2);

    return (
      <CCard key={order._id} className="mb-3 order-card">
        <CCardBody>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h5 className="mb-1">
                <CIcon icon={cilListRich} className="me-2" />
                {Language.order} #{order.orderNumber}
              </h5>
              <div className="d-flex align-items-center">
                <span className="me-3">
                  {Language.Table} {order.table?.number || "N/A"}
                </span>
                {getStatusBadge(order.status)}
              </div>
            </div>
            <div className="text-end">
              <div className="fw-bold">
                {totalPrice} {Language.TND}
              </div>
              <small className="text-muted">
                {new Date(order.createdAt).toLocaleTimeString()}
              </small>
            </div>
          </div>

          <CAccordion flush>
            <CAccordionItem itemKey="1">
              <CAccordionHeader>
                <span className="fw-semibold">
                  {order.products.length}{" "}
                  {order.products.length === 1 ? "Item" : "Items"}
                </span>
              </CAccordionHeader>
              <CAccordionBody>
                {order.products.map((product, index) => (
                  <div
                    key={index}
                    className="d-flex justify-content-between py-2 border-bottom"
                  >
                    <div>
                      <span className="fw-medium">{product.product?.name}</span>
                      <div className="small text-muted">
                        {product.notes && (
                          <span>
                            <CIcon icon={cilInfo} className="me-1" />
                            {product.notes}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-end">
                      <div>x{product.quantity}</div>
                      <div>
                        {(product.product?.price * product.quantity).toFixed(2)}{" "}
                        {Language.TND}
                      </div>
                    </div>
                  </div>
                ))}
              </CAccordionBody>
            </CAccordionItem>
          </CAccordion>

          {statusFlowEnabled && (
            <div className="mt-3">
              <h6 className="mb-2">
                <CIcon icon={cilClock} className="me-2" />
                {Language.TimeSpent}
              </h6>
              {Object.entries(order.statusDurations).map(
                ([status, duration], index) => {
                  const durationInMinutes = Math.floor(
                    parseInt(duration, 10) / 60000,
                  );
                  const formattedDuration =
                    convertMinutesToDHM(durationInMinutes);
                  const percentage = (durationInMinutes / 120) * 100; // Assuming 120 minutes is max for visualization

                  return (
                    <div key={index} className="mb-2">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-capitalize">{status}</span>
                        <span>{formattedDuration}</span>
                      </div>
                      <CProgress
                        thin
                        color={
                          status === "pending"
                            ? "warning"
                            : status === "preparing"
                              ? "info"
                              : "success"
                        }
                        value={Math.min(percentage, 100)}
                        className="mb-3"
                      />
                    </div>
                  );
                },
              )}
            </div>
          )}
        </CCardBody>
      </CCard>
    );
  };

  const filteredOrders = filterOrders(orders);
  const pendingOrders = filteredOrders.filter(
    (order) => order.status === "pending",
  );
  const preparingOrders = filteredOrders.filter(
    (order) => order.status === "preparing",
  );
  const completedOrders = filteredOrders.filter(
    (order) => order.status === "completed",
  );

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4 dashboard-card">
          <CCardHeader className="dashboard-card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="dashboard-title mb-0">
                <CIcon icon={cilListRich} className="me-2" />
                {Language.OrderStatusOverview}
              </h3>
              <div className="d-flex">
                <CFormSelect
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value)}
                  className="me-2"
                  style={{ width: "120px" }}
                >
                  <option value="all">{Language.AllTime}</option>
                  <option value="today">{Language.Today}</option>
                  <option value="thisWeek">{Language.ThisWeek}</option>
                </CFormSelect>
                <CButton color="primary" onClick={fetchOrders}>
                  {Language.Refresh}
                </CButton>
              </div>
            </div>
          </CCardHeader>
          <CCardBody>
            <CNav variant="tabs" role="tablist" className="mb-4">
              {statusFlowEnabled && (
                <CNavItem>
                  <CNavLink
                    active={activeKey === 1}
                    onClick={() => setActiveKey(1)}
                  >
                    <CIcon icon={cilClock} className="me-1" />
                    {Language.Pending} ({pendingOrders.length})
                  </CNavLink>
                </CNavItem>
              )}
              {statusFlowEnabled && (
                <CNavItem>
                  <CNavLink
                    active={activeKey === 2}
                    onClick={() => setActiveKey(2)}
                  >
                    <CIcon icon={cilFire} className="me-1" />
                    {Language.Preparing} ({preparingOrders.length})
                  </CNavLink>
                </CNavItem>
              )}
              <CNavItem>
                <CNavLink
                  active={activeKey === 3}
                  onClick={() => setActiveKey(3)}
                >
                  <CIcon icon={cilCheckCircle} className="me-1" />
                  {Language.completed} ({completedOrders.length})
                </CNavLink>
              </CNavItem>
            </CNav>

            <CTabContent>
              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <p className="mt-3">{Language.Loadingorders}</p>
                </div>
              ) : (
                <>
                  {statusFlowEnabled && (
                    <CTabPane visible={activeKey === 1}>
                      {pendingOrders.length > 0 ? (
                        pendingOrders.map(renderOrderCard)
                      ) : (
                        <CAlert color="info" className="text-center">
                          {Language.Nopendingordersatthemoment}
                        </CAlert>
                      )}
                    </CTabPane>
                  )}
                  {statusFlowEnabled && (
                    <CTabPane visible={activeKey === 2}>
                      {preparingOrders.length > 0 ? (
                        preparingOrders.map(renderOrderCard)
                      ) : (
                        <CAlert color="info" className="text-center">
                          {Language.Noordersbeingpreparedcurrently}
                        </CAlert>
                      )}
                    </CTabPane>
                  )}
                  <CTabPane visible={activeKey === 3}>
                    {completedOrders.length > 0 ? (
                      completedOrders.map(renderOrderCard)
                    ) : (
                      <CAlert color="info" className="text-center">
                        {Language.Nocompletedordersintheselectedtimeframe}
                      </CAlert>
                    )}
                  </CTabPane>
                </>
              )}
            </CTabContent>
          </CCardBody>
        </CCard>
      </CCol>

      <style>{`
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
          padding: 1.5rem;
        }
        .dashboard-title {
          margin: 0;
          font-weight: 600;
          color: white;
        }
        .order-card {
          border-left: 4px solid;
          border-left-color: var(--cui-warning);
          transition: transform 0.2s;
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
      `}</style>
    </CRow>
  );
};

export default OrderStatusOverview;
