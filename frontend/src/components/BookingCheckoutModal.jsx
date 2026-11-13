import React, { useState } from "react";
import "./BookingCheckoutModal.css";

export default function BookingCheckoutModal({
  bookingData, // { trip, selectedSeats, boardingPoint, droppingPoint }
  user,
  token,
  onClose,
  onBookingSuccess,
  showToast
}) {
  const { trip, selectedSeats, boardingPoint, droppingPoint } = bookingData;
  const seatCount = selectedSeats.length;

  // Passenger state
  const [passengers, setPassengers] = useState(
    selectedSeats.map((seat, i) => ({
      name: i === 0 && user?.name ? user.name : "",
      age: 28,
      gender: "Male",
      seat
    }))
  );

  const [phone, setPhone] = useState(user?.phone || "9876543210");
  const [email, setEmail] = useState(user?.email || "user@example.com");
  const [insuranceOpted, setInsuranceOpted] = useState(true);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [submitting, setSubmitting] = useState(false);

  const handlePassengerChange = (index, field, value) => {
    setPassengers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleApplyCoupon = (codeToApply) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) return;

    if (code === "REDBUS150") {
      setAppliedCoupon(code);
      setDiscountAmount(150);
      showToast("Coupon REDBUS150 applied! Flat ₹150 off.");
    } else if (code === "FIRSTTRIP") {
      const disc = Math.min(250, Math.round(trip.price * seatCount * 0.15));
      setAppliedCoupon(code);
      setDiscountAmount(disc);
      showToast(`Coupon FIRSTTRIP applied! ₹${disc} discount.`);
    } else if (code === "TRIPNEST10") {
      const disc = Math.min(500, Math.round(trip.price * seatCount * 0.1));
      setAppliedCoupon(code);
      setDiscountAmount(disc);
      showToast(`Coupon TRIPNEST10 applied! ₹${disc} discount.`);
    } else if (code === "SUPERBUS") {
      setAppliedCoupon(code);
      setDiscountAmount(120);
      showToast("Coupon SUPERBUS applied! ₹120 discount.");
    } else {
      showToast("Invalid or expired coupon code.", true);
    }
  };

  // Calculations
  const baseFare = trip.price * seatCount;
  const insuranceAmount = insuranceOpted ? 15 * seatCount : 0;
  const gstAmount = Number(((baseFare + insuranceAmount) * 0.05).toFixed(2));
  const totalAmount = Number(Math.max(1, baseFare + insuranceAmount + gstAmount - discountAmount).toFixed(2));

  const handleCompleteBooking = async (e) => {
    e.preventDefault();

    for (let i = 0; i < passengers.length; i++) {
      if (!passengers[i].name.trim()) {
        showToast(`Please enter passenger ${i + 1}'s full name.`, true);
        return;
      }
      if (!passengers[i].age || Number(passengers[i].age) < 1) {
        showToast(`Please enter a valid age for passenger ${i + 1}.`, true);
        return;
      }
    }

    if (!phone || phone.length < 10) {
      showToast("Please enter a valid 10-digit mobile number.", true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tripId: trip.id,
          seats: seatCount,
          passengers: passengers.map((p) => ({
            name: p.name.trim(),
            age: Number(p.age),
            gender: p.gender,
            seat: p.seat
          })),
          seatCodes: selectedSeats,
          boardingPoint,
          droppingPoint,
          paymentMethod: `${paymentMethod}_demo`,
          couponCode: appliedCoupon || "",
          passengerPhone: phone,
          passengerEmail: email,
          insuranceOpted
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm booking.");

      showToast("Ticket Confirmed! Safe travels with TripNest.");
      onBookingSuccess(data.booking);
    } catch (err) {
      showToast(err.message, true);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-large">
        <div className="modal-header">
          <div>
            <h3>Review Journey & Checkout</h3>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
              {trip.origin} → {trip.destination} · {trip.travel_date}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleCompleteBooking}>
          <div className="modal-body checkout-modal-body">
            {/* Left Column: Passenger & Contact Info */}
            <div className="checkout-form-column">
              {/* Trip Highlight Banner */}
              <div className="checkout-trip-banner">
                <div>
                  <b style={{ color: "var(--ink)", fontSize: "15px" }}>{trip.operator}</b>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {trip.bus_type} · Seats: <b style={{ color: "var(--primary)" }}>{selectedSeats.join(", ")}</b>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <b>{trip.departure_time} - {trip.arrival_time}</b>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Board: {boardingPoint.split(" ")[0]}
                  </div>
                </div>
              </div>

              {/* Passenger Details */}
              <div className="checkout-section-title">
                <span>👤</span> Passenger Details
              </div>

              {passengers.map((p, idx) => (
                <div key={idx} className="passenger-entry-card">
                  <div className="passenger-entry-header">
                    <span>Passenger {idx + 1}</span>
                    <span className="badge badge-primo">Seat {p.seat}</span>
                  </div>

                  <div className="passenger-entry-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Chandan Ghanghav"
                        value={p.name}
                        onChange={(e) => handlePassengerChange(idx, "name", e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Age</label>
                      <input
                        type="number"
                        min="1"
                        max="110"
                        value={p.age}
                        onChange={(e) => handlePassengerChange(idx, "age", e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Gender</label>
                      <select
                        value={p.gender}
                        onChange={(e) => handlePassengerChange(idx, "gender", e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {/* Contact Information */}
              <div className="checkout-section-title" style={{ marginTop: "20px" }}>
                <span>📱</span> Contact Information (For M-Ticket)
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Mobile Number (SMS Updates)</label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email ID (PDF E-Ticket)</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Insurance Opt-in */}
              <div className="insurance-optin-card">
                <input
                  type="checkbox"
                  id="insuranceCheck"
                  checked={insuranceOpted}
                  onChange={(e) => setInsuranceOpted(e.target.checked)}
                />
                <label htmlFor="insuranceCheck" style={{ cursor: "pointer", fontSize: "12px" }}>
                  <b style={{ color: "#065F46" }}>Add TripNest Travel Protection (+₹{15 * seatCount})</b>
                  <p style={{ margin: "2px 0 0", color: "#047857" }}>
                    Covers accidental medical expenses up to ₹5,00,000, emergency hospital cash & baggage loss.
                  </p>
                </label>
              </div>
            </div>

            {/* Right Column: Coupons, Payment & Summary */}
            <div className="checkout-summary-column">
              {/* Coupon Box */}
              <div className="coupon-box-card">
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)" }}>
                  🏷 Offers & Promo Codes
                </span>
                <div className="coupon-input-group">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button
                    type="button"
                    className="coupon-apply-btn"
                    onClick={() => handleApplyCoupon()}
                  >
                    Apply
                  </button>
                </div>

                <div className="available-coupons-pills">
                  <span className="coupon-pill" onClick={() => handleApplyCoupon("REDBUS150")}>
                    REDBUS150 (-₹150)
                  </span>
                  <span className="coupon-pill" onClick={() => handleApplyCoupon("FIRSTTRIP")}>
                    FIRSTTRIP (15% off)
                  </span>
                  <span className="coupon-pill" onClick={() => handleApplyCoupon("TRIPNEST10")}>
                    TRIPNEST10 (10% off)
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="coupon-box-card">
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)" }}>
                  💳 Demo Payment Method
                </span>

                <div className="payment-options-grid">
                  <label
                    className={`payment-method-label ${paymentMethod === "upi" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("upi")}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "upi"}
                      onChange={() => setPaymentMethod("upi")}
                    />
                    <span>UPI (Google Pay, PhonePe, Paytm QR)</span>
                  </label>

                  <label
                    className={`payment-method-label ${paymentMethod === "card" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("card")}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                    />
                    <span>Credit / Debit Card (Visa, MasterCard, RuPay)</span>
                  </label>

                  <label
                    className={`payment-method-label ${paymentMethod === "wallet" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("wallet")}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "wallet"}
                      onChange={() => setPaymentMethod("wallet")}
                    />
                    <span>TripNest Wallet / Net Banking</span>
                  </label>
                </div>

                {paymentMethod === "upi" && (
                  <div className="upi-qr-preview">
                    <div style={{ fontSize: "28px" }}>📱</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                      Scan QR or Pay to: <span style={{ color: "var(--primary)" }}>tripnest@upi</span>
                    </div>
                    <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                      Instant automated demo verification
                    </small>
                  </div>
                )}
              </div>

              {/* Fare Breakdown */}
              <div className="fare-breakdown-card">
                <div className="fare-breakdown-row">
                  <span>Base Fare ({seatCount} × ₹{trip.price})</span>
                  <b>₹{baseFare}</b>
                </div>

                {insuranceOpted && (
                  <div className="fare-breakdown-row">
                    <span>Travel Insurance</span>
                    <span>₹{insuranceAmount}</span>
                  </div>
                )}

                <div className="fare-breakdown-row">
                  <span>GST & Service Charges (5%)</span>
                  <span>₹{gstAmount}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="fare-breakdown-row" style={{ color: "var(--green)" }}>
                    <span>Offer Discount ({appliedCoupon})</span>
                    <b>-₹{discountAmount}</b>
                  </div>
                )}

                <div className="fare-breakdown-row total">
                  <span>Total Amount</span>
                  <span style={{ color: "var(--primary)" }}>₹{totalAmount}</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", padding: "14px", fontSize: "15px" }}
                disabled={submitting}
              >
                {submitting ? "Processing Booking..." : `Pay ₹${totalAmount} & Confirm Booking →`}
              </button>

              <small style={{ textAlign: "center", color: "var(--muted)", fontSize: "11px" }}>
                🔒 256-bit encrypted secure transaction · Simulated instant confirmation
              </small>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
