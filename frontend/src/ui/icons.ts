const paths: Record<string, string> = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  map: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15",
  walk: "m13 4 .01 0M10 9l3-2 3 4 3 1M13 7l-2 7 4 2 1 5m-5-7-3 7M5 12l4-3",
  cube: "m12 3 9 5v8l-9 5-9-5V8l9-5Zm-9 5 9 5 9-5m-9 5v8",
  close: "m6 6 12 12M6 18 18 6",
  book: "M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4Zm9 3a3 3 0 0 1 3-3h5v15h-4a4 4 0 0 0-4 2",
  chat: "M21 11a8 8 0 0 1-8 8H6l-4 3 1-7a8 8 0 0 1 2-10 9 9 0 0 1 16 6Z",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  logout: "M9 4H4v16h5m5-13 5 5-5 5m-5-5h10",
  pause: "M6 4h4v16H6Zm8 0h4v16h-4Z",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-2 4 7 7",
  pin: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Zm-5 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  photo: "M3 4h18v16H3V4Zm0 12 6-6 5 5 3-3 4 5M16 8h.01",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
  moon: "M20.8 14.1A8.8 8.8 0 0 1 9.9 3.2 9 9 0 1 0 20.8 14.1Z",
  help: "M12 17h.01M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  keyboard: "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm2 4h.01m4 0h.01m4 0h.01m4 0h.01M6 14h.01m4 0h8",
  phone: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 16h2",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  layers: "m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5",
  sparkles: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z|M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z",
  menu: "M4 7h16M4 12h16M4 17h16",
  more: "M5 12h.01m6.99 0h.01m6.99 0h.01",
  volume: "m3 9 5 0 5-5v16l-5-5H3V9Zm14-2a8 8 0 0 1 0 10",
};
export const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(
    paths[name] ?? paths.pin
  )
    .split("|")
    .map((d) => `<path d="${d}"/>`)
    .join("")}</svg>`;
