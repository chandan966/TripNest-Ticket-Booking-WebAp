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
      <div className="advanced-filters" aria-label="Refine journeys">
        <label>Max fare
          <select id="maxFare">
            <option value="all">Any price</option>
            <option value="500">Under ₹500</option>
            <option value="1000">Under ₹1,000</option>
            <option value="2000">Under ₹2,000</option>
            <option value="5000">Under ₹5,000</option>
          </select>
        </label>
        <label>Departure
          <select id="departureWindow">
            <option value="all">Any time</option>
            <option value="morning">Morning · 6am–12pm</option>
            <option value="afternoon">Afternoon · 12pm–6pm</option>
            <option value="night">Night · 6pm–6am</option>
          </select>
        </label>
        <label>Bus type
          <select id="busType">
            <option value="all">Any bus type</option>
            <option value="AC Sleeper">AC sleeper</option>
            <option value="AC Seater">AC seater</option>
            <option value="Non-AC Seater">Non-AC seater</option>
          </select>
        </label>
        <label className="filter-check"><input id="womenFriendly" type="checkbox" /> Women-friendly options</label>
        <label className="filter-check"><input id="primoOnly" type="checkbox" /> Top-rated operators</label>
      </div>
      <div className="results-list" id="resultsList" />
    </section>
  );
}
