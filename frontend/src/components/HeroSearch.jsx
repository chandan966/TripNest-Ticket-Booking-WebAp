import React, { useState, useEffect } from "react";
import "./HeroSearch.css";

const POPULAR_CITIES = [
  "Pune",
  "Mumbai",
  "Bangalore",
  "Goa",
  "Delhi",
  "Jaipur",
  "Hyderabad",
  "Chennai",
  "Ahmedabad"
];

export default function HeroSearch({ onSearch, initialFrom = "Pune", initialTo = "Mumbai" }) {
  const [fromCity, setFromCity] = useState(initialFrom);
  const [toCity, setToCity] = useState(initialTo);
  const [journeyType, setJourneyType] = useState("bus");
  const [travellers, setTravellers] = useState(1);

  // Default dates: tomorrow
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const [travelDate, setTravelDate] = useState(getTodayStr());

  // Listen to external type changes
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setJourneyType(e.detail);
    };
    window.addEventListener("tripnest_set_type", handler);
    return () => window.removeEventListener("tripnest_set_type", handler);
  }, []);

  const handleSwap = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fromCity || !toCity) {
      alert("Please choose both departure city and destination.");
      return;
    }
    if (fromCity.toLowerCase() === toCity.toLowerCase()) {
      alert("Origin and destination cannot be the same city.");
      return;
    }
    onSearch({
      from: fromCity,
      to: toCity,
      date: travelDate,
      type: journeyType,
      travellers
    });
  };

  const selectTrendingRoute = (from, to) => {
    setFromCity(from);
    setToCity(to);
    onSearch({
      from,
      to,
      date: travelDate,
      type: journeyType,
      travellers
    });
  };

  return (
    <section className="hero-search-wrapper">
      <div className="hero-search-container">
        <div className="hero-headings">
          <h1>India's #1 Bus Ticket Booking Platform</h1>
          <p>
            Compare 3000+ top bus operators, reserve seats with live deck layout, and track buses on live GPS.
          </p>
        </div>

        {/* Travel Mode Tabs */}
        <div className="search-mode-tabs">
          <button
            type="button"
            className={`mode-tab-btn ${journeyType === "bus" ? "active" : ""}`}
            onClick={() => setJourneyType("bus")}
          >
            <span>🚌</span> Bus Tickets
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${journeyType === "train" ? "active" : ""}`}
            onClick={() => setJourneyType("train")}
          >
            <span>🚆</span> Trains
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${journeyType === "flight" ? "active" : ""}`}
            onClick={() => setJourneyType("flight")}
          >
            <span>✈</span> Flights
          </button>
        </div>

        {/* Search Card */}
        <form className="search-box-card" onSubmit={handleSubmit}>
          {/* FROM */}
          <div className="search-field">
            <label className="search-field-label">FROM</label>
            <div className="search-field-inner">
              <span className="search-field-icon">📍</span>
              <select
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                required
              >
                <option value="">Select origin</option>
                {POPULAR_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SWAP BUTTON */}
          <button
            type="button"
            className="swap-route-btn"
            title="Swap Origin and Destination"
            onClick={handleSwap}
          >
            ⇄
          </button>

          {/* TO */}
          <div className="search-field">
            <label className="search-field-label">TO</label>
            <div className="search-field-inner">
              <span className="search-field-icon">🏁</span>
              <select
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                required
              >
                <option value="">Select destination</option>
                {POPULAR_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* DATE */}
          <div className="search-field">
            <label className="search-field-label">TRAVEL DATE</label>
            <div className="search-field-inner">
              <span className="search-field-icon">📅</span>
              <input
                type="date"
                min={getTodayStr()}
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                required
              />
            </div>
            <div className="date-shortcuts">
              <button
                type="button"
                className={`date-shortcut-btn ${travelDate === getTodayStr() ? "active" : ""}`}
                onClick={() => setTravelDate(getTodayStr())}
              >
                Today
              </button>
              <button
                type="button"
                className={`date-shortcut-btn ${travelDate === getTomorrowStr() ? "active" : ""}`}
                onClick={() => setTravelDate(getTomorrowStr())}
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* TRAVELLERS */}
          <div className="search-field">
            <label className="search-field-label">SEATS</label>
            <div className="search-field-inner">
              <span className="search-field-icon">💺</span>
              <select
                value={travellers}
                onChange={(e) => setTravellers(Number(e.target.value))}
              >
                <option value={1}>1 Seat</option>
                <option value={2}>2 Seats</option>
                <option value={3}>3 Seats</option>
                <option value={4}>4 Seats</option>
                <option value={5}>5 Seats</option>
                <option value={6}>6 Seats</option>
              </select>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button type="submit" className="search-submit-btn">
            SEARCH BUSES <span>→</span>
          </button>
        </form>

        {/* Trending Routes */}
        <div className="trending-routes-bar">
          <span className="trending-label">🔥 Popular Routes:</span>
          <span className="trending-pill" onClick={() => selectTrendingRoute("Pune", "Mumbai")}>
            Pune → Mumbai <b>from ₹520</b>
          </span>
          <span className="trending-pill" onClick={() => selectTrendingRoute("Bangalore", "Goa")}>
            Bangalore → Goa <b>from ₹1,350</b>
          </span>
          <span className="trending-pill" onClick={() => selectTrendingRoute("Delhi", "Jaipur")}>
            Delhi → Jaipur <b>from ₹499</b>
          </span>
          <span className="trending-pill" onClick={() => selectTrendingRoute("Bangalore", "Hyderabad")}>
            Bangalore → Hyderabad <b>from ₹799</b>
          </span>
          <span className="trending-pill" onClick={() => selectTrendingRoute("Chennai", "Bangalore")}>
            Chennai → Bangalore <b>from ₹799</b>
          </span>
        </div>
      </div>
    </section>
  );
}
