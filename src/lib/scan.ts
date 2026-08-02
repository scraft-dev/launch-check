export type ScanResponse = {
  url: string;
  finalUrl: string;
  pageTitle: string;
  httpStatus: number;
  loadTime: number;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: Array<{
    url: string;
    resourceType: string;
    status: number;
    error: string;
  }>;
};

export type ScanErrorResponse = {
  error: string;
};

export function getUrlValidationError(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "Enter a valid website URL.";
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "Enter a valid website URL.";
    }

    if (isPrivateHostname(parsedUrl.hostname)) {
      return "Enter a valid website URL.";
    }
  } catch {
    return "Enter a valid website URL.";
  }

  return null;
}

function isPrivateHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "0.0.0.0"
  ) {
    return true;
  }

  if (normalizedHostname.includes(":")) {
    return normalizedHostname === "::1";
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Pattern.test(normalizedHostname)) {
    return false;
  }

  const octets = normalizedHostname.split(".").map((octet) => Number(octet));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [firstOctet, secondOctet] = octets;
  if (firstOctet === 0) {
    return true;
  }

  if (firstOctet === 10) {
    return true;
  }

  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true;
  }

  if (firstOctet === 192 && secondOctet === 168) {
    return true;
  }

  return false;
}

export function getUserFriendlyScanError(message: string | null | undefined): string {
  const normalizedMessage = (message ?? "").toLowerCase();

  if (
    normalizedMessage.includes("net::err_name_not_resolved") ||
    normalizedMessage.includes("dns")
  ) {
    return "The website could not be reached. Check the URL and try again.";
  }

  if (
    normalizedMessage.includes("ssl") ||
    normalizedMessage.includes("certificate")
  ) {
    return "SSL verification failed. Try a different URL.";
  }

  if (normalizedMessage.includes("timeout")) {
    return "The scan timed out. The site may be slow or unavailable.";
  }

  if (normalizedMessage.includes("cloudflare")) {
    return "The site is blocking automated access.";
  }

  if (normalizedMessage.includes("captcha")) {
    return "The site requested a CAPTCHA challenge.";
  }

  if (normalizedMessage.includes("access denied") || normalizedMessage.includes("denied")) {
    return "Access to this website was denied.";
  }

  if (normalizedMessage.includes("browser")) {
    return "The browser could not be launched for scanning.";
  }

  return "Unable to scan this website right now.";
}
