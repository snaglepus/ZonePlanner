(() => {
  "use strict";

  const MIN_ZONES = 3;
  const MAX_ZONES = 8;
  const SLOT_MIN = 15;
  const SLOT_MS = SLOT_MIN * 60000;
  const STORE_KEY = "zoneplanner:v1";

  // Business 09–17, edge 06–09 & 17–20, everything else inconvenient.
  const BAND = { biz: 2, edge: 1, night: 0 };
  const BAND_NAME = { 2: "biz", 1: "edge", 0: "night" };
  const BAND_LABEL = { 2: "Business", 1: "Edge", 0: "Inconvenient" };
  const classify = (minuteOfDay) => {
    if (minuteOfDay >= 540 && minuteOfDay < 1020) return BAND.biz;
    if ((minuteOfDay >= 360 && minuteOfDay < 540) || (minuteOfDay >= 1020 && minuteOfDay < 1200)) return BAND.edge;
    return BAND.night;
  };

  const CITIES = [
    ["Honolulu", "United States", "Pacific/Honolulu"], ["Anchorage", "United States", "America/Anchorage"],
    ["Los Angeles", "United States", "America/Los_Angeles"], ["San Francisco", "United States", "America/Los_Angeles"],
    ["Seattle", "United States", "America/Los_Angeles"], ["Vancouver", "Canada", "America/Vancouver"],
    ["Denver", "United States", "America/Denver"], ["Phoenix", "United States", "America/Phoenix"],
    ["Chicago", "United States", "America/Chicago"], ["Mexico City", "Mexico", "America/Mexico_City"],
    ["Austin", "United States", "America/Chicago"], ["New York", "United States", "America/New_York"],
    ["Toronto", "Canada", "America/Toronto"], ["Boston", "United States", "America/New_York"],
    ["Bogotá", "Colombia", "America/Bogota"], ["Lima", "Peru", "America/Lima"],
    ["Santiago", "Chile", "America/Santiago"], ["Halifax", "Canada", "America/Halifax"],
    ["São Paulo", "Brazil", "America/Sao_Paulo"], ["Buenos Aires", "Argentina", "America/Argentina/Buenos_Aires"],
    ["St. John's", "Canada", "America/St_Johns"], ["Reykjavík", "Iceland", "Atlantic/Reykjavik"],
    ["London", "United Kingdom", "Europe/London"], ["Dublin", "Ireland", "Europe/Dublin"],
    ["Lisbon", "Portugal", "Europe/Lisbon"], ["Paris", "France", "Europe/Paris"],
    ["Berlin", "Germany", "Europe/Berlin"], ["Amsterdam", "Netherlands", "Europe/Amsterdam"],
    ["Madrid", "Spain", "Europe/Madrid"], ["Rome", "Italy", "Europe/Rome"],
    ["Stockholm", "Sweden", "Europe/Stockholm"], ["Zürich", "Switzerland", "Europe/Zurich"],
    ["Warsaw", "Poland", "Europe/Warsaw"], ["Athens", "Greece", "Europe/Athens"],
    ["Helsinki", "Finland", "Europe/Helsinki"], ["Kyiv", "Ukraine", "Europe/Kyiv"],
    ["Istanbul", "Türkiye", "Europe/Istanbul"], ["Cairo", "Egypt", "Africa/Cairo"],
    ["Lagos", "Nigeria", "Africa/Lagos"], ["Johannesburg", "South Africa", "Africa/Johannesburg"],
    ["Nairobi", "Kenya", "Africa/Nairobi"], ["Moscow", "Russia", "Europe/Moscow"],
    ["Riyadh", "Saudi Arabia", "Asia/Riyadh"], ["Tehran", "Iran", "Asia/Tehran"],
    ["Dubai", "United Arab Emirates", "Asia/Dubai"], ["Karachi", "Pakistan", "Asia/Karachi"],
    ["Mumbai", "India", "Asia/Kolkata"], ["Bengaluru", "India", "Asia/Kolkata"],
    ["Delhi", "India", "Asia/Kolkata"], ["Kathmandu", "Nepal", "Asia/Kathmandu"],
    ["Dhaka", "Bangladesh", "Asia/Dhaka"], ["Bangkok", "Thailand", "Asia/Bangkok"],
    ["Jakarta", "Indonesia", "Asia/Jakarta"], ["Ho Chi Minh City", "Vietnam", "Asia/Ho_Chi_Minh"],
    ["Singapore", "Singapore", "Asia/Singapore"], ["Kuala Lumpur", "Malaysia", "Asia/Kuala_Lumpur"],
    ["Hong Kong", "China", "Asia/Hong_Kong"], ["Shanghai", "China", "Asia/Shanghai"],
    ["Taipei", "Taiwan", "Asia/Taipei"], ["Manila", "Philippines", "Asia/Manila"],
    ["Perth", "Australia", "Australia/Perth"], ["Seoul", "South Korea", "Asia/Seoul"],
    ["Tokyo", "Japan", "Asia/Tokyo"], ["Adelaide", "Australia", "Australia/Adelaide"],
    ["Brisbane", "Australia", "Australia/Brisbane"], ["Sydney", "Australia", "Australia/Sydney"],
    ["Melbourne", "Australia", "Australia/Melbourne"], ["Auckland", "New Zealand", "Pacific/Auckland"]
  ].map(([city, country, tz]) => ({ city, country, tz }));

  // ---------- Time engine ----------
  const fmtCache = new Map();
  const partsFmt = (tz) => {
    if (!fmtCache.has(tz)) {
      fmtCache.set(tz, new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      }));
    }
    return fmtCache.get(tz);
  };
  /** Minutes the zone is ahead of UTC at instant t. */
  const offsetMin = (tz, t) => {
    const p = {};
    for (const { type, value } of partsFmt(tz).formatToParts(new Date(t))) p[type] = value;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUTC - Math.floor(t / 1000) * 1000) / 60000);
  };
  /** UTC instant of local midnight on y-m-d in tz. */
  const zonedMidnight = (tz, y, m, d) => {
    const wall = Date.UTC(y, m - 1, d);
    let t = wall - offsetMin(tz, wall) * 60000;
    t = wall - offsetMin(tz, t) * 60000;
    return t;
  };
  const localParts = (tz, t) => {
    const off = offsetMin(tz, t);
    const l = new Date(t + off * 60000);
    return { h: l.getUTCHours(), m: l.getUTCMinutes(), mod: l.getUTCHours() * 60 + l.getUTCMinutes(), dayKey: l.getUTCFullYear() * 10000 + (l.getUTCMonth() + 1) * 100 + l.getUTCDate(), date: l, off };
  };
  const pad = (n) => String(n).padStart(2, "0");
  const hhmm = (p) => `${pad(p.h)}:${pad(p.m)}`;
  const offLabel = (off) => {
    const s = off < 0 ? "−" : "+";
    const a = Math.abs(off);
    return `UTC${s}${Math.floor(a / 60)}${a % 60 ? ":" + pad(a % 60) : ""}`;
  };
  const weekday = (d) => d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const durLabel = (slots) => {
    const m = slots * SLOT_MIN;
    return m < 60 ? `${m} min` : `${m / 60} h`.replace(".5 h", "½ h").replace(/^0½/, "½");
  };

  const validTz = (tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };
  const cityFor = (tz) => CITIES.find((c) => c.tz === tz);
  const prettyTz = (tz) => tz.split("/").pop().replace(/_/g, " ");

  // ---------- State ----------
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  const todayISO = () => {
    const p = localParts(localTz, Date.now());
    return `${p.date.getUTCFullYear()}-${pad(p.date.getUTCMonth() + 1)}-${pad(p.date.getUTCDate())}`;
  };

  const state = { zones: [], date: todayISO(), len: 4, start: null, editing: false };

  const mkZone = (tz, name) => {
    const c = (name && CITIES.find((x) => x.tz === tz && x.city === name)) || (!name && cityFor(tz));
    return { tz, name: name || (c ? c.city : prettyTz(tz)), country: c ? c.country : "" };
  };

  const load = () => {
    const hash = new URLSearchParams(location.hash.slice(1));
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch { /* storage unavailable */ }
    let zones = [];
    if (hash.get("z")) {
      zones = hash.get("z").split(",").map((s) => { const [tz, name] = s.split("~"); return mkZone(decodeURIComponent(tz), name ? decodeURIComponent(name).slice(0, 60) : undefined); });
      if (/^\d{4}-\d{2}-\d{2}$/.test(hash.get("d") || "")) state.date = hash.get("d");
      if (["2", "4", "6", "8"].includes(hash.get("l"))) state.len = +hash.get("l");
    } else if (saved && Array.isArray(saved.zones)) {
      zones = saved.zones.map((z) => mkZone(z.tz, z.name));
      if ([2, 4, 6, 8].includes(saved.len)) state.len = saved.len;
    }
    zones = zones.filter((z) => validTz(z.tz));
    if (zones.length < MIN_ZONES) {
      zones = [mkZone(localTz)];
      for (const tz of ["America/New_York", "Europe/London", "Asia/Singapore", "Australia/Sydney"]) {
        if (zones.length >= 4) break;
        if (!zones.some((z) => z.tz === tz)) zones.push(mkZone(tz));
      }
    }
    state.zones = zones.slice(0, MAX_ZONES);
  };
  const save = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ zones: state.zones.map(({ tz, name }) => ({ tz, name })), len: state.len })); } catch { /* ignore */ }
  };
  const shareURL = () => {
    const z = state.zones.map((x) => `${encodeURIComponent(x.tz)}~${encodeURIComponent(x.name)}`).join(",");
    return `${location.origin}${location.pathname}#z=${z}&d=${state.date}&l=${state.len}`;
  };

  // ---------- Model ----------
  let model = null;
  const buildModel = () => {
    const [y, m, d] = state.date.split("-").map(Number);
    const home = state.zones[0];
    const t0 = zonedMidnight(home.tz, y, m, d);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const t1 = zonedMidnight(home.tz, next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
    const n = Math.round((t1 - t0) / SLOT_MS);
    const grid = state.zones.map((z) => {
      const bands = new Array(n);
      const parts = new Array(n);
      for (let i = 0; i < n; i++) {
        const p = localParts(z.tz, t0 + i * SLOT_MS);
        parts[i] = p;
        bands[i] = classify(p.mod);
      }
      return { bands, parts };
    });
    const all = Array.from({ length: n }, (_, i) => Math.min(...grid.map((g) => g.bands[i])));
    model = { t0, n, grid, all };
  };

  /** Lower cost is better. Each zone costs its worst slot in the window. */
  const PENALTY = { 2: 0, 1: 2, 0: 9 };
  const windowStats = (s) => {
    const L = state.len;
    const worst = model.grid.map((g) => { let w = 2; for (let i = s; i < s + L; i++) w = Math.min(w, g.bands[i]); return w; });
    const soft = model.grid.reduce((acc, g) => { for (let i = s; i < s + L; i++) acc += PENALTY[g.bands[i]]; return acc; }, 0);
    const cost = worst.reduce((a, w) => a + PENALTY[w], 0);
    return { s, worst, cost, soft, biz: worst.filter((w) => w === 2).length, edge: worst.filter((w) => w === 1).length, night: worst.filter((w) => w === 0).length };
  };
  const suggestions = () => {
    const out = [];
    const L = state.len;
    const mid = model.n / 2 + 4; // nudge toward home afternoon
    for (let s = 0; s + L <= model.n; s += 2) out.push(windowStats(s));
    out.sort((a, b) => a.cost - b.cost || a.soft - b.soft || Math.abs(a.s - mid) - Math.abs(b.s - mid));
    const picked = [];
    for (const w of out) {
      if (picked.length >= 4) break;
      if (picked.some((p) => Math.abs(p.s - w.s) < L)) continue;
      if (picked.length && w.night > 0 && picked[0].night === 0) continue;
      picked.push(w);
    }
    return picked;
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    rows: $("rows"), axis: $("axis"), scrub: $("scrub"), selbar: $("selbar"), timeline: $("timeline"),
    meetingTime: $("meetingTime"), meetingSub: $("meetingSub"), verdict: $("verdict"), suggestions: $("suggestions"),
    lengthSeg: $("lengthSeg"), dateInput: $("dateInput"), dateLabel: $("dateLabel"), zoneCount: $("zoneCount"),
    addZone: $("addZone"), editBtn: $("editBtn"), copyBtn: $("copyBtn"), shareBtn: $("shareBtn"),
    sheet: $("zoneSheet"), search: $("zoneSearch"), results: $("results"), sheetNote: $("sheetNote"), toast: $("toast")
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  const segmentsHTML = (bands, parts) => {
    const n = bands.length;
    let html = "";
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n && bands[j] === bands[i]) j++;
      html += `<div class="seg-${BAND_NAME[bands[i]]}" style="width:${((j - i) / n) * 100}%"></div>`;
      i = j;
    }
    if (parts) {
      // local hour numbers every 3 local hours
      for (let k = 0; k < n; k++) {
        const p = parts[k];
        if (p.m === 0 && p.h % 3 === 0 && k + 4 <= n) {
          html += `<span class="tick on-${BAND_NAME[bands[k + 1]]}" style="left:${((k + 2) / n) * 100}%">${p.h}</span>`;
        }
      }
    }
    return html;
  };

  const renderAxis = () => {
    const homeParts = model.grid[0].parts;
    let html = "";
    for (let k = 0; k <= model.n; k++) {
      const p = k === model.n ? { h: 24, m: 0 } : homeParts[k];
      if (p.m === 0 && p.h % 6 === 0) html += `<span style="left:${(k / model.n) * 100}%">${pad(p.h)}</span>`;
    }
    el.axis.innerHTML = html;
  };

  const renderRows = () => {
    const homeName = state.zones[0].name;
    const ov = overlapSummary();
    let html = `<li class="row row-all" data-all="${ov.tone}"><div class="row-top"><div class="row-name"><b>Everyone</b></div><div class="row-at"><b>${ov.text}</b></div></div><div class="strip" aria-hidden="true">${segmentsHTML(model.all)}</div></li>`;
    state.zones.forEach((z, idx) => {
      const nowP = localParts(z.tz, Date.now());
      const sub = [z.country, offLabel(nowP.off)].filter(Boolean).join(" · ");
      html += `<li class="row" data-idx="${idx}">
        <div class="row-top">
          <div class="row-name"><b>${idx === 0 ? `<svg aria-label="Home zone" role="img"><use href="#i-home"/></svg>` : ""}${esc(z.name)}</b><span>${esc(sub)}</span></div>
          <div class="row-at" data-at></div>
          <div class="row-actions">
            ${idx === 0 ? "" : `<button class="icon-btn icon-btn-soft" type="button" data-act="home" data-idx="${idx}" aria-label="Make ${esc(z.name)} the home zone"><svg><use href="#i-home"/></svg></button>`}
            <button class="icon-btn icon-btn-soft" type="button" data-act="remove" data-idx="${idx}" aria-label="Remove ${esc(z.name)}" ${state.zones.length <= MIN_ZONES ? "disabled" : ""}><svg><use href="#i-x"/></svg></button>
          </div>
        </div>
        <div class="strip" aria-hidden="true">${segmentsHTML(model.grid[idx].bands, model.grid[idx].parts)}</div>
      </li>`;
    });
    el.rows.innerHTML = html;
    el.zoneCount.textContent = `${state.zones.length} of ${MAX_ZONES}`;
    el.addZone.disabled = state.zones.length >= MAX_ZONES;
    el.addZone.querySelector("span").textContent = state.zones.length >= MAX_ZONES ? "8 zones max" : "Add zone";
    el.rows.setAttribute("aria-label", `Hours for each zone. Day runs on ${homeName} time.`);
  };

  /** Longest run where every zone is at least `min`. */
  const longestRun = (min) => {
    let best = null, i = 0;
    while (i < model.n) {
      if (model.all[i] < min) { i++; continue; }
      let j = i; while (j < model.n && model.all[j] >= min) j++;
      if (!best || j - i > best[1] - best[0]) best = [i, j];
      i = j;
    }
    return best;
  };
  const runLabel = ([i, j]) => {
    const a = model.grid[0].parts[i];
    const b = localParts(state.zones[0].tz, model.t0 + j * SLOT_MS);
    return `${hhmm(a)}–${hhmm(b)}`;
  };
  const overlapSummary = () => {
    const biz = longestRun(2);
    if (biz) return { tone: "biz", text: `Business ${runLabel(biz)}` };
    const edge = longestRun(1);
    if (edge) return { tone: "edge", text: `Edge ${runLabel(edge)}` };
    return { tone: "none", text: "No shared hours" };
  };

  const renderSuggestions = (list) => {
    if (!list.length) { el.suggestions.innerHTML = `<span class="chips-empty">No windows this day.</span>`; return; }
    el.suggestions.innerHTML = list.map((w) => {
      const p = model.grid[0].parts[w.s];
      const tone = w.night ? "night" : w.edge ? "edge" : "biz";
      const bad = state.zones.map((z, i) => (w.worst[i] === 0 ? `${z.name} ${hhmm(model.grid[i].parts[w.s])}` : null)).filter(Boolean);
      const note = w.night ? (bad.length > 1 ? `Inconvenient for ${bad.length} zones` : `Inconvenient: ${bad[0]}`) : w.edge ? `${w.biz} business, ${w.edge} edge` : "All in business hours";
      return `<button type="button" class="chip" data-s="${w.s}" aria-pressed="${w.s === state.start}"><span class="mark mark-${tone}" aria-hidden="true"></span>${hhmm(p)} <small>${esc(note)}</small></button>`;
    }).join("");
  };

  const renderSelection = () => {
    const s = state.start;
    const L = state.len;
    const w = windowStats(s);
    const home = state.zones[0];
    const a = model.grid[0].parts[s];
    const endT = model.t0 + (s + L) * SLOT_MS;
    const b = localParts(home.tz, endT);
    el.meetingTime.textContent = `${hhmm(a)} – ${hhmm(b)}`;
    const dateTxt = new Date(model.t0 + 12 * 3600000).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: home.tz });
    el.meetingSub.textContent = `${home.name} time · ${dateTxt} · ${durLabel(L)}`;

    // verdict
    const n = state.zones.length;
    const names = (band) => state.zones.filter((_, i) => w.worst[i] === band);
    if (w.biz === n) {
      el.verdict.dataset.tone = "biz";
      el.verdict.textContent = `All ${n} zones are in business hours.`;
    } else if (w.night === 0) {
      el.verdict.dataset.tone = "edge";
      const e = names(1).map((z) => z.name);
      el.verdict.textContent = `${w.biz} of ${n} in business hours. Outside them for ${listJoin(e)}.`;
    } else {
      el.verdict.dataset.tone = "bad";
      const bad = names(0).map((z) => {
        const idx = state.zones.indexOf(z);
        return `${z.name} (${hhmm(model.grid[idx].parts[s])})`;
      });
      el.verdict.textContent = `Inconvenient for ${listJoin(bad)}.`;
    }

    // per-row readouts
    const homeDay = model.grid[0].parts[s].dayKey;
    el.rows.querySelectorAll(".row[data-idx]").forEach((row) => {
      const i = +row.dataset.idx;
      const g = model.grid[i];
      const p = g.parts[s];
      const q = localParts(state.zones[i].tz, endT);
      const band = w.worst[i];
      row.dataset.at = BAND_NAME[band];
      const dayBadge = p.dayKey !== homeDay ? `<span class="day">${weekday(p.date)}</span>` : "";
      row.querySelector("[data-at]").innerHTML = `<b>${dayBadge}${hhmm(p)}–${hhmm(q)}</b><span><i class="mark mark-${BAND_NAME[band]}" aria-hidden="true"></i>${BAND_LABEL[band]}</span>`;
    });

    // bar geometry
    const track = el.rows.getBoundingClientRect().width;
    el.selbar.style.width = `${(L / model.n) * track}px`;
    el.selbar.style.transform = `translateX(${(s / model.n) * track}px)`;
    el.scrub.max = String(model.n - L);
    el.scrub.value = String(s);
    el.scrub.setAttribute("aria-valuetext", `${hhmm(a)} to ${hhmm(b)} ${home.name} time. ${el.verdict.textContent}`);
    el.suggestions.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(+c.dataset.s === s)));
  };
  const listJoin = (arr) => arr.length <= 1 ? arr.join("") : `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`;

  const renderDate = () => {
    el.dateInput.value = state.date;
    const [y, m, d] = state.date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const label = dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    el.dateLabel.textContent = state.date === todayISO() ? `Today, ${label.replace(/^\w+,?\s/, "")}` : label;
  };

  const renderLength = () => {
    el.lengthSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.len === state.len)));
  };

  const render = ({ keepStart = false } = {}) => {
    buildModel();
    renderDate();
    renderLength();
    renderAxis();
    renderRows();
    const list = suggestions();
    if (!keepStart || state.start == null || state.start > model.n - state.len) state.start = list.length ? list[0].s : 0;
    renderSuggestions(list);
    renderSelection();
    el.timeline.classList.toggle("editing", state.editing);
    save();
    if (location.hash) history.replaceState(null, "", shareURL());
  };

  // ---------- Interaction ----------
  const setStart = (s) => {
    s = Math.max(0, Math.min(model.n - state.len, s));
    if (s === state.start) return;
    state.start = s;
    renderSelection();
  };

  el.scrub.addEventListener("input", () => { el.timeline.classList.add("dragging"); setStart(+el.scrub.value); });
  el.scrub.addEventListener("change", () => el.timeline.classList.remove("dragging"));

  // drag anywhere on the strips
  let dragging = false;
  const slotAt = (clientX) => {
    const r = el.rows.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    return Math.round(x * model.n - state.len / 2);
  };
  el.rows.addEventListener("pointerdown", (e) => {
    if (state.editing || e.target.closest("button")) return;
    dragging = true;
    el.timeline.classList.add("dragging");
    el.rows.setPointerCapture(e.pointerId);
    setStart(slotAt(e.clientX));
  });
  el.rows.addEventListener("pointermove", (e) => { if (dragging) setStart(slotAt(e.clientX)); });
  const endDrag = () => { dragging = false; el.timeline.classList.remove("dragging"); };
  el.rows.addEventListener("pointerup", endDrag);
  el.rows.addEventListener("pointercancel", endDrag);

  el.rows.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const i = +btn.dataset.idx;
    const z = state.zones[i];
    if (btn.dataset.act === "remove" && state.zones.length > MIN_ZONES) {
      state.zones.splice(i, 1);
      toast(`Removed ${z.name}`);
    } else if (btn.dataset.act === "home") {
      state.zones.splice(i, 1);
      state.zones.unshift(z);
      toast(`${z.name} is now home`);
    }
    render();
  });

  el.suggestions.addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (c) setStart(+c.dataset.s);
  });

  el.lengthSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-len]");
    if (!b) return;
    state.len = +b.dataset.len;
    render();
  });
  el.lengthSeg.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const opts = [2, 4, 6, 8];
    const i = opts.indexOf(state.len) + (e.key === "ArrowRight" ? 1 : -1);
    if (i < 0 || i >= opts.length) return;
    state.len = opts[i];
    render();
    el.lengthSeg.querySelector(`[data-len="${state.len}"]`).focus();
  });

  const shiftDay = (delta) => {
    const [y, m, d] = state.date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + delta));
    state.date = dt.toISOString().slice(0, 10);
    render();
  };
  $("prevDay").addEventListener("click", () => shiftDay(-1));
  $("nextDay").addEventListener("click", () => shiftDay(1));
  el.dateInput.addEventListener("change", () => { if (el.dateInput.value) { state.date = el.dateInput.value; render(); } });

  el.editBtn.addEventListener("click", () => {
    state.editing = !state.editing;
    el.editBtn.setAttribute("aria-pressed", String(state.editing));
    el.editBtn.textContent = state.editing ? "Done" : "Edit";
    el.timeline.classList.toggle("editing", state.editing);
  });

  const copyText = async (text, ok) => {
    try { await navigator.clipboard.writeText(text); toast(ok); return; } catch { /* fall through */ }
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0";
    document.body.appendChild(ta); ta.select();
    let done = false;
    try { done = document.execCommand("copy"); } catch { done = false; }
    ta.remove();
    if (done) toast(ok); else window.prompt("Copy this text:", text.replace(/\n/g, " · "));
  };
  el.copyBtn.addEventListener("click", () => {
    const s = state.start;
    const endT = model.t0 + (s + state.len) * SLOT_MS;
    const lines = state.zones.map((z, i) => {
      const p = model.grid[i].parts[s];
      const q = localParts(z.tz, endT);
      return `${z.name}: ${weekday(p.date)} ${hhmm(p)}–${hhmm(q)}`;
    });
    copyText(lines.join("\n"), "Meeting times copied");
  });
  el.shareBtn.addEventListener("click", () => {
    const url = shareURL();
    history.replaceState(null, "", url);
    copyText(url, "Link to this plan copied");
  });

  let toastTimer;
  const toast = (msg) => {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2400);
  };

  // ---------- Zone sheet ----------
  let allTz = [];
  try { allTz = Intl.supportedValuesOf("timeZone"); } catch { allTz = []; }
  const searchPool = () => {
    const seen = new Set(CITIES.map((c) => c.city + c.tz));
    const extra = allTz.filter((tz) => !CITIES.some((c) => c.tz === tz)).map((tz) => ({ city: prettyTz(tz), country: tz.split("/")[0].replace(/_/g, " "), tz }));
    return CITIES.concat(extra.filter((x) => !seen.has(x.city + x.tz)));
  };
  let pool = null;
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const renderResults = () => {
    pool = pool || searchPool();
    const q = norm(el.search.value.trim());
    const list = (q ? pool.filter((c) => norm(`${c.city} ${c.country} ${c.tz}`).includes(q)) : CITIES).slice(0, 40);
    const full = state.zones.length >= MAX_ZONES;
    el.sheetNote.textContent = full ? "You have 8 zones, the maximum. Remove one to add another." : `${state.zones.length} of ${MAX_ZONES} zones added`;
    if (!list.length) { el.results.innerHTML = `<li class="sheet-note">Nothing matches “${esc(el.search.value)}”. Try a nearby major city.</li>`; return; }
    const now = Date.now();
    el.results.innerHTML = list.map((c) => {
      const added = state.zones.some((z) => z.tz === c.tz && z.name === c.city);
      const p = localParts(c.tz, now);
      return `<li><button type="button" class="result" role="option" data-tz="${esc(c.tz)}" data-name="${esc(c.city)}" ${added || full ? "disabled" : ""} aria-selected="false">
        <span class="r-main"><b>${esc(c.city)}</b><span>${esc(c.country)} · ${offLabel(p.off)}</span></span>
        ${added ? icon("check") : `<span class="r-time">${hhmm(p)}<span>${BAND_LABEL[classify(p.mod)]}</span></span>`}
      </button></li>`;
    }).join("");
  };
  el.addZone.addEventListener("click", () => {
    el.search.value = "";
    renderResults();
    el.sheet.showModal();
    if (matchMedia("(pointer: fine)").matches) el.search.focus();
  });
  el.search.addEventListener("input", renderResults);
  el.search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); const first = el.results.querySelector(".result:not(:disabled)"); if (first) first.click(); }
  });
  el.results.addEventListener("click", (e) => {
    const b = e.target.closest(".result");
    if (!b || b.disabled) return;
    const z = mkZone(b.dataset.tz, b.dataset.name);
    const c = CITIES.find((x) => x.tz === z.tz && x.city === z.name);
    z.country = c ? c.country : "";
    state.zones.push(z);
    render({ keepStart: true });
    toast(`Added ${z.name}`);
    if (state.zones.length >= MAX_ZONES) el.sheet.close(); else renderResults();
  });
  el.sheet.addEventListener("click", (e) => { if (e.target === el.sheet) el.sheet.close(); });

  addEventListener("resize", () => renderSelection());
  addEventListener("hashchange", () => { load(); render(); });

  load();
  render();
})();
