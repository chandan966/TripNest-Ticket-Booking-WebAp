import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar.jsx";
import HeroSearch from "./components/HeroSearch.jsx";
import OffersCarousel from "./components/OffersCarousel.jsx";
import PrimoSection from "./components/PrimoSection.jsx";
import HomeExtras from "./components/HomeExtras.jsx";
import SearchResults from "./components/SearchResults.jsx";
import BookingCheckoutModal from "./components/BookingCheckoutModal.jsx";
import ETicketModal from "./components/ETicketModal.jsx";
import LiveBusTracker from "./components/LiveBusTracker.jsx";
import MyBookingsPage from "./components/MyBookingsPage.jsx";
import OffersPage from "./components/OffersPage.jsx";
import SupportPage from "./components/SupportPage.jsx";
import AdminPage from "./components/AdminPage.jsx";
import AuthModal from "./components/AuthModal.jsx";
import NotificationsModal from "./components/NotificationsModal.jsx";

export default function App() {
  // Navigation & View State: 'home' | 'search' | 'bookings' | 'tracking' | 'offers' | 'support' | 'admin'
  const [currentView, setCurrentView] = useState("home");

  // User & Auth State
  const [token, setToken] = useState(() => localStorage.getItem("tripnest_token") || "");
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("tripnest_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // Search State
  const [searchParams, setSearchParams] = useState({
    from: "Pune",
    to: "Mumbai",
    date: new Date().toISOString().slice(0, 10),
    type: "bus",
    travellers: 1
  });
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // Modals State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [authSuccessCallback, setAuthSuccessCallback] = useState(null);

  const [checkoutBookingData, setCheckoutBookingData] = useState(null);
  const [activeETicket, setActiveETicket] = useState(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Toast State
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, isError = false) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.items || []);
        setUnreadNotifications(data.unread || 0);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token, fetchNotifications]);

  // Handle Search Trigger
  const handleSearch = useCallback(async (params) => {
    setSearchParams(params);
    setCurrentView("search");
    setLoadingTrips(true);

    try {
      const query = new URLSearchParams({
        from: params.from,
        to: params.to,
        date: params.date,
        type: params.type || "bus"
      });

      const res = await fetch(`/api/trips?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.");

      setTrips(Array.isArray(data) ? data : []);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoadingTrips(false);
    }
  }, [showToast]);

  // Auth Handling
  const handleOpenAuth = (mode = "login", onSuccess = null) => {
    setAuthModalMode(mode);
    setAuthSuccessCallback(() => onSuccess);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("tripnest_token", newToken);
    localStorage.setItem("tripnest_user", JSON.stringify(newUser));

    if (authSuccessCallback) {
      authSuccessCallback();
      setAuthSuccessCallback(null);
    }
  };

  const handleSignOut = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("tripnest_token");
    localStorage.removeItem("tripnest_user");
    setCurrentView("home");
    showToast("Signed out successfully.");
  };

  // Mark all notifications read
  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch {}
  };

  // Booking Flow Transitions
  const handleProceedToBooking = (bookingPackage) => {
    if (!user) {
      handleOpenAuth("login", () => {
        setCheckoutBookingData(bookingPackage);
      });
      return;
    }
    setCheckoutBookingData(bookingPackage);
  };

  const handleBookingConfirmed = (confirmedBooking) => {
    setCheckoutBookingData(null);
    setActiveETicket(confirmedBooking);
    fetchNotifications();
  };

  const handleTrackBus = (code) => {
    setTrackingCode(code);
    setCurrentView("tracking");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="tripnest-app">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        user={user}
        onOpenAuth={(mode, cb) => handleOpenAuth(mode, cb)}
        onSignOut={handleSignOut}
        unreadNotifications={unreadNotifications}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenSupport={() => setCurrentView("support")}
      />

      {/* Main Pages Router */}
      <main>
        {currentView === "home" && (
          <>
            <HeroSearch
              onSearch={handleSearch}
              initialFrom={searchParams.from}
              initialTo={searchParams.to}
            />
            <OffersCarousel
              onCopyCode={(code) => {
                navigator.clipboard.writeText(code).then(() => {
                  showToast(`Offer code ${code} copied! Apply at checkout.`);
                });
              }}
              onExploreAll={() => setCurrentView("offers")}
            />
            <PrimoSection
              onSearchPrimo={() => {
                handleSearch({ ...searchParams, primoOnly: true });
              }}
            />
            <HomeExtras
              onSelectRoute={(from, to) => {
                handleSearch({ ...searchParams, from, to });
              }}
            />
          </>
        )}

        {currentView === "search" && (
          <SearchResults
            searchParams={searchParams}
            trips={trips}
            loading={loadingTrips}
            user={user}
            token={token}
            onProceedToBooking={handleProceedToBooking}
            onOpenAuth={handleOpenAuth}
            onModifySearch={() => {
              setCurrentView("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onChangeDate={(newDate) => {
              handleSearch({ ...searchParams, date: newDate });
            }}
            showToast={showToast}
          />
        )}

        {currentView === "bookings" && (
          <MyBookingsPage
            user={user}
            token={token}
            onOpenETicket={(b) => setActiveETicket(b)}
            onTrackBus={handleTrackBus}
            onOpenAuth={handleOpenAuth}
            showToast={showToast}
            onSearchNew={() => setCurrentView("home")}
          />
        )}

        {currentView === "tracking" && (
          <LiveBusTracker
            initialCode={trackingCode}
            showToast={showToast}
            onBack={() => setCurrentView("home")}
          />
        )}

        {currentView === "offers" && (
          <OffersPage
            showToast={showToast}
            onBookNow={() => setCurrentView("home")}
          />
        )}

        {currentView === "support" && (
          <SupportPage
            user={user}
            token={token}
            onOpenAuth={handleOpenAuth}
            showToast={showToast}
          />
        )}

        {currentView === "admin" && (
          <AdminPage
            token={token}
            showToast={showToast}
            onBack={() => setCurrentView("home")}
          />
        )}
      </main>

      {/* Booking Checkout Modal */}
      {checkoutBookingData && (
        <BookingCheckoutModal
          bookingData={checkoutBookingData}
          user={user}
          token={token}
          onClose={() => setCheckoutBookingData(null)}
          onBookingSuccess={handleBookingConfirmed}
          showToast={showToast}
        />
      )}

      {/* Digital Printable E-Ticket Pass Modal */}
      {activeETicket && (
        <ETicketModal
          booking={activeETicket}
          onClose={() => setActiveETicket(null)}
          onTrackBus={handleTrackBus}
        />
      )}

      {/* Authentication Modal */}
      {authModalOpen && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          showToast={showToast}
        />
      )}

      {/* Account Notifications Modal */}
      {notificationsOpen && (
        <NotificationsModal
          notifications={notifications}
          unreadCount={unreadNotifications}
          onClose={() => setNotificationsOpen(false)}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onOpenBooking={(code) => {
            setTrackingCode(code);
            setCurrentView("tracking");
          }}
        />
      )}

      {/* Floating Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item ${toast.isError ? "error" : "success"}`}
          >
            <span>{toast.isError ? "⚠️" : "✓"}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
