import React from "react";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot" /> TRAVEL YOUR WAY</div>
        <h1>Go places.<br /><span>Make stories.</span></h1>
        <p className="hero-description">Compare routes, find a fare that feels right, and book your next journey — all in one happy place.</p>
        <div className="trust-row">
          <div className="avatar-stack"><i>R</i><i>A</i><i>S</i><i>+</i></div>
          <span><strong>Easy travel planning</strong><br />One search. More possibilities.</span>
        </div>
      </div>
      <div className="hero-art" aria-label="Travel illustration">
        <div className="sun" /><div className="cloud cloud-one" /><div className="cloud cloud-two" />
        <div className="hill hill-back" /><div className="hill hill-front" />
        <div className="route-line" />
        <div className="floating-card card-one"><span className="mini-icon">✈</span><span><b>New places</b><small>Closer than you think</small></span></div>
        <div className="floating-card card-two"><span className="mini-icon green">✓</span><span><b>Easy booking</b><small>In just a few steps</small></span></div>
        <div className="plane">✈</div>
      </div>
      <div className="hero-sticker"><span>✦</span> Find your<br />kind of journey</div>
    </section>
  );
}
