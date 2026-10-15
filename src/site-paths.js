const normalizedBase = `${import.meta.env.BASE_URL || "/"}`.replace(/\/*$/, "/");
const basePathname = new URL(normalizedBase, window.location.origin).pathname.replace(/\/+$/, "");

export function sitePath(path = "") {
  const value = String(path);
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
  return `${normalizedBase}${value.replace(/^\.?\/+/, "")}`;
}

export function currentRoute() {
  const pathname = window.location.pathname;
  if (basePathname && (pathname === basePathname || pathname.startsWith(`${basePathname}/`))) {
    return pathname.slice(basePathname.length) || "/";
  }
  return pathname || "/";
}

export function absoluteSiteUrl(path = "") {
  return new URL(sitePath(path), window.location.origin).href;
}

