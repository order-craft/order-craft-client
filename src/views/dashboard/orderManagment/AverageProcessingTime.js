import { useState } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CSpinner,
  CAlert,
  CRow,
  CCol,
  CProgress,
  CFormInput,
  CFormLabel,
  CBadge,
  CListGroup,
  CListGroupItem,
  CProgressBar,
} from "@coreui/react";
import axios from "axios";
import { BaseUrl } from "../../../helpers/BaseUrl";
import { GetToken } from "../../../helpers/GetToken";
import CIcon from "@coreui/icons-react";
import { cilClock, cilChart, cilCalendar, cilCheckCircle } from "@coreui/icons";
import { useSelector } from "react-redux";
import translations from "../../../app/Language";

const AverageProcessingTime = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [avgTimes, setAvgTimes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState("custom"); // 'today', 'week', 'month', 'custom'

  const token = GetToken();

  const t = useSelector((state) => state.language);
  const Language = translations[t];

  const presetDateRanges = {
    today: () => {
      const today = new Date();
      return {
        start: today.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
    },
    week: () => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        start: weekStart.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
    },
    month: () => {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: monthStart.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
    },
  };

  const handleTimeframeChange = (selected) => {
    setTimeframe(selected);
    if (selected !== "custom") {
      const { start, end } = presetDateRanges[selected]();
      setStartDate(start);
      setEndDate(end);
    }
  };

  const fetchAverageProcessingTime = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    setLoading(true);
    setError(null);
    setAvgTimes(null);

    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/average-processing-time`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAvgTimes(response.data);

      console.log(response.data);
    } catch (error) {
      console.error("Error fetching average processing time:", error);
      setError(
        error.response?.data?.message ||
          "Failed to fetch data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatMinutes = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const calculateEfficiency = (time) => {
    // Assuming lower time is better (adjust thresholds as needed)
    if (time < 30) return Language.Excellent;
    if (time < 60) return Language.Good;
    if (time < 90) return Language.Average;
    return Language.NeedsImprovement;
  };

  return (
    <CCard className="dashboard-card">
      <CCardHeader className="dashboard-card-header">
        <h3 className="dashboard-title">
          <CIcon icon={cilClock} className="me-2" />
          {Language.OrderProcessingEfficiency}
        </h3>
      </CCardHeader>
      <CCardBody>
        <div className="mb-4">
          <div className="d-flex flex-wrap gap-2 mb-3">
            <CButton
              color={timeframe === "today" ? "primary" : "outline-secondary"}
              onClick={() => handleTimeframeChange("today")}
            >
              {Language.Today}
            </CButton>
            <CButton
              color={timeframe === "week" ? "primary" : "outline-secondary"}
              onClick={() => handleTimeframeChange("week")}
            >
              {Language.ThisWeek}
            </CButton>
            <CButton
              color={timeframe === "month" ? "primary" : "outline-secondary"}
              onClick={() => handleTimeframeChange("month")}
            >
              {Language.ThisMonth}
            </CButton>
            <CButton
              color={timeframe === "custom" ? "primary" : "outline-secondary"}
              onClick={() => handleTimeframeChange("custom")}
            >
              {Language.CustomRange}
            </CButton>
          </div>

          {timeframe === "custom" && (
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>{Language.StartDate}</CFormLabel>
                <CFormInput
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || new Date().toISOString().split("T")[0]}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>{Language.EndDate}</CFormLabel>
                <CFormInput
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={new Date().toISOString().split("T")[0]}
                />
              </CCol>
            </CRow>
          )}
        </div>

        <div className="d-flex justify-content-between mb-4">
          <div>
            {startDate && endDate && (
              <CBadge color="info" className="fs-6">
                {new Date(startDate).toLocaleDateString()} -{" "}
                {new Date(endDate).toLocaleDateString()}
              </CBadge>
            )}
          </div>
          <CButton
            color="primary"
            onClick={fetchAverageProcessingTime}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? (
              <CSpinner size="sm" />
            ) : (
              <CIcon icon={cilChart} className="me-1" />
            )}
            {loading ? "Analyzing..." : "Analyze Efficiency"}
          </CButton>
        </div>

        {error && (
          <CAlert color="danger" className="mt-3">
            {error}
          </CAlert>
        )}
        {avgTimes?.statusFlowDisabled && (
          <CAlert color="info" className="mt-3">
            {Language.statusFlowDisabledNotice ||
              "Order status flow is disabled for this business — processing times are not tracked."}
          </CAlert>
        )}
        {avgTimes && !avgTimes.statusFlowDisabled && (
          <div className="mt-4">
            <h4 className="mb-4 text-center">
              <CIcon icon={cilClock} className="me-2" />
              {Language.ProcessingEfficiencyAnalysis}
            </h4>

            <CRow className="g-4">
              <CCol md={6}>
                <CCard className="h-100">
                  <CCardBody>
                    <h5 className="d-flex align-items-center">
                      <CIcon icon={cilClock} className="me-2 text-warning" />
                      {Language.OrderAcceptance}
                    </h5>
                    <div className="my-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span>{Language.AverageTime}</span>
                        <span className="fw-bold">
                          {formatMinutes(avgTimes.avgPendingToPreparing)}
                        </span>
                      </div>
                      <CProgress
                        color="warning"
                        value={avgTimes.avgPendingToPreparing}
                        // max={120}
                        className="mb-3"
                        style={{ height: "10px" }}
                      >
                        <CProgressBar
                          color="warning"
                          value={avgTimes.avgPendingToPreparing}
                          // max={120}
                        />
                      </CProgress>
                      <div className="text-center">
                        <CBadge color="warning">
                          {Language.Efficiency}:{" "}
                          {calculateEfficiency(avgTimes.avgPendingToPreparing)}
                        </CBadge>
                      </div>
                    </div>
                    <CListGroup flush>
                      <CListGroupItem>
                        <div className="d-flex justify-content-between">
                          <span>{Language.Fastest}</span>
                          <span>
                            {formatMinutes(avgTimes.minPendingToPreparing)}
                          </span>
                        </div>
                      </CListGroupItem>
                      <CListGroupItem>
                        <div className="d-flex justify-content-between">
                          <span>{Language.Slowest}</span>
                          <span>
                            {formatMinutes(avgTimes.maxPendingToPreparing)}
                          </span>
                        </div>
                      </CListGroupItem>
                    </CListGroup>
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol md={6}>
                <CCard className="h-100">
                  <CCardBody>
                    <h5 className="d-flex align-items-center">
                      <CIcon
                        icon={cilCheckCircle}
                        className="me-2 text-success"
                      />
                      {Language.OrderCompletion}
                    </h5>
                    <div className="my-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span>{Language.AverageTime}</span>
                        <span className="fw-bold">
                          {formatMinutes(avgTimes.avgPreparingToCompleted)}
                        </span>
                      </div>
                      <CProgress
                        color="success"
                        value={Math.min(avgTimes.avgPreparingToCompleted, 180)}
                        max={180}
                        className="mb-3"
                        style={{ height: "10px" }}
                      >
                        <CProgressBar
                          color="success"
                          value={Math.min(
                            avgTimes.avgPreparingToCompleted,
                            180,
                          )}
                          max={180}
                        />
                      </CProgress>
                      <div className="text-center">
                        <CBadge color="success">
                          {Language.Efficiency}:{" "}
                          {calculateEfficiency(
                            avgTimes.avgPreparingToCompleted,
                          )}
                        </CBadge>
                      </div>
                    </div>
                    <CListGroup flush>
                      <CListGroupItem>
                        <div className="d-flex justify-content-between">
                          <span>{Language.Fastest}</span>
                          <span>
                            {formatMinutes(avgTimes.minPreparingToCompleted)}
                          </span>
                        </div>
                      </CListGroupItem>
                      <CListGroupItem>
                        <div className="d-flex justify-content-between">
                          <span>{Language.Slowest}</span>
                          <span>
                            {formatMinutes(avgTimes.maxPreparingToCompleted)}
                          </span>
                        </div>
                      </CListGroupItem>
                    </CListGroup>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            <div className="mt-4 text-center text-muted small">
              <CIcon icon={cilCalendar} className="me-1" />
              {Language.Datafrom} {new Date(startDate).toLocaleDateString()}{" "}
              {Language.to} {new Date(endDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </CCardBody>

      <style>{`
        .dashboard-card {
          border-radius: 15px;
          box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
          border: none;
          overflow: hidden;
          margin-bottom:20px;
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
        .progress-label {
          font-size: 0.8rem;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </CCard>
  );
};

export default AverageProcessingTime;
