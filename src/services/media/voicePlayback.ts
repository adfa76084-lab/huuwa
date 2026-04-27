/**
 * Coordinates voice-message playback so only one plays at a time.
 *
 * Each VoiceMessagePlayer registers a stop() callback with `setActive`.
 * When another player starts, it calls `setActive` again — the previous
 * player's stop() runs, pausing it. Mirrors LINE/Messenger behavior.
 */

type StopFn = () => void;

let activeStop: StopFn | null = null;
let activeId: symbol | null = null;

export function setActive(id: symbol, stop: StopFn) {
  if (activeId && activeId !== id && activeStop) {
    try {
      activeStop();
    } catch {
      // ignore
    }
  }
  activeId = id;
  activeStop = stop;
}

export function clearActive(id: symbol) {
  if (activeId === id) {
    activeId = null;
    activeStop = null;
  }
}

export function stopAll() {
  if (activeStop) {
    try {
      activeStop();
    } catch {
      // ignore
    }
  }
  activeId = null;
  activeStop = null;
}
