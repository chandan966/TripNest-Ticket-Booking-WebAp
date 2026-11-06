import React, { useEffect, useState } from "react";
import "./TravelExtras.css";

const services = [
  { icon: "⌂", title: "Stay nearby", text: "Explore sample hotel deals for your destination.", action: "hotels" },
  { icon: "♧", title: "Travel with confidence", text: "See women-friendly and highly rated demo operators.", action: "safety" },
  { icon: "⌖", title: "Journey updates", text: "Open the sample trip tracker from your booking history.", action: "tracking" },
];

export default function TravelExtras() {
  const [offers, setOffers] = useState(null);
  useEffect(() => {
    let active = true;
    fetch("/api/offers")
      .then((response) => {
        if (!response.ok) throw new Error("Offers are unavailable.");
        return response.json();
      })
      .then((items) => { if (active) setOffers(items); })
      .catch(() => { if (active) setOffers([]); });
    return () => { active = false; };
  }, []);

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
        {offers === null ? (
          <article className="offer-card offer-empty" aria-live="polite">Loading current offers…</article>
        ) : offers.length ? offers.map((offer) => (
          <article className="offer-card" key={offer.code}>
            <span className="offer-kicker">TRIPNEST OFFER · {offer.discount_label}</span>
            <h3>Save on your next trip</h3>
            <p>Minimum booking ₹{Number(offer.minimum_amount).toLocaleString("en-IN")}. Demo discount; no payment is collected.</p>
            <button type="button" className="coupon-copy" data-copy-code={offer.code}>Copy {offer.code}</button>
          </article>
        )) : (
          <article className="offer-card offer-empty"><span className="offer-kicker">TRIPNEST OFFERS</span><h3>No active offers</h3><p>Check back later for new savings.</p></article>
        )}
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
