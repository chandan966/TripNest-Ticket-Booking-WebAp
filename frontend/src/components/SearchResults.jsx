import React, { useState, useMemo } from "react";
import SeatLayout from "./SeatLayout.jsx";
import "./SearchResults.css";

export default function SearchResults({
  searchParams,
  trips = [],
  loading = false,
  user,
  token,
  onProceedToBooking,
  onOpenAuth,
  onModifySearch,
  onChangeDate,
  showToast
}) {
  const [expandedTripId, setExpandedTripId] = useState(null);
  const [activeTabDrawer, setActiveTabDrawer] = useState({}); // tripId -> 'boarding' | 'policy' | 'amenities'
  const [sortBy, setSortBy] = useState("recommended");

  // Filters
  const [filterPrimo, setFilterPrimo] = useState(false);
  const [filterTracking, setFilterTracking] = useState(false);
  const [filterWomen, setFilterWomen] = useState(false);
  const [filterBusType, setFilterBusType] = useState("all");
  const [filterDepartureWindow, setFilterDepartureWindow] = useState("all");
  const [maxFare, setMaxFare] = useState("all");

  const toggleSeats = (tripId) => {
    if (expandedTripId === tripId) {
      setExpandedTripId(null);
    } else {
      setExpandedTripId(tripId);
    }
  };

  const toggleDrawer = (tripId, tab) => {
    setActiveTabDrawer((prev) => ({
      ...prev,
      [tripId]: prev[tripId] === tab ? null : tab
    }));
  };

  // Filter & Sort Logic
  const filteredTrips = useMemo(() => {
    let result = [...trips];

    if (filterPrimo) {
      result = result.filter((t) => t.is_primo);
    }
    if (filterTracking) {
      result = result.filter((t) => t.supports_tracking);
    }
    if (filterWomen) {
      result = result.filter((t) => t.women_friendly);
    }
    if (filterBusType !== "all") {
      result = result.filter((t) => (t.bus_type || "").toLowerCase().includes(filterBusType.toLowerCase()));
    }
    if (maxFare !== "all") {
      result = result.filter((t) => Number(t.price) <= Number(maxFare));
    }
    if (filterDepartureWindow !== "all") {
      result = result.filter((t) => {
        const hour = Number(String(t.departure_time || "00").split(":")[0]);
        if (filterDepartureWindow === "early_morning") return hour < 6;
        if (filterDepartureWindow === "morning") return hour >= 6 && hour < 12;
        if (filterDepartureWindow === "afternoon") return hour >= 12 && hour < 18;
        if (filterDepartureWindow === "night") return hour >= 18;
        return true;
      });
    }

    // Sort
    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "departure_asc") {
      result.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
    } else if (sortBy === "rating_desc") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "duration_asc") {
      result.sort((a, b) => a.duration.localeCompare(b.duration));
    }

    return result;
  }, [
    trips,
    filterPrimo,
    filterTracking,
    filterWomen,
    filterBusType,
    maxFare,
    filterDepartureWindow,
    sortBy
  ]);

  const resetFilters = () => {
    setFilterPrimo(false);
    setFilterTracking(false);
    setFilterWomen(false);
    setFilterBusType("all");
    setFilterDepartureWindow("all");
    setMaxFare("all");
    setSortBy("recommended");
  };

  // Date Navigator Helpers
  const currentDate = new Date(searchParams.date || new Date().toISOString().slice(0, 10));
  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const prevDateStr = prevDate.toISOString().slice(0, 10);
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  return (
    <div className="search-results-page">
      {/* Sticky Header with Route Summary & Date Navigator */}
      <div className="search-sticky-header">
        <div className="search-route-summary">
          <h2>
            <span>{searchParams.from}</span>
            <span style={{ color: "var(--primary)" }}>→</span>
            <span>{searchParams.to}</span>
          </h2>
          <p>
            {filteredTrips.length} bus(es) found · {searchParams.travellers} traveller(s)
          </p>
        </div>

        {/* Date Navigator */}
        <div className="date-navigator">
          <button
            type="button"
            className="date-nav-btn"
            onClick={() => onChangeDate(prevDateStr)}
          >
            ‹ {prevDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </button>
          <div className="date-nav-current">
            📅 {currentDate.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
          </div>
          <button
            type="button"
            className="date-nav-btn"
            onClick={() => onChangeDate(nextDateStr)}
          >
            {nextDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} ›
          </button>
        </div>

        <button
          type="button"
          className="btn-secondary"
          style={{ fontSize: "12px", padding: "8px 14px" }}
          onClick={onModifySearch}
        >
          ✏ Modify Search
        </button>
      </div>

      <div className="results-layout-grid">
        {/* Left Filters Sidebar */}
        <aside className="filters-sidebar">
          <div className="filters-header">
            <h3>FILTERS</h3>
            <button type="button" className="reset-filters-btn" onClick={resetFilters}>
              RESET ALL
            </button>
          </div>

          {/* Quick Redbus Toggles */}
          <div className="filter-section">
            <div className="filter-title">Redbus Highlights</div>
            <label className="filter-toggle-label">
              <input
                type="checkbox"
                checked={filterPrimo}
                onChange={(e) => setFilterPrimo(e.target.checked)}
              />
              <span>⭐ Primo Verified Buses</span>
            </label>
            <label className="filter-toggle-label">
              <input
                type="checkbox"
                checked={filterTracking}
                onChange={(e) => setFilterTracking(e.target.checked)}
              />
              <span>📍 Live GPS Tracking</span>
            </label>
            <label className="filter-toggle-label">
              <input
                type="checkbox"
                checked={filterWomen}
                onChange={(e) => setFilterWomen(e.target.checked)}
              />
              <span>🌸 Women-Friendly</span>
            </label>
          </div>

          {/* Departure Times */}
          <div className="filter-section">
            <div className="filter-title">Departure Time</div>
            <div className="time-slots-grid">
              <button
                type="button"
                className={`time-slot-btn ${filterDepartureWindow === "early_morning" ? "active" : ""}`}
                onClick={() => setFilterDepartureWindow(filterDepartureWindow === "early_morning" ? "all" : "early_morning")}
              >
                🌅 Before 6am
              </button>
              <button
                type="button"
                className={`time-slot-btn ${filterDepartureWindow === "morning" ? "active" : ""}`}
                onClick={() => setFilterDepartureWindow(filterDepartureWindow === "morning" ? "all" : "morning")}
              >
                ☀️ 6am - 12pm
              </button>
              <button
                type="button"
                className={`time-slot-btn ${filterDepartureWindow === "afternoon" ? "active" : ""}`}
                onClick={() => setFilterDepartureWindow(filterDepartureWindow === "afternoon" ? "all" : "afternoon")}
              >
                🌤 12pm - 6pm
              </button>
              <button
                type="button"
                className={`time-slot-btn ${filterDepartureWindow === "night" ? "active" : ""}`}
                onClick={() => setFilterDepartureWindow(filterDepartureWindow === "night" ? "all" : "night")}
              >
                🌙 After 6pm
              </button>
            </div>
          </div>

          {/* Bus Types */}
          <div className="filter-section">
            <div className="filter-title">Bus Type</div>
            <select
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
              value={filterBusType}
              onChange={(e) => setFilterBusType(e.target.value)}
            >
              <option value="all">All Bus Types</option>
              <option value="Sleeper">AC Sleeper</option>
              <option value="Seater">AC Seater / Semi-Sleeper</option>
              <option value="Volvo">Volvo Multi-Axle</option>
              <option value="Scania">Scania Luxury</option>
              <option value="BharatBenz">BharatBenz</option>
            </select>
          </div>

          {/* Max Fare */}
          <div className="filter-section" style={{ borderBottom: "none" }}>
            <div className="filter-title">Max Price</div>
            <select
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }}
              value={maxFare}
              onChange={(e) => setMaxFare(e.target.value)}
            >
              <option value="all">Any Price</option>
              <option value="600">Under ₹600</option>
              <option value="1000">Under ₹1,000</option>
              <option value="1500">Under ₹1,500</option>
              <option value="2500">Under ₹2,500</option>
            </select>
          </div>
        </aside>

        {/* Right Bus Results Column */}
        <main className="results-content-col">
          {/* Sorting Bar */}
          <div className="sort-tabs-bar">
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>SORT BY:</span>
            <div className="sort-buttons-group">
              <button
                type="button"
                className={`sort-btn ${sortBy === "recommended" ? "active" : ""}`}
                onClick={() => setSortBy("recommended")}
              >
                Recommended
              </button>
              <button
                type="button"
                className={`sort-btn ${sortBy === "price_asc" ? "active" : ""}`}
                onClick={() => setSortBy("price_asc")}
              >
                Cheapest First
              </button>
              <button
                type="button"
                className={`sort-btn ${sortBy === "departure_asc" ? "active" : ""}`}
                onClick={() => setSortBy("departure_asc")}
              >
                Departure Time
              </button>
              <button
                type="button"
                className={`sort-btn ${sortBy === "rating_desc" ? "active" : ""}`}
                onClick={() => setSortBy("rating_desc")}
              >
                Top Rated
              </button>
            </div>
          </div>

          {/* Results List */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "16px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🚌</div>
              <h3>Finding best available buses for you...</h3>
              <p style={{ color: "var(--muted)" }}>Checking live seat inventory across top operators</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "16px" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
              <h3>No buses found matching your filters</h3>
              <p style={{ color: "var(--muted)", marginBottom: "20px" }}>
                Try resetting filters or choosing a different travel date.
              </p>
              <button type="button" className="btn-primary" onClick={resetFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const isExpanded = expandedTripId === trip.id;
              const drawerTab = activeTabDrawer[trip.id];
              const seatsLeft = trip.seats_available;

              return (
                <article key={trip.id} className="bus-card">
                  <div className="bus-card-main">
                    {/* Operator */}
                    <div className="bus-operator-info">
                      <h4>
                        <span>{trip.operator}</span>
                        {trip.is_primo ? (
                          <span className="badge badge-primo">PRIMO</span>
                        ) : null}
                      </h4>
                      <div className="bus-model-sub">
                        {trip.bus_type} · {trip.type.toUpperCase()}
                      </div>
                      <div className="bus-badges-row">
                        <span className="bus-rating-pill">★ {Number(trip.rating || 4.5).toFixed(1)}</span>
                        <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                          ({trip.review_count || 120} reviews)
                        </span>
                        {trip.supports_tracking ? (
                          <span className="badge badge-blue">📍 Live Track</span>
                        ) : null}
                        {trip.women_friendly ? (
                          <span className="badge badge-women">🌸 Women Choice</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Timings */}
                    <div className="bus-timings-col">
                      <div className="timing-block">
                        <b>{trip.departure_time}</b>
                        <small>{trip.origin}</small>
                      </div>

                      <div className="duration-line-wrap">
                        <div className="duration-line-text">{trip.duration}</div>
                        <div className="duration-bar" />
                      </div>

                      <div className="timing-block">
                        <b>{trip.arrival_time}</b>
                        <small>{trip.destination}</small>
                      </div>
                    </div>

                    {/* Fare */}
                    <div className="bus-fare-col">
                      <div className="fare-sub-text">Starts from</div>
                      <div className="fare-price-tag">₹{trip.price}</div>
                      <div className={`seats-remaining-pill ${seatsLeft <= 5 ? "critical" : ""}`}>
                        {seatsLeft <= 5 ? `🔥 Only ${seatsLeft} seats left!` : `✓ ${seatsLeft} seats available`}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="bus-card-actions">
                      <button
                        type="button"
                        className="view-seats-cta-btn"
                        onClick={() => toggleSeats(trip.id)}
                      >
                        {isExpanded ? "Hide Seats ▲" : "View Seats ▼"}
                      </button>
                    </div>
                  </div>

                  {/* Amenities & Tab Links Strip */}
                  <div className="bus-card-tabs-row">
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span>✦ {trip.amenities}</span>
                    </div>

                    <div className="bus-card-tab-links">
                      <span
                        className={`card-tab-link ${drawerTab === "boarding" ? "active" : ""}`}
                        onClick={() => toggleDrawer(trip.id, "boarding")}
                      >
                        Boarding & Dropping
                      </span>
                      <span
                        className={`card-tab-link ${drawerTab === "policy" ? "active" : ""}`}
                        onClick={() => toggleDrawer(trip.id, "policy")}
                      >
                        Cancellation Policy
                      </span>
                      <span
                        className={`card-tab-link ${drawerTab === "amenities" ? "active" : ""}`}
                        onClick={() => toggleDrawer(trip.id, "amenities")}
                      >
                        Amenities
                      </span>
                    </div>
                  </div>

                  {/* Informational Drawer */}
                  {drawerTab && (
                    <div className="bus-card-tab-drawer">
                      {drawerTab === "boarding" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                          <div>
                            <b style={{ color: "var(--ink)" }}>Boarding Points:</b>
                            <ul style={{ paddingLeft: "18px", marginTop: "6px", color: "var(--muted)" }}>
                              {(trip.boarding_points || []).map((bp, idx) => (
                                <li key={idx} style={{ marginBottom: "4px" }}>
                                  <b>{bp.name}</b> ({bp.time || trip.departure_time}) - {bp.landmark}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <b style={{ color: "var(--ink)" }}>Dropping Points:</b>
                            <ul style={{ paddingLeft: "18px", marginTop: "6px", color: "var(--muted)" }}>
                              {(trip.dropping_points || []).map((dp, idx) => (
                                <li key={idx} style={{ marginBottom: "4px" }}>
                                  <b>{dp.name}</b> ({dp.time || trip.arrival_time}) - {dp.landmark}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {drawerTab === "policy" && (
                        <div>
                          <b style={{ color: "var(--ink)" }}>TripNest Standard Refund Policy:</b>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "8px" }}>
                            {(trip.cancellation_policy || []).map((p, idx) => (
                              <div key={idx} style={{ background: "var(--bg-surface)", padding: "8px 12px", borderRadius: "6px" }}>
                                <div style={{ fontWeight: 700, color: "var(--ink)" }}>{p.timeframe}</div>
                                <div style={{ color: "var(--primary)", fontWeight: 800 }}>{p.refundPercent}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {drawerTab === "amenities" && (
                        <div>
                          <b style={{ color: "var(--ink)" }}>Included Amenities & Services:</b>
                          <p style={{ marginTop: "4px", color: "var(--muted)" }}>
                            {trip.amenities} · CCTV Surveillance · Fire Extinguisher · Emergency Exit · First Aid Kit · Reading Light
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded Interactive Seat Layout */}
                  {isExpanded && (
                    <SeatLayout
                      trip={trip}
                      travellerCount={searchParams.travellers}
                      user={user}
                      token={token}
                      onProceedToBooking={onProceedToBooking}
                      onOpenAuth={onOpenAuth}
                      showToast={showToast}
                    />
                  )}
                </article>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}
