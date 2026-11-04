import React from "react";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot" /> BUS TRAVEL, MADE EASY</div>
        <h1>More than a ride.<br /><span>Your next story.</span></h1>
        <p className="hero-description">Find your route, choose a seat, and book your next bus journey in just a few easy steps.</p>
        <div className="trust-row">
          <div className="trust-check">✓</div>
          <span><strong>Simple, secure booking</strong><br />Your journey starts right here.</span>
        </div>
      </div>
      <div className="hero-art" role="img" aria-label="A red TripNest bus traveling through the hills">
        <div className="sun" />
        <div className="cloud cloud-one" />
        <div className="cloud cloud-two" />
        <div className="hill hill-back" />
        <div className="road" />
        <div className="hill hill-front" />
        <div className="hero-bus">
          <div className="bus-destination">TRIPNEST</div>
          <div className="bus-window-row"><i /><i /><i /></div>
          <div className="bus-grille" />
          <span className="bus-light" />
          <span className="bus-wheel wheel-one" />
          <span className="bus-wheel wheel-two" />
        </div>
        <div className="floating-card card-one"><span className="mini-icon">↗</span><span><b>Great routes</b><small>Ready when you are</small></span></div>
        <div className="floating-card card-two"><span className="mini-icon green">✓</span><span><b>Easy booking</b><small>From search to seat</small></span></div>
      </div>
    </section>
  );
}
