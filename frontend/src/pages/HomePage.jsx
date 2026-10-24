import React, { useEffect } from "react";
import Header from "../components/Header.jsx";
import Hero from "../components/Hero.jsx";
import JourneySearch from "../components/JourneySearch.jsx";
import TripResults from "../components/TripResults.jsx";
import PopularRoutes from "../components/PopularRoutes.jsx";
import Benefits from "../components/Benefits.jsx";
import Footer from "../components/Footer.jsx";
import BookingModals from "../components/BookingModals.jsx";
import "./HomePage.css";

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
        <PopularRoutes />
        <Benefits />
        <Footer />
      </main>
      <BookingModals />
    </div>
  );
}
