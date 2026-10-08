import React, { useState, useEffect, useCallback } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CFormInput,
  CSpinner,
  CAlert,
} from "@coreui/react";
import { CChartLine } from "@coreui/react-chartjs";
import CIcon from "@coreui/icons-react";
import { cilWarning, cilReload } from "@coreui/icons";
import axios from "axios";
import { BaseUrl } from "../../../helpers/BaseUrl";
import { GetToken } from "../../../helpers/GetToken";
import { useSelector } from "react-redux";
import translations from "../../../app/Language";

const toLocalISO = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const todayISO = () => toLocalISO(new Date());

const daysAgoISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalISO(d);
};

const ProfitOverTimeCard = () => {
  const t = useSelector((state) => state.language);
  const Language = translations[t];

  const [startDate, setStartDate] = useState(daysAgoISO(14));
  const [endDate, setEndDate] = useState(todayISO());
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = GetToken();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        `${BaseUrl}/dashboard/profit-by-period`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDaily(res.data.daily || []);
    } catch (err) {
      console.error("Error fetching profit-by-period:", err);
      setError(
        err.response?.data?.message ||
          Language.errorFetchingProfitPeriod ||
          "Failed to fetch profit over time",
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, token, Language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const labels = daily.map((d) => d.date);

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">
            {Language.profitOverTime || "Profit over time"}
          </h5>
          <small className="text-medium-emphasis">
            {Language.revenueVsCostVsProfit ||
              "Revenue vs Cost vs Profit, day by day"}
          </small>
        </div>
        <CIcon icon={cilReload} role="button" onClick={fetchData} />
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3 align-items-end mb-4">
          <CCol xs={12} md={4}>
            <label className="form-label">
              {Language.startDate || "Start date"}
            </label>
            <CFormInput
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </CCol>
          <CCol xs={12} md={4}>
            <label className="form-label">
              {Language.endDate || "End date"}
            </label>
            <CFormInput
              type="date"
              value={endDate}
              min={startDate}
              max={todayISO()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </CCol>
          <CCol xs={12} md={4}>
            <CButton
              color="primary"
              onClick={fetchData}
              disabled={loading}
              className="w-100"
            >
              {loading ? <CSpinner size="sm" /> : Language.refresh || "Refresh"}
            </CButton>
          </CCol>
        </CRow>

        {error && (
          <CAlert color="danger" className="d-flex align-items-center">
            <CIcon icon={cilWarning} className="flex-shrink-0 me-2" />
            <div>{error}</div>
          </CAlert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : daily.length === 0 ? (
          <CAlert color="info" className="text-center">
            {Language.noOrdersInRange || "No orders in the selected range."}
          </CAlert>
        ) : (
          <div style={{ height: "320px" }}>
            <CChartLine
              data={{
                labels,
                datasets: [
                  {
                    label: Language.revenue || "Revenue",
                    data: daily.map((d) => d.revenue),
                    borderColor: "#0d6efd",
                    backgroundColor: "rgba(13,110,253,0.1)",
                    tension: 0.3,
                    fill: false,
                  },
                  {
                    label: Language.cost || "Cost",
                    data: daily.map((d) => d.cost),
                    borderColor: "#ffc107",
                    backgroundColor: "rgba(255,193,7,0.1)",
                    tension: 0.3,
                    fill: false,
                  },
                  {
                    label: Language.profit || "Profit",
                    data: daily.map((d) => d.profit),
                    borderColor: "#198754",
                    backgroundColor: "rgba(25,135,84,0.1)",
                    tension: 0.3,
                    fill: false,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top" },
                  tooltip: {
                    callbacks: {
                      label: (ctx) =>
                        `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} TND`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => `${v} TND` },
                  },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        )}
      </CCardBody>
    </CCard>
  );
};

export default ProfitOverTimeCard;
