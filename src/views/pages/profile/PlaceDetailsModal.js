import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CFormInput, CFormSelect, CModal, CModalBody, CModalFooter } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBuilding, cilLocationPin, cilImage, cilCheck, cilX } from '@coreui/icons'
import './profile.css'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const FLOW_OPTIONS = [
  {
    key: 'two-step',
    labelKey: 'orderFlowTwoStepLabel',
    hintKey: 'orderFlowTwoStepHint',
  },
  {
    key: 'three-step',
    labelKey: 'orderFlowThreeStepLabel',
    hintKey: 'orderFlowThreeStepHint',
  },
  {
    key: 'four-step',
    labelKey: 'orderFlowFourStepLabel',
    hintKey: 'orderFlowFourStepHint',
  },
  {
    key: 'delivery-only',
    labelKey: 'orderFlowDeliveryOnlyLabel',
    hintKey: 'orderFlowDeliveryOnlyHint',
  },
]

const PlaceDetailsModal = ({ visible, onClose, data, onChange, onFileChange, onSave }) => {
  const [saving, setSaving] = useState(false)
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  useEffect(() => {
    if (visible) setSaving(false)
  }, [visible])

  const brandColor = data?.brandColor || '#8B5A2B'
  const orderFlow = data?.orderFlow || 'three-step'
  const editWindow = data?.customerEditWindow || {
    enabled: true,
    minutes: 3,
    from: 'placed',
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  const pickFlow = (key) => {
    onChange({ target: { name: 'orderFlow', value: key } })
  }

  const handleWindowChange = (field) => (e) => {
    const raw = e.target.value
    onChange({
      target: {
        name: 'customerEditWindow',
        value: {
          ...editWindow,
          [field]: field === 'minutes' ? Number(raw) : field === 'enabled' ? e.target.checked : raw,
        },
      },
    })
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      backdrop="static"
      className="pf-modal"
    >
      {/* ---------- Header ---------- */}
      <div className="pf-modal-header">
        <h5 className="pf-modal-title">
          <CIcon icon={cilBuilding} />
          {data?.placeName ? `${Language.edit} ${data.placeName}` : Language.businessDetails}
        </h5>
        <button type="button" className="pf-modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      {/* ---------- Body ---------- */}
      <CModalBody className="pf-modal-body">
        {/* Basic info */}
        <div className="pf-section">
          <div className="pf-section-title">{Language.basicInfo}</div>

          <div className="pf-grid-2">
            <div>
              <label className="pf-field-label" htmlFor="pf-place-name">
                {Language.placeName}
              </label>
              <CFormInput
                id="pf-place-name"
                type="text"
                name="placeName"
                placeholder="e.g. The Corner Cafe"
                value={data?.placeName || ''}
                onChange={onChange}
              />
            </div>
            <div>
              <label className="pf-field-label" htmlFor="pf-place-phone">
                {Language.phoneNumber}
              </label>
              <CFormInput
                id="pf-place-phone"
                type="text"
                name="phoneNumber"
                placeholder="e.g. +216 71 123 456"
                value={data?.phoneNumber || ''}
                onChange={onChange}
              />
            </div>
          </div>

          <label className="pf-field-label" htmlFor="pf-place-address" style={{ marginTop: 14 }}>
            {Language.address}
          </label>
          <CFormInput
            id="pf-place-address"
            type="text"
            name="PlaceAddress"
            placeholder="Street, city, postcode"
            value={data?.PlaceAddress || ''}
            onChange={onChange}
          />
        </div>

        {/* Brand color */}
        <div className="pf-section">
          <div className="pf-section-title">{Language.brandColor}</div>
          <div className="pf-color-row">
            <div className="pf-color-preview-wrap">
              <div className="pf-color-preview" style={{ background: brandColor }} />
              <div className="pf-color-hex">{brandColor}</div>
            </div>
            <div className="pf-color-input-wrap">
              <input
                type="color"
                name="brandColor"
                value={brandColor}
                onChange={onChange}
                className="pf-color-input"
                aria-label="Brand color"
              />
              <div className="pf-color-hint">{Language.brandColorHint}</div>
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="pf-section">
          <div className="pf-section-title">{Language.media}</div>

          <div className="pf-grid-2">
            <div className="pf-media-cell">
              <label className="pf-field-label" htmlFor="pf-logo-upload">
                {Language.placeLogo}
              </label>
              <input
                id="pf-logo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => onFileChange(e, 'logo')}
                style={{ display: 'none' }}
              />
              <label htmlFor="pf-logo-upload" className="pf-upload-area">
                {data?.logoPreview ? (
                  <img
                    src={data.logoPreview}
                    alt="Logo preview"
                    className="pf-upload-preview is-square"
                  />
                ) : (
                  <>
                    <CIcon icon={cilImage} className="pf-upload-icon" />
                    <span className="pf-upload-text">{Language.clickToUploadShort}</span>
                  </>
                )}
              </label>
              <div className="pf-upload-hint">{Language.logoUploadHint}</div>
            </div>

            <div className="pf-media-cell">
              <label className="pf-field-label" htmlFor="pf-picture-upload">
                {Language.placePicture}
              </label>
              <input
                id="pf-picture-upload"
                type="file"
                accept="image/*"
                onChange={(e) => onFileChange(e, 'place')}
                style={{ display: 'none' }}
              />
              <label htmlFor="pf-picture-upload" className="pf-upload-area">
                {data?.picturePreview ? (
                  <img
                    src={data.picturePreview}
                    alt="Place preview"
                    className="pf-upload-preview"
                  />
                ) : (
                  <>
                    <CIcon icon={cilImage} className="pf-upload-icon" />
                    <span className="pf-upload-text">{Language.clickToUploadShort}</span>
                  </>
                )}
              </label>
              <div className="pf-upload-hint">{Language.pictureUploadHint}</div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="pf-section">
          <div className="pf-section-title">
            <CIcon icon={cilLocationPin} /> {Language.location}
          </div>
          <div className="pf-grid-3">
            <div>
              <label className="pf-field-label" htmlFor="pf-distance">
                {Language.distanceM} (m)
              </label>
              <CFormInput
                id="pf-distance"
                type="number"
                name="distance"
                placeholder="e.g. 300"
                value={data?.distance || ''}
                onChange={onChange}
              />
            </div>
            <div>
              <label className="pf-field-label" htmlFor="pf-lat">
                {Language.latitude}
              </label>
              <CFormInput
                id="pf-lat"
                type="text"
                name="lat"
                placeholder="e.g. 36.8310"
                value={data?.lat || ''}
                onChange={onChange}
              />
            </div>
            <div>
              <label className="pf-field-label" htmlFor="pf-long">
                {Language.longitude}
              </label>
              <CFormInput
                id="pf-long"
                type="text"
                name="long"
                placeholder="e.g. 10.2304"
                value={data?.long || ''}
                onChange={onChange}
              />
            </div>
          </div>
          <p className="pf-modal-note" style={{ textAlign: 'left' }}>
            {Language.distanceHint}.
          </p>
        </div>

        {/* ── Order flow (replaces the old status flow switch) ── */}
        <div className="pf-section">
          <div className="pf-section-title">{Language.orderFlowTitle}</div>
          <div className="pf-flow-hint">{Language.orderFlowHint}</div>

          <div className="pf-flow-grid">
            {FLOW_OPTIONS.map((opt) => {
              const active = orderFlow === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`pf-flow-card ${active ? 'is-active' : ''}`}
                  onClick={() => pickFlow(opt.key)}
                  aria-pressed={active}
                >
                  <div className="pf-flow-card-head">
                    <span className="pf-flow-radio" aria-hidden="true" />
                    <span className="pf-flow-label">{Language[opt.labelKey]}</span>
                  </div>
                  <div className="pf-flow-desc">{Language[opt.hintKey]}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Customer edit window ── */}
        <div className="pf-section">
          <div className="pf-section-title">{Language.customerEditWindowTitle}</div>
          <div className="pf-flow-hint">{Language.customerEditWindowHint}</div>

          <div className="pf-switch-row" style={{ marginTop: 10 }}>
            <div className="pf-switch-text">
              <div className="pf-switch-title">{Language.customerEditWindowEnabledLabel}</div>
            </div>
            <label className="pf-toggle">
              <input
                type="checkbox"
                checked={!!editWindow.enabled}
                onChange={handleWindowChange('enabled')}
              />
              <span className="pf-toggle-slider" />
            </label>
          </div>

          <div className="pf-grid-2" style={{ marginTop: 14 }}>
            <div>
              <label className="pf-field-label" htmlFor="pf-edit-minutes">
                {Language.customerEditWindowMinutesLabel}
              </label>
              <CFormInput
                id="pf-edit-minutes"
                type="number"
                min="0"
                step="1"
                value={editWindow.minutes ?? 3}
                onChange={handleWindowChange('minutes')}
                disabled={!editWindow.enabled}
              />
            </div>
            <div>
              <label className="pf-field-label" htmlFor="pf-edit-from">
                {Language.customerEditWindowFromLabel}
              </label>
              <CFormSelect
                id="pf-edit-from"
                value={editWindow.from || 'placed'}
                onChange={handleWindowChange('from')}
                disabled={!editWindow.enabled}
              >
                <option value="placed">{Language.customerEditWindowFromPlaced}</option>
                <option value="preparing">{Language.customerEditWindowFromPreparing}</option>
              </CFormSelect>
            </div>
          </div>
        </div>
      </CModalBody>

      {/* ---------- Footer ---------- */}
      <CModalFooter className="pf-modal-footer">
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={saving}>
          <CIcon icon={cilX} className="me-2" />
          {Language.cancel}
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>{Language.saving}</>
          ) : (
            <>
              <CIcon icon={cilCheck} className="me-2" />
              {Language.saveChanges}
            </>
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

PlaceDetailsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  data: PropTypes.shape({
    placeName: PropTypes.string,
    PlaceAddress: PropTypes.string,
    phoneNumber: PropTypes.string,
    distance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    logoPreview: PropTypes.string,
    picturePreview: PropTypes.string,
    lat: PropTypes.string,
    long: PropTypes.string,
    brandColor: PropTypes.string,
    orderFlow: PropTypes.oneOf(['two-step', 'three-step', 'four-step', 'delivery-only']),
    customerEditWindow: PropTypes.shape({
      enabled: PropTypes.bool,
      minutes: PropTypes.number,
      from: PropTypes.oneOf(['placed', 'preparing']),
    }),
  }),
}

export default PlaceDetailsModal
