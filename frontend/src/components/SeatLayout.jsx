import React, { useState, useEffect, useRef } from "react";
import "./SeatLayout.css";

export default function SeatLayout({
  trip,
  travellerCount = 1,
  user,
  token,
  onProceedToBooking,
  onOpenAuth,
  showToast
}) {
  const isSleeper = (trip.seat_layout_type || "sleeper_2_1") === "sleeper_2_1" || (trip.bus_type || "").includes("Sleeper");
  const [activeDeck, setActiveDeck] = useState("lower");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatHoldData, setSeatHoldData] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const timerRef = useRef(null);

  const boardingPoints = trip.boarding_points || [
    { name: `${trip.origin} Central Platform`, time: trip.departure_time, landmark: "Main Gate" }
  ];
  const droppingPoints = trip.dropping_points || [
    { name: `${trip.destination} Central Terminal`, time: trip.arrival_time, landmark: "Drop Point" }
  ];

  const [selectedBoarding, setSelectedBoarding] = useState(boardingPoints[0]?.name || "");
  const [selectedDropping, setSelectedDropping] = useState(droppingPoints[0]?.name || "");

  const bookedSet = new Set(trip.booked_seats || []);
  const heldSet = new Set(trip.held_seats || []);

  // Female reserved seats simulation for Redbus experience
  const femaleReservedSeats = new Set(["L1", "L4", "U1", "U4", "A1", "B1"]);

  // Seat hold countdown
  useEffect(() => {
    if (!seatHoldData) return;

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((seatHoldData.expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setSeatHoldData(null);
        setSelectedSeats([]);
        showToast("Your seat hold expired. Please select seats again.", true);
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [seatHoldData]);

  // Handle seat click
  const handleSeatClick = async (seatCode) => {
    if (bookedSet.has(seatCode) || (heldSet.has(seatCode) && !selectedSeats.includes(seatCode))) {
      return;
    }

    if (!user) {
      onOpenAuth("login", () => {
        showToast("Signed in! Now you can reserve your seats.");
      });
      return;
    }

    let updated = [];
    if (selectedSeats.includes(seatCode)) {
      updated = selectedSeats.filter((s) => s !== seatCode);
    } else {
      if (selectedSeats.length >= travellerCount) {
        showToast(`You searched for ${travellerCount} seat(s). Deselect one to change.`, true);
        return;
      }
      updated = [...selectedSeats, seatCode];
    }

    setSelectedSeats(updated);

    // Call Hold API if seats selected
    if (updated.length > 0) {
      try {
        const res = await fetch("/api/seats/hold", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ tripId: trip.id, seatCodes: updated })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to hold seats.");
        setSeatHoldData({ expiresAt: data.expiresAt, seats: data.seats });
        setSecondsLeft(300);
      } catch (err) {
        setSelectedSeats(selectedSeats); // Revert
        showToast(err.message, true);
      }
    } else {
      // Release
      try {
        await fetch("/api/seats/release", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ tripId: trip.id, seatCodes: [] })
        });
      } catch {}
      setSeatHoldData(null);
    }
  };

  // Helper formatting for seconds to mm:ss
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Generate Sleeper Layout
  const renderSleeperRows = (deckPrefix) => {
    const rows = [];
    // 6 rows: 1 single window berth on left + 2 double berths on right
    for (let r = 1; r <= 6; r++) {
      const singleSeat = `${deckPrefix}${r * 3 - 2}`;
      const doubleSeat1 = `${deckPrefix}${r * 3 - 1}`;
      const doubleSeat2 = `${deckPrefix}${r * 3}`;

      const getBerthClass = (code) => {
        let cls = "berth-box";
        if (selectedSeats.includes(code)) return cls + " selected";
        if (bookedSet.has(code) || (heldSet.has(code) && !selectedSeats.includes(code))) return cls + " booked";
        if (femaleReservedSeats.has(code)) return cls + " ladies";
        return cls;
      };

      rows.push(
        <div key={r} className="sleeper-row">
          <div className="single-berth-col">
            <button
              type="button"
              className={getBerthClass(singleSeat)}
              onClick={() => handleSeatClick(singleSeat)}
              disabled={bookedSet.has(singleSeat) || (heldSet.has(singleSeat) && !selectedSeats.includes(singleSeat))}
              title={`Berth ${singleSeat} - ₹${trip.price}`}
            >
              <span>{singleSeat}</span>
              <div className="berth-pillow" />
            </button>
          </div>

          <div className="gangway-aisle">aisle</div>

          <div className="double-berth-col">
            <button
              type="button"
              className={getBerthClass(doubleSeat1)}
              onClick={() => handleSeatClick(doubleSeat1)}
              disabled={bookedSet.has(doubleSeat1) || (heldSet.has(doubleSeat1) && !selectedSeats.includes(doubleSeat1))}
              title={`Berth ${doubleSeat1} - ₹${trip.price}`}
            >
              <span>{doubleSeat1}</span>
              <div className="berth-pillow" />
            </button>
            <button
              type="button"
              className={getBerthClass(doubleSeat2)}
              onClick={() => handleSeatClick(doubleSeat2)}
              disabled={bookedSet.has(doubleSeat2) || (heldSet.has(doubleSeat2) && !selectedSeats.includes(doubleSeat2))}
              title={`Berth ${doubleSeat2} - ₹${trip.price}`}
            >
              <span>{doubleSeat2}</span>
              <div className="berth-pillow" />
            </button>
          </div>
        </div>
      );
    }
    return rows;
  };

  // Generate Seater Layout (2+2)
  const renderSeaterRows = () => {
    const rows = [];
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    for (let i = 0; i < 9; i++) {
      const rowLetter = letters[i];
      const s1 = `${rowLetter}1`;
      const s2 = `${rowLetter}2`;
      const s3 = `${rowLetter}3`;
      const s4 = `${rowLetter}4`;

      const getSeaterClass = (code) => {
        let cls = "seater-box";
        if (selectedSeats.includes(code)) return cls + " selected";
        if (bookedSet.has(code) || (heldSet.has(code) && !selectedSeats.includes(code))) return cls + " booked";
        if (femaleReservedSeats.has(code)) return cls + " ladies";
        return cls;
      };

      rows.push(
        <div key={rowLetter} className="sleeper-row">
          <div className="single-berth-col">
            <button
              type="button"
              className={getSeaterClass(s1)}
              onClick={() => handleSeatClick(s1)}
              disabled={bookedSet.has(s1) || (heldSet.has(s1) && !selectedSeats.includes(s1))}
              title={`Seat ${s1} - ₹${trip.price}`}
            >
              {s1}
            </button>
            <button
              type="button"
              className={getSeaterClass(s2)}
              onClick={() => handleSeatClick(s2)}
              disabled={bookedSet.has(s2) || (heldSet.has(s2) && !selectedSeats.includes(s2))}
              title={`Seat ${s2} - ₹${trip.price}`}
            >
              {s2}
            </button>
          </div>

          <div className="gangway-aisle">aisle</div>

          <div className="double-berth-col">
            <button
              type="button"
              className={getSeaterClass(s3)}
              onClick={() => handleSeatClick(s3)}
              disabled={bookedSet.has(s3) || (heldSet.has(s3) && !selectedSeats.includes(s3))}
              title={`Seat ${s3} - ₹${trip.price}`}
            >
              {s3}
            </button>
            <button
              type="button"
              className={getSeaterClass(s4)}
              onClick={() => handleSeatClick(s4)}
              disabled={bookedSet.has(s4) || (heldSet.has(s4) && !selectedSeats.includes(s4))}
              title={`Seat ${s4} - ₹${trip.price}`}
            >
              {s4}
            </button>
          </div>
        </div>
      );
    }
    return rows;
  };

  const handleContinue = () => {
    if (selectedSeats.length !== travellerCount) {
      showToast(`Please select exactly ${travellerCount} seat(s) to proceed.`, true);
      return;
    }
    if (!selectedBoarding || !selectedDropping) {
      showToast("Please choose both boarding and dropping points.", true);
      return;
    }

    onProceedToBooking({
      trip,
      selectedSeats,
      boardingPoint: selectedBoarding,
      droppingPoint: selectedDropping
    });
  };

  const baseFare = trip.price * selectedSeats.length;

  return (
    <div className="seat-layout-container">
      {/* Left Seat Matrix Panel */}
      <div className="deck-selection-panel">
        <div className="deck-tabs-header">
          <div>
            <h4 style={{ fontWeight: 800, fontSize: "15px", color: "var(--ink)" }}>
              Select Seats for {trip.operator}
            </h4>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
              Click on an available seat to reserve it for 5 minutes.
            </p>
          </div>

          {isSleeper && (
            <div className="deck-switcher">
              <button
                type="button"
                className={`deck-tab-btn ${activeDeck === "lower" ? "active" : ""}`}
                onClick={() => setActiveDeck("lower")}
              >
                Lower Deck
              </button>
              <button
                type="button"
                className={`deck-tab-btn ${activeDeck === "upper" ? "active" : ""}`}
                onClick={() => setActiveDeck("upper")}
              >
                Upper Deck
              </button>
            </div>
          )}
        </div>

        {/* Bus Body */}
        <div className="deck-bus-body">
          <div className="bus-front-indicator">
            <span>DRIVER CABIN</span>
            <span className="steering-wheel-icon">✇</span>
            <span>FRONT</span>
          </div>

          <div className="sleeper-matrix">
            {isSleeper
              ? renderSleeperRows(activeDeck === "lower" ? "L" : "U")
              : renderSeaterRows()}
          </div>
        </div>

        {/* Legend */}
        <div className="seat-legend-grid">
          <div className="legend-item">
            <div className="legend-swatch" />
            <span>Available</span>
          </div>
          <div className="legend-item">
            <div className="legend-swatch selected" />
            <span>Selected</span>
          </div>
          <div className="legend-item">
            <div className="legend-swatch booked" />
            <span>Booked</span>
          </div>
          <div className="legend-item">
            <div className="legend-swatch ladies" />
            <span>Female Reserved</span>
          </div>
        </div>
      </div>

      {/* Right Checkout & Points Sidebar */}
      <div className="seat-summary-sidebar">
        {seatHoldData && (
          <div className="seat-hold-timer-badge">
            <span>⏱ Seats held for:</span>
            <b style={{ fontSize: "14px", color: "#92400E" }}>{formatTimer(secondsLeft)}</b>
          </div>
        )}

        <div>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)" }}>SELECTED SEATS</span>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--primary)", marginTop: "2px" }}>
            {selectedSeats.length > 0 ? selectedSeats.join(", ") : "None selected yet"}
          </div>
          <small style={{ color: "var(--muted)" }}>
            Required: {travellerCount} seat(s)
          </small>
        </div>

        {/* Boarding Point */}
        <div className="point-select-group">
          <label>Boarding Point</label>
          <select
            value={selectedBoarding}
            onChange={(e) => setSelectedBoarding(e.target.value)}
          >
            {boardingPoints.map((bp) => (
              <option key={bp.name} value={bp.name}>
                {bp.name} ({bp.time || trip.departure_time})
              </option>
            ))}
          </select>
        </div>

        {/* Dropping Point */}
        <div className="point-select-group">
          <label>Dropping Point</label>
          <select
            value={selectedDropping}
            onChange={(e) => setSelectedDropping(e.target.value)}
          >
            {droppingPoints.map((dp) => (
              <option key={dp.name} value={dp.name}>
                {dp.name} ({dp.time || trip.arrival_time})
              </option>
            ))}
          </select>
        </div>

        {/* Fare Summary */}
        <div className="fare-breakdown-card">
          <div className="fare-breakdown-row">
            <span>Seat Fare ({selectedSeats.length} × ₹{trip.price})</span>
            <b>₹{baseFare}</b>
          </div>
          <div className="fare-breakdown-row">
            <span>Estimated GST & Tax (5%)</span>
            <span>₹{Number((baseFare * 0.05).toFixed(2))}</span>
          </div>
          <div className="fare-breakdown-row total">
            <span>Subtotal</span>
            <span>₹{Number((baseFare * 1.05).toFixed(2))}</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          style={{ width: "100%", padding: "14px", fontSize: "15px" }}
          onClick={handleContinue}
          disabled={selectedSeats.length !== travellerCount}
        >
          Proceed to Book <span>→</span>
        </button>
      </div>
    </div>
  );
}
