/**
 * The third-party CES messenger custom element. Loaded asynchronously from
 * gstatic.com (see index.html) and upgraded by its own script. The standard
 * lib.dom.d.ts has no type for it; this alias documents the methods we
 * actually call from TS code.
 *
 * `setQueryParameters` is called from src/App.tsx to sync the user's first
 * name into the agent context. `open` is called from
 * src/components/ConciergeLauncher.tsx when the user taps the launcher.
 *
 * Methods are all optional: the upgrade is async, and at the moment we
 * query the element a method may not yet be attached.
 */
export type CesMessengerEl = HTMLElement & {
  open?: () => void;
  close?: () => void;
  setQueryParameters?: (params: Record<string, unknown>) => void;
};
