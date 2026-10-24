import React from "react";
import "./Benefits.css";

export default function Benefits() {
  return (
    <section className="benefits">
      <div className="benefit"><span className="benefit-icon peach">⌕</span><div><h3>Compare with ease</h3><p>See your available options side by side.</p></div></div>
      <div className="benefit"><span className="benefit-icon lilac">♡</span><div><h3>Plans that fit you</h3><p>Choose routes, times and fares your way.</p></div></div>
      <div className="benefit"><span className="benefit-icon mint">✓</span><div><h3>Booking made simple</h3><p>Your trip details, all in one place.</p></div></div>
    </section>
  );
}
