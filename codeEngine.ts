import type {
  BloggerViewType,
  DirectionOverride,
  EditorMode,
  SelectedElementPayload,
} from "@/types/analyzer";
import { SANDBOX_AGENT_CODE, SANDBOX_HEAD_SHIM } from "./sandboxAgent";

export function escapeForScript(str: string): string {
  return str.replace(/<\/script>/gi, "<\\/script>");
}

export function escapeXmlText(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeAttrValue(str: string, quote: "'" | '"' = '"'): string {
  const base = str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return quote === "'" ? base.replace(/'/g, "&#39;") : base.replace(/"/g, "&quot;");
}

export function isTransparentColor(color: string): boolean {
  if (!color) return true;
  const trimmed = color.trim().toLowerCase();
  if (trimmed === "transparent") return true;
  const m = trimmed.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/);
  return Boolean(m && parseFloat(m[1]) === 0);
}

export function rgbToHex(color: string): string {
  if (!color) return "#000000";
  const c = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    return ("#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toLowerCase();
  }
  const match = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/i);
  if (!match) return "#000000";
  const hex = (n: string) => {
    const h = Math.max(0, Math.min(255, parseInt(n, 10))).toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return `#${hex(match[1])}${hex(match[2])}${hex(match[3])}`;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Updates or appends a CSS property on `selector` inside `cssText`.
 */
export function modifyCssRule(
  cssText: string,
  selector: string,
  property: string,
  value: string
): string {
  const cssProperty = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const escSel = escapeRegExp(selector.trim());
  const blockRegex = new RegExp(
    `(^|\\}|\\{)((?:\\s|\\/\\*[\\s\\S]*?\\*\\/)*)(${escSel})\\s*\\{([^}]*)\\}`,
    "g"
  );

  let found = false;
  let updatedCss = cssText.replace(
    blockRegex,
    (_full, boundary: string, between: string, sel: string, body: string) => {
      found = true;
      const propRegex = new RegExp(
        `(^|;|\\n)(\\s*)${escapeRegExp(cssProperty)}\\s*:[^;\\n]*;?`,
        "i"
      );
      let newBody = body;
      if (propRegex.test(newBody)) {
        newBody = newBody.replace(propRegex, (_m, sep: string, ws: string) => {
          const indent = ws || " ";
          return `${sep}${indent}${cssProperty}: ${value};`;
        });
      } else {
        const trimmedEnd = newBody.replace(/\s*$/, "");
        const hasNewlines = newBody.includes("\n");
        if (hasNewlines) {
          const sep = trimmedEnd.length > 0 && !trimmedEnd.endsWith(";") ? ";" : "";
          newBody = `${trimmedEnd}${sep}\n  ${cssProperty}: ${value};\n`;
        } else {
          const sep = trimmedEnd.length > 0 && !trimmedEnd.endsWith(";") ? "; " : " ";
          newBody = `${trimmedEnd}${sep}${cssProperty}: ${value}; `;
        }
      }
      return `${boundary}${between}${sel} {${newBody}}`;
    }
  );

  if (!found) {
    const base = updatedCss.trimEnd();
    updatedCss = `${base}${base ? "\n\n" : ""}${selector} {\n  ${cssProperty}: ${value};\n}`;
  }

  return updatedCss;
}

/**
 * Modifies CSS inside `<b:skin><![CDATA[ ... ]]></b:skin>` in a Blogger XML template.
 */
export function modifyCssInXml(
  xml: string,
  selector: string,
  property: string,
  value: string
): string {
  const skinRegex = /(<b:skin[^>]*>)([\s\S]*?)(<\/b:skin>)/i;
  const match = xml.match(skinRegex);
  if (!match) {
    const styleRegex = /(<style[^>]*>)([\s\S]*?)(<\/style>)/i;
    const sMatch = xml.match(styleRegex);
    if (!sMatch) return xml;
    const updatedStyle = modifyCssRule(sMatch[2], selector, property, value);
    return xml.replace(styleRegex, () => `${sMatch[1]}\n${updatedStyle.trim()}\n${sMatch[3]}`);
  }

  let css = match[2].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
  css = modifyCssRule(css, selector, property, value);

  const newSkin = `${match[1]}<![CDATA[\n${css.trim()}\n  ]]>${match[3]}`;
  return xml.replace(skinRegex, () => newSkin);
}

/**
 * Helper to operate on Normal HTML while preserving whether user wrote a full document or a snippet.
 */
function mutateNormalHtmlDom(
  html: string,
  mutator: (doc: Document) => boolean
): { html: string; matched: boolean } {
  try {
    const isFullDoc = /<!doctype\s+html|<html\b/i.test(html);
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      isFullDoc ? html : `<!DOCTYPE html><html><body>${html}</body></html>`,
      "text/html"
    );
    const ok = mutator(doc);
    if (!ok) return { html, matched: false };

    if (isFullDoc) {
      return { html: `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, matched: true };
    }
    return { html: doc.body.innerHTML, matched: true };
  } catch {
    return { html, matched: false };
  }
}

export function modifyTextInNormalHtml(
  html: string,
  selector: string,
  newText: string
): { html: string; matched: boolean } {
  return mutateNormalHtmlDom(html, (doc) => {
    const el = doc.querySelector(selector);
    if (!el) return false;
    if (el.children.length > 0) {
      let updatedNode = false;
      for (let i = 0; i < el.childNodes.length; i++) {
        const node = el.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE && (node.nodeValue ?? "").trim().length > 0) {
          node.nodeValue = ` ${newText} `;
          updatedNode = true;
          break;
        }
      }
      if (!updatedNode) el.appendChild(doc.createTextNode(` ${newText}`));
    } else {
      el.textContent = newText;
    }
    return true;
  });
}

export function modifyPartTextInNormalHtml(
  html: string,
  parentSelector: string,
  textNodeIndex: number | undefined,
  partSelector: string | undefined,
  newText: string
): { html: string; matched: boolean } {
  if (textNodeIndex !== undefined) {
    return mutateNormalHtmlDom(html, (doc) => {
      const parentEl = doc.querySelector(parentSelector);
      if (!parentEl) return false;
      let counter = 0;
      for (let i = 0; i < parentEl.childNodes.length; i++) {
        const cn = parentEl.childNodes[i];
        if (cn.nodeType === Node.TEXT_NODE) {
          if (counter === textNodeIndex) {
            cn.nodeValue = ` ${newText} `;
            return true;
          }
          counter++;
        }
      }
      return false;
    });
  }
  if (partSelector) {
    return modifyTextInNormalHtml(html, partSelector, newText);
  }
  return { html, matched: false };
}

export function modifyAttributeInNormalHtml(
  html: string,
  selector: string,
  attr: string,
  value: string
): { html: string; matched: boolean } {
  return mutateNormalHtmlDom(html, (doc) => {
    const el = doc.querySelector(selector);
    if (!el) return false;
    if (!value) el.removeAttribute(attr);
    else el.setAttribute(attr, value);
    return true;
  });
}

export function modifyAttributeInBloggerXml(
  xml: string,
  tagName: string,
  id: string,
  classes: string[],
  oldHref: string,
  label: string,
  attr: string,
  value: string
): { xml: string; matched: boolean } {
  const tag = escapeRegExp(tagName);
  const openTagRe = new RegExp(`<${tag}\\b([^>]*?)(\\/?)>`, "gi");
  const primaryClass = classes[0];

  let best: { index: number; length: number; attrs: string; selfClose: string; score: number } | null = null;
  let m: RegExpExecArray | null;

  while ((m = openTagRe.exec(xml)) !== null) {
    const [full, attrs, selfClose] = m;
    let score = 0;
    if (id && new RegExp(`\\bid\\s*=\\s*['"]${escapeRegExp(id)}['"]`).test(attrs)) score += 20;
    if (oldHref && attrs.includes(oldHref)) score += 12;
    if (primaryClass && attrs.includes(primaryClass)) score += 5;

    // Peek slightly ahead for label text match
    const ahead = xml.slice(m.index + full.length, m.index + full.length + 180);
    if (label && ahead.includes(label.slice(0, 18))) score += 8;

    if (score > 0 && (!best || score > best.score)) {
      best = { index: m.index, length: full.length, attrs, selfClose, score };
    }
  }

  if (!best) return { xml, matched: false };

  const quote: "'" | '"' = best.attrs.includes("'") && !best.attrs.includes('"') ? "'" : '"';
  let newAttrs = best.attrs;

  // If setting href on a tag that previously used expr:href, replace expr:href with href
  if (attr === "href" && /\bexpr:href\s*=\s*['"][^'"]*['"]/i.test(newAttrs)) {
    newAttrs = newAttrs.replace(
      /\bexpr:href\s*=\s*['"][^'"]*['"]/i,
      value ? `href=${quote}${escapeAttrValue(value, quote)}${quote}` : ""
    );
  } else {
    const attrRe = new RegExp(`\\b${escapeRegExp(attr)}\\s*=\\s*(['"])([^'"]*)\\1`, "i");
    if (attrRe.test(newAttrs)) {
      newAttrs = value
        ? newAttrs.replace(attrRe, `${attr}=${quote}${escapeAttrValue(value, quote)}${quote}`)
        : newAttrs.replace(attrRe, "");
    } else if (value) {
      newAttrs = `${newAttrs} ${attr}=${quote}${escapeAttrValue(value, quote)}${quote}`;
    }
  }

  const rebuilt = `<${tagName}${newAttrs}${best.selfClose}>`;
  return {
    xml: xml.slice(0, best.index) + rebuilt + xml.slice(best.index + best.length),
    matched: true,
  };
}

/**
 * Unwraps a container tag while keeping all inner content intact.
 */
export function unwrapElementInNormalHtml(
  html: string,
  selector: string
): { html: string; matched: boolean } {
  return mutateNormalHtmlDom(html, (doc) => {
    const el = doc.querySelector(selector);
    if (!el || !el.parentNode || el.tagName.toLowerCase() === "body") return false;
    const parent = el.parentNode;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
    return true;
  });
}

export function unwrapElementInBloggerXml(
  xml: string,
  tagName: string,
  id: string,
  classes: string[]
): { xml: string; matched: boolean } {
  const tag = escapeRegExp(tagName);
  const primaryClass = classes[0];
  const openRe = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  let candidateIndex = -1;
  let openLen = 0;
  let bestScore = 0;
  let m: RegExpExecArray | null;

  while ((m = openRe.exec(xml)) !== null) {
    if (m[0].endsWith("/>")) continue;
    let s = 0;
    if (id && new RegExp(`\\bid\\s*=\\s*['"]${escapeRegExp(id)}['"]`).test(m[1])) s += 15;
    if (primaryClass && m[1].includes(primaryClass)) s += 5;
    if (s > bestScore) {
      bestScore = s;
      candidateIndex = m.index;
      openLen = m[0].length;
    }
  }

  if (candidateIndex === -1) return { xml, matched: false };

  // Find balanced closing </tagName>
  const tokenRe = new RegExp(`<(\\/?)${tag}\\b([^>]*)>`, "gi");
  tokenRe.lastIndex = candidateIndex + openLen;
  let depth = 1;
  let closeStart = -1;
  let closeEnd = -1;
  let tm: RegExpExecArray | null;

  while ((tm = tokenRe.exec(xml)) !== null) {
    const isClosing = tm[1] === "/";
    const selfClosing = tm[0].endsWith("/>");
    if (!isClosing && !selfClosing) depth++;
    else if (isClosing) {
      depth--;
      if (depth === 0) {
        closeStart = tm.index;
        closeEnd = tm.index + tm[0].length;
        break;
      }
    }
  }

  if (closeStart === -1) return { xml, matched: false };

  const inner = xml.slice(candidateIndex + openLen, closeStart);
  return {
    xml: xml.slice(0, candidateIndex) + inner + xml.slice(closeEnd),
    matched: true,
  };
}

/**
 * Assigns a unique ID to a selected element so styling it doesn't mutate sibling cards sharing its class.
 */
export function assignUniqueIdInSource(
  mode: EditorMode,
  source: string,
  selected: SelectedElementPayload,
  uniqueId: string
): { source: string; matched: boolean } {
  if (mode === "normal") {
    const res = modifyAttributeInNormalHtml(source, selected.selector, "id", uniqueId);
    return { source: res.html, matched: res.matched };
  }
  const res = modifyAttributeInBloggerXml(
    source,
    selected.tagName,
    selected.id,
    selected.classes,
    "",
    (selected.directText || selected.innerText).slice(0, 24),
    "id",
    uniqueId
  );
  return { source: res.xml, matched: res.matched };
}

/**
 * Extracts standalone HTML + matching CSS rules for a selected component.
 */
export function extractStandaloneComponentCode(
  selected: SelectedElementPayload,
  cssOrXml: string,
  mode: EditorMode
): { html: string; css: string } {
  let rawCss = cssOrXml;
  if (mode === "blogger") {
    const skinMatch = cssOrXml.match(/<b:skin[^>]*>([\s\S]*?)<\/b:skin>/i);
    rawCss = skinMatch ? skinMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "") : "";
  }

  // Collect class names inside selected.outerHTML
  const classSet = new Set<string>(selected.classes);
  const clsMatches = selected.outerHTML.matchAll(/\bclass\s*=\s*["']([^"']+)["']/gi);
  for (const cm of clsMatches) {
    cm[1]
      .split(/\s+/)
      .filter((c) => c && !c.startsWith("__ux"))
      .forEach((c) => classSet.add(c));
  }

  const matchedBlocks: string[] = [];
  const rootMatch = rawCss.match(/:root\s*\{[^}]*\}/);
  if (rootMatch) matchedBlocks.push(rootMatch[0]);

  const ruleRe = /([^{}@]+)\{([^}]*)\}/g;
  let rm: RegExpExecArray | null;
  while ((rm = ruleRe.exec(rawCss)) !== null) {
    const selHeader = rm[1].trim();
    const hit =
      (selected.id && selHeader.includes(`#${selected.id}`)) ||
      Array.from(classSet).some((cls) => selHeader.includes(`.${cls}`));
    if (hit) {
      matchedBlocks.push(`${selHeader} {${rm[2]}}`);
    }
  }

  const cleanHtml = selected.outerHTML
    .replace(/\s*class="([^"]*)"/g, (_m, cls: string) => {
      const filtered = cls
        .split(/\s+/)
        .filter((c) => c && !c.startsWith("__ux"))
        .join(" ");
      return filtered ? ` class="${filtered}"` : "";
    });

  return {
    html: cleanHtml,
    css: matchedBlocks.join("\n\n") || `/* لا توجد قواعد CSS خارجية مخصّصة لهذا العنصر */`,
  };
}

