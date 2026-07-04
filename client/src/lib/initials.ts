export function getInitialsFromName(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return initials || fallback;
}

export function getInitialsFromParts(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "?"
): string {
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  return initials || fallback;
}
