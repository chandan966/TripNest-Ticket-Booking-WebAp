import React, { useState, useEffect } from "react";
import "./SupportPage.css";

export default function SupportPage({ user, token, onOpenAuth, showToast }) {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);

  // New ticket modal form state
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [category, setCategory] = useState("booking");
  const [subject, setSubject] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [description, setDescription] = useState("");

  const fetchTickets = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/support/tickets", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTickets(data);
    } catch {}
  };

  const fetchTicketDetails = async (id) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTicket(data.ticket);
        setMessages(data.messages || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ body: replyText.trim() })
      });
      if (!res.ok) throw new Error("Could not send reply.");
      setReplyText("");
      showToast("Reply sent to customer care!");
      fetchTicketDetails(activeTicket.id);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast("Please fill in the subject and description.", true);
      return;
    }

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          bookingCode: bookingCode.trim() || null,
          description: description.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create support ticket.");

      showToast(`Support Ticket ${data.ticket.ticket_code} created!`);
      setCreatingTicket(false);
      setSubject("");
      setDescription("");
      setBookingCode("");
      fetchTickets();
      fetchTicketDetails(data.ticket.id);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  if (!user) {
    return (
      <div className="support-page-container" style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2>Sign In for 24/7 RedCare Support</h2>
        <p style={{ color: "var(--muted)", margin: "8px 0 20px" }}>
          Get instant assistance with bookings, refunds, cancellations, and bus tracking.
        </p>
        <button type="button" className="btn-primary" onClick={() => onOpenAuth("login")}>
          Sign In to Open Ticket
        </button>
      </div>
    );
  }

  return (
    <div className="support-page-container">
      <div className="support-hero-banner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="badge badge-primo" style={{ marginBottom: "8px" }}>
              REDCARE HELPLINE 24x7
            </span>
            <h1 style={{ fontSize: "28px", fontWeight: 800 }}>TripNest Customer Help Center</h1>
            <p style={{ opacity: 0.9, fontSize: "14px", margin: 0 }}>
              Need help with a booking, refund, or bus issue? Create a request or chat with our team.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => setCreatingTicket(true)}
          >
            + Create New Request
          </button>
        </div>
      </div>

      {creatingTicket ? (
        <div className="ticket-chat-box" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>
            Open a Support Request
          </h3>

          <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="form-group">
              <label>Issue Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="booking">Booking & Seat Questions</option>
                <option value="cancellation">Cancellation & Rescheduling</option>
                <option value="refund">Refund Status</option>
                <option value="bus_issue">Bus Delay or Amenity Issue</option>
                <option value="lost_item">Lost Belongings / Luggage</option>
                <option value="payment">Payment & Offer Codes</option>
                <option value="technical">Technical Support</option>
              </select>
            </div>

            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                placeholder="Brief summary of your query"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Booking Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. TN..."
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Describe the issue in detail</label>
              <textarea
                rows={4}
                placeholder="Please describe how we can assist you..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--line)" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button type="button" className="btn-secondary" onClick={() => setCreatingTicket(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Submit Request →
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="support-grid-layout">
          {/* Left Tickets List */}
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "12px", color: "var(--ink)" }}>
              Your Support Requests ({tickets.length})
            </h3>

            {tickets.length === 0 ? (
              <div style={{ background: "#fff", padding: "30px 20px", borderRadius: "12px", textAlign: "center" }}>
                <p style={{ color: "var(--muted)" }}>No support requests logged yet.</p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: "10px", fontSize: "12px" }}
                  onClick={() => setCreatingTicket(true)}
                >
                  Create Your First Request
                </button>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className={`ticket-item-card ${activeTicket?.id === t.id ? "active" : ""}`}
                  onClick={() => fetchTicketDetails(t.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ color: "var(--ink)", fontSize: "14px" }}>{t.subject}</b>
                    <span className="badge badge-primo">{t.status.replace("_", " ")}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                    ID: <b>{t.ticket_code}</b> · {t.category} · {t.message_count} messages
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Ticket Thread View */}
          <div className="ticket-chat-box">
            {activeTicket ? (
              <>
                <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)" }}>
                      {activeTicket.subject}
                    </h3>
                    <span className="badge badge-green">{activeTicket.status}</span>
                  </div>
                  <small style={{ color: "var(--muted)" }}>
                    Ticket {activeTicket.ticket_code}
                    {activeTicket.booking_code ? ` · Booking Ref: ${activeTicket.booking_code}` : ""}
                  </small>
                </div>

                <div className="chat-messages-container">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`chat-bubble ${m.from_staff ? "staff" : "user"}`}
                    >
                      <b style={{ display: "block", fontSize: "11px", marginBottom: "2px", opacity: 0.85 }}>
                        {m.from_staff ? "🎧 TripNest RedCare Officer" : m.author || "You"}
                      </b>
                      {m.body}
                      <small style={{ display: "block", fontSize: "10px", opacity: 0.65, marginTop: "4px", textAlign: "right" }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </small>
                    </div>
                  ))}
                </div>

                <form className="reply-input-bar" onSubmit={handleSendReply}>
                  <input
                    type="text"
                    placeholder="Type a message or response..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button type="submit" className="btn-primary">
                    Send Reply
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>💬</div>
                <h4>Select a request to view conversation</h4>
                <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                  Click any ticket on the left or create a new request.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