/**
 * Updates element text inside a Blogger XML template while preserving inner icons (`<i>`, `<svg>`)
 * and XML attributes.
 */
export function modifyTextInBloggerXml(
  xml: string,
  selected: SelectedElementPayload,
  newText: string,
  previousText?: string
): { xml: string; matched: boolean } {
  const tag = escapeRegExp(selected.tagName);
  const safeNew = escapeXmlText(newText);
  const oldCandidate = (previousText ?? (selected.directText || selected.innerText)).trim();

  const decodeEntities = (s: string) =>
    s
      .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

  const replacePreservingLeadingIcon = (inner: string): string => {
    const iconLead = inner.match(/^(\s*(?:<i\b[^>]*><\/i>|<svg\b[\s\S]*?<\/svg>)\s*)([\s\S]*)$/i);
    if (iconLead) {
      return `${iconLead[1]}${safeNew}`;
    }
    return safeNew;
  };

  if (selected.id) {
    const idRe = new RegExp(
      `(<${tag}\\b[^>]*\\bid\\s*=\\s*['"]${escapeRegExp(selected.id)}['"][^>]*>)([\\s\\S]*?)(<\\/${tag}>)`,
      "i"
    );
    const idMatch = xml.match(idRe);
    if (idMatch) {
      const innerWithoutIcons = idMatch[2].replace(/<i\b[^>]*><\/i>|<svg\b[\s\S]*?<\/svg>|<data:[^>]+\/>/gi, "");
      if (!/<[a-zA-Z]/.test(innerWithoutIcons)) {
        return {
          xml: xml.replace(idRe, (_m, open: string, inner: string, close: string) => {
            return `${open}${replacePreservingLeadingIcon(inner)}${close}`;
          }),
          matched: true,
        };
      }
    }
  }

  const tagBlockRe = new RegExp(`(<${tag}\\b([^>]*)>)([\\s\\S]*?)(<\\/${tag}>)`, "gi");
  const primaryClass = selected.classes[0];
  const normalizedOld = oldCandidate.replace(/\s+/g, " ").trim();
  const isSimulatedDataText =
    normalizedOld === "مدونة تجريبية" ||
    normalizedOld === "محتوى تجريبي" ||
    normalizedOld.startsWith("مقال تجريبي");

  let bestMatch: {
    index: number;
    length: number;
    open: string;
    inner: string;
    close: string;
    score: number;
  } | null = null;
  let m: RegExpExecArray | null;

  while ((m = tagBlockRe.exec(xml)) !== null) {
    const [full, open, attrs, inner, close] = m;
    const strippedIconsAndData = inner.replace(
      /<i\b[^>]*><\/i>|<svg\b[\s\S]*?<\/svg>|<data:[^>]+\/>/gi,
      ""
    );
    if (/<[a-zA-Z]/.test(strippedIconsAndData)) continue;

    const decodedInner = decodeEntities(strippedIconsAndData);
    const hasDataTag = /<data:[^>]+\/>/i.test(inner);

    const textMatches =
      (normalizedOld.length > 0 && decodedInner === normalizedOld) ||
      (isSimulatedDataText && hasDataTag);

    if (!textMatches) continue;

    let score = 1;
    if (primaryClass && attrs.includes(primaryClass)) score += 5;
    if (selected.id && attrs.includes(selected.id)) score += 10;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { index: m.index, length: full.length, open, inner, close, score };
    }
  }

  if (bestMatch) {
    const updated =
      xml.slice(0, bestMatch.index) +
      `${bestMatch.open}${replacePreservingLeadingIcon(bestMatch.inner)}${bestMatch.close}` +
      xml.slice(bestMatch.index + bestMatch.length);
    return { xml: updated, matched: true };
  }

  return { xml, matched: false };
}

