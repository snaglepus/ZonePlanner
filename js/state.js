// Stored state: shape, load, validation, migration and a debounced saver. No DOM; storage is passed in.
import { userRows } from "./zones.js";

export const STATE_KEY = "zoneplanner.state";
export const BACKUP_KEY = "zoneplanner.state.bak";
export const LEGACY_KEY = "zoneplanner:v1";
export const STATE_VERSION = 1;
export const DEFAULT_ZONES = ["America/New_York", "Europe/London", "Asia/Singapore", "Australia/Sydney"];
export const LENS = [2, 4, 6, 8];
export const FILTERS = ["all", "good", "best"];

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export const defaultState = (homeTz) => ({
  version: STATE_VERSION,
  zones: userRows(DEFAULT_ZONES.map((tz) => ({ tz })), homeTz).rows,
  hour12: null,
  filter: "all",
  len: 4
});

/** Brings stored data up to the current version, or null when the version is unknown. Version 0 is `zoneplanner:v1`. */
export const migrate = (data) => {
  switch (data.version) {
    case 0: return { version: 1, zones: data.zones, len: data.len };
    case 1: return data;
    default: return null;
  }
};

/** Parsed JSON when it is a plain object with a `zones` array, otherwise null. */
const parseStored = (text) => {
  try {
    const v = JSON.parse(text);
    return isPlainObject(v) && Array.isArray(v.zones) ? v : null;
  } catch { return null; }
};

/** A fully valid version-1 state from a migrated object; bad fields fall back to defaults, never a reset. */
const validate = (obj, homeTz) => {
  const { rows, dropped } = userRows(obj.zones, homeTz);
  const state = {
    version: STATE_VERSION,
    zones: rows,
    hour12: [true, false, null].includes(obj.hour12) ? obj.hour12 : null,
    filter: FILTERS.includes(obj.filter) ? obj.filter : "all",
    len: LENS.includes(obj.len) ? obj.len : 4
  };
  return { state, dropped };
};

/** Loads from the raw `zoneplanner.state` and `zoneplanner:v1` strings (null when absent). Status: ok, migrated, new or reset. */
export const loadState = (text, legacyText, homeTz) => {
  if (text === null) {
    const legacy = legacyText === null ? null : parseStored(legacyText);
    if (legacy) return { ...validate(migrate({ ...legacy, version: 0 }), homeTz), status: "migrated" };
    return { state: defaultState(homeTz), status: "new", dropped: 0 };
  }
  const parsed = parseStored(text);
  const migrated = parsed && migrate(parsed);
  if (!migrated) return { state: defaultState(homeTz), status: "reset", dropped: 0 };
  return { ...validate(migrated, homeTz), status: "ok" };
};

export const serializeState = ({ zones, hour12, filter, len }) => JSON.stringify({
  version: STATE_VERSION,
  zones: zones.map((z) => ("tz" in z ? { tz: z.tz, name: z.name } : { offsetMin: z.offsetMin })),
  hour12,
  filter,
  len
});

/** Writes the latest `save(text)` to `storage` after `delay` ms of quiet, or at once on `flush()`. Write errors are swallowed. */
export const createSaver = ({ storage, key, delay = 250, setTimer = setTimeout, clearTimer = clearTimeout }) => {
  let pending = null;
  let timer = null;
  const flush = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (pending === null) return;
    const text = pending;
    pending = null;
    try { storage.setItem(key, text); } catch { /* storage full or unavailable */ }
  };
  const save = (text) => {
    pending = text;
    if (timer !== null) clearTimer(timer);
    timer = setTimer(flush, delay);
  };
  return { save, flush };
};
