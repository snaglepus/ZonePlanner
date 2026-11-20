// Row reorder for the zone list. No DOM.

/**
 * A new list with `list[from]` moved to index `to`, clamped to [fixed, last] so nothing lands in or above
 * the fixed rows. A `to` of null (cancelled) or a `from` outside the movable rows returns an unchanged copy.
 */
export const moveRow = (list, from, to, fixed = 1) => {
  const out = list.slice();
  const last = list.length - 1;
  if (to === null || !Number.isInteger(from) || from < fixed || from > last) return out;
  const at = Math.max(fixed, Math.min(last, to));
  out.splice(at, 0, ...out.splice(from, 1));
  return out;
};
