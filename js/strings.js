// User-facing text (en-AU). Functions return plain text; callers escape for innerHTML.

export const BAND_LABEL = { 2: "Business", 1: "Edge", 0: "Inconvenient" };

export const listJoin = (arr) => arr.length <= 1 ? arr.join("") : `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`;
/** Meeting length in minutes, e.g. "30 min", "1 h", "1½ h". */
export const durLabel = (m) => m < 60 ? `${m} min` : `${m / 60} h`.replace(".5 h", "½ h").replace(/^0½/, "½");

// Rows
export const EVERYONE = "Everyone";
export const HOME_ZONE = "Home zone";
export const removeZone = (name) => `Remove ${name}`;
export const zoneCount = (n, max) => `${n} of ${max}`;
export const ADD_ZONE = "Add zone";
export const rowsLabel = (homeName) => `Hours for each zone. Day runs on ${homeName} time.`;

// Overlap summary
export const overlapBiz = (range) => `Business ${range}`;
export const overlapEdge = (range) => `Edge ${range}`;
export const NO_SHARED = "No shared hours";

// Suggestion chips
export const NO_WINDOWS = "No windows this day.";
export const inconvenientCount = (n) => `Inconvenient for ${n} zones`;
export const inconvenientOne = (who) => `Inconvenient: ${who}`;
export const bizEdgeCount = (biz, edge) => `${biz} business, ${edge} edge`;
export const ALL_BUSINESS = "All in business hours";

// Selection
export const meetingSub = (homeName, date, dur) => `${homeName} time · ${date} · ${dur}`;
export const verdictAll = (n) => `All ${n} zones are in business hours.`;
export const verdictEdge = (biz, n, names) => `${biz} of ${n} in business hours. Outside them for ${listJoin(names)}.`;
export const verdictBad = (items) => `Inconvenient for ${listJoin(items)}.`;
export const scrubText = (from, to, homeName, verdict) => `${from} to ${to} ${homeName} time. ${verdict}`;

// Header and actions
export const today = (date) => `Today, ${date}`;
export const DONE = "Done";
export const EDIT = "Edit";
export const COPY_PROMPT = "Copy this text:";

// Toasts
export const removed = (name) => `Removed ${name}`;
export const nowIn = (name) => `You're now in ${name} time`;
export const linkDropped = (n) => `Left out ${n} ${n === 1 ? "zone" : "zones"} from the link. Maximum of 7 time zones.`;
export const TIMES_COPIED = "Meeting times copied";
export const LINK_COPIED = "Link to this plan copied";
export const added = (name) => `Added ${name}`;

// Zone sheet
export const ZONES_FULL = "Maximum of 7 time zones. Remove one to add another.";
export const zonesAdded = (n, max) => `${n} of ${max} zones added`;
export const noMatch = (query) => `Nothing matches “${query}”. Try a nearby major city.`;