/**
 * Detects natural direction when the user writes an HTML snippet without explicit dir="...".
 */
function detectNaturalDirection(html: string, css: string): "rtl" | "ltr" {
  if (/direction\s*:\s*ltr/i.test(css)) return "ltr";
  if (/direction\s*:\s*rtl/i.test(css)) return "rtl";
  const stripped = html.replace(/<[^>]+>/g, " ");
  const arabicChars = (stripped.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (stripped.match(/[a-zA-Z]/g) || []).length;
  if (arabicChars === 0 && latinChars > 0) return "ltr";
  return arabicChars >= latinChars * 0.25 ? "rtl" : "ltr";
}

/**
 * Builds high-fidelity srcdoc for Normal (HTML / CSS / JS) mode.
 * Preserves full HTML documents (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>` attributes, external CDNs)
 * AND smartly handles snippets without forcing reversed directionality.
 */
export function buildSrcdocNormal(
  html: string,
  css: string,
  js: string,
  dirOverride: DirectionOverride = "auto"
): string {
  const safeAgent = escapeForScript(SANDBOX_AGENT_CODE);
  const safeShim = escapeForScript(SANDBOX_HEAD_SHIM);
  const safeJs = escapeForScript(js);
  const jsRunner = safeJs.trim()
    ? `<script>\ntry {\n${safeJs}\n} catch (e) {\n  parent.postMessage({ type: "SANDBOX_ERROR", payload: { message: e && e.message ? e.message : String(e) } }, "*");\n}\n</script>`
    : "";

  const isFullDoc = /<!doctype\s+html|<html\b/i.test(html);

  if (isFullDoc) {
    let docStr = html;
    // Apply explicit direction override if chosen
    if (dirOverride !== "auto") {
      if (/<html\b[^>]*\bdir\s*=/i.test(docStr)) {
        docStr = docStr.replace(
          /(<html\b[^>]*\bdir\s*=\s*['"])([^'"]+)(['"])/i,
          `$1${dirOverride}$3`
        );
      } else {
        docStr = docStr.replace(/<html\b/i, `<html dir="${dirOverride}"`);
      }
    }

    const headInjection = `<script>${safeShim}</script>\n${css.trim() ? `<style id="__ux_editor_css__">${css}</style>` : ""}`;
    if (/<head\b[^>]*>/i.test(docStr)) {
      docStr = docStr.replace(/<head\b[^>]*>/i, (m) => `${m}\n${headInjection}`);
    } else {
      docStr = docStr.replace(/<html\b[^>]*>/i, (m) => `${m}\n<head>${headInjection}</head>`);
    }

    const bodyTail = `\n${jsRunner}\n<script>${safeAgent}</script>\n`;
    if (/<\/body>/i.test(docStr)) {
      docStr = docStr.replace(/<\/body>/i, `${bodyTail}</body>`);
    } else {
      docStr += bodyTail;
    }

    return docStr;
  }

  // Snippet mode
  const resolvedDir =
    dirOverride !== "auto" ? dirOverride : detectNaturalDirection(html, css);
  const resolvedLang = resolvedDir === "rtl" ? "ar" : "en";

  return `<!DOCTYPE html>
<html dir="${resolvedDir}" lang="${resolvedLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap">
  <script>${safeShim}</script>
  <style>${css}</style>
</head>
<body>
${html}
${jsRunner}
<script>${safeAgent}</script>
</body>
</html>`;
}

// =========================================================
// High-Fidelity Blogger XML Compiler
// =========================================================

function evalBloggerCond(condRaw: string, view: BloggerViewType): boolean {
  const c = condRaw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  if (!c) return true;

  // Strip outer parentheses
  if (c.startsWith("(") && c.endsWith(")")) {
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < c.length - 1; i++) {
      if (c[i] === "(") depth++;
      else if (c[i] === ")") {
        depth--;
        if (depth === 0) {
          balanced = false;
          break;
        }
      }
    }
    if (balanced) return evalBloggerCond(c.slice(1, -1), view);
  }

  if (/\bor\b|\|\|/i.test(c)) {
    return c.split(/\bor\b|\|\|/i).some((part) => evalBloggerCond(part, view));
  }
  if (/\band\b|&&/i.test(c)) {
    return c.split(/\band\b|&&/i).every((part) => evalBloggerCond(part, view));
  }
  if (c.startsWith("!") || /^not\s+/i.test(c)) {
    const rest = c.startsWith("!") ? c.slice(1) : c.replace(/^not\s+/i, "");
    return !evalBloggerCond(rest.trim(), view);
  }

  const flags: Record<string, boolean> = {
    isHomepage: view === "homepage",
    isMultipleItems: view === "homepage" || view === "archive",
    isSingleItem: view === "post",
    isPost: view === "post",
    isPage: false,
    isArchive: view === "archive",
    isLabelSearch: view === "archive",
    isSearch: false,
    isPreview: false,
    isError: false,
    allowComments: false,
  };

  for (const [key, val] of Object.entries(flags)) {
    if (c.includes(key)) return val;
  }
  return true;
}

