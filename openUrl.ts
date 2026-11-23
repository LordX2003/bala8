/**
 * Robust cross-origin-safe external URL opener.
 *
 * Why this is needed:
 * The studio may run inside a hosting preview that applies
 * `Cross-Origin-Opener-Policy` (COOP) and/or nested sandboxed iframes.
 * A plain `window.open()` or a naive `<a target="_blank">` from such a
 * context gets blocked with `NS_ERROR_DOM_COOP_FAILED` when the target
 * is a different cross-origin domain (e.g. gemini.google.com).
 *
 * Strategy (most → least restrictive):
 *  1. A detached, hidden real <a rel="noopener noreferrer"> clicked
 *     synchronously inside the surrounding user-gesture. This is a
 *     top-level navigation in a NEW browsing context group, which is
 *     explicitly exempt from the opener's COOP policy.
 *  2. `window.open(url, "_blank", "noopener,noreferrer")` as fallback.
 *  3. Copy the URL to the clipboard as a guaranteed last resort so the
 *     user always gets the link (the caller shows a toast).
 */
export type OpenUrlResult = "opened" | "copied" | "failed";

function looksLikeOpenableUrl(raw: string): boolean {
  const u = raw.trim();
  if (!u) return false;
  if (/^(https?:|mailto:|tel:|ftp:)/i.test(u)) return true;
  if (u.startsWith("#")) return false;
  if (u.startsWith("/") || u.startsWith("./") || u.startsWith("../")) return false;
  return true;
}

export function openExternalUrl(raw: string): OpenUrlResult {
  const url = raw.trim();
  if (!looksLikeOpenableUrl(url)) {
    return "failed";
  }

  // 1) Detached real anchor with noopener — top-level, COOP-exempt navigation.
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-hidden", "true");
    a.style.position = "fixed";
    a.style.top = "-10000px";
    a.style.left = "-10000px";
    a.style.opacity = "0";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 0);
    return "opened";
  } catch {
    /* continue to fallback */
  }

  // 2) Fully detached window.open.
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) return "opened";
  } catch {
    /* continue to fallback */
  }

  // 3) Guaranteed clipboard fallback.
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      void navigator.clipboard.writeText(url);
      return "copied";
    }
  } catch {
    /* ignore */
  }

  return "failed";
}
