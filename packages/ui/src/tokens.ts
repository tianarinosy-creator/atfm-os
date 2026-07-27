// Design tokens repris du prototype atfm-legacy-os-platform.jsx (bloc CSS `:root`)
// — source de vérité pour rester cohérent visuellement (apps/web/tailwind.config.ts
// les consomme via le preset).

export const colors = {
  bg: "#FBFBFD",
  surface: "#FFFFFF",
  surfaceAlt: "#F3F4F7",
  ink: "#10141C",
  inkSoft: "#5B6270",
  border: "#E4E6EB",
  blueDeep: "#14224A",
  violet: "#6E56CF",
  success: "#1F9D64",
  danger: "#D64545",
  warning: "#C98A1B",
} as const;

export const darkColors = {
  bg: "#0B0D12",
  surface: "#12141B",
  surfaceAlt: "#171A22",
  ink: "#EDEEF2",
  inkSoft: "#9AA1AE",
  border: "#232630",
} as const;

// Pastille de couleur par filiale (fil conducteur du multi-tenant, repris du prototype).
export const tenantColors: Record<string, string> = {
  atfm: "#14224A",
  logistics: "#1F6F8B",
  housing: "#B08A3E",
  films: "#7A3B69",
  tech: "#6E56CF",
  impact: "#2F8F5B",
  dsfamily: "#B5482D",
  creatic: "#3A5DAE",
};

export const radius = "10px";

export const fonts = {
  sans: "'Inter', -apple-system, system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};
