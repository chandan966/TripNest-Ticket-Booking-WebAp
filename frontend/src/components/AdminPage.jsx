import React, { useState, useEffect } from "react";
import "./AdminPage.css";

export default function AdminPage({ token, showToast, onBack }) {
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState("trips"); // 'trips' | 'bookings' | 'support'
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add Trip Form State
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [origin, setOrigin] = useState("Pune");
  const [destination, setDestination] = useState("Mumbai");
  const [travelDate, setTravelDate] = useState(new Date().toISOString().slice(0, 10));
  const [departureTime, setDepartureTime] = useState("09:00");
  const [arrivalTime, setArrivalTime] = useState("12:45");
  const [operator, setOperator] = useState("Shivneri Express");
  const [busType, setBusType] = useState("Volvo 9600 AC Sleeper");
  const [price, setPrice] = useState(550);
  const [duration, setDuration] = useState("3h 45m");
  const [totalSeats, setTotalSeats] = useState(36);
  const [layoutType, setLayoutType] = useState("sleeper_2_1");
  const [amenities, setAmenities] = useState("AC · Water Bottle · Wi-Fi · Charging Point");

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setOverview(data);
    } catch {}
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trips", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTrips(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setBookings(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchSupport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTickets(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    if (tab === "trips") fetchTrips();
    if (tab === "bookings") fetchBookings();
    if (tab === "support") fetchSupport();
  }, [tab, token]);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: "bus",
          origin,
          destination,
          travel_date: travelDate,
          departure_time: departureTime,
          arrival_time: arrivalTime,
          operator,
          bus_type: busType,
          price: Number(price),
          duration,
          total_seats: Number(totalSeats),
          seat_layout_type: layoutType,
          amenities
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create trip.");

      showToast("New Bus Route added successfully!");
      setShowAddTrip(false);
      fetchTrips();
      fetchOverview();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleDeleteTrip = async (id) => {
    if (!confirm("Are you sure you want to delete this trip route?")) return;
    try {
      const res = await fetch(`/api/admin/trips/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Could not delete trip.");
      showToast("Trip route deleted.");
      fetchTrips();
      fetchOverview();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleUpdateTicketStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status.");
      showToast(`Ticket status updated to ${status}.`);
      fetchSupport();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header-strip">
        <div>
          <span className="badge badge-primo" style={{ marginBottom: "6px" }}>
            ADMIN CONTROL PANEL
          </span>
          <h2 style={{ fontSize: "26px", fontWeight: 900 }}>TripNest Platform Management</h2>
        </div>

        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Exit Admin
        </button>
      </div>

      {/* KPI Overview Cards */}
      {overview && (
        <div className="kpi-cards-grid">
          <div className="kpi-card">
            <span className="kpi-label">Total Revenue</span>
            <div className="kpi-value" style={{ color: "var(--primary)" }}>
              ₹{overview.totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Confirmed Bookings</span>
            <div className="kpi-value" style={{ color: "var(--green-dark)" }}>
              {overview.confirmedBookings}
            </div>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Active Bus Trips</span>
            <div className="kpi-value">{overview.totalTrips}</div>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Registered Travellers</span>
            <div className="kpi-value">{overview.totalUsers}</div>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Open Support Tickets</span>
            <div className="kpi-value" style={{ color: overview.openTickets > 0 ? "#EF4444" : "var(--muted)" }}>
              {overview.openTickets}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs-nav">
        <button
          type="button"
          className={`admin-tab-btn ${tab === "trips" ? "active" : ""}`}
          onClick={() => setTab("trips")}
        >
          🚌 Trips & Inventory ({trips.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${tab === "bookings" ? "active" : ""}`}
          onClick={() => setTab("bookings")}
        >
          📋 Customer Bookings ({bookings.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${tab === "support" ? "active" : ""}`}
          onClick={() => setTab("support")}
        >
          🎧 Support Queue ({tickets.length})
        </button>
      </div>

      {/* TRIPS TAB */}
      {tab === "trips" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800 }}>Bus Routes & Schedules</h3>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowAddTrip(!showAddTrip)}
            >
              {showAddTrip ? "Cancel" : "+ Add New Bus Route"}
            </button>
          </div>

          {/* Add Trip Form Modal / Drawer */}
          {showAddTrip && (
            <div className="ticket-chat-box" style={{ marginBottom: "24px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "14px" }}>Create New Bus Journey</h4>
              <form onSubmit={handleCreateTrip}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                  <div className="form-group">
                    <label>Origin City</label>
                    <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Destination City</label>
                    <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Travel Date</label>
                    <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Departure Time</label>
                    <input type="text" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} placeholder="08:30" required />
                  </div>
                  <div className="form-group">
                    <label>Arrival Time</label>
                    <input type="text" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} placeholder="12:30" required />
                  </div>
                  <div className="form-group">
                    <label>Operator Name</label>
                    <input type="text" value={operator} onChange={(e) => setOperator(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Bus Type</label>
                    <input type="text" value={busType} onChange={(e) => setBusType(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Fare (₹)</label>
                    <input type="number" min="50" value={price} onChange={(e) => setPrice(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Total Seats</label>
                    <input type="number" min="10" max="60" value={totalSeats} onChange={(e) => setTotalSeats(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Seat Layout</label>
                    <select value={layoutType} onChange={(e) => setLayoutType(e.target.value)}>
                      <option value="sleeper_2_1">Sleeper (2+1 Upper/Lower)</option>
                      <option value="seater_2_2">Seater (2+2 Chair Car)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-primary">
                  Save & Publish Route →
                </button>
              </form>
            </div>
          )}

          <div className="admin-table-card">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>ROUTE</th>
                  <th>OPERATOR</th>
                  <th>DATE & TIME</th>
                  <th>FARE</th>
                  <th>SEATS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <b>{t.origin} → {t.destination}</b>
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>{t.bus_type}</div>
                    </td>
                    <td>{t.operator}</td>
                    <td>
                      <b>{t.travel_date}</b>
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>{t.departure_time} - {t.arrival_time}</div>
                    </td>
                    <td><b>₹{t.price}</b></td>
                    <td>{t.total_seats} seats</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "11px", color: "#EF4444", padding: "4px 8px" }}
                        onClick={() => handleDeleteTrip(t.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOOKINGS TAB */}
      {tab === "bookings" && (
        <div className="admin-table-card">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>PNR</th>
                <th>CUSTOMER</th>
                <th>ROUTE</th>
                <th>TRAVEL DATE</th>
                <th>SEATS</th>
                <th>TOTAL</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td><b style={{ color: "var(--primary)" }}>{b.booking_code}</b></td>
                  <td>
                    <b>{b.customer_name}</b>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>{b.customer_email}</div>
                  </td>
                  <td>{b.origin} → {b.destination}</td>
                  <td>{b.travel_date} ({b.departure_time})</td>
                  <td>{b.seats} seats</td>
                  <td><b>₹{b.total_amount}</b></td>
                  <td>
                    <span className={`badge ${b.status === "confirmed" ? "badge-green" : "badge-red"}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUPPORT QUEUE TAB */}
      {tab === "support" && (
        <div className="admin-table-card">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>TICKET ID</th>
                <th>CUSTOMER</th>
                <th>CATEGORY</th>
                <th>SUBJECT</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td><b>{t.ticket_code}</b></td>
                  <td>{t.customer_name}</td>
                  <td>{t.category}</td>
                  <td>{t.subject}</td>
                  <td>
                    <span className="badge badge-primo">{t.status}</span>
                  </td>
                  <td>
                    <select
                      style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--line)" }}
                      value={t.status}
                      onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value)}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
