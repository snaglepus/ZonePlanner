// User-facing text (en-AU). Functions return plain text; callers escape for innerHTML.

export const BAND_LABEL = { 2: "Best", 1: "Good", 0: "Unsuitable" };

export const listJoin = (arr) => arr.length <= 1 ? arr.join("") : `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`;
/** Meeting length in minutes, e.g. "30 min", "1 h", "1½ h". */
export const durLabel = (m) => m < 60 ? `${m} min` : `${m / 60} h`.replace(".5 h", "½ h").replace(/^0½/, "½");

// Clock: every displayed time of day goes through clock()
export const AM = "am";
export const PM = "pm";
export const meridiem = (h) => (h < 12 ? AM : PM);
/** A time of day {h, m}: "15:00" / "3:00 pm", or as a cell label "15" / "3", "3:30" (no meridiem). */
export const clock = (p, hour12, { cell = false } = {}) => {
  const h = hour12 ? p.h % 12 || 12 : p.h;
  const mm = String(p.m).padStart(2, "0");
  if (cell) return p.m ? `${h}:${mm}` : String(h);
  return hour12 ? `${h}:${mm} ${meridiem(p.h)}` : `${String(h).padStart(2, "0")}:${mm}`;
};
/** A compact range: "15:00–16:00", "3:00–4:00 pm", "11:30 am–12:30 pm". */
export const clockRange = (a, b, hour12) => {
  const from = clock(a, hour12);
  const to = clock(b, hour12);
  if (hour12 && meridiem(a.h) === meridiem(b.h)) return `${from.slice(0, -` ${meridiem(a.h)}`.length)}–${to}`;
  return `${from}–${to}`;
};
export const legendBest = (hour12) => (hour12 ? "9 am–5 pm" : "9–17");
export const legendGood = (hour12) => (hour12 ? "6–9 am, 5–8 pm" : "6–9, 17–20");
export const TIME_FORMAT = "Time format";
export const CLOCK_12 = "12h";
export const CLOCK_24 = "24h";
export const CLOCK_12_LABEL = "12-hour clock";
export const CLOCK_24_LABEL = "24-hour clock";

// Rows
export const EVERYONE = "Everyone";
export const HOME_ZONE = "Home zone";
export const removeZone = (name) => `Remove ${name}`;
export const changeZone = (name) => `Change ${name}`;
export const zoneCount = (n, max) => `${n} of ${max}`;
export const ADD_CITY = "Add City";
/** A fixed-offset row's name: "UTC+05:30", "UTC−07:00", "UTC+00:00". */
export const offsetName = (min) => `UTC${min < 0 ? "−" : "+"}${String(Math.floor(Math.abs(min) / 60)).padStart(2, "0")}:${String(Math.abs(min) % 60).padStart(2, "0")}`;
export const offsetResult = (min) => `${offsetName(min)} (fixed, no daylight saving)`;
export const rowsLabel = (homeName) => `Hours for each zone. Day runs on ${homeName} time.`;
/** A zone's date against home: "" (same day), "Tomorrow", "Yesterday", "+2 days", "−2 days". */
export const dayDiffLabel = (n) => n === 0 ? "" : n === 1 ? "Tomorrow" : n === -1 ? "Yesterday" : `${n < 0 ? "−" : "+"}${Math.abs(n)} days`;

// Overlap summary
export const overlapBiz = (range) => `Best ${range}`;
export const overlapEdge = (range) => `Good ${range}`;
export const NO_SHARED = "No shared hours";

// Hour filter
export const filterEmpty = (band) => `No hours are ${band} for everyone on this day`;

// Suggestion chips
export const NO_WINDOWS = "No windows this day.";
export const inconvenientCount = (n) => `Unsuitable for ${n} zones`;
export const inconvenientOne = (who) => `Unsuitable: ${who}`;
export const bizEdgeCount = (biz, edge) => `${biz} Best, ${edge} Good`;
export const ALL_BUSINESS = "All in Best hours";

// Selection
export const meetingSub = (homeName, date, dur) => `${homeName} time · ${date} · ${dur}`;
export const verdictAll = (n) => n === 1 ? "In Best hours." : `All ${n} zones are in Best hours.`;
export const verdictEdge = (biz, n, names) => `${biz} of ${n} in Best hours. Outside them for ${listJoin(names)}.`;
export const verdictBad = (items) => `Unsuitable for ${listJoin(items)}.`;
export const scrubText = (from, to, homeName, verdict) => `${from} to ${to} ${homeName} time. ${verdict}`;

// Header and actions
export const today = (date) => `Today, ${date}`;
export const DONE = "Done";
export const EDIT = "Edit";
export const NOW = "Now";
export const COPY_PROMPT = "Copy this text:";

// Toasts
export const removed = (name) => `Removed ${name}`;
export const nowIn = (name) => `You're now in ${name} time`;
export const linkDropped = (n) => `Left out ${n} ${n === 1 ? "zone" : "zones"} from the link. Maximum of 7 time zones.`;
export const TIMES_COPIED = "Meeting times copied";
export const LINK_COPIED = "Link to this plan copied";
export const added = (name) => `Added ${name}`;
export const changed = (from, to) => `Changed ${from} to ${to}`;
export const STATE_RESET = "Your saved zones couldn't be read, so the defaults are back.";

// Zone sheet
export const ADD_TITLE = "Add City";
export const changeTitle = (name) => `Change ${name}`;
export const changeNote = (name) => `Pick a zone to replace ${name}. It keeps its place in the list.`;
export const ZONES_FULL = "Maximum of 7 time zones. Remove one to add another.";
export const zonesAdded = (n, max) => `${n} of ${max} zones added`;
export const noMatch = (query) => `Nothing matches “${query}”. Try a nearby major city.`;
