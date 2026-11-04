import React from "react";
import "./Header.css";

function Brand({ footer = false }) {
  return (
    <a className={`brand${footer ? " footer-brand" : ""}`} href="/">
      <span className="brand-mark">t</span>
      <span>trip<span className="brand-accent">nest</span></span>
    </a>
  );
}

export default function Header() {
  return (
    <>
      <div className="announcement">
        <span className="spark">✦</span>
        Your next bus journey starts here
        <span className="announcement-right">Easy booking. Happier journeys.</span>
      </div>
      <header className="header">
        <Brand />
        <nav className="main-nav" aria-label="Main navigation">
          <button className="nav-item active" data-type="all"><span>⌕</span> Explore</button>
          <button className="nav-item" data-type="bus"><span>▰</span> Bus</button>
          <button className="nav-item" data-type="train"><span>▤</span> Train</button>
          <button className="nav-item" data-type="flight"><span>✈</span> Flights</button>
        </nav>
        <div className="header-actions">
          <button className="text-btn" id="myBookingsBtn">My bookings</button>
          <button className="login-btn" id="authBtn">Sign in <span>↗</span></button>
          <button className="mobile-menu" id="mobileMenu" aria-label="Open menu">☰</button>
        </div>
      </header>
    </>
  );
}
