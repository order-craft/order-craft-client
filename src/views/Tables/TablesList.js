import React, { useEffect, useState } from "react";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CRow,
  CCol,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CInputGroup,
  CFormInput,
  CForm,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CCardImage,
  CFormSelect,
  CBadge,
  CFormSwitch,
  CToaster,
  CToast,
  CToastHeader,
  CToastBody,
} from "@coreui/react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BaseUrl } from "../../helpers/BaseUrl";
import Loading from "../../helpers/Loading";
import tableImageDark from "src/assets/images/table.jpg";
import { io } from "socket.io-client";
import { GetToken } from "../../helpers/GetToken";
import { saveAs } from "file-saver";
import CIcon from "@coreui/icons-react";
import {
  cilCloudDownload,
  cilQrCode,
  cilTrash,
  cilSave,
  cilList,
  cilInfo,
  cilLayers,
  cilPencil,
} from "@coreui/icons";
import { useSelector } from "react-redux";
import translations from "../../app/Language";
import "./TableList.css";
import ManualOrderModal from "./OrderModal";
import OrderCard from "./OrderCard";
import ProductSelectionModal from "./ProductSelectionModal";
import { useAuth } from "../../context/AuthContext";

const TablesDashboard = () => {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalError, setModalError] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMoveOrdersModal, setShowMoveOrdersModal] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);
  const [targetTable, setTargetTable] = useState("");
  const [targetTableNumber, setTargetTableNumber] = useState("");
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDescription, setNewPlanDescription] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("all"); // 'all' will show all tables
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanDescription, setEditPlanDescription] = useState("");
  const [modalPlanFilter, setModalPlanFilter] = useState("all"); // For modal only
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isTakeAway, setIsTakeAway] = useState(false);
  const [showProdSelectModal, setShowProdSelectModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderProducts, setSelectedOrderProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showPaidOrders, setShowPaidOrders] = useState(false);

  const token = GetToken();
  const { role } = useAuth();
  const isSuperClient = role === "superClient";

  //language
  const t = useSelector((state) => state.language);
  const Language = translations[t];
  const navigate = useNavigate();

  const [toasts, setToasts] = useState([]);

  const handlePlaceTogoOrder = () => {
    setModalMessage(Language.togoOrderSuccess);
    setShowModal(true);
  };

  const fetchTables = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BaseUrl}/tables`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const tablesWithTotalPrice = response.data.map((table) => {
        const totalPrice = table.orders.reduce(
          (acc, order) => acc + order.totalPrice,
          0,
        );
        return { ...table, totalPrice };
      });

      setTables(tablesWithTotalPrice);
    } catch (err) {
      setError("Error fetching tables");
      console.error(err);
    }
    setLoading(false);
  };

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${BaseUrl}/tables/get/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlans(response.data);
      if (response.data.length > 0) {
        setSelectedPlan(response.data[0]._id);
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
    }
  };

  // Fetch orders (for takeaway/delivery view)
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BaseUrl}/order/dineIn/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BaseUrl}/payment-methods`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setPaymentMethods(res.data);
    } catch (error) {
      setError("Error fetching tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    if (isTakeAway) {
      fetchOrders();
      fetchMethods();
    } else {
      fetchPlans();
      fetchTables();
    }

    const socket = io(BaseUrl, { auth: { token } });
    socket.on(isTakeAway ? "newOrder" : "tableUpdated", () => {
      isTakeAway ? fetchOrders() : fetchTables();
    });
    return () => socket.disconnect();
  }, [isTakeAway]);

  const handleCardClick = (tableId) => {
    navigate(`/tables/${tableId}`);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log(selectedPlan);
    console.log(tableNumber);
    try {
      const response = await axios.post(
        `${BaseUrl}/tables`,
        { number: tableNumber, plan: selectedPlan },

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log(response);
      setModalMessage("Table created successfully");
      setModalError(false);
      setShowCreateModal(false);
      setTableNumber(""); // Reset the table number input
      fetchTables(); // Refresh the tables list
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setModalMessage(err.response.data.error);
      } else {
        setModalMessage("Error creating table");
      }
      setModalError(true);
      console.error(err);
    }
    setLoading(false);
    setShowModal(true);
  };

  // plans functions
  const handleCreatePlan = async () => {
    try {
      const response = await axios.post(
        `${BaseUrl}/tables/plans`,
        { name: newPlanName, description: newPlanDescription },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPlans([...plans, response.data]);
      setNewPlanName("");
      setNewPlanDescription("");
      setShowPlanModal(false);
    } catch (err) {
      console.error("Error creating plan:", err);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanDescription(plan.description || "");
    setShowEditPlanModal(true);
  };

  const handleUpdatePlan = async () => {
    try {
      await axios.put(
        `${BaseUrl}/tables/plans/${editingPlan._id}`,
        { name: editPlanName, description: editPlanDescription },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchPlans();
      setModalMessage("Plan updated successfully");
      setModalError(false);
      setShowEditPlanModal(false);
    } catch (err) {
      setModalMessage("Error updating plan");
      setModalError(true);
      console.error(err);
    }
    setShowModal(true);
  };

  const handleDeletePlan = async (planId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this plan? Tables using this plan will not be deleted.",
      )
    ) {
      try {
        await axios.delete(`${BaseUrl}/tables/plans/${planId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchPlans();
        setModalMessage("Plan deleted successfully");
        setModalError(false);
      } catch (err) {
        setModalMessage("Error deleting plan");
        setModalError(true);
        console.error(err);
      }
      setShowModal(true);
    }
  };

  const downloadQRCode = (tableNumber, qrCodeURL) => {
    // Fetch the image from the URL and download it using FileSaver
    saveAs(qrCodeURL, `Table-${tableNumber}-QRCode.png`);
  };

  const handleDeleteTable = async (tableId, unpaidOrders) => {
    if (unpaidOrders) {
      setModalMessage("Cannot delete a table with unpaid orders.");
      setModalError(true);
      setShowModal(true);
      return;
    }

    if (
      window.confirm(
        "By deleting the table you are going to delete also any orders assigned to it?",
      )
    ) {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${BaseUrl}/tables/${tableId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setModalMessage("Table deleted successfully");
        setModalError(false);
        fetchTables(); // Refresh the tables list after deletion
      } catch (err) {
        setModalMessage("Error deleting table");
        setModalError(true);
        console.error(err);
      }
      setLoading(false);
      setShowModal(true);
    }
  };

  const handleMoveOrders = async () => {
    if (!targetTable) {
      setModalMessage("Please select a target table.");
      setModalError(true);
      setShowModal(true);
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${BaseUrl}/tables/move-orders`,
        { sourceTableId: selectedTable._id, targetTableId: targetTable },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setModalMessage("Orders moved successfully");
      setModalError(false);
      setShowMoveOrdersModal(false);
      fetchTables(); // Refresh the tables list after moving orders
    } catch (err) {
      setModalMessage("Error moving orders");
      setModalError(true);
      console.error(err);
    }
    setLoading(false);
    setShowModal(true);
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

  // Filters
  const filteredTables = tables.filter((table) => {
    const matchesSearch = table.number.toString().includes(searchTerm);
    const matchesPlan =
      selectedPlanFilter === "all" || table.plan === selectedPlanFilter;
    return matchesSearch && matchesPlan;
  });
  const filteredOrders = orders.filter((order) => {
    const matchesPayStatus = showPaidOrders || !order.payed;
    const matchesSearch = order.orderNumber.toString().includes(searchTerm);
    const matchesType =
      orderTypeFilter === "all" || order.orderType === orderTypeFilter;
    return matchesSearch && matchesType && matchesPayStatus;
  });

  const hundleTargetTableChange = (e) => {
    setTargetTable(e.target.value);
    setTargetTableNumber(e.target.value);
  };

  return (
    <>
      {/* Toast container */}
      <CToaster position="top-end">
        {toasts.map(({ id, msg, color }) => (
          <CToast
            key={id}
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

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            {/* Top Switch */}
            <div className="d-flex justify-content-end m-3">
              {isTakeAway ? (
                <div style={{ marginRight: 15 }}>
                  <CFormSwitch
                    id="toggleViewSwitch1"
                    label={Language.showPaidOrders}
                    checked={showPaidOrders}
                    onChange={(e) => setShowPaidOrders(e.target.checked)}
                  />
                </div>
              ) : (
                <></>
              )}
              <CFormSwitch
                id="toggleViewSwitch"
                label={Language.takeawayDeliveryOnly}
                checked={isTakeAway}
                onChange={(e) => setIsTakeAway(e.target.checked)}
              />
            </div>

            <CCardHeader className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
              <div>
                <strong>
                  {isTakeAway ? Language.ordersToday : Language.tables}
                </strong>
              </div>

              <div className="d-flex flex-column flex-md-row w-100 w-md-auto gap-2">
                {/* Conditional filters */}
                {isTakeAway ? (
                  <CFormSelect
                    className="w-100 w-md-auto"
                    style={{ minWidth: "200px" }}
                    value={orderTypeFilter}
                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                  >
                    <option value="all">{Language.allTypes}</option>
                    <option value="to-go">{Language.togo}</option>
                    <option value="delivery">{Language.delivery}</option>
                  </CFormSelect>
                ) : (
                  <CFormSelect
                    className="w-100 w-md-auto"
                    style={{ minWidth: "200px" }}
                    value={selectedPlanFilter}
                    onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  >
                    <option value="all">
                      {Language.allPlans || "All Plans"}
                    </option>
                    {plans.map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.name}
                      </option>
                    ))}
                  </CFormSelect>
                )}
                {!isTakeAway ? (
                  <div className="d-flex gap-2">
                    {isSuperClient && (
                      <>
                        <CButton
                          color="secondary"
                          onClick={() => setShowPlanModal(true)}
                          className="flex-grow-1 flex-md-grow-0"
                        >
                          {Language.managePlans || "Manage Plans"}
                        </CButton>
                        <CButton
                          color="primary"
                          onClick={() => setShowCreateModal(true)}
                          className="flex-grow-1 flex-md-grow-0"
                        >
                          {Language.create + " " + Language.table}
                        </CButton>
                      </>
                    )}
                    <CButton
                      color="primary"
                      onClick={() => setShowOrderModal(true)}
                      className="flex-grow-1 flex-md-grow-0"
                    >
                      {Language.create + " " + Language.togo}
                    </CButton>
                  </div>
                ) : (
                  <></>
                )}
              </div>
            </CCardHeader>

            <CCardBody>
              {/* Search */}
              <CInputGroup className="mb-3">
                <CFormInput
                  type="text"
                  placeholder={
                    isTakeAway
                      ? Language.searchByOrderNumber
                      : Language.searchByTableNumber
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CInputGroup>

              {loading && <Loading />}
              {error && <p className="text-danger">{error}</p>}

              <CRow className="g-3">
                {isTakeAway
                  ? filteredOrders.map((order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        onClick={() => {
                          setSelectedOrderId(order._id);
                          setSelectedOrderProducts(order.products);
                          setShowProdSelectModal(true);
                        }}
                        paymentMethods={paymentMethods}
                        refreshOrders={fetchOrders}
                        onShowToast={showAlert}
                      />
                    ))
                  : filteredTables.map((table) => (
                      <CCol xs={12} sm={6} md={4} lg={3} xl={2} key={table._id}>
                        <CCard
                          className="h-100"
                          style={{ cursor: "pointer", position: "relative" }}
                        >
                          {/* Card Header with Full-Width Dropdown */}
                          <CCardHeader className="p-0 d-flex justify-content-end">
                            <CDropdown className="w-100">
                              <CDropdownToggle
                                color="secondary"
                                size="sm"
                                className="w-100 rounded-0"
                                style={{
                                  borderTopLeftRadius: "0 !important",
                                  borderTopRightRadius: "0 !important",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "0.25rem 1rem",
                                }}
                              >
                                {Language.actions}
                                <CIcon
                                  icon={cilPencil}
                                  width={12}
                                  className="ms-2"
                                />
                              </CDropdownToggle>
                              <CDropdownMenu
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  left: "auto",
                                  minWidth: "max-content",
                                  width: "auto",
                                }}
                              >
                                <CDropdownItem
                                  onClick={() =>
                                    downloadQRCode(table.number, table.qrCode)
                                  }
                                >
                                  <CIcon
                                    icon={cilCloudDownload}
                                    className="me-2"
                                  />
                                  {Language.downloadQR}
                                </CDropdownItem>
                                {isSuperClient && (
                                  <CDropdownItem
                                    onClick={() =>
                                      handleDeleteTable(
                                        table._id,
                                        table.unpaidOrders,
                                      )
                                    }
                                  >
                                    <CIcon icon={cilTrash} className="me-2" />
                                    {Language.deleteTable}
                                  </CDropdownItem>
                                )}
                                <CDropdownItem
                                  onClick={() => {
                                    setSelectedTable(table);
                                    setShowMoveOrdersModal(true);
                                  }}
                                >
                                  <CIcon icon={cilQrCode} className="me-2" />
                                  {Language.switchTable}
                                </CDropdownItem>
                              </CDropdownMenu>
                            </CDropdown>
                          </CCardHeader>

                          {/* Card Body */}
                          <CCardBody
                            onClick={() => handleCardClick(table._id)}
                            className={table.unpaidOrders ? "text-white" : ""}
                            style={{
                              background: table.unpaidOrders ? "#F39C12" : "",
                              paddingBottom: "1.5rem",
                            }}
                          >
                            <CCardImage
                              className="img-fluid"
                              style={{
                                height: "150px",
                                objectFit: "cover",
                                width: "100%",
                              }}
                              src={tableImageDark}
                              alt={`Table ${table.number}`}
                            />
                            <CCardTitle className="mt-3 mb-1">
                              {Language.table} {table.number}
                            </CCardTitle>
                            <small className="text-muted d-block">
                              {plans.find((p) => p._id === table.plan)?.name ||
                                "No Plan"}
                            </small>
                          </CCardBody>
                        </CCard>
                      </CCol>
                    ))}
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Move Orders Modal */}
      <CModal
        visible={showMoveOrdersModal}
        onClose={() => setShowMoveOrdersModal(false)}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>{Language.moveOrdersToAnotherTable}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="mb-3 g-3">
            <CCol md={8}>
              <CInputGroup>
                <CFormInput
                  type="text"
                  placeholder="Search table by number"
                  value={targetTableNumber}
                  onChange={(e) => hundleTargetTableChange(e)}
                />
              </CInputGroup>
            </CCol>
            <CCol md={4}>
              <CFormSelect
                value={modalPlanFilter}
                onChange={(e) => setModalPlanFilter(e.target.value)}
                className="w-100"
              >
                <option value="all">{Language.allPlans}</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <CRow className="g-2">
              {tables
                .filter(
                  (table) =>
                    table.number.toString().includes(targetTable) &&
                    table._id !== selectedTable?._id &&
                    (modalPlanFilter === "all" ||
                      table.plan === modalPlanFilter), // Use modal-specific filter
                )
                .map((table) => (
                  <CCol xs={12} sm={6} key={table._id}>
                    <CCard
                      onClick={() => {
                        setTargetTable(table._id);
                        setTargetTableNumber(table.number);
                      }}
                      style={{
                        cursor: "pointer",
                        border:
                          targetTable === table._id
                            ? "2px solid #321fdb"
                            : "1px solid #d8dbe0",
                        transition: "border-color 0.2s ease",
                      }}
                      className="h-100"
                    >
                      <CCardBody className="d-flex flex-column">
                        <CCardTitle className="mb-1">
                          {Language.table} {table.number}
                        </CCardTitle>
                        <small className="text-muted">
                          {plans.find((p) => p._id === table.plan)?.name ||
                            "No Plan"}
                        </small>
                      </CCardBody>
                    </CCard>
                  </CCol>
                ))}
            </CRow>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setShowMoveOrdersModal(false)}
          >
            {Language.cancel}
          </CButton>
          <CButton
            color="primary"
            onClick={handleMoveOrders}
            disabled={!targetTable}
          >
            {Language.moveOrders}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Create Table Modal */}
      <CModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <CModalHeader>
          <CModalTitle>
            {Language.create + " " + Language.new + " " + Language.table}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleCreateTable}>
            <CFormInput
              type="number"
              placeholder={Language.enterTableNumber}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
              className="mb-3"
            />
            <CFormSelect
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="mb-3"
            >
              {plans.map((plan) => (
                <option key={plan._id} value={plan._id}>
                  {plan.name}
                </option>
              ))}
            </CFormSelect>
            <CButton type="submit" color="primary">
              {Language.create + " " + Language.table}
            </CButton>
          </CForm>
        </CModalBody>
      </CModal>

      {/*plan management modal */}
      <CModal
        visible={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        size="lg"
        alignment="center"
        backdrop="static"
        className="plan-management-modal"
      >
        {/* Modal Header */}
        <CModalHeader className="modal-header">
          <CModalTitle className="modal-title">
            <CIcon icon={cilList} className="me-2" />
            {Language.manageTablePlans}
          </CModalTitle>
        </CModalHeader>

        {/* Scrollable Content Area */}
        <div className="modal-scrollable-content">
          <CModalBody className="modal-body-content">
            {/* Create New Plan Section */}
            <div className="create-plan-section">
              <div className="section-header">
                <h5>{Language.createNewPlan || Language.createNewPlan}</h5>
              </div>

              <CForm className="plan-form">
                <CRow>
                  <CCol md={6}>
                    <CFormInput
                      placeholder={`${Language.planName}+(e.g., 'VIP Section', 'Outdoor Seating`}
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      floatingLabel={Language.planName}
                      className="form-input mb-2"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormInput
                      placeholder={Language.description}
                      value={newPlanDescription}
                      onChange={(e) => setNewPlanDescription(e.target.value)}
                      floatingLabel={Language.description}
                      className="form-input"
                    />
                  </CCol>
                </CRow>

                <div className="form-actions">
                  <CButton
                    color="primary"
                    onClick={handleCreatePlan}
                    disabled={!newPlanName.trim()}
                    className="submit-btn mt-2 mb-4"
                  >
                    <CIcon icon={cilSave} className="me-2 " />
                    {Language.createNewPlan}
                  </CButton>
                </div>
              </CForm>
            </div>

            {/* Existing Plans Section */}
            <div className="existing-plans-section">
              <div className="section-header">
                <div className="icon-wrapper">
                  <CIcon icon={cilList} />
                </div>
                <h5>{Language.existingPlans}</h5>
              </div>

              {plans.length === 0 ? (
                <div className="empty-state">
                  <CIcon icon={cilInfo} size="xl" />
                  <p>{Language.noPlansCreatedYet}</p>
                </div>
              ) : (
                <CRow className="plans-grid">
                  {plans.map((plan) => (
                    <CCol lg={6} key={plan._id} className="mb-2">
                      <CCard className="plan-card">
                        <CCardHeader className="card-header">
                          <div className="plan-title">
                            <CIcon icon={cilLayers} className="me-2" />
                            {plan.name}
                          </div>
                          <CBadge color="info" className="tables-count">
                            {tables.filter((t) => t.plan === plan._id).length}{" "}
                            {Language.tables}
                          </CBadge>
                        </CCardHeader>
                        <CCardBody className="card-body">
                          <p className="plan-description">
                            {plan.description || Language.noDescriptionProvided}
                          </p>
                          <div className="card-actions">
                            <CButton
                              color="outline-primary"
                              onClick={() => handleEditPlan(plan)}
                              className="action-btn"
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                              color="outline-danger"
                              onClick={() => handleDeletePlan(plan._id)}
                              disabled={tables.some((t) => t.plan === plan._id)}
                              className="action-btn"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  ))}
                </CRow>
              )}
            </div>
          </CModalBody>
        </div>

        {/* Modal Footer */}
        <CModalFooter className="modal-footer">
          <CButton
            color="secondary"
            onClick={() => setShowPlanModal(false)}
            className="close-btn"
          >
            {Language.close}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Edit Plan Modal */}
      <CModal
        visible={showEditPlanModal}
        onClose={() => setShowEditPlanModal(false)}
      >
        <CModalHeader closeButton>
          <CModalTitle>{Language.editPlan}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <div className="mb-3">
              <CFormInput
                type="text"
                label={Language.planName}
                placeholder={Language.planName}
                value={editPlanName}
                onChange={(e) => setEditPlanName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <CFormInput
                type="text"
                label={Language.description}
                placeholder={Language.description}
                value={editPlanDescription}
                onChange={(e) => setEditPlanDescription(e.target.value)}
              />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setShowEditPlanModal(false)}
          >
            {Language.cancel}
          </CButton>
          <CButton color="primary" onClick={handleUpdatePlan}>
            {Language.updatePlan}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Success/Error Modal */}
      <CModal visible={showModal} onClose={handleCloseModal}>
        <CModalHeader>
          <CModalTitle>{modalError ? "Error" : "Success"}</CModalTitle>
        </CModalHeader>
        <CModalBody>{modalMessage}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={handleCloseModal}>
            {Language.close}
          </CButton>
        </CModalFooter>
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
        onShowToast={showAlert}
        isTakeaway={true}
      />
    </>
  );
};

export default TablesDashboard;
