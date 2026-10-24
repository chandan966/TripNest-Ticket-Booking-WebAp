import React from "react";
import "./JourneySearch.css";

export default function JourneySearch() {
  return (
    <section className="search-wrap" aria-label="Search tickets">
      <div className="search-tabs">
        <button className="search-tab selected" data-type="all"><span>⌕</span> All journeys</button>
        <button className="search-tab" data-type="bus"><span>▰</span> Bus</button>
        <button className="search-tab" data-type="train"><span>▤</span> Train</button>
        <button className="search-tab" data-type="flight"><span>✈</span> Flights</button>
      </div>
      <form className="search-form" id="searchForm">
        <label className="field location-field">
          <span className="field-icon">⌖</span>
          <span className="field-copy"><small>FROM</small><select id="from" required><option value="">Choose origin</option></select></span>
        </label>
        <button className="swap-btn" id="swapBtn" type="button" title="Swap origin and destination">⇄</button>
        <label className="field location-field">
          <span className="field-icon destination-icon">⌖</span>
          <span className="field-copy"><small>TO</small><select id="to" required><option value="">Choose destination</option></select></span>
        </label>
        <label className="field date-field">
          <span className="field-icon">▦</span>
          <span className="field-copy"><small>TRAVEL DATE</small><input type="date" id="travelDate" required /></span>
        </label>
        <label className="field passengers-field">
          <span className="field-icon">♙</span>
          <span className="field-copy">
            <small>TRAVELLERS</small>
            <select id="travellers">
              <option value="1">1 traveller</option><option value="2">2 travellers</option>
              <option value="3">3 travellers</option><option value="4">4 travellers</option>
              <option value="5">5 travellers</option><option value="6">6 travellers</option>
            </select>
          </span>
        </label>
        <button className="search-btn" type="submit">Search trips <span>→</span></button>
      </form>
      <div className="search-note"><span>✦</span> Compare bus, train and flight options in one search.</div>
    </section>
  );
}
