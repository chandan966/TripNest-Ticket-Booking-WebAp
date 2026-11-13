import React, { useState } from "react";
import "./Navbar.css";

export default function Navbar({
  currentView,
  onNavigate,
  user,
  onOpenAuth,
  onSignOut,
  unreadNotifications,
  onOpenNotifications,
  onOpenSupport
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="redbus-header">
      <div className="top-announcement">
        <div>
          <span className="spark">✦</span>
          <span>Redbus Experience · Book certified Primo buses, track live GPS & enjoy instant refunds!</span>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <span style={{ cursor: "pointer" }} onClick={() => onNavigate("offers")}>Offers & Deals</span>
          <span style={{ cursor: "pointer" }} onClick={onOpenSupport}>Customer Care 24x7</span>
        </div>
      </div>

      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="brand-logo" onClick={() => onNavigate("home")}>
          <div className="brand-icon">🚌</div>
          <span>trip<span className="accent">nest</span></span>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-links">
          <button
            className={`nav-tab-btn ${currentView === "home" || currentView === "search" ? "active" : ""}`}
            onClick={() => onNavigate("home")}
          >
            <span className="tab-icon">🚌</span>
            <span>Bus Tickets</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === "trains" ? "active" : ""}`}
            onClick={() => {
              onNavigate("home");
              window.dispatchEvent(new CustomEvent("tripnest_set_type", { detail: "train" }));
            }}
          >
            <span className="tab-icon">🚆</span>
            <span>Trains</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === "flights" ? "active" : ""}`}
            onClick={() => {
              onNavigate("home");
              window.dispatchEvent(new CustomEvent("tripnest_set_type", { detail: "flight" }));
            }}
          >
            <span className="tab-icon">✈</span>
            <span>Flights</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === "offers" ? "active" : ""}`}
            onClick={() => onNavigate("offers")}
          >
            <span className="tab-icon">🏷</span>
            <span>Offers</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === "tracking" ? "active" : ""}`}
            onClick={() => onNavigate("tracking")}
          >
            <span className="tab-icon">📍</span>
            <span>Track Bus</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === "support" ? "active" : ""}`}
            onClick={() => onNavigate("support")}
          >
            <span className="tab-icon">🎧</span>
            <span>Help</span>
          </button>
        </nav>

        {/* Right Side User Actions */}
        <div className="nav-right-actions">
          {user && (
            <button
              className="nav-icon-btn"
              title="Notifications"
              onClick={onOpenNotifications}
            >
              🔔
              {unreadNotifications > 0 && (
                <span className="nav-badge-count">{unreadNotifications}</span>
              )}
            </button>
          )}

          <button
            className="btn-secondary"
            style={{ fontSize: "12px", padding: "8px 14px" }}
            onClick={() => {
              if (!user) {
                onOpenAuth("login", () => onNavigate("bookings"));
              } else {
                onNavigate("bookings");
              }
            }}
          >
            📋 My Bookings
          </button>

          {user ? (
            <div style={{ position: "relative" }}>
              <button
                className="user-account-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="user-avatar-circle">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span>{user.name.split(" ")[0]}</span>
                <span style={{ fontSize: "10px", color: "var(--muted)" }}>▼</span>
              </button>

              {dropdownOpen && (
                <div className="user-dropdown-menu" onMouseLeave={() => setDropdownOpen(false)}>
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-name">{user.name}</div>
                    <div className="user-dropdown-email">{user.email}</div>
                    {user.role === "admin" && (
                      <span className="badge badge-primo" style={{ marginTop: "4px" }}>Admin Account</span>
                    )}
                  </div>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigate("bookings");
                    }}
                  >
                    <span>📋</span> My Bookings & Tickets
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigate("tracking");
                    }}
                  >
                    <span>📍</span> Track My Bus
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigate("support");
                    }}
                  >
                    <span>🎧</span> Support Center
                  </button>

                  {user.role === "admin" && (
                    <button
                      className="dropdown-item"
                      style={{ color: "var(--primary)", fontWeight: 700 }}
                      onClick={() => {
                        setDropdownOpen(false);
                        onNavigate("admin");
                      }}
                    >
                      <span>⚡</span> Admin Management
                    </button>
                  )}

                  <div className="dropdown-divider" />

                  <button
                    className="dropdown-item"
                    style={{ color: "#EF4444" }}
                    onClick={() => {
                      setDropdownOpen(false);
                      onSignOut();
                    }}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="btn-primary"
              style={{ padding: "8px 18px", fontSize: "13px" }}
              onClick={() => onOpenAuth("login")}
            >
              Sign In <span>↗</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
