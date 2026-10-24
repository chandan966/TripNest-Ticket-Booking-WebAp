const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { token: localStorage.getItem("tripnest_token") || "", user: JSON.parse(localStorage.getItem("tripnest_user") || "null"), type: "all", filter: "all", trips: [], selectedTrip: null };
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
  const sort=$("#sortSelect").value;
  if(sort==="price")trips.sort((a,b)=>a.price-b.price); else if(sort==="departure")trips.sort((a,b)=>a.departure_time.localeCompare(b.departure_time));
  if(!trips.length){$("#resultsList").innerHTML='<div class="empty-state"><b>No trips found just yet.</b>Try another date, route, or travel type.</div>';return;}
  $("#resultsList").innerHTML=trips.map(t=>`<article class="trip-card">
    <div class="trip-operator"><span class="operator-icon">${icons[t.type]}</span><span><b>${escapeHtml(t.operator)}</b><small>${escapeHtml(t.type)} · ${escapeHtml(t.amenities||"Standard")}</small></span></div>
    <div class="trip-timing"><span class="time-block"><b>${escapeHtml(t.departure_time)}</b><small>${escapeHtml(t.origin)}</small></span><span class="journey-line">${escapeHtml(t.duration)}</span><span class="time-block"><b>${escapeHtml(t.arrival_time)}</b><small>${escapeHtml(t.destination)}</small></span></div>
    <div class="trip-price"><small>Per traveller · ${t.seats_available} seats left</small><strong>${money(t.price)}</strong><button class="book-btn" data-book="${t.id}" ${t.seats_available<Number($("#travellers").value)?"disabled":""}>${t.seats_available<Number($("#travellers").value)?"Sold out":"Book journey →"}</button></div>
    <div class="trip-meta"><span>✦ ${escapeHtml(t.amenities||"Standard service")}</span><span>✓ Secure booking</span><span>♙ ${t.seats_available} seats available</span></div>
  </article>`).join("");
  $$("[data-book]").forEach(btn=>btn.addEventListener("click",()=>startBooking(Number(btn.dataset.book))));
}
$("#sortSelect").addEventListener("change",renderTrips);
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
    openModal(`<h2 id="modalTitle">My bookings</h2><p class="modal-sub">Your upcoming plans and booking history.</p>${bookings.length?'<div class="booking-list">'+bookings.map(b=>`<article class="booking-item"><div class="booking-item-top"><div><b>${escapeHtml(b.origin)} → ${escapeHtml(b.destination)}</b><br><small>${escapeHtml(b.travel_date)} · ${escapeHtml(b.departure_time)} · ${escapeHtml(b.operator)}</small></div><span class="status ${b.status==="cancelled"?"cancelled":""}">${escapeHtml(b.status)}</span></div><p><small>Booking ID: ${escapeHtml(b.booking_code)} · ${b.seats} seat(s) · ${money(b.total_amount)}</small></p>${b.status==="confirmed"&&b.travel_date>localDate?`<button class="cancel-btn" data-cancel="${escapeHtml(b.booking_code)}">Cancel booking</button>`:""}</article>`).join("")+'</div>':'<div class="empty-state"><b>No bookings yet.</b>Your next adventure could start with a search.</div>'}`);
    $$("[data-cancel]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Cancel this booking?"))return;try{await api(`/api/bookings/${btn.dataset.cancel}/cancel`,{method:"POST",body:"{}"});toast("Booking cancelled.");showBookings();}catch(err){toast(err.message,true);}}));
  } catch(err){toast(err.message,true);if(err.message.includes("Session")){state.token="";state.user=null;refreshAuthButton();}}
}
function startBooking(tripId) {
  const trip=state.trips.find(t=>t.id===tripId);if(!trip)return;
  if(!state.user)return authModal("login",()=>startBooking(tripId));
  state.selectedTrip=trip;const count=Number($("#travellers").value);
  const passengerFields=Array.from({length:count},(_,i)=>`<div class="passenger-row"><label>Passenger ${i+1} name<input name="passengerName${i}" required maxlength="80" placeholder="Full name"></label><label>Age<input name="passengerAge${i}" type="number" min="1" max="120" required placeholder="Age"></label></div>`).join("");
  openModal(`<h2 id="modalTitle">Complete your booking</h2><p class="modal-sub">A few details, then your journey is booked.</p><div class="booking-summary"><b>${escapeHtml(trip.origin)} → ${escapeHtml(trip.destination)}</b><p>${escapeHtml(trip.travel_date)} · ${escapeHtml(trip.departure_time)} – ${escapeHtml(trip.arrival_time)}<br>${escapeHtml(trip.operator)} · ${count} traveller(s)<br><strong>Total: ${money(trip.price*count)}</strong></p></div><form class="form-stack" id="passengerForm">${passengerFields}<button class="primary-btn" type="submit">Confirm booking · ${money(trip.price*count)}</button></form><p class="modal-sub" style="margin:12px 0 0">Demo project: no real payment is collected.</p>`);
  $("#passengerForm").addEventListener("submit",async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);const passengers=Array.from({length:count},(_,i)=>({name:f.get(`passengerName${i}`),age:Number(f.get(`passengerAge${i}`))}));
    const btn=e.currentTarget.querySelector("button");btn.disabled=true;btn.textContent="Confirming…";
    try{const result=await api("/api/bookings",{method:"POST",body:JSON.stringify({tripId,seats:count,passengers})});const b=result.booking;openModal(`<div style="text-align:center;padding:10px 0"><div style="width:65px;height:65px;border-radius:50%;background:#e6f6eb;color:#36845c;display:grid;place-items:center;font-size:30px;margin:0 auto 18px">✓</div><div class="eyebrow" style="justify-content:center">YOU'RE ALL SET</div><h2 style="margin:12px 0">It's a trip!</h2><p class="modal-sub">Your demo booking has been confirmed.</p><div class="booking-summary" style="text-align:left"><b>${escapeHtml(b.origin)} → ${escapeHtml(b.destination)}</b><p>${escapeHtml(b.travel_date)} · ${escapeHtml(b.departure_time)}<br>Booking ID: <strong>${escapeHtml(b.booking_code)}</strong><br>Total paid: <strong>${money(b.total_amount)}</strong></p></div><button class="primary-btn" id="doneBooking">Lovely, thanks!</button><button class="link-btn" id="seeBookings" style="width:100%;margin-top:12px">View my bookings</button></div>`);$("#doneBooking").addEventListener("click",closeModal);$("#seeBookings").addEventListener("click",showBookings);toast("Booking confirmed!");}
    catch(err){toast(err.message,true);btn.disabled=false;btn.textContent=`Confirm booking · ${money(trip.price*count)}`;}
  });
}
refreshAuthButton();loadLocations();
