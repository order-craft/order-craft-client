import CIcon from '@coreui/icons-react'
import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
} from '@coreui/react'
import MainChart from '../MainChart'
import RevenuePerProductPerDay from '../RevenuePerProductPerDay'
import { useState } from 'react'
import { cilCloudDownload, cilChart, cilCalendar } from '@coreui/icons'
import RevenuePerProduct2dates from '../RevenuePerProduct2dates'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const RevenuePerProduct = () => {
  const [chartValue, setChartValue] = useState('Day')
  const [data, setData] = useState([])
  const [dataDay, setDataDay] = useState([])

  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const handleDataUpdate = (newData) => setData(newData)
  const handleDataUpdateDay = (newData) => setDataDay(newData)

  const handleDownloadPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(Language.RevenueperProductReport, 14, 16)
    doc.setFontSize(12)
    doc.text(`${Language.Generatedon} ${new Date().toLocaleDateString()}`, 14, 24)
    doc.autoTable({
      startY: 30,
      head: [[Language.Product, `${Language.Revenue} (TND)`]],
      body: data.flatMap((entry) =>
        entry?.products.map((item) => [item.productName, item.totalRevenue.toFixed(2)]),
      ),
      styles: { cellPadding: 5, fontSize: 10 },
      headStyles: { fillColor: [79, 115, 223] },
    })
    doc.save(`${Language.revenue_per_product}-${new Date().getTime()}.pdf`)
  }

  const handleDownloadExcel = () => {
    const revenueTnd = Language.Revenue + " (TND)";
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Revenue Data');
    XLSX.writeFile(workbook, `${Language.revenue_per_product}-${new Date().getTime()}.xlsx`);
    const worksheet = XLSX.utils.json_to_sheet(
      data.flatMap((entry) =>
        entry.products.map((item) => ({
          Product: item.productName,
          revenueTnd: item.totalRevenue.toFixed(2),
        })),
      ),
    )
  }

  return (
    <div className="dashboard-container">
      <CCard className="dashboard-card mb-4">
        <CCardHeader className="dashboard-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="dashboard-title">
              <CIcon icon={cilChart} className="me-2" />
              {Language.revenuePerProduct}
            </h3>
            <CBadge color="primary">
              {chartValue === Language.Month ? Language.MonthlyView : Language.DailyView}
            </CBadge>
          </div>
        </CCardHeader>
        <CCardBody className="dashboard-card-body">
          <div className="d-flex justify-content-between mb-4">
            <CButtonGroup>
              {['Day', 'Month'].map((value) => (
                <CButton
                  color={value === chartValue ? 'primary' : 'outline-secondary'}
                  key={value}
                  onClick={() => setChartValue(value)}
                >
                  {value}
                </CButton>
              ))}
            </CButtonGroup>
            <div>
              <CButton
                color="primary"
                variant="outline"
                className="me-2"
                onClick={chartValue === 'Month' ? handleDownloadPDF : handleDownloadPDF}
              >
                <CIcon icon={cilCloudDownload} className="me-1" />
                PDF
              </CButton>
              <CButton color="primary" variant="outline" onClick={handleDownloadExcel}>
                <CIcon icon={cilCloudDownload} className="me-1" />
                Excel
              </CButton>
            </div>
          </div>

          {chartValue === 'Month' ? (
            <MainChart onDataUpdate={handleDataUpdate} />
          ) : (
            <RevenuePerProductPerDay onDataUpdate={handleDataUpdateDay} />
          )}
        </CCardBody>
      </CCard>

      <CCard className="dashboard-card mb-4">
        <CCardHeader className="dashboard-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="dashboard-title">
              <CIcon icon={cilCalendar} className="me-2" />
              {Language.Product_sRevenueBetween2Dates}
            </h3>
          </div>
        </CCardHeader>
        <CCardBody>
          <RevenuePerProduct2dates />
        </CCardBody>
      </CCard>

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
        .dashboard-card-body {
          padding: 2rem;
        }
      `}</style>
    </div>
  )
}

export default RevenuePerProduct
