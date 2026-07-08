const MARKETING_ORIGIN = "https://axlehq.app";
const APP_ORIGIN = "https://app.axlehq.app";
const SUBDOMAIN_HOSTS = new Set(["axlehq.app", "www.axlehq.app", "app.axlehq.app"]);

export function isSubdomainMode(): boolean {
  if (typeof window === "undefined") return false;
  return SUBDOMAIN_HOSTS.has(window.location.hostname);
}

export function getAppOrigin(): string {
  return isSubdomainMode() ? APP_ORIGIN : "";
}

export function getMarketingOrigin(): string {
  return isSubdomainMode() ? MARKETING_ORIGIN : "";
}
