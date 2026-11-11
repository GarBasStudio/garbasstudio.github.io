/* GarBas Studio · Motor de reservas para webs demo.
   Cada página define window.DEMO = { name, services:[{id,cat,name,dur,price,desc}], hours:{1:[["09:30","14:00"],...],...}, slot:30, days:21 }
   y un contenedor <div id="booking"></div>. Opcional: <div id="agenda"></div> para la vista del negocio. */
(function () {
  const D = window.DEMO;
  if (!D) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const DAYS_L = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const MONTHS_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const KEY = "garbas-demo-" + D.slug;
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const toHHMM = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const price = p => typeof p === "number" ? p.toLocaleString("es-ES") + " €" : p;
  const dur = m => m >= 60 ? (Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "")) : m + " min";

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} }

  // Huecos "ocupados" de ejemplo, siempre iguales para el mismo día
  function seeded(dateStr, t) { let h = 0; const s = dateStr + t + D.slug; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 100; }

  const st = { step: 1, service: null, date: null, time: null };
  const root = $("#booking");

  function days() {
    const out = [], now = new Date(); now.setHours(0, 0, 0, 0);
    for (let i = 0; out.length < (D.days || 21) && i < 60; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i);
      out.push({ d, open: !!(D.hours[d.getDay()] && D.hours[d.getDay()].length) });
    }
    return out;
  }
  function slots(date, service) {
    const ranges = D.hours[date.getDay()] || [], res = [], step = D.slot || 30, mine = load();
    const now = new Date(), isToday = ymd(date) === ymd(now), nowMin = now.getHours() * 60 + now.getMinutes() + 60;
    ranges.forEach(([a, b]) => {
      for (let m = toMin(a); m + service.dur <= toMin(b); m += step) {
        const t = toHHMM(m), key = ymd(date);
        let taken = seeded(key, t) < 38 || (D.agendaExamples || []).some(x => x.time === t);
        if (mine.some(x => x.date === key && x.time === t)) taken = true;
        if (isToday && m < nowMin) taken = true;
        res.push({ t, taken });
      }
    });
    return res;
  }

  function stepper() {
    const labels = ["Servicio", "Día y hora", "Tus datos"];
    return `<ol class="bk-steps">${labels.map((l, i) => `<li class="${st.step > i + 1 ? "done" : st.step === i + 1 ? "on" : ""}"><span>${i + 1}</span>${l}</li>`).join("")}</ol>`;
  }

  function render() {
    if (st.step === 4) return renderDone();
    let body = "";
    if (st.step === 1) {
      const cats = [...new Set(D.services.map(s => s.cat))];
      body = cats.map(c => `<div class="bk-cat"><h4>${esc(c)}</h4><div class="bk-services">${D.services.filter(s => s.cat === c).map(s => `
        <button type="button" class="bk-svc${st.service && st.service.id === s.id ? " sel" : ""}" data-svc="${s.id}">
          <span class="bk-svc-main"><b>${esc(s.name)}</b>${s.desc ? `<small>${esc(s.desc)}</small>` : ""}</span>
          <span class="bk-svc-meta"><b>${esc(price(s.price))}</b><small>${dur(s.dur)}</small></span>
        </button>`).join("")}</div></div>`).join("");
    }
    if (st.step === 2) {
      const ds = days();
      if (!st.date) st.date = ds.find(x => x.open).d;
      const sl = slots(st.date, st.service);
      const morning = sl.filter(x => toMin(x.t) < 14 * 60), afternoon = sl.filter(x => toMin(x.t) >= 14 * 60);
      const group = (title, arr) => arr.length ? `<div class="bk-slot-group"><h5>${title}</h5><div class="bk-slots">${arr.map(x => `<button type="button" class="bk-slot${st.time === x.t ? " sel" : ""}" data-time="${x.t}" ${x.taken ? "disabled" : ""}>${x.t}</button>`).join("")}</div></div>` : "";
      body = `<div class="bk-chosen"><span>${esc(st.service.name)} · ${dur(st.service.dur)} · ${esc(price(st.service.price))}</span><button type="button" class="bk-link" data-go="1">Cambiar</button></div>
        <div class="bk-month">${MONTHS_L[st.date.getMonth()]} ${st.date.getFullYear()}</div>
        <div class="bk-days" role="listbox" aria-label="Elige día">${ds.map(x => `<button type="button" class="bk-day${ymd(x.d) === ymd(st.date) ? " sel" : ""}" data-date="${ymd(x.d)}" ${x.open ? "" : "disabled"}><small>${DAYS[x.d.getDay()]}</small><b>${x.d.getDate()}</b><small>${MONTHS[x.d.getMonth()]}</small></button>`).join("")}</div>
        ${sl.some(x => !x.taken) ? group("Mañana", morning) + group("Tarde", afternoon) : `<p class="bk-empty">No quedan huecos este día. Prueba con otro.</p>`}
        <div class="bk-nav"><button type="button" class="bk-btn ghost" data-go="1">Atrás</button><button type="button" class="bk-btn" data-go="3" ${st.time ? "" : "disabled"}>Continuar</button></div>`;
    }
    if (st.step === 3) {
      body = `<div class="bk-summary">${summary()}</div>
        <form class="bk-form" id="bk-form" novalidate>
          <label>Nombre y apellidos<input id="bk-name" required autocomplete="name"></label>
          <label>Teléfono móvil<input id="bk-phone" type="tel" required autocomplete="tel" inputmode="tel"></label>
          <label>Comentarios <i>(opcional)</i><textarea id="bk-notes" rows="2"></textarea></label>
          <label class="bk-check"><input type="checkbox" id="bk-ok" required> Acepto que se usen mis datos para gestionar la cita.</label>
          <p class="bk-error" id="bk-err" hidden></p>
          <div class="bk-nav"><button type="button" class="bk-btn ghost" data-go="2">Atrás</button><button type="submit" class="bk-btn">Confirmar cita</button></div>
        </form>`;
    }
    root.innerHTML = stepper() + `<div class="bk-body">${body}</div>`;
  }

  function summary() {
    const d = st.date;
    return `<div><small>Servicio</small><b>${esc(st.service.name)}</b></div>
      <div><small>Día</small><b>${DAYS_L[d.getDay()]} ${d.getDate()} de ${MONTHS_L[d.getMonth()]}</b></div>
      <div><small>Hora</small><b>${st.time} · ${dur(st.service.dur)}</b></div>
      <div><small>Precio</small><b>${esc(price(st.service.price))}</b></div>`;
  }

  function renderDone() {
    root.innerHTML = `<div class="bk-done">
      <div class="bk-tick" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
      <h3>¡Cita reservada!</h3>
      <p>Te esperamos el <b>${DAYS_L[st.date.getDay()]} ${st.date.getDate()} de ${MONTHS_L[st.date.getMonth()]} a las ${st.time}</b>.</p>
      <div class="bk-summary">${summary()}</div>
      <div class="bk-nav center"><button type="button" class="bk-btn" id="bk-ics">Añadir a mi calendario</button><button type="button" class="bk-btn ghost" data-reset>Reservar otra cita</button></div>
      ${document.getElementById("agenda") ? `<a class="bk-link" href="#agenda">Mira cómo le llega al ${esc(D.who || "negocio")} ↓</a>` : ""}
      <p class="bk-demo-note">Esto es una demostración: no se ha enviado ninguna reserva. En la web real, ${esc(D.name)} recibiría la cita al momento por WhatsApp o email y el cliente un recordatorio el día antes.</p>
    </div>`;
    $("#bk-ics").addEventListener("click", ics);
  }

  function ics() {
    const [h, m] = st.time.split(":").map(Number);
    const s = new Date(st.date); s.setHours(h, m, 0, 0);
    const e = new Date(s.getTime() + st.service.dur * 60000);
    const f = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "T" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + "00";
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GarBas Studio//Demo//ES", "BEGIN:VEVENT", "UID:" + Date.now() + "@garbas", "DTSTART:" + f(s), "DTEND:" + f(e), "SUMMARY:" + st.service.name + " · " + D.name, "LOCATION:" + (D.address || ""), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" })); a.download = "cita.ics"; a.click();
  }

  root.addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.svc) { st.service = D.services.find(s => s.id === t.dataset.svc); st.time = null; st.step = 2; render(); scrollTop(); return; }
    if (t.dataset.date) { st.date = new Date(t.dataset.date + "T00:00:00"); st.time = null; render(); return; }
    if (t.dataset.time) { st.time = t.dataset.time; render(); return; }
    if (t.dataset.go) { st.step = +t.dataset.go; render(); scrollTop(); return; }
    if (t.hasAttribute("data-reset")) { Object.assign(st, { step: 1, service: null, date: null, time: null }); render(); scrollTop(); }
  });
  root.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#bk-name").value.trim(), phone = $("#bk-phone").value.trim(), ok = $("#bk-ok").checked, err = $("#bk-err");
    if (!name || phone.replace(/\D/g, "").length < 9 || !ok) { err.hidden = false; err.textContent = !name ? "Escribe tu nombre." : phone.replace(/\D/g, "").length < 9 ? "Escribe un teléfono válido (9 cifras)." : "Marca la casilla para continuar."; return; }
    const list = load(); list.push({ date: ymd(st.date), time: st.time, svc: st.service.name, dur: st.service.dur, name, created: Date.now() }); save(list);
    st.step = 4; render(); renderAgenda();
  });
  function scrollTop() { const r = root.getBoundingClientRect(); if (r.top < 0) root.scrollIntoView({ behavior: "smooth", block: "start" }); }

  /* ---------- Vista del negocio ---------- */
  function renderAgenda() {
    const el = document.getElementById("agenda"); if (!el) return;
    const mine = load().filter(x => x.date >= ymd(new Date())).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const today = new Date(); const day = mine.length ? new Date(mine[0].date + "T00:00:00") : (() => { const d = new Date(today); while (!(D.hours[d.getDay()] || []).length) d.setDate(d.getDate() + 1); return d; })();
    const key = ymd(day);
    const examples = (D.agendaExamples || []).map(x => ({ ...x, ex: true }));
    const rows = [...examples, ...mine.filter(x => x.date === key).map(x => ({ time: x.time, svc: x.svc, name: x.name, dur: x.dur, isNew: true }))].sort((a, b) => a.time.localeCompare(b.time));
    el.innerHTML = `<div class="ag-head"><div><small>Agenda de ${esc(D.name)}</small><b>${cap(DAYS_L[day.getDay()])} ${day.getDate()} de ${MONTHS_L[day.getMonth()]}</b></div><span class="ag-count">${rows.length} citas</span></div>
      <ul class="ag-list">${rows.map(r => `<li class="${r.isNew ? "new" : ""}"><time>${r.time}</time><div><b>${esc(r.svc)}</b><small>${esc(r.name)} · ${dur(r.dur)}</small></div>${r.isNew ? `<span class="ag-badge">Nueva</span>` : r.ex ? `<span class="ag-ex">ejemplo</span>` : ""}</li>`).join("")}</ul>
      <p class="ag-foot">${mine.length ? "Tu reserva de prueba aparece aquí al momento, igual que le llegaría al negocio." : "Haz una reserva de prueba arriba y aparecerá aquí al momento."}</p>`;
  }

  window.GarBasBooking = { pick(id) { const s = D.services.find(x => x.id === id); if (!s) return; st.service = s; st.time = null; st.date = null; st.step = 2; render(); root.scrollIntoView({ behavior: "smooth", block: "start" }); } };
  render(); renderAgenda();
})();
