// Small hand-drawn icon set (24px grid, stroke-based) to avoid an icon dependency.
const PATHS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  memory: 'M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z',
  send: 'M12 19V5M6 11l6-6 6 6',
  stop: 'M7 7h10v10H7z',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12l5 5 9-10',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  close: 'M6 6l12 12M18 6L6 18',
  retry: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5',
  bookmarkAdd: 'M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1zM12 8v5M9.5 10.5h5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Original abstract mark: a quiet circle with two small ears. Not a person's likeness. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M7 11 L9 4 L13.5 8.5 A10 10 0 0 1 18.5 8.5 L23 4 L25 11 A10 10 0 1 1 7 11 Z" fill="var(--accent)" />
      <circle cx="12.5" cy="17" r="1.4" fill="var(--bg)" />
      <circle cx="19.5" cy="17" r="1.4" fill="var(--bg)" />
    </svg>
  );
}
