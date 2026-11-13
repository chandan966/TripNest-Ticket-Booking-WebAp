import React, { useState, useEffect } from "react";
import "./MyBookingsPage.css";

export default function MyBookingsPage({
  user,
  token,
  onOpenETicket,
  onTrackBus,
  onOpenAuth,
  showToast,
  onSearchNew
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming"); // 'upcoming' | 'past'

  const fetchBookings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/mine", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bookings.");
      setBookings(data);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [token]);

  const handleCancelBooking = async (code) => {
    if (!confirm("Are you sure you want to cancel this booking? Refund policy will apply.")) {
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(code)}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel ticket.");

      showToast(`Booking ${code} cancelled. ${data.refundStatus || ""}`);
      fetchBookings();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleReschedule = async (code) => {
    const newDate = prompt("Enter new travel date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!newDate) return;

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(code)}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newDate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reschedule journey.");

      showToast(`Journey rescheduled to ${newDate}!`);
      fetchBookings();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const upcomingBookings = bookings.filter((b) => {
    const travelDate = b.rescheduled_to || b.travel_date;
    return b.status === "confirmed" && travelDate >= todayStr;
  });

  const pastBookings = bookings.filter((b) => {
    const travelDate = b.rescheduled_to || b.travel_date;
    return b.status === "cancelled" || travelDate < todayStr;
  });

  const displayedList = activeTab === "upcoming" ? upcomingBookings : pastBookings;

  if (!user) {
    return (
      <div className="my-bookings-page" style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2>Sign In to View Your Bookings</h2>
        <p style={{ color: "var(--muted)", margin: "8px 0 20px" }}>
          Access your digital M-tickets, track buses live, and manage cancellations.
        </p>
        <button type="button" className="btn-primary" onClick={() => onOpenAuth("login")}>
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="my-bookings-page">
      <div className="bookings-page-header">
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 800 }}>My Bookings & E-Tickets</h2>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
            Manage active bus reservations, track trips, and download printable passes.
          </p>
        </div>

        <button type="button" className="btn-primary" onClick={onSearchNew}>
          + Book New Journey
        </button>
      </div>

      {/* Tabs */}
      <div className="bookings-tabs-bar">
        <button
          type="button"
          className={`booking-tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          Upcoming Journeys ({upcomingBookings.length})
        </button>
        <button
          type="button"
          className={`booking-tab-btn ${activeTab === "past" ? "active" : ""}`}
          onClick={() => setActiveTab("past")}
        >
          Past & Cancelled ({pastBookings.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "16px" }}>
          <div>🚌</div>
          <h4>Loading your bookings...</h4>
        </div>
      ) : displayedList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "16px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎫</div>
          <h3>No {activeTab} bookings found</h3>
          <p style={{ color: "var(--muted)", marginBottom: "20px" }}>
            Ready for your next trip? Search bus tickets on popular routes.
          </p>
          <button type="button" className="btn-primary" onClick={onSearchNew}>
            Search Buses Now
          </button>
        </div>
      ) : (
        displayedList.map((booking) => {
          const isCancelled = booking.status === "cancelled";
          const travelDate = booking.rescheduled_to || booking.travel_date;

          return (
            <article key={booking.id} className="booking-ticket-card">
              <div className="booking-ticket-top">
                <div>
                  <span className="ticket-pnr-tag">PNR / TICKET NUMBER</span>
                  <div className="ticket-pnr-value">{booking.booking_code}</div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className={`badge ${isCancelled ? "badge-red" : "badge-green"}`}>
                    ● {isCancelled ? "CANCELLED" : "CONFIRMED"}
                  </span>
                </div>
              </div>

              <div className="booking-ticket-middle">
                <div>
                  <div className="ticket-route-heading">
                    {booking.origin} → {booking.destination}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 700, marginTop: "4px" }}>
                    {booking.operator} · <small style={{ color: "var(--muted)" }}>{booking.bus_type}</small>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                    Boarding: <b>{booking.boarding_point || `${booking.origin} Central`}</b>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)" }}>DEPARTURE</span>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)" }}>
                    {booking.departure_time}
                  </div>
                  <small style={{ color: "var(--primary)", fontWeight: 700 }}>
                    📅 {travelDate}
                  </small>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)" }}>SEATS & FARE</span>
                  <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--ink)" }}>
                    ₹{booking.total_amount}
                  </div>
                  <small style={{ color: "var(--muted)" }}>
                    Seats: <b>{booking.selected_seats?.join(", ") || `${booking.seats} Seats`}</b>
                  </small>
                </div>
              </div>

              {isCancelled && booking.refund_status && (
                <div style={{ background: "#FEF2F2", padding: "10px 14px", borderRadius: "6px", marginBottom: "14px", fontSize: "12px", color: "#991B1B" }}>
                  ℹ️ {booking.refund_status}
                </div>
              )}

              <div className="booking-ticket-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "12px" }}
                  onClick={() => onOpenETicket(booking)}
                >
                  🖨 View E-Ticket Pass
                </button>

                {!isCancelled && (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: "12px" }}
                      onClick={() => onTrackBus(booking.booking_code)}
                    >
                      📍 Track Live Bus
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: "12px" }}
                      onClick={() => handleReschedule(booking.booking_code)}
                    >
                      📅 Reschedule
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: "12px", color: "#EF4444" }}
                      onClick={() => handleCancelBooking(booking.booking_code)}
                    >
                      ✕ Cancel Ticket
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
