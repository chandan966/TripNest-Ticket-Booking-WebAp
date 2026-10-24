import React from "react";
import "./Footer.css";

function Brand() {
  return (
    <a className="brand footer-brand" href="/">
      <span className="brand-mark">t</span>
      <span>trip<span className="brand-accent">nest</span></span>
    </a>
  );
}

export default function Footer() {
  return (
    <>
      <section className="cta-strip">
        <div><span className="cta-spark">✦</span><h2>Your next chapter is out there.</h2><p>Pick a place. We’ll help you find a way.</p></div>
        <button id="ctaSearch">Find my trip <span>→</span></button>
      </section>
      <footer>
        <Brand />
        <p>Made for the joy of getting there.</p>
        <a className="footer-credit" href="https://github.com/chandan966" target="_blank" rel="noreferrer">
          @webdevchandan
        </a>
        <span>© 2026 TripNest · Demo booking platform</span>
      </footer>
    </>
  );
}
