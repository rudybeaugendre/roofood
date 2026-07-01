// Stub de tracking : pas de SDK analytics réel dans ce projet, on garde une
// implémentation minimale et facilement remplaçable plus tard.

const events = [];

export function trackEvent(name, properties = {}) {
  events.push({ name, properties, timestamp: Date.now() });
  console.log(`[analytics] ${name}`, properties);
}

export function getTrackedEvents() {
  return events;
}

export function clearTrackedEvents() {
  events.length = 0;
}
