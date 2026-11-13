import React, { useState, useEffect } from "react";
import "./LiveBusTracker.css";

export default function LiveBusTracker({ initialCode = "", showToast, onBack }) {
  const [searchCode, setSearchCode] = useState(initialCode);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTracking = async (codeToFetch) => {
    const code = (codeToFetch || searchCode).trim().toUpperCase();
    if (!code) {
      showToast("Please enter a valid Booking PNR code.", true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not retrieve live tracking data.");
      setTrackingData(data);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchTracking(initialCode);
    }
  }, [initialCode]);

  const handleShare = () => {
    if (!trackingData) return;
    const text = `🚌 TripNest Live Bus Tracker:\n${trackingData.operator} (${trackingData.origin} → ${trackingData.destination})\nCurrent Location: ${trackingData.currentLocation}\nStatus: ${trackingData.status} (ETA: ${trackingData.eta})\nDriver: ${trackingData.driverName} (${trackingData.driverPhone})`;
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Tracking details copied to clipboard!"))
      .catch(() => showToast("Failed to copy."));
  };

  return (
    <div className="live-tracker-page">
      <div className="tracker-hero-banner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="badge badge-primo" style={{ marginBottom: "8px" }}>
              LIVE GPS TELEMETRY
            </span>
            <h2 style={{ fontSize: "28px", fontWeight: 800 }}>Track My Bus</h2>
            <p style={{ opacity: 0.9, fontSize: "14px", margin: 0 }}>
              Real-time satellite tracking, driver contact, and arrival estimates.
            </p>
          </div>

          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              ← Back
            </button>
          )}
        </div>

        <form
          className="tracker-search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            fetchTracking();
          }}
        >
          <input
            type="text"
            placeholder="Enter PNR code (e.g. TN...)"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Locating..." : "Track Bus"}
          </button>
        </form>
      </div>

      {trackingData ? (
        <>
          {/* Telemetry Cards */}
          <div className="tracker-telemetry-grid">
            <div className="telemetry-card">
              <span className="telemetry-label">Status</span>
              <div className="telemetry-value" style={{ color: "var(--green-dark)", fontSize: "15px" }}>
                ● {trackingData.status}
              </div>
            </div>

            <div className="telemetry-card">
              <span className="telemetry-label">Current Location</span>
              <div className="telemetry-value" style={{ fontSize: "14px" }}>
                📍 {trackingData.currentLocation}
              </div>
            </div>

            <div className="telemetry-card">
              <span className="telemetry-label">Cruising Speed</span>
              <div className="telemetry-value" style={{ color: "var(--primary)" }}>
                {trackingData.speed}
              </div>
            </div>

            <div className="telemetry-card">
              <span className="telemetry-label">Estimated Arrival</span>
              <div className="telemetry-value">
                {trackingData.eta}
              </div>
            </div>
          </div>

          {/* Route Progression Timeline */}
          <div className="route-progress-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)" }}>
                  {trackingData.origin} to {trackingData.destination}
                </h3>
                <small style={{ color: "var(--muted)" }}>
                  Operator: {trackingData.operator} · Bus: <b>{trackingData.busNumber}</b>
                </small>
              </div>

              <button type="button" className="btn-secondary" style={{ fontSize: "12px" }} onClick={handleShare}>
                📤 Share Live Status
              </button>
            </div>

            <div className="timeline-stops-list">
              {(trackingData.waypoints || []).map((wp, idx) => {
                const isPassed = wp.passed;
                const isCurrent = idx === 1; // Simulated current stop

                return (
                  <div
                    key={idx}
                    className={`timeline-stop-item ${isPassed ? "passed" : ""} ${isCurrent ? "current" : ""}`}
                  >
                    <div className="timeline-stop-node">
                      {isPassed ? "✓" : isCurrent ? "🚌" : ""}
                    </div>
                    <div>
                      <b style={{ color: isCurrent ? "var(--primary)" : "var(--ink)", fontSize: "14px" }}>
                        {wp.label}
                      </b>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {isPassed ? "Cleared" : "ETA"} · {wp.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Driver Contact & Bus Info */}
          <div className="driver-contact-card">
            <div>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)" }}>ASSIGNED CREW</span>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", marginTop: "2px" }}>
                👨‍✈️ {trackingData.driverName} (Verified Captain)
              </div>
              <small style={{ color: "var(--muted)" }}>Direct Captain Contact: {trackingData.driverPhone}</small>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ padding: "8px 18px", fontSize: "13px" }}
              onClick={() => showToast(`Calling driver at ${trackingData.driverPhone} (demo)...`)}
            >
              📞 Call Captain
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "16px" }}>
          <div style={{ fontSize: "42px", marginBottom: "14px" }}>🗺️</div>
          <h3>Track Any Bus Journey Live</h3>
          <p style={{ color: "var(--muted)", maxWidth: "450px", margin: "0 auto 20px" }}>
            Enter your booking reference code in the search bar above to see live GPS location, speed, and real-time arrival estimates.
          </p>
        </div>
      )}
    </div>
  );
}
