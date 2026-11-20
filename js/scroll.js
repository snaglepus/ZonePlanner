// Wheel-to-horizontal scroll decision for the hour grid. No DOM.

/**
 * Pixels to add to the grid's scrollLeft for a wheel event, or 0 to leave the event alone:
 * horizontal-dominant gestures, nothing to scroll, or already at the end the wheel points to.
 */
export const wheelScroll = (dx, dy, left, max) => {
  if (Math.abs(dx) >= Math.abs(dy)) return 0;
  if (max < 1) return 0;
  if (dy < 0 && left < 1) return 0;
  if (dy > 0 && left > max - 1) return 0;
  return Math.max(-left, Math.min(max - left, dy));
};
