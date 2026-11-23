const PATHS = {
  home: 'M3 11l9-8 9 8v10H3z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  upload: 'M12 16V4m0 0L7 9m5-5l5 5M4 20h16',
  cal: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4',
  chart: 'M4 20V4M4 20h16M8 16l4-5 3 3 5-7',
  gear: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2-1-2-4-2 1-2-1-1-2h-4l-1 2-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1 1 2h4l1-2 2-1 2 1 2-4-2-1z',
  bell: 'M6 16V10a6 6 0 0112 0v6l2 2H4zM10 21h4',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  chev: 'M9 6l6 6-6 6',
  chevl: 'M15 6l-6 6 6 6',
  chevd: 'M6 9l6 6 6-6',
  drag: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  play: 'M7 4l13 8-13 8z',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  dl: 'M12 4v12m0 0l-5-5m5 5l5-5M4 20h16',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  move: 'M5 12h14m0 0l-5-5m5 5l-5 5',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  link: 'M10 14a4 4 0 005 0l4-4a4 4 0 00-5-5l-1 1M14 10a4 4 0 00-5 0l-4 4a4 4 0 005 5l1-1',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  more: 'M12 5h.01M12 12h.01M12 19h.01',
  check: 'M5 12l5 5 9-10',
  ext: 'M7 17L17 7M8 7h9v9',
  menu: 'M4 7h16M4 12h16M4 17h16',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ n, s = 16, className = '' }: { n: IconName; s?: number; className?: string }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[n]} />
    </svg>
  )
}
