import React from "react";
import "./PopularRoutes.css";

export default function PopularRoutes() {
  return (
    <section className="popular-section" id="popularSection">
      <div className="section-heading">
        <div><div className="eyebrow">A LITTLE INSPIRATION</div><h2>Where to next?</h2><p>Popular routes to get your plans moving.</p></div>
        <span className="heading-doodle">✳</span>
      </div>
      <div className="destination-grid">
        <button className="destination-card pune-mumbai" data-from="Pune" data-to="Mumbai">
          <span className="destination-tag">CITY ESCAPE</span><span className="destination-name">Pune <span>→</span> Mumbai</span><span className="destination-foot">From ₹499 <b>↗</b></span>
        </button>
        <button className="destination-card mumbai-goa" data-from="Mumbai" data-to="Goa">
          <span className="destination-tag">COASTAL VIBES</span><span className="destination-name">Mumbai <span>→</span> Goa</span><span className="destination-foot">From ₹760 <b>↗</b></span>
        </button>
        <button className="destination-card mumbai-delhi" data-from="Mumbai" data-to="Delhi">
          <span className="destination-tag">BIG CITY ENERGY</span><span className="destination-name">Mumbai <span>→</span> Delhi</span><span className="destination-foot">From ₹4,299 <b>↗</b></span>
        </button>
      </div>
    </section>
  );
}
