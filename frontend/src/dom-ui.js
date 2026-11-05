const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
function storedUser() {
  try {
    const user = JSON.parse(localStorage.getItem("tripnest_user") || "null");
    return user && typeof user.name === "string" && typeof user.email === "string" ? user : null;
  } catch {
    localStorage.removeItem("tripnest_user");
    return null;
  }
}
const state = { token: localStorage.getItem("tripnest_token") || "", user: storedUser(), type: "all", filter: "all", trips: [], selectedTrip: null };
const today = new Date(); const localDate = new Date(today.getTime() - today.getTimezoneOffset()*60000).toISOString().slice(0,10);
$("#travelDate").min = localDate; $("#travelDate").value = localDate;
const icons = { bus:"▰", train:"▤", flight:"✈" };
function escapeHtml(value="") { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function money(n) { return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n); }
async function api(url, options={}) {
  const headers = { "Content-Type":"application/json", ...(options.headers||{}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let response;
  try { response = await fetch(url,{...options,headers}); }
  catch { throw new Error("Could not reach the server. Make sure the app is running."); }
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
let toastTimer;
function toast(message, error=false) { const el=$("#toast"); el.textContent=message; el.classList.toggle("error",error); el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),3000); }
function openModal(html) { $("#modalContent").innerHTML=html; $("#modalBackdrop").classList.remove("hidden"); document.body.style.overflow="hidden"; }
function closeModal() { $("#modalBackdrop").classList.add("hidden"); document.body.style.overflow=""; }
$("#closeModal").addEventListener("click",closeModal);
$("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
function refreshAuthButton() { $("#authBtn").innerHTML=state.user ? `${escapeHtml(state.user.name.split(" ")[0])} <span>↗</span>` : 'Sign in <span>↗</span>'; }
async function loadLocations() {
  try {
    const locations = await api("/api/locations");
    ["#from","#to"].forEach(sel=>{ const el=$(sel); const previous=el.value; el.innerHTML='<option value="">Choose '+(sel==="#from"?"origin":"destination")+'</option>'+locations.map(c=>`<option>${escapeHtml(c)}</option>`).join(""); if(previous)el.value=previous; });
    if(locations.includes("Pune"))$("#from").value="Pune";
    if(locations.includes("Mumbai"))$("#to").value="Mumbai";
  } catch(e) { toast(e.message,true); }
}
function setType(type) {
  state.type=type;
  $$(".search-tab").forEach(b=>b.classList.toggle("selected",b.dataset.type===type));
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.type===type));
}
$$(".search-tab,.nav-item").forEach(b=>b.addEventListener("click",()=>setType(b.dataset.type)));
$("#mobileMenu").addEventListener("click",()=>$("#main-nav")?.classList.toggle("open") || $(".main-nav").classList.toggle("open"));
$("#swapBtn").addEventListener("click",()=>{const a=$("#from").value;$("#from").value=$("#to").value;$("#to").value=a;});
$("#ctaSearch").addEventListener("click",()=>{$("#from").focus();window.scrollTo({top:$("#searchForm").getBoundingClientRect().top+scrollY-100,behavior:"smooth"});});
$$(".destination-card").forEach(card=>card.addEventListener("click",()=>{$("#from").value=card.dataset.from;$("#to").value=card.dataset.to;$("#searchForm").requestSubmit();}));
$("#searchForm").addEventListener("submit",async e=>{
  e.preventDefault(); const from=$("#from").value,to=$("#to").value,date=$("#travelDate").value;
  if(!from||!to)return toast("Choose both origin and destination.",true);
  if(from===to)return toast("Origin and destination must be different.",true);
  if(!date)return toast("Choose your travel date.",true);
  const params=new URLSearchParams({from,to,date}); if(state.type!=="all")params.set("type",state.type);
  $("#resultsSection").classList.remove("hidden"); $("#resultsTitle").textContent=`${from} to ${to}`; $("#resultsSubtitle").textContent=`${new Date(date+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})} · up to ${$("#travellers").value} traveller(s)`;
  $("#resultsList").innerHTML='<div class="empty-state">Finding the best journeys for you…</div>';
  $("#resultsSection").scrollIntoView({behavior:"smooth",block:"start"});
  try { state.trips=await api("/api/trips?"+params); state.filter="all"; $$(".filter-pill").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all")); renderTrips(); }
  catch(err){$("#resultsList").innerHTML=`<div class="empty-state">${escapeHtml(err.message)}</div>`;}
});
function renderTrips() {
  let trips=[...state.trips]; if(state.filter!=="all")trips=trips.filter(t=>t.type===state.filter);
  const maxFare=$("#maxFare").value;
  if(maxFare!=="all")trips=trips.filter(t=>Number(t.price)<=Number(maxFare));
  const busType=$("#busType").value;
  if(busType!=="all")trips=trips.filter(t=>t.type==="bus"&&t.bus_type===busType);
  const departureWindow=$("#departureWindow").value;
  if(departureWindow!=="all")trips=trips.filter(t=>{
    const hour=Number(String(t.departure_time).slice(0,2));
    if(departureWindow==="morning")return hour>=6&&hour<12;
    if(departureWindow==="afternoon")return hour>=12&&hour<18;
    return hour>=18||hour<6;
  });
  if($("#womenFriendly").checked)trips=trips.filter(t=>t.women_friendly);
  if($("#primoOnly").checked)trips=trips.filter(t=>t.is_primo);
  const sort=$("#sortSelect").value;
  if(sort==="price")trips.sort((a,b)=>a.price-b.price); else if(sort==="departure")trips.sort((a,b)=>a.departure_time.localeCompare(b.departure_time));
  if(!trips.length){$("#resultsList").innerHTML='<div class="empty-state"><b>No trips found just yet.</b>Try another date, route, or travel type.</div>';return;}
  $("#resultsList").innerHTML=trips.map(t=>`<article class="trip-card">
    <div class="trip-operator"><span class="operator-icon">${icons[t.type]}</span><span><b>${escapeHtml(t.operator)}</b><small>${escapeHtml(t.type==="bus"?t.bus_type:t.type)} · ${escapeHtml(t.amenities||"Standard")}</small><div class="trip-badges"><span class="trip-rating">★ ${Number(t.rating||4.5).toFixed(1)} <small>(${Number(t.review_count||0)} reviews)</small></span>${t.is_primo?'<span class="trip-badge primo">Top rated</span>':""}${t.women_friendly?'<span class="trip-badge">Women-friendly</span>':""}${t.supports_tracking?'<span class="trip-badge">Tracking demo</span>':""}</div></span></div>
    <div class="trip-timing"><span class="time-block"><b>${escapeHtml(t.departure_time)}</b><small>${escapeHtml(t.origin)}</small></span><span class="journey-line">${escapeHtml(t.duration)}</span><span class="time-block"><b>${escapeHtml(t.arrival_time)}</b><small>${escapeHtml(t.destination)}</small></span></div>
    <div class="trip-price"><small>Per traveller · ${t.seats_available} seats left</small><strong>${money(t.price)}</strong><button class="book-btn" data-book="${t.id}" ${t.seats_available<Number($("#travellers").value)?"disabled":""}>${t.seats_available<Number($("#travellers").value)?"Sold out":"Book journey →"}</button></div>
    <div class="trip-meta"><span>✦ ${escapeHtml(t.amenities||"Standard service")}</span><span>✓ Secure booking</span><span>♙ ${t.seats_available} seats available</span></div>
  </article>`).join("");
  $$("[data-book]").forEach(btn=>btn.addEventListener("click",()=>startBooking(Number(btn.dataset.book))));
}
$("#sortSelect").addEventListener("change",renderTrips);
["#maxFare","#departureWindow","#busType","#womenFriendly","#primoOnly"].forEach(sel=>$(sel).addEventListener("change",renderTrips));
$$(".filter-pill").forEach(b=>b.addEventListener("click",()=>{state.filter=b.dataset.filter;$$(".filter-pill").forEach(x=>x.classList.toggle("active",x===b));renderTrips();}));
function authModal(mode="login",after) {
  const isRegister=mode==="register";
  openModal(`<h2 id="modalTitle">${isRegister?"Create your account":"Welcome back"}</h2><p class="modal-sub">${isRegister?"Save your bookings and keep your trip details handy.":"Sign in to book tickets and manage your journeys."}</p>
  <form class="form-stack" id="authForm">${isRegister?'<label>Your name<input name="name" autocomplete="name" placeholder="e.g. Chandan Ghanghav" required maxlength="80"></label>':""}
  <label>Email address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
  <label>Password<input name="password" type="password" autocomplete="${isRegister?"new-password":"current-password"}" placeholder="${isRegister?"At least 8 characters":"Your password"}" minlength="${isRegister?8:1}" required></label>
  <button class="primary-btn" type="submit">${isRegister?"Create account":"Sign in"} →</button></form>
  <div class="modal-switch">${isRegister?"Already have an account?":"New to TripNest?"} <button class="link-btn" id="switchAuth">${isRegister?"Sign in":"Create account"}</button></div>`);
  $("#switchAuth").addEventListener("click",()=>authModal(isRegister?"login":"register",after));
  $("#authForm").addEventListener("submit",async e=>{
    e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget).entries());
    const button=e.currentTarget.querySelector("button[type=submit]");button.disabled=true;button.textContent="Please wait…";
    try { const result=await api(`/api/auth/${isRegister?"register":"login"}`,{method:"POST",body:JSON.stringify(data)});state.token=result.token;state.user=result.user;localStorage.setItem("tripnest_token",state.token);localStorage.setItem("tripnest_user",JSON.stringify(state.user));refreshAuthButton();closeModal();toast(`Welcome${state.user.name?" back, "+state.user.name.split(" ")[0]:""}!`);if(after)after(); }
    catch(err){toast(err.message,true);button.disabled=false;button.textContent=isRegister?"Create account →":"Sign in →";}
  });
}
$("#authBtn").addEventListener("click",()=>state.user?openAccountMenu():authModal());
function openAccountMenu(){openModal(`<h2>Hello, ${escapeHtml(state.user.name.split(" ")[0])}!</h2><p class="modal-sub">${escapeHtml(state.user.email)}</p><div class="form-stack"><button class="primary-btn" id="accountBookings">View my bookings</button><button class="primary-btn" style="background:#343630" id="signOut">Sign out</button></div>`);$("#accountBookings").addEventListener("click",showBookings);$("#signOut").addEventListener("click",()=>{state.token="";state.user=null;localStorage.removeItem("tripnest_token");localStorage.removeItem("tripnest_user");refreshAuthButton();closeModal();toast("You have signed out.");});}
$("#myBookingsBtn").addEventListener("click",showBookings);
async function showBookings() {
  if(!state.user){closeModal();return authModal("login",showBookings);}
  try {
    const bookings=await api("/api/bookings/mine");
    openModal(`<h2 id="modalTitle">My bookings</h2><p class="modal-sub">Your tickets, sample tracking and booking history.</p>${bookings.length?'<div class="booking-list">'+bookings.map(b=>`<article class="booking-item"><div class="booking-item-top"><div><b>${escapeHtml(b.origin)} → ${escapeHtml(b.destination)}</b><br><small>${escapeHtml(b.rescheduled_to||b.travel_date)} · ${escapeHtml(b.departure_time)} · ${escapeHtml(b.operator)}</small></div><span class="status ${b.status==="cancelled"?"cancelled":""}">${escapeHtml(b.status)}</span></div><p><small>Booking ID: ${escapeHtml(b.booking_code)} · ${b.seats} seat(s) · ${money(b.total_amount)} · Demo payment</small></p>${b.selected_seats?.length?`<p><small>Seats: ${b.selected_seats.map(escapeHtml).join(", ")}</small></p>`:""}${b.boarding_point?`<p><small>Boarding: ${escapeHtml(b.boarding_point)} · Drop: ${escapeHtml(b.dropping_point||"")}</small></p>`:""}${b.status==="cancelled"?`<p class="demo-disclaimer">Refund status: ${escapeHtml(b.refund_status||"Demo only; no payment was collected.")}</p>`:""}<div class="booking-actions">${b.status==="confirmed"?`<button class="cancel-btn" data-print="${escapeHtml(b.booking_code)}">View e-ticket</button>${b.type==="bus"?`<button class="cancel-btn" data-track="${escapeHtml(b.booking_code)}">Track demo</button>`:""}${b.travel_date>localDate?`<button class="cancel-btn" data-reschedule="${escapeHtml(b.booking_code)}">Flexi change (demo)</button><button class="cancel-btn" data-cancel="${escapeHtml(b.booking_code)}">Cancel booking</button>`:""}`:""}</div></article>`).join("")+'</div>':'<div class="empty-state"><b>No bookings yet.</b>Your next adventure could start with a search.</div>'}`);
    $$("[data-cancel]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Cancel this demo booking? No refund will be issued because no payment was collected."))return;try{await api(`/api/bookings/${encodeURIComponent(btn.dataset.cancel)}/cancel`,{method:"POST",body:"{}"});toast("Demo booking cancelled.");showBookings();}catch(err){toast(err.message,true);}}));
    $$("[data-track]").forEach(btn=>btn.addEventListener("click",async()=>{try{const tracking=await api(`/api/tracking/${encodeURIComponent(btn.dataset.track)}`);openModal(`<h2 id="modalTitle">Journey tracker</h2><p class="modal-sub">${escapeHtml(tracking.origin)} → ${escapeHtml(tracking.destination)}</p><div class="booking-summary"><b>📍 ${escapeHtml(tracking.location)}</b><p>Estimated arrival: ${escapeHtml(tracking.eta)}<br>Updated: ${escapeHtml(new Date(tracking.updatedAt).toLocaleTimeString())}</p></div><p class="demo-disclaimer">${escapeHtml(tracking.message)}</p><button class="primary-btn" id="shareTracking">Share demo update</button>`);$("#shareTracking").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(`${tracking.origin} to ${tracking.destination}: ${tracking.location}, ETA ${tracking.eta} (demo)`);toast("Demo update copied.");}catch{toast("Sharing is not available in this browser.",true);}});}catch(err){toast(err.message,true);}}));
    $$("[data-reschedule]").forEach(btn=>btn.addEventListener("click",async()=>{const travelDate=prompt("Choose a new date (YYYY-MM-DD). This demo change does not check live inventory:");if(!travelDate)return;try{await api(`/api/bookings/${encodeURIComponent(btn.dataset.reschedule)}/reschedule`,{method:"POST",body:JSON.stringify({travelDate})});toast("Demo date change saved.");showBookings();}catch(err){toast(err.message,true);}}));
    $$("[data-print]").forEach(btn=>btn.addEventListener("click",()=>{const booking=bookings.find(item=>item.booking_code===btn.dataset.print);if(booking)printTicket(booking);}));
  } catch(err){toast(err.message,true);if(err.message.includes("Session")){state.token="";state.user=null;refreshAuthButton();}}
}
function startBooking(tripId) {
  const trip=state.trips.find(t=>t.id===tripId);if(!trip)return;
  if(!state.user)return authModal("login",()=>startBooking(tripId));
  state.selectedTrip=trip;const count=Number($("#travellers").value);
  const bookedSeats=new Set(trip.booked_seats||[]);
  const seatCodes=Array.from({length:Math.min(Number(trip.total_seats)||40,60)},(_,i)=>`${String.fromCharCode(65+Math.floor(i/4))}${i%4+1}`);
  const boardingPoints=trip.boarding_points?.length?trip.boarding_points:[`${trip.origin} Central`];
  const droppingPoints=trip.dropping_points?.length?trip.dropping_points:[`${trip.destination} Central`];
  const seatButtons=seatCodes.map(seat=>`<button type="button" class="seat-choice" data-seat="${seat}" aria-pressed="false" ${bookedSeats.has(seat)?"disabled":""}>${seat}</button>`).join("");
  const passengerFields=Array.from({length:count},(_,i)=>`<div class="passenger-row"><label>Passenger ${i+1} name<input name="passengerName${i}" required maxlength="80" placeholder="Full name"></label><label>Age<input name="passengerAge${i}" type="number" min="1" max="120" required placeholder="Age"></label></div>`).join("");
  const pointOptions=points=>points.map(point=>`<option value="${escapeHtml(point)}">${escapeHtml(point)}</option>`).join("");
  openModal(`<h2 id="modalTitle">Complete your booking</h2><p class="modal-sub">Choose seats, pickup and drop points, and a demo payment option.</p><div class="booking-summary"><b>${escapeHtml(trip.origin)} → ${escapeHtml(trip.destination)}</b><p>${escapeHtml(trip.travel_date)} · ${escapeHtml(trip.departure_time)} – ${escapeHtml(trip.arrival_time)}<br>${escapeHtml(trip.operator)} · ${count} traveller(s)<br><strong>Subtotal: ${money(trip.price*count)}</strong></p></div><form class="form-stack" id="passengerForm"><div class="seat-map-wrap"><div class="seat-map-heading"><span>Choose ${count} seat(s)</span><span class="seat-legend">Green available · Grey taken</span></div><div class="seat-map">${seatButtons}</div><p class="modal-sub" id="selectedSeatText" style="margin:10px 0 0">No seats selected</p></div><label>Boarding point<select name="boardingPoint" required>${pointOptions(boardingPoints)}</select></label><label>Dropping point<select name="droppingPoint" required>${pointOptions(droppingPoints)}</select></label>${passengerFields}<label>Demo payment option<select name="paymentMethod"><option value="upi_test">UPI · test mode</option><option value="card_test">Card · test mode</option><option value="netbanking_test">Net banking · test mode</option><option value="wallet_demo">TripNest wallet · demo</option></select></label><label>Offer code<input name="couponCode" maxlength="24" placeholder="Try TRIPNEST10 or NEST5"></label><button class="primary-btn" type="submit">Continue · no real payment</button></form><p class="demo-disclaimer">Demo only: seats, payment, ticket, and offers use sample data. No payment is collected or ticket issued by an operator.</p>`);
  const selected=new Set();
  $$("[data-seat]").forEach(button=>button.addEventListener("click",()=>{const seat=button.dataset.seat;if(selected.has(seat)){selected.delete(seat);button.classList.remove("selected");button.setAttribute("aria-pressed","false");}else if(selected.size<count){selected.add(seat);button.classList.add("selected");button.setAttribute("aria-pressed","true");}else toast(`Choose no more than ${count} seats.`,true);$("#selectedSeatText").textContent=selected.size?`Selected: ${[...selected].join(", ")}`:"No seats selected";}));
  $("#passengerForm").addEventListener("submit",async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);const passengers=Array.from({length:count},(_,i)=>({name:f.get(`passengerName${i}`),age:Number(f.get(`passengerAge${i}`))}));
    if(selected.size!==count)return toast(`Please select exactly ${count} seats.`,true);
    const btn=e.currentTarget.querySelector("button");btn.disabled=true;btn.textContent="Confirming…";
    try{const result=await api("/api/bookings",{method:"POST",body:JSON.stringify({tripId,seats:count,passengers,seatCodes:[...selected],boardingPoint:f.get("boardingPoint"),droppingPoint:f.get("droppingPoint"),paymentMethod:f.get("paymentMethod"),couponCode:f.get("couponCode")})});const b=result.booking;openModal(`<div style="text-align:center;padding:10px 0"><div style="width:65px;height:65px;border-radius:50%;background:#e6f6eb;color:#36845c;display:grid;place-items:center;font-size:30px;margin:0 auto 18px">✓</div><div class="eyebrow" style="justify-content:center">DEMO BOOKING READY</div><h2 style="margin:12px 0">It's a trip!</h2><p class="modal-sub">Sample booking confirmed. No payment was collected.</p><div class="booking-summary" style="text-align:left"><b>${escapeHtml(b.origin)} → ${escapeHtml(b.destination)}</b><p>${escapeHtml(b.travel_date)} · ${escapeHtml(b.departure_time)}<br>Seats: ${[...selected].map(escapeHtml).join(", ")}<br>Boarding: ${escapeHtml(b.boarding_point||"")} · Drop: ${escapeHtml(b.dropping_point||"")}<br>Booking ID: <strong>${escapeHtml(b.booking_code)}</strong><br>Total: <strong>${money(b.total_amount)}</strong><br>Payment: demo only</p></div><p class="demo-disclaimer">This is not a valid transport ticket. Live operator ticketing and payments are not connected.</p><button class="primary-btn" id="ticketBooking">View e-ticket</button><button class="link-btn" id="doneBooking" style="width:100%;margin-top:12px">Done</button></div>`);$("#ticketBooking").addEventListener("click",()=>{printTicket({...b,selected_seats:[...selected]});});$("#doneBooking").addEventListener("click",closeModal);toast("Demo booking confirmed!");}
    catch(err){toast(err.message,true);btn.disabled=false;btn.textContent="Continue · no real payment";}
  });
}
function printTicket(booking){const ticket=window.open("","_blank","width=640,height=720");if(!ticket)return toast("Allow pop-ups to view the sample ticket.",true);ticket.document.write(`<!doctype html><title>TripNest demo ticket</title><style>body{font:15px Arial,sans-serif;max-width:560px;margin:40px auto;color:#292a26}h1{color:#d84e55}.card{border:1px solid #ddd;border-radius:14px;padding:22px}.notice{background:#fff5da;padding:12px;border-radius:8px;font-size:12px}@media print{button{display:none}}</style><h1>TripNest · Demo e-ticket</h1><div class="card"><h2>${escapeHtml(booking.origin)} → ${escapeHtml(booking.destination)}</h2><p>${escapeHtml(booking.rescheduled_to||booking.travel_date)} · ${escapeHtml(booking.departure_time)} · ${escapeHtml(booking.operator)}</p><p>Booking ID: <b>${escapeHtml(booking.booking_code)}</b></p><p>Seats: ${Array.isArray(booking.selected_seats)?booking.selected_seats.map(escapeHtml).join(", "):"Assigned at demo checkout"}</p><p>Boarding: ${escapeHtml(booking.boarding_point||"Demo point")} · Drop: ${escapeHtml(booking.dropping_point||"Demo point")}</p><p>Amount: ${money(booking.total_amount)}</p><p class="notice">Sample ticket only. Not valid for boarding; no real payment or transport booking was made.</p><button onclick="window.print()">Print sample ticket</button></div>`);ticket.document.close();}
$$("[data-copy-code]").forEach(button=>button.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(button.dataset.copyCode);toast(`${button.dataset.copyCode} copied.`);}catch{toast(`Use code ${button.dataset.copyCode} at demo checkout.`);}}));
$$("[data-demo-action]").forEach(button=>button.addEventListener("click",()=>{const message={hotels:"Hotel cards and prices are sample-only. No hotel inventory or reservations are connected.",safety:"Safety badges, ratings, and women-friendly information are simulated sample data, not verified provider details.",tracking:"Book a sample bus trip and open My bookings to try the approximate tracker."}[button.dataset.demoAction];openModal(`<h2 id="modalTitle">${button.textContent.trim()}</h2><p class="modal-sub">${escapeHtml(message)}</p><p class="demo-disclaimer">College project demonstration. External travel providers are not connected.</p><button class="primary-btn" id="demoNoticeClose">Got it</button>`);$("#demoNoticeClose").addEventListener("click",closeModal);}));
refreshAuthButton();loadLocations();
