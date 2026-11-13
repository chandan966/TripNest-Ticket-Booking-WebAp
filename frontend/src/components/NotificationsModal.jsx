import React from "react";

export default function NotificationsModal({
  notifications = [],
  unreadCount = 0,
  onClose,
  onMarkAllRead,
  onOpenBooking
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: "480px" }}>
        <div className="modal-header">
          <div>
            <h3>Notifications ({unreadCount} new)</h3>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
              Updates on your bookings, cancellations, and support queries
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {unreadCount > 0 && (
            <div style={{ textAlign: "right", marginBottom: "12px" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "11px", padding: "4px 10px" }}
                onClick={onMarkAllRead}
              >
                Mark all as read
              </button>
            </div>
          )}

          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 10px" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔔</div>
              <h4>No notifications right now</h4>
              <p style={{ color: "var(--muted)", fontSize: "12px" }}>
                When you make a booking or contact support, updates will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  background: n.read_at ? "#fff" : "var(--primary-light)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "8px",
                  transition: "background 0.2s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ color: "var(--ink)", fontSize: "13px" }}>{n.title}</b>
                  <small style={{ color: "var(--muted)", fontSize: "10px" }}>
                    {new Date(n.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </small>
                </div>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 8px" }}>
                  {n.message}
                </p>

                {n.booking_code && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                    onClick={() => {
                      onClose();
                      onOpenBooking(n.booking_code);
                    }}
                  >
                    View Booking {n.booking_code} →
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
