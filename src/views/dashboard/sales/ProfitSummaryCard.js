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
  CWidgetStatsF,
  CCallout,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilDollar,
  cilChartLine,
  cilMoney,
  cilCalendar,
  cilWarning,
} from "@coreui/icons";
import axios from "axios";
import { BaseUrl } from "../../../helpers/BaseUrl";
import { GetToken } from "../../../helpers/GetToken";
import { useSelector } from "react-redux";
import translations from "../../../app/Language";

const fmtTND = (v) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(
    Number(v) || 0,
  ) + " TND";

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const ProfitSummaryCard = () => {
  const t = useSelector((state) => state.language);
  const Language = translations[t];

  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = GetToken();

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        `${BaseUrl}/dashboard/profit-summary`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setData(res.data);
    } catch (err) {
      console.error("Error fetching profit summary:", err);
      setError(
        err.response?.data?.message ||
          Language.errorFetchingProfitSummary ||
          "Failed to fetch profit summary",
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, token, Language]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const marginColor =
    (data?.marginPercent ?? 0) >= 40
      ? "success"
      : (data?.marginPercent ?? 0) >= 20
        ? "info"
        : (data?.marginPercent ?? 0) > 0
          ? "warning"
          : "danger";

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">{Language.profitSummary || "Profit Summary"}</h5>
          <small className="text-medium-emphasis">
            {Language.profitSummaryHint ||
              "Revenue, cost, and profit for the selected period"}
          </small>
        </div>
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
              onClick={fetchSummary}
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

        {data && (
          <>
            <CRow className="mb-3">
              <CCol sm={6} lg={3}>
                <CWidgetStatsF
                  className="mb-3"
                  color="primary"
                  icon={<CIcon icon={cilDollar} height={24} />}
                  title={Language.revenue || "Revenue"}
                  value={fmtTND(data.revenue)}
                />
              </CCol>
              <CCol sm={6} lg={3}>
                <CWidgetStatsF
                  className="mb-3"
                  color="warning"
                  icon={<CIcon icon={cilMoney} height={24} />}
                  title={Language.cost || "Cost"}
                  value={fmtTND(data.cost)}
                />
              </CCol>
              <CCol sm={6} lg={3}>
                <CWidgetStatsF
                  className="mb-3"
                  color="success"
                  icon={<CIcon icon={cilChartLine} height={24} />}
                  title={Language.profit || "Profit"}
                  value={fmtTND(data.profit)}
                />
              </CCol>
              <CCol sm={6} lg={3}>
                <CWidgetStatsF
                  className="mb-3"
                  color={marginColor}
                  icon={<CIcon icon={cilCalendar} height={24} />}
                  title={Language.margin || "Margin %"}
                  value={`${data.marginPercent ?? 0}%`}
                />
              </CCol>
            </CRow>

            <CCallout color="info" className="mb-0">
              {Language.ordersInPeriod || "Orders in period"}:{" "}
              <strong>{data.orderCount}</strong>
              {data.ordersWithoutSnapshot > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-warning">
                    {data.ordersWithoutSnapshot}{" "}
                    {Language.ordersWithoutSnapshot ||
                      "orders have no cost snapshot and are excluded from cost/profit"}
                  </span>
                </>
              )}
            </CCallout>
          </>
        )}
      </CCardBody>
    </CCard>
  );
};

export default ProfitSummaryCard;
