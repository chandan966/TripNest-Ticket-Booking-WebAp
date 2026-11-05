import React from "react";
import "./TravelExtras.css";

const services = [
  { icon: "⌂", title: "Stay nearby", text: "Explore sample hotel deals for your destination.", action: "hotels" },
  { icon: "♧", title: "Travel with confidence", text: "See women-friendly and highly rated demo operators.", action: "safety" },
  { icon: "⌖", title: "Journey updates", text: "Open the sample trip tracker from your booking history.", action: "tracking" },
];

export default function TravelExtras() {
  return (
    <section className="travel-extras" aria-labelledby="extrasTitle">
      <div className="section-heading">
        <div>
          <div className="eyebrow">MORE FOR YOUR JOURNEY</div>
          <h2 id="extrasTitle">A little extra travel joy</h2>
          <p>Demo offers and tools to make planning easier.</p>
        </div>
      </div>
      <div className="extras-grid">
        <article className="offer-card">
          <span className="offer-kicker">DEMO OFFER · 10% OFF</span>
          <h3>A better fare for your next trip</h3>
          <p>Use this sample coupon at checkout. No real payment is collected.</p>
          <button type="button" className="coupon-copy" data-copy-code="TRIPNEST10">Copy TRIPNEST10</button>
        </article>
        {services.map((service) => (
          <article className="service-card" key={service.action}>
            <span className="service-icon" aria-hidden="true">{service.icon}</span>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
            <button type="button" data-demo-action={service.action}>Explore <span aria-hidden="true">→</span></button>
          </article>
        ))}
      </div>
      <p className="extras-disclaimer">Sample deals, hotel information, and tracking are demonstrations only; no live provider is connected.</p>
    </section>
  );
}
