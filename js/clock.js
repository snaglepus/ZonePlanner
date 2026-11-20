// Shared minute clock: ticks on the wall-clock minute, pauses while hidden, no DOM.

const MINUTE = 60000;

export const createClock = ({ now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) => {
  const listeners = new Set();
  let timer = null;
  let paused = false;
  const fire = () => {
    const t = now();
    for (const fn of [...listeners]) fn(t);
  };
  // Each timer gets its own handle, so a stale one that still fires is ignored.
  const schedule = () => {
    if (timer != null) clearTimer(timer);
    const handle = setTimer(() => {
      if (paused || timer !== handle) return;
      timer = null;
      fire();
      if (!paused) schedule();
    }, MINUTE - (now() % MINUTE));
    timer = handle;
  };
  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    start() {
      paused = false;
      schedule();
    },
    pause() {
      paused = true;
      if (timer != null) clearTimer(timer);
      timer = null;
    },
    resume() {
      if (!paused) return;
      paused = false;
      fire();
      schedule();
    }
  };
};
