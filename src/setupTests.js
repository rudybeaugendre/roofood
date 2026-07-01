import '@testing-library/jest-dom';

// Node 22+ exposes its own experimental global `localStorage`, which shadows the
// jsdom-backed one vitest would otherwise proxy onto globalThis (vitest's jsdom
// environment skips keys that already exist on Node's global). Point it at
// jsdom's real implementation so localStorage-backed code behaves under test
// the same way it does in a real browser.
if (globalThis.jsdom) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: globalThis.jsdom.window.localStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: globalThis.jsdom.window.sessionStorage,
    configurable: true,
  });
}
