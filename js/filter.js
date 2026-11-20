// The All / Good / Best hour filter over the overlap row. No DOM.

/** The lowest overlap band each filter keeps: 0 Unsuitable, 1 Good, 2 Best. */
const MIN_BAND = { all: 0, good: 1, best: 2 };

/** One boolean per slot: true when the slot's overlap band passes `filter`. */
export const keptSlots = (all, filter) => all.map((band) => band >= MIN_BAND[filter]);

/** True when every slot in [s, s + len) is kept. */
export const windowKept = (kept, s, len) => {
  for (let i = s; i < s + len; i++) if (!kept[i]) return false;
  return true;
};
