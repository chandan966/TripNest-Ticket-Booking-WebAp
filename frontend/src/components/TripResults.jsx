import React from "react";
import "./TripResults.css";

export default function TripResults() {
  return (
    <section className="results-section hidden" id="resultsSection">
      <div className="section-heading results-heading">
        <div><div className="eyebrow">YOUR OPTIONS</div><h2 id="resultsTitle">Trips for you</h2><p id="resultsSubtitle">Pick the journey that works for you.</p></div>
        <div className="sort-wrap">
          <label htmlFor="sortSelect">Sort by</label>
          <select id="sortSelect"><option value="recommended">Recommended</option><option value="price">Lowest price</option><option value="departure">Departure time</option></select>
        </div>
      </div>
      <div className="filters" id="filters">
        <button className="filter-pill active" data-filter="all">All options</button>
        <button className="filter-pill" data-filter="bus">Bus</button>
        <button className="filter-pill" data-filter="train">Train</button>
        <button className="filter-pill" data-filter="flight">Flights</button>
      </div>
      <div className="results-list" id="resultsList" />
    </section>
  );
}
