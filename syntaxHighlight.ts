function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightAttrs(attrsRaw: string): string {
  // Single-pass over attribute names and quoted values
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(\s*=\s*)("[^"]*"|'[^']*')|([a-zA-Z_:][-a-zA-Z0-9_:.]*)/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrsRaw)) !== null) {
    if (m.index > last) out += esc(attrsRaw.slice(last, m.index));
    if (m[1] !== undefined) {
      const isBloggerAttr = /^(b:|expr:|xmlns)/.test(m[1]);
      out += `<span class="${isBloggerAttr ? "tok-blogger" : "tok-attr"}">${esc(m[1])}</span>`;
      out += esc(m[2]);
      out += `<span class="tok-str">${esc(m[3])}</span>`;
    } else if (m[4] !== undefined) {
      out += `<span class="tok-attr">${esc(m[4])}</span>`;
    }
    last = m.index + m[0].length;
  }
  if (last < attrsRaw.length) out += esc(attrsRaw.slice(last));
  return out;
}

function highlightMarkup(code: string): string {
  const tokenRe =
    /(<!--[\s\S]*?-->)|(<!\[CDATA\[|\]\]>)|(<\?[\s\S]*?\?>)|(<!DOCTYPE[^>]*>)|(<\/?)([a-zA-Z_][-a-zA-Z0-9_:.]*)((?:\s+[^<>]*?)?)(\/?>)/gi;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(code)) !== null) {
    if (m.index > last) out += esc(code.slice(last, m.index));

    if (m[1]) {
      out += `<span class="tok-comment">${esc(m[1])}</span>`;
    } else if (m[2]) {
      out += `<span class="tok-blogger">${esc(m[2])}</span>`;
    } else if (m[3] || m[4]) {
      out += `<span class="tok-comment">${esc(m[3] || m[4])}</span>`;
    } else {
      const openBracket = m[5];
      const tagName = m[6];
      const attrs = m[7] || "";
      const closeBracket = m[8];
      const isBloggerTag = /^(b:|data:|Variable\b)/i.test(tagName);
      const cls = isBloggerTag ? "tok-blogger" : "tok-tag";
      out += `<span class="${cls}">${esc(openBracket + tagName)}</span>`;
      if (attrs) out += highlightAttrs(attrs);
      out += `<span class="${cls}">${esc(closeBracket)}</span>`;
    }
    last = m.index + m[0].length;
  }
  if (last < code.length) out += esc(code.slice(last));
  return out;
}

export function highlightCss(code: string): string {
  const tokenRe =
    /(\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*')|(#[0-9a-fA-F]{3,8}\b)|(\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms|deg|fr)?\b)|(--[-a-zA-Z0-9_]+)|([a-zA-Z-]+)(\s*:)/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(code)) !== null) {
    if (m.index > last) out += esc(code.slice(last, m.index));
    if (m[1]) {
      out += `<span class="tok-comment">${esc(m[1])}</span>`;
    } else if (m[2]) {
      out += `<span class="tok-str">${esc(m[2])}</span>`;
    } else if (m[3] || m[4]) {
      out += `<span class="tok-num">${esc(m[3] || m[4])}</span>`;
    } else if (m[5]) {
      out += `<span class="tok-attr">${esc(m[5])}</span>`;
    } else if (m[6]) {
      out += `<span class="tok-prop">${esc(m[6])}</span>${esc(m[7])}`;
    }
    last = m.index + m[0].length;
  }
  if (last < code.length) out += esc(code.slice(last));
  return out;
}

const JS_KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "break",
  "new",
  "try",
  "catch",
  "finally",
  "throw",
  "async",
  "await",
  "true",
  "false",
  "null",
  "undefined",
  "this",
  "typeof",
  "class",
]);

export function highlightJs(code: string): string {
  const tokenRe =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(code)) !== null) {
    if (m.index > last) out += esc(code.slice(last, m.index));
    if (m[1]) {
      out += `<span class="tok-comment">${esc(m[1])}</span>`;
    } else if (m[2]) {
      out += `<span class="tok-str">${esc(m[2])}</span>`;
    } else if (m[3]) {
      out += `<span class="tok-num">${esc(m[3])}</span>`;
    } else if (m[4]) {
      const word = m[4];
      if (JS_KEYWORDS.has(word)) {
        out += `<span class="tok-kw">${esc(word)}</span>`;
      } else if (word === "document" || word === "window" || word === "console") {
        out += `<span class="tok-prop">${esc(word)}</span>`;
      } else {
        out += esc(word);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < code.length) out += esc(code.slice(last));
  return out;
}

export function highlightCode(
  code: string,
  lang: "html" | "xml" | "css" | "js"
): string {
  // Guard very large files (>65KB) from regex overhead while keeping instant typing
  if (code.length > 65000) return esc(code) + "\n";
  let res = "";
  if (lang === "css") res = highlightCss(code);
  else if (lang === "js") res = highlightJs(code);
  else res = highlightMarkup(code);
  // Trailing newline ensures <pre> matches <textarea> height when code ends with '\n'
  return res + "\n";
}

/**
 * Clean lightweight formatter for CSS and simple HTML/JS blocks.
 */
export function formatCode(
  code: string,
  lang: "html" | "xml" | "css" | "js"
): string {
  if (lang === "css") {
    const normalized = code
      .replace(/\s*\{\s*/g, " {\n  ")
      .replace(/;\s*/g, ";\n  ")
      .replace(/\s*\}\s*/g, "\n}\n\n");
    return normalized
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Trim trailing whitespace on each line and collapse excessive blank lines
  return code
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
