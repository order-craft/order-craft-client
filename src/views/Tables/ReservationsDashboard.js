import React, { useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CForm,
  CFormInput,
  CFormSelect,
  CTable,
  CTableBody,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTableDataCell,
} from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import Loading from '../../helpers/Loading'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'

const ReservationsDashboard = () => {
  const [reservations, setReservations] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTimes, setSelectedTimes] = useState({})
  const [newReservation, setNewReservation] = useState({ tableId: '', startTime: '', endTime: '' })
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  // Fetch reservations
  const fetchReservations = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/tables/reservations/all`,
        { date: selectedDate },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      setReservations(response.data)
      console.log(response.data)
    } catch (err) {
      setError('Error fetching reservations')
      console.error(err)
    }
    setLoading(false)
  }

  // Fetch tables
  const fetchTables = async () => {
    try {
      const response = await axios.post(
        `${BaseUrl}/tables/reservations/all`,
        { date: selectedDate },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      setTables(response.data)
    } catch (err) {
      console.error('Error fetching tables:', err)
    }
  }

  // Handle time slot selection
  const handleTimeSlotClick = (tableId, hour) => {
    setSelectedTimes((prev) => {
      const currentTableTimes = prev[tableId] || []
      if (currentTableTimes.length === 2) return prev // Limit to two selections

      const updatedTableTimes = [...currentTableTimes, hour].sort((a, b) => a - b)
      const startTime = updatedTableTimes[0]
      const endTime = updatedTableTimes.length === 2 ? updatedTableTimes[1] + 1 : null // End hour exclusive

      setNewReservation((current) => ({
        ...current,
        tableId,
        startTime:
          startTime !== undefined ? `${selectedDate}T${String(startTime).padStart(2, '0')}:00` : '',
        endTime:
          endTime !== undefined ? `${selectedDate}T${String(endTime).padStart(2, '0')}:00` : '',
      }))

      return { ...prev, [tableId]: updatedTableTimes }
    })
  }

  // Handle reservation creation
  const handleCreateReservation = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post(`${BaseUrl}/tables/reservations`, newReservation, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setShowCreateModal(false)
      setSelectedTimes({})
      setNewReservation({ tableId: '', startTime: '', endTime: '' })
      fetchReservations()
    } catch (err) {
      setError('Error creating reservation')
      console.error(err)
    }
    setLoading(false)
  }

  // Handle reservation details
  const handleViewReservation = (reservation, tableId) => {
    setSelectedReservation({ ...reservation, tableId })
    setShowDetailsModal(true)
  }

  // Handle reservation deletion
  const handleDeleteReservation = async (reservationId, tableId) => {
    if (window.confirm('are you sure you want to delete this reservations?')) {
      setLoading(true)
      try {
        await axios.delete(`${BaseUrl}/tables/${tableId}/reservations/${reservationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        fetchReservations()
        setShowDetailsModal(false)
      } catch (err) {
        setError('Error deleting reservation')
        console.error(err)
      }
      setLoading(false)
    }
  }

  // Render time slots for a table
  const renderTimeSlots = (table) => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const tableReservations = table.reservations || []
    const selectedTableTimes = selectedTimes[table._id] || []

    return hours.map((hour) => {
      const reservation = tableReservations.find((res) => {
        const resStart = new Date(res.startTime)
        const resEnd = new Date(res.endTime)
        const selectedDateObj = new Date(selectedDate)

        return (
          resStart.getDate() === selectedDateObj.getDate() &&
          resStart.getMonth() === selectedDateObj.getMonth() &&
          resStart.getFullYear() === selectedDateObj.getFullYear() &&
          resStart.getHours() <= hour &&
          resEnd.getHours() > hour
        )
      })

      if (reservation) {
        return (
          <CTableDataCell
            key={hour}
            className="bg-danger text-white"
            onClick={() => handleViewReservation(reservation, table._id)}
            style={{ cursor: 'pointer' }}
          >
            Reserved
          </CTableDataCell>
        )
      }

      const isSelected = selectedTableTimes.includes(hour)
      const isBetween =
        selectedTableTimes.length === 2 &&
        hour > selectedTableTimes[0] &&
        hour < selectedTableTimes[1]

      return (
        <CTableDataCell
          key={hour}
          className={
            isBetween ? 'bg-warning text-dark' : isSelected ? 'bg-primary text-white' : 'bg-light'
          }
          onClick={() => handleTimeSlotClick(table._id, hour)}
          style={{ cursor: 'pointer' }}
        >
          {hour}:00
        </CTableDataCell>
      )
    })
  }
  const selectedDateChange = (e) => {
    setSelectedDate(e.target.value)
    fetchReservations()
  }

  useEffect(() => {
    fetchReservations()
    fetchTables()
  }, [])

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <strong>Time Schedule</strong>
                <div>
                  <CFormInput
                    type="date"
                    value={selectedDate}
                    onChange={(e) => selectedDateChange(e)}
                    className="me-3"
                  />
                  <CButton color="primary" onClick={() => setShowCreateModal(true)}>
                    Create Reservation
                  </CButton>
                </div>
              </div>
            </CCardHeader>
            <CCardBody>
              {loading && <Loading />}
              {error && <p className="text-danger">{error}</p>}
              <div className="table-responsive">
                <CTable striped bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Table</CTableHeaderCell>
                      {Array.from({ length: 24 }, (_, i) => (
                        <CTableHeaderCell key={i}>{i}:00</CTableHeaderCell>
                      ))}
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {tables.map((table) => (
                      <CTableRow key={table._id}>
                        <CTableDataCell>Table {table.number}</CTableDataCell>
                        {renderTimeSlots(table)}
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Create Reservation Modal */}
      <CModal visible={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <CModalHeader>
          <CModalTitle>Create Reservation</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleCreateReservation}>
            <CFormSelect
              value={newReservation.tableId}
              onChange={(e) => setNewReservation({ ...newReservation, tableId: e.target.value })}
              required
            >
              <option value="">Select Table</option>
              {tables.map((table) => (
                <option key={table._id} value={table._id}>
                  Table {table.number}
                </option>
              ))}
            </CFormSelect>
            <CFormInput
              type="datetime-local"
              value={newReservation.startTime}
              onChange={(e) => setNewReservation({ ...newReservation, startTime: e.target.value })}
              required
              style={{ marginTop: '10px' }}
            />
            <CFormInput
              type="datetime-local"
              value={newReservation.endTime}
              onChange={(e) => setNewReservation({ ...newReservation, endTime: e.target.value })}
              required
              style={{ marginTop: '10px' }}
            />
            <CButton type="submit" color="primary" style={{ marginTop: '10px' }}>
              Create Reservation
            </CButton>
          </CForm>
        </CModalBody>
      </CModal>

      {/* Reservation Details Modal */}
      {selectedReservation && (
        <CModal visible={showDetailsModal} onClose={() => setShowDetailsModal(false)}>
          <CModalHeader>
            <CModalTitle>Reservation Details</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <p>
              <strong>Table:</strong> Table{' '}
              {tables.find((t) => t._id === selectedReservation.tableId)?.number}
            </p>
            <p>
              <strong>Start Time:</strong>{' '}
              {new Date(selectedReservation.startTime).toLocaleString()}
            </p>
            <p>
              <strong>End Time:</strong> {new Date(selectedReservation.endTime).toLocaleString()}
            </p>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="danger"
              onClick={() =>
                handleDeleteReservation(selectedReservation._id, selectedReservation.tableId)
              }
            >
              Delete Reservation
            </CButton>
            <CButton color="secondary" onClick={() => setShowDetailsModal(false)}>
              Close
            </CButton>
          </CModalFooter>
        </CModal>
      )}
    </>
  )
}

export default ReservationsDashboard
