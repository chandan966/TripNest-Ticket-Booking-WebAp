import React from "react";
import "./ETicketModal.css";

export default function ETicketModal({ booking, onClose, onTrackBus }) {
  if (!booking) return null;

  const passengers = booking.passengers || [];
  const selectedSeats = booking.selected_seats || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="eticket-paper">
        {/* Header */}
        <div className="eticket-header-banner">
          <div className="eticket-brand-title">
            <span>🚌</span>
            <span>trip<span style={{ color: "#FEF08A" }}>nest</span></span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="eticket-status-badge">
              {booking.status === "cancelled" ? "CANCELLED" : "CONFIRMED TICKET"}
            </span>
            <button
              type="button"
              className="modal-close-btn"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="eticket-content-body">
          {/* PNR Strip */}
          <div className="eticket-pnr-strip">
            <div>
              <span className="pnr-box-label">BOOKING PNR NUMBER</span>
              <div className="pnr-box-value">{booking.booking_code}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="pnr-box-label">SEATS ALLOTTED</span>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)" }}>
                {selectedSeats.length ? selectedSeats.join(", ") : `${booking.seats} Seat(s)`}
              </div>
            </div>
          </div>

          {/* Route Summary */}
          <div className="eticket-route-card">
            <div className="route-stop-block">
              <b>{booking.departure_time}</b>
              <small>{booking.origin}</small>
            </div>

            <div style={{ flex: 1, padding: "0 14px", position: "relative" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)" }}>
                {booking.duration || "Direct"}
              </span>
              <div style={{ height: "2px", background: "var(--line-strong)", margin: "4px 0" }} />
              <small style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 700 }}>
                {booking.rescheduled_to || booking.travel_date}
              </small>
            </div>

            <div className="route-stop-block">
              <b>{booking.arrival_time}</b>
              <small>{booking.destination}</small>
            </div>
          </div>

          {/* Details Grid */}
          <div className="eticket-details-grid">
            <div className="detail-item-card">
              <span style={{ color: "var(--muted)", fontWeight: 700 }}>Bus Operator</span>
              <b>{booking.operator}</b>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>{booking.bus_type}</span>
            </div>

            <div className="detail-item-card">
              <span style={{ color: "var(--muted)", fontWeight: 700 }}>Total Fare Paid</span>
              <b style={{ color: "var(--primary)", fontSize: "16px" }}>₹{booking.total_amount}</b>
              <span style={{ fontSize: "11px", color: "var(--green-dark)" }}>Paid via {booking.payment_method}</span>
            </div>

            <div className="detail-item-card">
              <span style={{ color: "var(--muted)", fontWeight: 700 }}>Boarding Point & Time</span>
              <b>{booking.boarding_point || `${booking.origin} Central`}</b>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Reporting: 15 mins prior</span>
            </div>

            <div className="detail-item-card">
              <span style={{ color: "var(--muted)", fontWeight: 700 }}>Dropping Point</span>
              <b>{booking.dropping_point || `${booking.destination} Central`}</b>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Scheduled arrival: {booking.arrival_time}</span>
            </div>
          </div>

          {/* Passenger Table */}
          <table className="passengers-table-wrap">
            <thead>
              <tr>
                <th>PASSENGER NAME</th>
                <th>AGE</th>
                <th>GENDER</th>
                <th>SEAT NO</th>
              </tr>
            </thead>
            <tbody>
              {passengers.map((p, idx) => (
                <tr key={idx}>
                  <td>{p.name}</td>
                  <td>{p.age} yrs</td>
                  <td>{p.gender || "Adult"}</td>
                  <td>
                    <b style={{ color: "var(--primary)" }}>{p.seat || selectedSeats[idx] || "Assigned"}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* QR & Barcode */}
          <div className="eticket-qr-barcode-row">
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div className="qr-code-mock">▦</div>
              <div>
                <b style={{ fontSize: "12px", color: "var(--ink)", display: "block" }}>
                  Digital M-Ticket Pass
                </b>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                  Show this QR code to bus conductor during boarding.
                </small>
              </div>
            </div>
            <div className="barcode-mock">||| | |||| | |||</div>
          </div>

          {/* Important instructions */}
          <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.4", marginBottom: "16px" }}>
            <b>Important Travel Notes:</b> Please carry a government-issued photo ID. The bus will depart promptly at the scheduled time. For luggage queries or location assistance, contact 24/7 RedCare helpline: <b>+91 98765 43210</b>.
          </div>

          {/* Actions */}
          <div className="eticket-actions-row">
            {booking.status === "confirmed" && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  onClose();
                  onTrackBus(booking.booking_code);
                }}
              >
                📍 Track Live Bus
              </button>
            )}

            <button type="button" className="btn-primary" onClick={handlePrint}>
              🖨 Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
