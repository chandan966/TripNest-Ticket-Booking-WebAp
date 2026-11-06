"use client";

import React, { Suspense, useEffect, lazy } from "react";
import Header from "../components/Header.jsx";
import Hero from "../components/Hero.jsx";
import JourneySearch from "../components/JourneySearch.jsx";
import TripResults from "../components/TripResults.jsx";
import "./HomePage.css";

const TravelExtras = lazy(() => import("../components/TravelExtras.jsx"));
const PopularRoutes = lazy(() => import("../components/PopularRoutes.jsx"));
const Benefits = lazy(() => import("../components/Benefits.jsx"));
const Footer = lazy(() => import("../components/Footer.jsx"));
const BookingModals = lazy(() => import("../components/BookingModals.jsx"));

function BelowFoldFallback() {
  return (
    <div style={{ padding: "24px 0", textAlign: "center", color: "#64748b" }}>
      Loading more TripNest experiences…
    </div>
  );
}

export default function HomePage() {
  useEffect(() => {
    void import("../dom-ui.js");
  }, []);

  return (
    <div className="home-page">
      <Header />
      <main>
        <Hero />
        <JourneySearch />
        <TripResults />
        <Suspense fallback={<BelowFoldFallback />}>
          <TravelExtras />
          <PopularRoutes />
          <Benefits />
          <Footer />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <BookingModals />
      </Suspense>
    </div>
  );
}