function resolveBloggerConditionals(input: string, view: BloggerViewType): string {
  let out = input;
  const innermostIf = /<b:if\b([^/>]*?)>((?:(?!<b:if\b)[\s\S])*?)<\/b:if>/gi;

  for (let guard = 0; guard < 50; guard++) {
    if (!innermostIf.test(out)) break;
    innermostIf.lastIndex = 0;
    out = out.replace(innermostIf, (_full, attrs: string, inner: string) => {
      const condMatch = attrs.match(/cond\s*=\s*['"]([^'"]*)['"]/i);
      const mainCond = condMatch ? condMatch[1] : "";

      // Split chains of <b:elseif cond='...'/> and <b:else/>
      const tokenRe = /<b:(elseif|else)\b([^>]*?)\/?>/gi;
      const branches: { type: "if" | "elseif" | "else"; cond: string; content: string }[] = [];
      let lastIdx = 0;
      let currentType: "if" | "elseif" | "else" = "if";
      let currentCond = mainCond;
      let tm: RegExpExecArray | null;

      while ((tm = tokenRe.exec(inner)) !== null) {
        branches.push({
          type: currentType,
          cond: currentCond,
          content: inner.slice(lastIdx, tm.index),
        });
        const tagKind = tm[1].toLowerCase() as "elseif" | "else";
        currentType = tagKind;
        currentCond =
          tagKind === "elseif"
            ? tm[2].match(/cond\s*=\s*['"]([^'"]*)['"]/i)?.[1] ?? ""
            : "";
        lastIdx = tm.index + tm[0].length;
      }
      branches.push({
        type: currentType,
        cond: currentCond,
        content: inner.slice(lastIdx),
      });

      for (const b of branches) {
        if (b.type === "else") return b.content;
        if (evalBloggerCond(b.cond, view)) return b.content;
      }
      return "";
    });
  }
  return out;
}

const SKIPPED_HELPER_INCLUDABLES = new Set([
  "commentDeleteIcon",
  "commentForm",
  "commentFormIframeSrc",
  "commentItem",
  "commentList",
  "commentPicker",
  "comments",
  "commentsTitle",
  "feedLinks",
  "feedLinksBody",
  "iframeComments",
  "inlineAd",
  "postMeta",
  "postMetadataJSON",
  "threadedCommentForm",
  "threadedCommentJs",
  "threadedComments",
  "tooltipCss",
  "aboutPostAuthor",
  "addComments",
  "commentAuthorAvatar",
]);

