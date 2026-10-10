import React, { useEffect, useMemo, useState } from "react";
import {
  CButton,
  CModal,
  CModalBody,
  CFormCheck,
  CFormSelect,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus, cilMinus, cilCheckCircle, cilWarning } from "@coreui/icons";
import axios from "axios";
import { GetToken } from "../../helpers/GetToken";
import { BaseUrl } from "../../helpers/BaseUrl";
import "./ProductSelectionModal.css";

const ProductSelectionModal = ({
  visible,
  onClose,
  products = [],
  orderId,
  refetchData,
  paymentMethods = [],
  onShowToast,
  isTakeaway,
  tableNumber, // optional new prop
}) => {
  const token = GetToken();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Map of productId -> selected count (0..remaining)
  const [selections, setSelections] = useState({});

  // Build a normalized view model: one entry per product, with remaining qty
  const lineItems = useMemo(() => {
    return (products || []).map((line) => {
      const paidQty = line.payedQuantity || 0;
      const totalQty = line.quantity || 0;
      const remaining = Math.max(totalQty - paidQty, 0);
      const rawPrice = line.product?.price ?? 0;
      const discount = line.product?.discountPercentage || 0;
      const finalPrice =
        discount > 0 ? rawPrice * (1 - discount / 100) : rawPrice;
      return {
        productId: line.product?._id,
        name: line.product?.name || "Unknown",
        totalQty,
        paidQty,
        remaining,
        rawPrice,
        finalPrice,
        discount,
      };
    });
  }, [products]);

  const totalRemaining = lineItems.reduce((acc, it) => acc + it.remaining, 0);

  const totalSelectedUnits = Object.values(selections).reduce(
    (a, b) => a + b,
    0,
  );

  const selectedTotalPrice = lineItems.reduce((acc, it) => {
    const qty = selections[it.productId] || 0;
    return acc + qty * it.finalPrice;
  }, 0);

  // Reset selections whenever the modal is (re)opened for a different order
  useEffect(() => {
    if (!visible) {
      setSelections({});
      setSelectedPaymentMethod("");
      setError("");
    }
  }, [visible]);

  const setProductQty = (productId, qty) => {
    setSelections((prev) => ({ ...prev, [productId]: Math.max(0, qty) }));
  };

  const handleSelectAll = () => {
    if (totalSelectedUnits === totalRemaining) {
      // Deselect all
      setSelections({});
      return;
    }
    const next = {};
    lineItems.forEach((it) => {
      if (it.remaining > 0) next[it.productId] = it.remaining;
    });
    setSelections(next);
  };

  /**
   * Payload: build one instanceId per selected unit, e.g. ["pid-0","pid-1"].
   * The backend counts occurrences of the same base id to determine how many
   * units are being paid for that product.
   */
  const buildProductIds = () => {
    const ids = [];
    lineItems.forEach((it) => {
      const selectedQty = selections[it.productId] || 0;
      // Start at paidQty so we don't overlap with already-paid units
      for (let i = 0; i < selectedQty; i++) {
        ids.push(`${it.productId}-${it.paidQty + i}`);
      }
    });
    return ids;
  };

  const handleConfirmPayment = async () => {
    if (totalSelectedUnits === 0) {
      setError("Select at least one item to pay for.");
      return;
    }
    if (!selectedPaymentMethod) {
      setError("Please choose a payment method.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const productIds = buildProductIds();
      const endpoint = isTakeaway
        ? `${BaseUrl}/order/confirm/confirm-notdinein-products-payment`
        : `${BaseUrl}/order/confirm/confirm-products-payment`;

      const response = await axios.put(
        endpoint,
        { orderId, productIds, paymentMethod: selectedPaymentMethod },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const {
        message = "Payment confirmed successfully",
        warnings = [],
        insufficientMaterials = [],
      } = response.data || {};

      onShowToast?.(message, "success");

      warnings.forEach((w, i) =>
        setTimeout(() => onShowToast?.(w, "warning"), 400 * (i + 1)),
      );

      if (insufficientMaterials.length > 0) {
        setTimeout(
          () =>
            onShowToast?.(
              `Insufficient stock for materials: ${insufficientMaterials.join(", ")}`,
              "warning",
            ),
          400 * (warnings.length + 1),
        );
      }

      setSelections({});
      setSelectedPaymentMethod("");
      refetchData?.();
      onClose?.();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to confirm payment";
      setError(msg);
      onShowToast?.(msg, "danger");
    } finally {
      setLoading(false);
    }
  };

  const allSelected =
    totalRemaining > 0 && totalSelectedUnits === totalRemaining;

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="lg"
      backdrop="static"
      className="psm-modal"
    >
      {/* ---- Header ---- */}
      <div className="psm-header">
        <div>
          <h5 className="psm-title">Product-level payment</h5>
          <div className="psm-subtitle">
            {tableNumber ? `Table ${tableNumber}` : null}
            {tableNumber && orderId ? " · " : null}
            {orderId ? `Order ${String(orderId).slice(-6)}` : null}
          </div>
        </div>
        <button
          className="psm-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          &times;
        </button>
      </div>

      {/* ---- Body ---- */}
      <CModalBody className="psm-body">
        {error && <div className="psm-error">{error}</div>}

        {/* Payment method */}
        <div className="psm-method-row">
          <label htmlFor="psm-method">Payment method</label>
          <CFormSelect
            id="psm-method"
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            disabled={paymentMethods.length === 0}
          >
            <option value="">
              {paymentMethods.length === 0
                ? "No methods configured"
                : "Select a payment method"}
            </option>
            {paymentMethods.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
                {m.description ? ` — ${m.description}` : ""}
              </option>
            ))}
          </CFormSelect>
        </div>

        {/* Select-all bar */}
        {totalRemaining > 0 && (
          <div className="psm-selectall">
            <CFormCheck
              id="psm-selectall"
              checked={allSelected}
              onChange={handleSelectAll}
              label="Select all unpaid"
            />
            <span className="psm-count">
              Selected <strong>{totalSelectedUnits}</strong> / {totalRemaining}
            </span>
          </div>
        )}

        {/* Items */}
        <div className="psm-list">
          {lineItems.length === 0 ? (
            <div className="psm-empty">
              <CIcon icon={cilWarning} className="me-2" />
              No items on this order.
            </div>
          ) : totalRemaining === 0 ? (
            <div className="psm-empty">
              <CIcon
                icon={cilCheckCircle}
                className="me-2"
                style={{ color: "#198754" }}
              />
              All items on this order are already paid.
            </div>
          ) : (
            lineItems.map((it) => {
              if (it.remaining === 0) return null;
              const selectedQty = selections[it.productId] || 0;
              const isFullyPaid = it.paidQty >= it.totalQty;
              const isPartiallyPaid = it.paidQty > 0 && !isFullyPaid;

              return (
                <div
                  key={it.productId}
                  className={`psm-row ${selectedQty > 0 ? "is-selected" : ""} ${
                    isFullyPaid ? "is-paid" : ""
                  }`}
                >
                  <div className="psm-row-check">
                    <CFormCheck
                      checked={selectedQty > 0}
                      onChange={(e) => {
                        setProductQty(
                          it.productId,
                          e.target.checked ? it.remaining : 0,
                        );
                      }}
                    />
                  </div>

                  <div className="psm-row-main">
                    <p className="psm-row-name">
                      {it.name}
                      {isFullyPaid && (
                        <span className="psm-pill paid">Paid</span>
                      )}
                      {isPartiallyPaid && (
                        <span className="psm-pill partial">
                          {it.paidQty}/{it.totalQty} paid
                        </span>
                      )}
                      {!isFullyPaid && !isPartiallyPaid && (
                        <span className="psm-pill unpaid">Unpaid</span>
                      )}
                    </p>
                    <div className="psm-row-price">
                      {it.discount > 0 ? (
                        <>
                          <span className="psm-strike">
                            {it.rawPrice.toFixed(2)} TND
                          </span>
                          <span className="psm-final">
                            {it.finalPrice.toFixed(2)} TND
                          </span>
                        </>
                      ) : (
                        <span>{it.finalPrice.toFixed(2)} TND / unit</span>
                      )}
                      {it.totalQty > 1 && (
                        <span>
                          {" "}
                          · <b>{it.remaining}</b> remaining
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="psm-stepper">
                    <button
                      type="button"
                      onClick={() =>
                        setProductQty(it.productId, selectedQty - 1)
                      }
                      disabled={selectedQty <= 0}
                      aria-label="Decrease"
                    >
                      <CIcon icon={cilMinus} size="sm" />
                    </button>
                    <span className="psm-stepper-value">{selectedQty}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setProductQty(it.productId, selectedQty + 1)
                      }
                      disabled={selectedQty >= it.remaining}
                      aria-label="Increase"
                    >
                      <CIcon icon={cilPlus} size="sm" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CModalBody>

      {/* ---- Footer ---- */}
      <div className="psm-footer">
        <div className="psm-total">
          <span className="psm-total-label">Total selected</span>
          <span className="psm-total-value">
            {selectedTotalPrice.toFixed(2)} TND
          </span>
        </div>

        <div className="psm-actions">
          <CButton
            color="secondary"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleConfirmPayment}
            disabled={
              loading || totalSelectedUnits === 0 || !selectedPaymentMethod
            }
          >
            {loading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Confirming…
              </>
            ) : (
              <>
                <CIcon icon={cilCheckCircle} className="me-2" />
                Confirm payment
              </>
            )}
          </CButton>
        </div>
      </div>
    </CModal>
  );
};

export default ProductSelectionModal;
