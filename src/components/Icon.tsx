import type { ReactNode } from "react";
import type { Meter } from "../types";

export type IconName =
  | "home"
  | "gauge"
  | "droplet"
  | "bolt"
  | "pencil"
  | "chart"
  | "plus"
  | "trash"
  | "calendar"
  | "check"
  | "download"
  | "upload"
  | "banknote"
  | "clock"
  | "camera"
  | "close"
  | "sun"
  | "moon"
  | "contrast"
  | "alert"
  | "sliders"
  | "bell"
  | "wallet"
  | "creditcard"
  | "timer"
  | "scale"
  | "info"
  | "chevronDown"
  | "layers"
  | "file-text"
  | "building"
  | "user";

// Jeu d'icônes SVG inline (style « outline »), pour rester sans dépendance UI.
const icons: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5L12 3l9 7.5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10Z" />
      <path d="M9 21V13h6v8" />
    </>
  ),
  gauge: (
    <>
      <path d="M21 18a9 9 0 1 0-18 0" />
      <path d="M12 13.5 15.5 10" />
      <circle cx="12" cy="14" r="1.6" />
    </>
  ),
  droplet: <path d="M12 3s6 6.2 6 10.2A6 6 0 0 1 6 13.2C6 9.2 12 3 12 3Z" />,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  chart: (
    <>
      <path d="M3 21h18" />
      <rect x="6" y="11" width="3" height="7" rx="1" />
      <rect x="11" y="6" width="3" height="12" rx="1" />
      <rect x="16" y="13" width="3" height="5" rx="1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  download: <path d="M12 3v12M7 12l5 5 5-5M5 21h14" />,
  upload: <path d="M12 21V9M7 12l5-5 5 5M5 3h14" />,
  banknote: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4M18 10v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />,
  contrast: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h6M14 7h6" />
      <path d="M4 12h1M9 12h11" />
      <path d="M4 17h8M16 17h4" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="7" cy="12" r="2" />
      <circle cx="14" cy="17" r="2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  wallet: (
    <>
      <path d="M21 12V7H4v12h17v-5z" />
      <path d="M16 15h.01" />
      <path d="M3 7l9-4 9 4M4 10h17" />
    </>
  ),
  creditcard: (
    <>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <path d="M1 10h22M5 15h3" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v4M5 19l7-16 7 16" />
      <path d="M4 19h16" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  layers: (
    <>
      <path d="M12 2L2 7l10 5 10-5-10-5Z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </>
  ),
  "file-text": (
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  chevronDown: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

// Choisit une icône pertinente selon le type de compteur.
export function meterIconName(m: Meter): IconName {
  const unit = m.unit.toLowerCase();
  const name = m.name.toLowerCase();
  if (unit.includes("m³") || unit.includes("m3") || name.includes("eau"))
    return "droplet";
  if (
    unit.includes("kwh") ||
    unit.includes("wh") ||
    name.includes("élec") ||
    name.includes("elec")
  )
    return "bolt";
  return "gauge";
}