function expandWidgetIncludables(widgetBody: string): string {
  // 1. Remove self-closing <b:includable .../> first so they never swallow subsequent tags!
  const cleaned = widgetBody.replace(/<b:includable\b[^>]*\/>/gi, "");

  // 2. Collect paired <b:includable id='...'>...</b:includable>
  const includables = new Map<string, string>();
  const incRe = /<b:includable\b([^/>]*?)>([\s\S]*?)<\/b:includable>/gi;
  let im: RegExpExecArray | null;
  while ((im = incRe.exec(cleaned)) !== null) {
    const id = im[1].match(/\bid\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? "main";
    if (!includables.has(id)) includables.set(id, im[2]);
  }

  if (includables.size === 0) return cleaned;

  const resolveIncludes = (fragment: string, depth: number): string => {
    if (depth > 6) return fragment;
    return fragment.replace(
      /<b:include\b([^>]*?)(?:\/>|>[\s\S]*?<\/b:include>)/gi,
      (_m, attrs: string) => {
        const name = attrs.match(/\bname\s*=\s*['"]([^'"]+)['"]/i)?.[1];
        if (!name || SKIPPED_HELPER_INCLUDABLES.has(name)) return "";
        const target = includables.get(name);
        if (!target) return "";
        return resolveIncludes(target, depth + 1);
      }
    );
  };

  const mainContent = includables.get("main") ?? Array.from(includables.values())[0] ?? "";
  return resolveIncludes(mainContent, 0);
}

const HTML_VOID_OR_SVG_SELF_CLOSING = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
  // SVG self-closing primitives
  "path",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "polyline",
  "rect",
  "stop",
  "use",
  "animate",
  "animateTransform",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
  "feColorMatrix",
  "feMergeNode",
]);

function expandXmlSelfClosingHtmlTags(html: string): string {
  return html.replace(/<([a-zA-Z][a-zA-Z0-9:-]*)(\s[^>]*?)?\/>/g, (full, tagName: string, attrs = "") => {
    if (HTML_VOID_OR_SVG_SELF_CLOSING.has(tagName.toLowerCase()) || tagName.includes(":")) {
      return full;
    }
    return `<${tagName}${attrs}></${tagName}>`;
  });
}

/**
 * Builds high-fidelity srcdoc for Blogger XML templates so real themes render
 * identically to a live Blogger site.
 */
