import { REQUEST_TYPES, LEGACY_REQUEST_TYPES } from "./types";

export function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
}

export function isOverdue(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() > 10 * 60 * 1000;
}

export function formatDisplayName(email: string): string {
  const raw = email.split("@")[0];
  return raw
    .split(/[._-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const ALL_REQUEST_TYPES = [...REQUEST_TYPES, ...LEGACY_REQUEST_TYPES];

export function getConfig(type: string) {
  return ALL_REQUEST_TYPES.find((r) => r.type === type);
}
