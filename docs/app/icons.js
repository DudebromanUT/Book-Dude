/* The line icons drawn in buttons and lists (24 x 24, in the current text color). */

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="3"/>',
  shuffle: '<path d="M3 7h3.5c2.5 0 4 1.5 5.5 5s3 5 5.5 5H21M3 17h3.5c1.4 0 2.5-.5 3.4-1.5M14.1 8.5c.9-1 2-1.5 3.4-1.5H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  heart: '<path d="M12 20.5s-7.4-4.5-9.5-9.2C1.1 8 3.1 4.5 6.9 4.5c2.2 0 3.7 1.2 5.1 3 1.4-1.8 2.9-3 5.1-3 3.8 0 5.8 3.5 4.4 6.8-2.1 4.7-9.5 9.2-9.5 9.2z"/>',
  bookmark: '<path d="M6.5 3.5h11v17L12 16.3l-5.5 4.2z"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  star: '<path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/>',
  alert: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14"/>',
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.3"/>',
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4M6 11H5v9.5h14V11h-1"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  camera: '<path d="M4 8.5h3.2l1.8-2.5h6l1.8 2.5H20v10.5H4z"/><circle cx="12" cy="13.5" r="3.4"/>',
  pencil: '<path d="M15.5 5.5l3 3L8 19H5v-3z"/><path d="M13.5 7.5l3 3"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 10.5v6M14 10.5v6"/>'
};

export const icon = (name, cls) => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"' + (cls ? ' class="' + cls + '"' : '') + '>' + ICONS[name] + '</svg>';
