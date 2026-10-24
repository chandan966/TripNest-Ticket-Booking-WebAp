import React from "react";
import "./BookingModals.css";

export default function BookingModals() {
  return (
    <>
      <div className="modal-backdrop hidden" id="modalBackdrop">
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <button className="modal-close" id="closeModal" aria-label="Close">×</button>
          <div id="modalContent" />
        </section>
      </div>
      <div className="toast" id="toast" role="status" />
    </>
  );
}