export function buildSrcdocBlogger(
  xml: string,
  view: BloggerViewType = "homepage",
  dirOverride: DirectionOverride = "auto"
): string {
  // 1. Preserve <html> dir, lang, class
  const htmlTagMatch = xml.match(/<html\b([^>]*)>/i);
  const htmlAttrs = htmlTagMatch ? htmlTagMatch[1] : "";
  const xmlDir = htmlAttrs.match(/\bdir\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? "rtl";
  const dir = dirOverride !== "auto" ? dirOverride : xmlDir;
  const lang = htmlAttrs.match(/\blang\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? "ar";
  const htmlClass = htmlAttrs.match(/\bclass\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? "";

  // 2. Extract <head> links, extra <style>, <b:template-skin>, and head scripts
  const headMatch = xml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headRaw = headMatch ? headMatch[1] : "";

  const headLinks = (headRaw.match(/<link\b[^>]*\/?>/gi) || [])
    .map((l) => l.replace(/&amp;/g, "&").replace(/\/>$/, ">"))
    .join("\n  ");

  const extraHeadStyles = [...headRaw.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1].replace(/<!\[CDATA\[|\]\]>/g, ""))
    .join("\n");

  // 3. Extract <b:skin> & <b:template-skin> CSS and resolve Blogger <Variable> defaults
  const skinMatch = xml.match(/<b:skin[^>]*>([\s\S]*?)<\/b:skin>/i);
  const tplSkinMatch = xml.match(/<b:template-skin[^>]*>([\s\S]*?)<\/b:template-skin>/i);
  let css =
    (skinMatch ? skinMatch[1] : "") + "\n" + (tplSkinMatch ? tplSkinMatch[1] : "");
  css = css.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");

  const vars: Record<string, string> = {};
  const varTagRe = /<(?:Variable|b:variable)\b([^>]*)\/?>/gi;
  let vm: RegExpExecArray | null;
  while ((vm = varTagRe.exec(css)) !== null) {
    const a = vm[1];
    const name = a.match(/\bname\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    const val =
      a.match(/\bvalue\s*=\s*['"]([^'"]+)['"]/i)?.[1] ??
      a.match(/\bdefault\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    if (name && val) vars[name] = val;
  }
  css = css.replace(/\/\*[\s\S]*?<\s*(?:Variable|b:variable)[\s\S]*?\*\//gi, "");
  css = css.replace(/<(?:Variable|b:variable)\b[^>]*\/?>/gi, "");
  css = css.replace(/\$\(([a-zA-Z0-9_.-]+)\)/g, (_m, name: string) => vars[name] ?? "inherit");

  // 4. Extract <body> attributes & content
  const bodyOpenMatch = xml.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
  let bodyAttrs = bodyOpenMatch ? bodyOpenMatch[1] : "";
  let html = bodyOpenMatch ? bodyOpenMatch[2] : xml;

  // Clean expr:* on <body> attributes
  bodyAttrs = bodyAttrs.replace(/\bexpr:class\s*=\s*(['"])([\s\S]*?)\1/gi, (_m, _q: string, expr: string) => {
    const decoded = expr.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const literals = [...decoded.matchAll(/["']([a-zA-Z0-9_\s-]+)["']/g)].map((x) => x[1].trim());
    return literals.length ? `class="${literals.join(" ")}"` : "";
  });
  bodyAttrs = bodyAttrs.replace(/\bexpr:[a-zA-Z0-9_-]+\s*=\s*(['"])[\s\S]*?\1/gi, "");

  // Remove <b:widget-settings> blocks
  html = html.replace(/<b:widget-settings\b[^>]*>[\s\S]*?<\/b:widget-settings>/gi, "");

  // Expand <b:widget> includables properly (resolving <b:include name='...'/>!)
  html = html.replace(/<b:widget\b([^/>]*?)>([\s\S]*?)<\/b:widget>/gi, (_m, _attrs: string, wInner: string) => {
    return expandWidgetIncludables(wInner);
  });
  // Also handle any top-level <b:includable> outside <b:widget>
  if (/<b:includable\b/i.test(html)) {
    html = expandWidgetIncludables(html);
  }

  // Evaluate <b:if> / <b:elseif> / <b:else/>
  html = resolveBloggerConditionals(html, view);

  // Sample posts for <b:loop values='data:posts' ...>
  const samplePosts = [
    {
      url: "#post-gis-specialist",
      title: "خارطة الطريق الكاملة لاحتراف نظم المعلومات الجغرافية GIS",
      date: "16 مايو 2026",
      snippet: "تعرّف على المهارات الأساسية في ArcGIS Pro وقواعد البيانات الجغرافية وبناء الخرائط الرقمية الحديثة.",
      body: "<p>تعد نظم المعلومات الجغرافية ركيزة أساسية في التخطيط العمراني وإدارة الموارد والشبكات الحديثة، وتجمع بين التحليل المكاني الدقيق والتصميم الكارتوجرافي الواضح.</p><blockquote>إتقان الأساسيات التطبيقية وبناء مشاريع حقيقية هو الطريق الأقصر للاحتراف المهني.</blockquote>",
    },
    {
      url: "#post-spatial-modeling",
      title: "مبادئ التحليل المكاني والنمذجة الشبكية في المشاريع الكبرى",
      date: "11 مايو 2026",
      snippet: "خطوات عملية لتصميم نماذج معالجة البيانات المكانية وتحليل شبكات الطرق والمرافق بكفاءة عالية.",
      body: "<p>يشرح هذا المقال كيفية بناء نماذج مكانية قابلة للتكرار واختبار جودة البيانات الطوبولوجية.</p>",
    },
  ];

  html = html.replace(/<b:loop\b([^/>]*?)>([\s\S]*?)<\/b:loop>/gi, (_m, attrs: string, inner: string) => {
    if (/posts/i.test(attrs)) {
      return samplePosts
        .map((p) =>
          inner
            .replace(/\bexpr:href\s*=\s*['"]data:post\.url['"]/gi, `href="${p.url}" data-blogger-expr="data:post.url"`)
            .replace(/<data:post\.title\s*\/>/gi, p.title)
            .replace(/<data:post\.date\s*\/>/gi, p.date)
            .replace(/<data:post\.timestamp\s*\/>/gi, p.date)
            .replace(/<data:post\.snippets\.short\s*\/>/gi, p.snippet)
            .replace(/<data:post\.snippet\s*\/>/gi, p.snippet)
            .replace(/<data:post\.body\s*\/>/gi, p.body)
        )
        .join("\n");
    }
    return inner;
  });

  // Clean CDATA wrappers inside inline <script> blocks BEFORE tag transformations
  const scriptsStore: string[] = [];
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_m, attrs: string, code: string) => {
    const cleaned = code
      .replace(/\/\/\s*<!\[CDATA\[/g, "")
      .replace(/\/\/\s*\]\]>/g, "")
      .replace(/<!\[CDATA\[/g, "")
      .replace(/\]\]>/g, "")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
    const token = `__UX_SCRIPT_PLACEHOLDER_${scriptsStore.length}__`;
    scriptsStore.push(`<script${attrs}>${escapeForScript(cleaned)}</script>`);
    return token;
  });

  // Preserve expr:href as inspectable Blogger dynamic links
  html = html.replace(/\bexpr:href\s*=\s*(['"])([^'"]*)\1/gi, (_m, _q: string, expr: string) => {
    const cleanExpr = expr.trim();
    const fallbackHref = /homepageUrl/i.test(cleanExpr) ? "#homepage" : "#blogger-link";
    return `href="${fallbackHref}" data-blogger-expr="${escapeAttrValue(cleanExpr, '"')}"`;
  });

  // Extract static classes from expr:class so styling never breaks
  html = html.replace(/\bexpr:class\s*=\s*(['"])([\s\S]*?)\1/gi, (_m, _q: string, expr: string) => {
    const decoded = expr.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const literals = [...decoded.matchAll(/["']([a-zA-Z0-9_\s-]+)["']/g)].map((x) => x[1].trim());
    return literals.length ? `class="${literals.join(" ")}"` : "";
  });

  html = html
    .replace(/\bexpr:src\s*=\s*(['"])([^'"]*)\1/gi, 'src=""')
    .replace(/\bexpr:[a-zA-Z0-9_-]+\s*=\s*(['"])[\s\S]*?\1/gi, "");

  // Replace <data:.../> placeholders
  const singlePost = samplePosts[0];
  html = html
    .replace(/<data:blog\.title\s*\/>/gi, "KIOGRAPHY")
    .replace(/<data:blog\.pageTitle\s*\/>/gi, "KIOGRAPHY — دورة تأهيل أخصائي GIS محترف")
    .replace(/<data:blog\.pageName\s*\/>/gi, "أرشيف المقالات")
    .replace(/<data:post\.title\s*\/>/gi, singlePost.title)
    .replace(/<data:post\.date\s*\/>/gi, singlePost.date)
    .replace(/<data:post\.snippets\.short\s*\/>/gi, singlePost.snippet)
    .replace(/<data:post\.body\s*\/>/gi, singlePost.body)
    .replace(/<data:[^>]+\/>/gi, "");

  // Strip remaining Blogger namespace tags (<b:section>, <b:include>, <b:eval>, etc.)
  html = html.replace(/<\/?b:[^>]+>/gi, "");

  // Expand XML self-closing non-void HTML tags (<div .../> -> <div ...></div>)
  html = expandXmlSelfClosingHtmlTags(html);

  // Restore inline <script> blocks
  html = html.replace(/__UX_SCRIPT_PLACEHOLDER_(\d+)__/g, (_m, idx: string) => {
    return scriptsStore[Number(idx)] ?? "";
  });

  const safeAgent = escapeForScript(SANDBOX_AGENT_CODE);
  const safeShim = escapeForScript(SANDBOX_HEAD_SHIM);

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}"${htmlClass ? ` class="${htmlClass}"` : ""}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${headLinks}
  <script>${safeShim}</script>
  <style>${extraHeadStyles}\n${css}</style>
</head>
<body${bodyAttrs}>
${html}
<script>${safeAgent}</script>
</body>
</html>`;
}

// =========================================================
// Smart Edit Engine: Programmatic Code Surgery, Reorder & Link Wrapping
// =========================================================

const INLINE_TAGS = new Set(["span", "strong", "em", "b", "i", "small", "code", "a"]);

/**
 * Formats an outerHTML snippet cleanly so Old Code vs New Code comparison is crisp and readable.
 */
export function prettyFormatHtmlSnippet(rawHtml: string): string {
  const cleaned = rawHtml
    .replace(/\s*class="([^"]*)"/g, (_m, cls: string) => {
      const f = cls
        .split(/\s+/)
        .filter((c) => c && !c.startsWith("__ux"))
        .join(" ");
      return f ? ` class="${f}"` : "";
    })
    .trim();

  // Keep short single-line elements compact
  if (cleaned.length < 95 && !cleaned.includes("\n")) return cleaned;

  const tokens = cleaned
    .replace(/>\s+</g, ">\n<")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  let indent = 0;
  const lines: string[] = [];

  for (const tok of tokens) {
    const closeMatch = tok.match(/^<\/([a-zA-Z0-9:-]+)>/);
    const openMatch = tok.match(/^<([a-zA-Z0-9:-]+)(\s[^>]*)?>$/);
    const selfClosing =
      tok.endsWith("/>") ||
      (openMatch && HTML_VOID_OR_SVG_SELF_CLOSING.has(openMatch[1].toLowerCase())) ||
      /^<[a-zA-Z0-9:-]+(\s[^>]*)?>[\s\S]*<\/[a-zA-Z0-9:-]+>$/.test(tok);

    if (closeMatch) {
      indent = Math.max(0, indent - 1);
    }

    lines.push("  ".repeat(indent) + tok);

    if (openMatch && !selfClosing && !INLINE_TAGS.has(openMatch[1].toLowerCase())) {
      indent++;
    }
  }

  return lines.join("\n");
}

/**
 * Extracts CSS rule blocks relevant to the selected element so Smart Code Modal shows Old vs New CSS.
 */
export function extractElementCssSnippet(
  selected: SelectedElementPayload,
  cssOrXml: string,
  mode: EditorMode
): { targetSelector: string; cssBlock: string } {
  let rawCss = cssOrXml;
  if (mode === "blogger") {
    const skinMatch = cssOrXml.match(/<b:skin[^>]*>([\s\S]*?)<\/b:skin>/i);
    rawCss = skinMatch ? skinMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "") : "";
  }

  const targetSelector =
    selected.id
      ? `#${selected.id}`
      : selected.sharedClassSelector || selected.selector;

  const candidates = [
    selected.selector,
    selected.id ? `#${selected.id}` : "",
    selected.sharedClassSelector || "",
  ].filter(Boolean);

  for (const cand of candidates) {
    const esc = escapeRegExp(cand.trim());
    const re = new RegExp(`(^|\\}|\\{)\\s*(${esc})\\s*\\{([^}]*)\\}`);
    const m = rawCss.match(re);
    if (m) {
      const bodyLines = m[3]
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `  ${s};`);
      return {
        targetSelector: m[2].trim(),
        cssBlock: `${m[2].trim()} {\n${bodyLines.join("\n")}\n}`,
      };
    }
  }

  return {
    targetSelector,
    cssBlock: `${targetSelector} {\n  /* أضف خصائص CSS المخصصة هنا */\n}`,
  };
}

/**
 * Applies a full edited CSS rule block (`selector { ... }`) back into Normal CSS or Blogger `<b:skin>`.
 */
export function applyCssRuleBlockToSource(
  mode: EditorMode,
  cssOrXml: string,
  fallbackSelector: string,
  editedCssBlock: string
): string {
  const applyToCss = (rawCss: string): string => {
    const blockMatch = editedCssBlock.trim().match(/^([^{]+)\{([\s\S]*)\}$/);
    const sel = (blockMatch ? blockMatch[1] : fallbackSelector).trim();
    const inner = (blockMatch ? blockMatch[2] : editedCssBlock)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();

    const esc = escapeRegExp(sel);
    const existingRe = new RegExp(
      `(^|\\}|\\{)((?:\\s|\\/\\*[\\s\\S]*?\\*\\/)*)(${esc})\\s*\\{([^}]*)\\}`,
      "g"
    );

    if (existingRe.test(rawCss)) {
      return rawCss.replace(
        existingRe,
        (_f, boundary: string, between: string, matchedSel: string) => {
          const formattedBody = inner
            ? `\n  ${inner
                .split(";")
                .map((d) => d.trim())
                .filter(Boolean)
                .join(";\n  ")};\n`
            : "\n";
          return `${boundary}${between}${matchedSel} {${formattedBody}}`;
        }
      );
    }

    if (!inner) return rawCss;
    const base = rawCss.trimEnd();
    const formattedBody = inner
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .join(";\n  ");
    return `${base}${base ? "\n\n" : ""}${sel} {\n  ${formattedBody};\n}`;
  };

  if (mode === "normal") {
    return applyToCss(cssOrXml);
  }

  const skinRegex = /(<b:skin[^>]*>)([\s\S]*?)(<\/b:skin>)/i;
  const match = cssOrXml.match(skinRegex);
  if (!match) return cssOrXml;
  const cleanCss = match[2].replace(/<!\[CDATA\[|\]\]>/g, "");
  const updatedCss = applyToCss(cleanCss);
  return cssOrXml.replace(
    skinRegex,
    () => `${match[1]}<![CDATA[\n${updatedCss.trim()}\n  ]]>${match[3]}`
  );
}

/**
 * Parses CSS declarations from a rule block (`selector { prop: val; ... }`) into `{ property, value }[]`
 * so live sandbox preview stays 100% synced without reloading the iframe.
 */
export function parseCssDeclarations(cssBlock: string): { property: string; value: string }[] {
  const m = cssBlock.trim().match(/\{([\s\S]*)\}/);
  const body = (m ? m[1] : cssBlock).replace(/\/\*[\s\S]*?\*\//g, "");
  const out: { property: string; value: string }[] = [];
  for (const part of body.split(";")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const prop = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (prop && val) out.push({ property: prop, value: val });
  }
  return out;
}

/**
 * Replaces an element's outerHTML inside Normal Mode HTML.
 */
export function replaceElementOuterHtmlInNormalHtml(
  html: string,
  selector: string,
  newOuterHtml: string
): { html: string; matched: boolean } {
  return mutateNormalHtmlDom(html, (doc) => {
    const el = doc.querySelector(selector);
    if (!el || !el.parentElement || el.tagName.toLowerCase() === "body") return false;
    const temp = doc.createElement("div");
    temp.innerHTML = newOuterHtml.trim();
    const replacement = temp.firstElementChild;
    if (!replacement) return false;
    el.parentElement.replaceChild(replacement, el);
    return true;
  });
}

function findBalancedTagSpanInXml(
  xml: string,
  selected: SelectedElementPayload
): { start: number; end: number } | null {
  const tag = escapeRegExp(selected.tagName);
  const primaryClass = selected.classes[0];
  const textSnippet = (selected.directText || selected.innerText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  const openRe = new RegExp(`<${tag}\\b([^>]*)>`, "gi");

  let bestStart = -1;
  let bestOpenLen = 0;
  let bestSelfClose = false;
  let bestScore = 0;
  let m: RegExpExecArray | null;

  while ((m = openRe.exec(xml)) !== null) {
    const fullOpen = m[0];
    const attrs = m[1];
    const isSelfClose = fullOpen.endsWith("/>");
    let score = 1;
    if (selected.id && new RegExp(`\\bid\\s*=\\s*['"]${escapeRegExp(selected.id)}['"]`).test(attrs)) {
      score += 25;
    }
    if (primaryClass && attrs.includes(primaryClass)) score += 6;
    if (selected.linkInfo?.rawHref && attrs.includes(selected.linkInfo.rawHref)) score += 10;

    const ahead = xml.slice(m.index + fullOpen.length, m.index + fullOpen.length + 220);
    if (textSnippet && ahead.includes(textSnippet)) score += 9;

    if (score > bestScore && score >= 6) {
      bestScore = score;
      bestStart = m.index;
      bestOpenLen = fullOpen.length;
      bestSelfClose = isSelfClose;
    }
  }

  if (bestStart === -1) return null;
  if (bestSelfClose) return { start: bestStart, end: bestStart + bestOpenLen };

  const tokenRe = new RegExp(`<(\\/?)${tag}\\b([^>]*)>`, "gi");
  tokenRe.lastIndex = bestStart + bestOpenLen;
  let depth = 1;
  let tm: RegExpExecArray | null;

  while ((tm = tokenRe.exec(xml)) !== null) {
    const isClosing = tm[1] === "/";
    const selfClosing = tm[0].endsWith("/>");
    if (!isClosing && !selfClosing) depth++;
    else if (isClosing) {
      depth--;
      if (depth === 0) {
        return { start: bestStart, end: tm.index + tm[0].length };
      }
    }
  }

  return null;
}

function ensureWellFormedVoidTagsForXml(markup: string): string {
  return markup.replace(
    /<(img|input|br|hr|meta|link)\b([^>]*?)>/gi,
    (full, tag: string, attrs: string) => {
      if (full.endsWith("/>")) return full;
      return `<${tag}${attrs}/>`;
    }
  );
}

/**
 * Replaces a balanced HTML element block inside a Blogger XML template safely.
 */
export function replaceElementOuterHtmlInBloggerXml(
  xml: string,
  selected: SelectedElementPayload,
  newOuterHtml: string
): { xml: string; matched: boolean } {
  const span = findBalancedTagSpanInXml(xml, selected);
  if (!span) return { xml, matched: false };
  const safeXmlFragment = ensureWellFormedVoidTagsForXml(newOuterHtml.trim());
  return {
    xml: xml.slice(0, span.start) + safeXmlFragment + xml.slice(span.end),
    matched: true,
  };
}

/**
 * Reorders an element before its previous sibling or after its next sibling in Normal Mode HTML.
 */
export function reorderElementInNormalHtml(
  html: string,
  selector: string,
  direction: "prev" | "next"
): { html: string; matched: boolean } {
  return mutateNormalHtmlDom(html, (doc) => {
    const el = doc.querySelector(selector);
    if (!el || !el.parentElement || el.tagName.toLowerCase() === "body") return false;
    if (direction === "prev") {
      const prev = el.previousElementSibling;
      if (!prev) return false;
      el.parentElement.insertBefore(el, prev);
      return true;
    }
    const next = el.nextElementSibling;
    if (!next) return false;
    el.parentElement.insertBefore(next, el);
    return true;
  });
}

/**
 * Reorders a sibling element inside Blogger XML when adjacent siblings share the same tag structure.
 */
export function reorderElementInBloggerXml(
  xml: string,
  selected: SelectedElementPayload,
  direction: "prev" | "next"
): { xml: string; matched: boolean } {
  const curSpan = findBalancedTagSpanInXml(xml, selected);
  if (!curSpan) return { xml, matched: false };

  const curChunk = xml.slice(curSpan.start, curSpan.end);
  const tag = escapeRegExp(selected.tagName);

  if (direction === "next") {
    const afterSlice = xml.slice(curSpan.end);
    const nextOpenMatch = afterSlice.match(new RegExp(`^(\\s*)<${tag}\\b([^>]*)>`, "i"));
    if (!nextOpenMatch) return { xml, matched: false };
    const ws = nextOpenMatch[1];
    const nextStart = curSpan.end + ws.length;
    const openLen = nextOpenMatch[0].length - ws.length;
    const isSelf = nextOpenMatch[0].endsWith("/>");
    let nextEnd = nextStart + openLen;
    if (!isSelf) {
      const tokRe = new RegExp(`<(\\/?)${tag}\\b([^>]*)>`, "gi");
      tokRe.lastIndex = nextEnd;
      let d = 1;
      let tm: RegExpExecArray | null;
      while ((tm = tokRe.exec(xml)) !== null) {
        if (tm[1] !== "/" && !tm[0].endsWith("/>")) d++;
        else if (tm[1] === "/") {
          d--;
          if (d === 0) {
            nextEnd = tm.index + tm[0].length;
            break;
          }
        }
      }
    }
    const nextChunk = xml.slice(nextStart, nextEnd);
    return {
      xml: xml.slice(0, curSpan.start) + nextChunk + ws + curChunk + xml.slice(nextEnd),
      matched: true,
    };
  }

  // direction === "prev": find closing `</tag>` right before curSpan.start
  const beforeSlice = xml.slice(0, curSpan.start);
  const prevCloseMatch = beforeSlice.match(new RegExp(`<\\/${tag}>(\\s*)$`, "i"));
  if (!prevCloseMatch) return { xml, matched: false };
  const ws = prevCloseMatch[1];
  const prevEnd = curSpan.start - ws.length;

  // Scan backwards for balanced `<tag ...>`
  const allTokens = [...xml.slice(0, prevEnd).matchAll(new RegExp(`<(\\/?)${tag}\\b([^>]*)>`, "gi"))];
  let depth = 0;
  let prevStart = -1;
  for (let i = allTokens.length - 1; i >= 0; i--) {
    const t = allTokens[i];
    const isClose = t[1] === "/";
    const isSelf = t[0].endsWith("/>");
    if (isClose) depth++;
    else if (!isSelf) {
      depth--;
      if (depth === 0) {
        prevStart = t.index ?? -1;
        break;
      }
    }
  }
  if (prevStart === -1) return { xml, matched: false };
  const prevChunk = xml.slice(prevStart, prevEnd);
  return {
    xml: xml.slice(0, prevStart) + curChunk + ws + prevChunk + xml.slice(curSpan.end),
    matched: true,
  };
}

/**
 * Attaches/wraps a hyperlink on a non-link element (e.g., turning a heading, badge, or image into a clickable link).
 */
export function attachLinkToElementInSource(
  mode: EditorMode,
  source: string,
  selected: SelectedElementPayload,
  href: string,
  openNewTab: boolean
): { source: string; wrappedHtml: string; matched: boolean } {
  const cleanHref = escapeAttrValue(href.trim(), '"');
  const targetAttrs = openNewTab ? ' target="_blank" rel="noopener noreferrer"' : "";
  const wrappedHtml = `<a href="${cleanHref}"${targetAttrs} style="text-decoration:inherit;color:inherit;display:inline-block;">${selected.outerHTML}</a>`;

  if (mode === "normal") {
    const res = replaceElementOuterHtmlInNormalHtml(source, selected.selector, wrappedHtml);
    return { source: res.html, wrappedHtml, matched: res.matched };
  }
  const res = replaceElementOuterHtmlInBloggerXml(source, selected, wrappedHtml);
  return { source: res.xml, wrappedHtml, matched: res.matched };
}

