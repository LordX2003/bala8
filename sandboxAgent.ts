/**
 * Injected into <head> BEFORE user scripts so Web Storage never throws SecurityError
 * in sandboxed srcdoc iframes, and addEventListener/console/errors are captured accurately.
 */
export const SANDBOX_HEAD_SHIM = `(function () {
  function createMemoryStorage() {
    var store = Object.create(null);
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[String(k)] = String(v); },
      removeItem: function (k) { delete store[String(k)]; },
      clear: function () { store = Object.create(null); },
      key: function (i) { var keys = Object.keys(store); return keys[i] || null; },
      get length() { return Object.keys(store).length; }
    };
  }
  try {
    var _ls = window.localStorage;
    _ls.getItem('__test__');
  } catch (_) {
    try { Object.defineProperty(window, 'localStorage', { value: createMemoryStorage(), configurable: true }); } catch (__) {}
  }
  try {
    var _ss = window.sessionStorage;
    _ss.getItem('__test__');
  } catch (_) {
    try { Object.defineProperty(window, 'sessionStorage', { value: createMemoryStorage(), configurable: true }); } catch (__) {}
  }

  var listenerMap = new WeakMap();
  var origAdd = EventTarget.prototype.addEventListener;
  window.__agentInternal = false;

  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (fn && !window.__agentInternal) {
      if (!listenerMap.has(this)) listenerMap.set(this, []);
      var src = typeof fn === 'function'
        ? fn.toString().replace(/\\s+/g, ' ').trim().slice(0, 320)
        : String(fn);
      listenerMap.get(this).push({ type: String(type), source: src });
    }
    return origAdd.call(this, type, fn, opts);
  };

  window.__getListeners = function (el) {
    var list = (listenerMap.get(el) || []).slice();
    if (el && el.getAttribute) {
      var inlineClick = el.getAttribute('onclick');
      if (inlineClick) list.push({ type: 'click (onclick)', source: inlineClick.slice(0, 320) });
    }
    return list;
  };

  function postConsole(level, args) {
    try {
      var msg = Array.prototype.map.call(args, function (a) {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch (_) { return String(a); }
      }).join(' ');
      parent.postMessage({ type: 'SANDBOX_CONSOLE', payload: { level: level, message: msg } }, '*');
    } catch (_) {}
  }

  var origLog = console.log, origWarn = console.warn, origErr = console.error;
  console.log = function () { postConsole('log', arguments); return origLog.apply(console, arguments); };
  console.warn = function () { postConsole('warn', arguments); return origWarn.apply(console, arguments); };
  console.error = function () { postConsole('error', arguments); return origErr.apply(console, arguments); };

  var origAlert = window.alert;
  window.alert = function (msg) {
    postConsole('alert', [msg]);
    try { if (typeof origAlert === 'function') origAlert.call(window, msg); } catch (_) {}
  };

  window.addEventListener('error', function (e) {
    parent.postMessage({
      type: 'SANDBOX_ERROR',
      payload: { message: e && e.message ? e.message : 'Runtime error' }
    }, '*');
  });
})();`;

/**
 * Injected at the end of <body> to power:
 * - Classic Inspect Mode + Smart Edit Mode (Full-Screen Interactive + Right-Click Context Menu)
 * - Precision CAD Geometric Move Engine (Smart Alignment Guides, Distance Rulers, Grid Snap, DOM Reorder)
 * - Programmatic Live HTML/CSS Replacement & Revert
 * - Links & Component Connections Scanner + Compound Element Atomic Decomposer
 */
export const SANDBOX_AGENT_CODE = `(function () {
  'use strict';
  window.__agentInternal = true;

  var inspectEnabled = false;
  var smartEditEnabled = false;
  var linkOverlayEnabled = false;
  var explodeEnabled = false;
  var isolatedSelector = null;

  var hoveredEl = null;
  var externalHoverEl = null;
  var selectedEl = null;
  var activeConnectionPair = null;
  var patchRules = Object.create(null);

  // Geometric Move Engine state
  var geoMove = {
    active: false,
    el: null,
    selector: '',
    initialX: 0,
    initialY: 0,
    x: 0,
    y: 0,
    dragging: false,
    dragStartMouseX: 0,
    dragStartMouseY: 0,
    dragOriginX: 0,
    dragOriginY: 0,
    gridStep: 1,
    smartSnap: true,
    snapLineX: null,
    snapLineY: null
  };

  // Studio overlay root
  var overlayRoot = document.createElement('div');
  overlayRoot.id = '__ux_analyzer_overlay__';
  overlayRoot.setAttribute('data-ux-ignore', 'true');
  overlayRoot.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483646;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;direction:ltr;';

  // SVG layer for connection curves AND geometric CAD rulers/guides
  var connSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  connSvg.setAttribute('width', '100%');
  connSvg.setAttribute('height', '100%');
  connSvg.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;';
  connSvg.innerHTML =
    '<defs><marker id="__ux_arrow__" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/></marker></defs>' +
    '<path id="__ux_conn_glow__" fill="none" stroke="rgba(56,189,248,0.28)" stroke-width="7" stroke-linecap="round"/>' +
    '<path id="__ux_conn_path__" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-dasharray="6 4" marker-end="url(#__ux_arrow__)"/>' +
    '<g id="__ux_cad_guides__"></g>';
  var connGlowPath = connSvg.querySelector('#__ux_conn_glow__');
  var connMainPath = connSvg.querySelector('#__ux_conn_path__');
  var cadGuidesGroup = connSvg.querySelector('#__ux_cad_guides__');

  var linkBadgesLayer = document.createElement('div');
  linkBadgesLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;';

  var hoverBox = document.createElement('div');
  hoverBox.style.cssText = 'position:fixed;display:none;border:1.5px dashed #60a5fa;background:rgba(96,165,250,0.09);border-radius:4px;pointer-events:none;transition:all 0.04s ease-out;';

  var hoverLabel = document.createElement('div');
  hoverLabel.style.cssText = 'position:fixed;display:none;background:rgba(15,19,29,0.95);color:#eef2ff;border:1px solid rgba(96,165,250,0.65);padding:3px 8px;border-radius:6px;font-size:11px;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,0.45);pointer-events:none;backdrop-filter:blur(6px);';

  var selectBox = document.createElement('div');
  selectBox.style.cssText = 'position:fixed;display:none;border:2px solid #34d399;background:rgba(52,211,153,0.06);border-radius:4px;pointer-events:none;box-shadow:0 0 0 1px rgba(9,11,17,0.45),0 0 16px rgba(52,211,153,0.22);';

  var selectLabel = document.createElement('div');
  selectLabel.style.cssText = 'position:fixed;display:none;background:#34d399;color:#090b11;font-weight:700;padding:2px 7px;border-radius:5px;font-size:10px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:none;';

  // Geometric CAD Drag Handle Frame
  var cadFrame = document.createElement('div');
  cadFrame.setAttribute('data-ux-ignore', 'true');
  cadFrame.style.cssText = 'position:fixed;display:none;border:2px solid #c084fc;background:rgba(192,132,252,0.1);border-radius:4px;cursor:move;pointer-events:auto;box-shadow:0 0 0 1px rgba(9,11,17,0.6),0 12px 32px rgba(192,132,252,0.28);';
  cadFrame.innerHTML =
    '<span style="position:absolute;top:-4px;left:-4px;width:8px;height:8px;background:#eef2ff;border:2px solid #c084fc;border-radius:2px;"></span>' +
    '<span style="position:absolute;top:-4px;right:-4px;width:8px;height:8px;background:#eef2ff;border:2px solid #c084fc;border-radius:2px;"></span>' +
    '<span style="position:absolute;bottom:-4px;left:-4px;width:8px;height:8px;background:#eef2ff;border:2px solid #c084fc;border-radius:2px;"></span>' +
    '<span style="position:absolute;bottom:-4px;right:-4px;width:8px;height:8px;background:#eef2ff;border:2px solid #c084fc;border-radius:2px;"></span>' +
    '<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px;border:1.5px solid #38bdf8;border-radius:50%;background:rgba(9,11,17,0.8);"></span>';

  var cadHudBadge = document.createElement('div');
  cadHudBadge.setAttribute('data-ux-ignore', 'true');
  cadHudBadge.style.cssText = 'position:fixed;display:none;background:rgba(9,11,17,0.94);color:#eef2ff;border:1px solid #c084fc;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.55);pointer-events:none;';

  var targetHighlightBox = document.createElement('div');
  targetHighlightBox.style.cssText = 'position:fixed;display:none;border:2px dashed #38bdf8;background:rgba(56,189,248,0.09);border-radius:6px;pointer-events:none;';

  overlayRoot.appendChild(connSvg);
  overlayRoot.appendChild(targetHighlightBox);
  overlayRoot.appendChild(linkBadgesLayer);
  overlayRoot.appendChild(selectBox);
  overlayRoot.appendChild(selectLabel);
  overlayRoot.appendChild(hoverBox);
  overlayRoot.appendChild(hoverLabel);
  overlayRoot.appendChild(cadFrame);
  overlayRoot.appendChild(cadHudBadge);
  document.documentElement.appendChild(overlayRoot);

  var liveStyleEl = document.createElement('style');
  liveStyleEl.id = '__ux_live_patches__';
  liveStyleEl.setAttribute('data-ux-ignore', 'true');
  document.head.appendChild(liveStyleEl);

  var inspectCursorStyle = document.createElement('style');
  inspectCursorStyle.setAttribute('data-ux-ignore', 'true');
  document.head.appendChild(inspectCursorStyle);

  var xrayStyle = document.createElement('style');
  xrayStyle.setAttribute('data-ux-ignore', 'true');
  document.head.appendChild(xrayStyle);

  var explodeStyle = document.createElement('style');
  explodeStyle.setAttribute('data-ux-ignore', 'true');
  document.head.appendChild(explodeStyle);

  var isolateStyle = document.createElement('style');
  isolateStyle.setAttribute('data-ux-ignore', 'true');
  document.head.appendChild(isolateStyle);

  function isIgnored(el) {
    if (!el || el.nodeType !== 1) return true;
    if (el === document.documentElement) return true;
    if (el.closest && el.closest('[data-ux-ignore="true"]')) return true;
    var tag = el.tagName.toLowerCase();
    return tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link' || tag === 'head' || tag === 'noscript';
  }

  function cssEscapeIdent(str) {
    if (window.CSS && CSS.escape) return CSS.escape(str);
    return String(str).replace(/([^a-zA-Z0-9_-])/g, '\\\\$1');
  }

  function isUnique(sel, target) {
    try {
      var list = document.querySelectorAll(sel);
      var filtered = [];
      for (var i = 0; i < list.length; i++) {
        if (!isIgnored(list[i])) filtered.push(list[i]);
      }
      return filtered.length === 1 && filtered[0] === target;
    } catch (_) {
      return false;
    }
  }

  function getValidClasses(el) {
    if (!el.classList || typeof el.className !== 'string') {
      if (el.getAttribute) {
        var rawCls = el.getAttribute('class') || '';
        return rawCls.split(/\\s+/).filter(function (c) { return c && !c.startsWith('__ux'); });
      }
      return [];
    }
    var out = [];
    for (var i = 0; i < el.classList.length; i++) {
      var c = el.classList[i];
      if (c && !c.startsWith('__ux')) out.push(c);
    }
    return out;
  }

  function getCleanSelector(el) {
    if (!el || el.nodeType !== 1) return 'body';
    var tag = el.tagName.toLowerCase();
    if (tag === 'body' || tag === 'html') return tag;

    if (el.id) {
      var idSel = '#' + cssEscapeIdent(el.id);
      if (isUnique(idSel, el)) return idSel;
    }

    var classes = getValidClasses(el);
    for (var i = 0; i < classes.length; i++) {
      var clsSel = '.' + cssEscapeIdent(classes[i]);
      if (isUnique(clsSel, el)) return clsSel;
    }

    if (classes.length > 0) {
      var tagCls = tag + '.' + cssEscapeIdent(classes[0]);
      if (isUnique(tagCls, el)) return tagCls;
    }

    if (isUnique(tag, el)) return tag;

    var parts = [];
    var cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body && cur !== document.documentElement) {
      var cTag = cur.tagName.toLowerCase();
      if (cur.id) {
        var cId = '#' + cssEscapeIdent(cur.id);
        parts.unshift(cId);
        var candId = parts.join(' > ');
        if (isUnique(candId, el)) return candId;
        break;
      }
      var cClasses = getValidClasses(cur);
      var step = cTag;
      if (cClasses.length > 0) {
        var withCls = cTag + '.' + cssEscapeIdent(cClasses[0]);
        var parent = cur.parentElement;
        if (parent) {
          try {
            var sameClsSibs = parent.querySelectorAll(':scope > ' + withCls);
            if (sameClsSibs.length === 1) step = withCls;
          } catch (_) {}
        }
      }
      if (step === cTag && cur.parentElement) {
        var sibs = cur.parentElement.children;
        var sameTagCount = 0;
        var idx = 0;
        for (var k = 0; k < sibs.length; k++) {
          if (isIgnored(sibs[k])) continue;
          if (sibs[k].tagName === cur.tagName) {
            sameTagCount++;
            if (sibs[k] === cur) idx = sameTagCount;
          }
        }
        if (sameTagCount > 1) step = cTag + ':nth-of-type(' + idx + ')';
      }
      parts.unshift(step);
      var candidate = parts.join(' > ');
      if (isUnique(candidate, el)) return candidate;
      cur = cur.parentElement;
    }

    return 'body > ' + parts.join(' > ');
  }

  function shortLabel(el) {
    var tag = el.tagName.toLowerCase();
    if (el.id) return tag + '#' + el.id;
    var cls = getValidClasses(el);
    if (cls.length > 0) return tag + '.' + cls[0];
    return tag;
  }

  function getBreadcrumbs(el) {
    var trail = [];
    var cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      if (!isIgnored(cur)) {
        trail.unshift({
          label: shortLabel(cur),
          selector: getCleanSelector(cur)
        });
      }
      if (cur === document.body) break;
      cur = cur.parentElement;
    }
    return trail;
  }

  function getCurrentTranslate(el) {
    if (!el || el.nodeType !== 1) return { x: 0, y: 0 };
    var cs = window.getComputedStyle(el);
    var tr = cs.transform || '';
    if (!tr || tr === 'none') return { x: 0, y: 0 };
    var m2d = tr.match(/^matrix\\(([^)]+)\\)$/);
    if (m2d) {
      var vals = m2d[1].split(',').map(function (v) { return parseFloat(v.trim()) || 0; });
      return { x: Math.round(vals[4] || 0), y: Math.round(vals[5] || 0) };
    }
    var m3d = tr.match(/^matrix3d\\(([^)]+)\\)$/);
    if (m3d) {
      var vals3 = m3d[1].split(',').map(function (v) { return parseFloat(v.trim()) || 0; });
      return { x: Math.round(vals3[12] || 0), y: Math.round(vals3[13] || 0) };
    }
    return { x: 0, y: 0 };
  }

  // =========================================================
  // Links, Buttons & Component Connections Scanner
  // =========================================================
  function getReadableElementLabel(el) {
    var txt = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
    if (txt) return txt.slice(0, 64);
    var aria = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('value') || el.getAttribute('name');
    if (aria) return aria.trim().slice(0, 64);
    var img = el.querySelector && el.querySelector('img[alt]');
    if (img && img.getAttribute('alt')) return img.getAttribute('alt').trim().slice(0, 64);
    var icon = el.querySelector && el.querySelector('i[class], svg');
    if (icon) {
      if (icon.tagName.toLowerCase() === 'svg') return 'زر بأيقونة SVG (' + shortLabel(el) + ')';
      var icls = icon.getAttribute('class') || '';
      return 'زر بأيقونة (' + icls.trim().split(/\\s+/).pop() + ')';
    }
    return shortLabel(el);
  }

  function analyzeInteractiveElement(el, idx) {
    var tag = el.tagName.toLowerCase();
    var sel = getCleanSelector(el);
    var rawHref = (el.getAttribute('href') || el.getAttribute('action') || '').trim();
    var bloggerExpr = el.getAttribute('data-blogger-expr') || '';
    var onclickCode = (el.getAttribute('onclick') || '').trim();
    var targetAttr = el.getAttribute('target') || '';
    var relAttr = el.getAttribute('rel') || '';
    var ariaControls = el.getAttribute('aria-controls') || '';
    var dataTab = el.getAttribute('data-tab') || '';
    var dataTarget = el.getAttribute('data-bs-target') || el.getAttribute('data-target') || '';
    var listeners = window.__getListeners ? window.__getListeners(el) : [];

    var linkedEl = null;
    var linkedSelector = '';
    var linkedTagLabel = '';
    var targetExists = undefined;

    if (rawHref.startsWith('#') && rawHref.length > 1 && !bloggerExpr) {
      var hashId = decodeURIComponent(rawHref.slice(1));
      linkedEl = document.getElementById(hashId) || document.querySelector('[name="' + cssEscapeIdent(hashId) + '"]');
      targetExists = Boolean(linkedEl);
      if (linkedEl) {
        linkedSelector = getCleanSelector(linkedEl);
        linkedTagLabel = shortLabel(linkedEl);
      } else {
        linkedSelector = '#' + hashId;
      }
    }

    if (!linkedEl && ariaControls) {
      var ctrlEl = document.getElementById(ariaControls);
      targetExists = Boolean(ctrlEl);
      linkedSelector = ctrlEl ? getCleanSelector(ctrlEl) : '#' + ariaControls;
      if (ctrlEl) {
        linkedEl = ctrlEl;
        linkedTagLabel = shortLabel(ctrlEl);
      }
    }
    if (!linkedEl && dataTab) {
      var tabPanel = document.getElementById('tab-' + dataTab) || document.getElementById(dataTab);
      if (tabPanel) {
        linkedEl = tabPanel;
        targetExists = true;
        linkedSelector = getCleanSelector(tabPanel);
        linkedTagLabel = shortLabel(tabPanel);
      }
    }
    if (!linkedEl && dataTarget) {
      try {
        var dtEl = document.querySelector(dataTarget);
        targetExists = Boolean(dtEl);
        linkedSelector = dtEl ? getCleanSelector(dtEl) : dataTarget;
        if (dtEl) {
          linkedEl = dtEl;
          linkedTagLabel = shortLabel(dtEl);
        }
      } catch (_) {}
    }
    if (!linkedEl && onclickCode) {
      var tabCall = onclickCode.match(/kgOpenTab\\s*\\(\\s*['"]([^'"]+)['"]/);
      if (tabCall && tabCall[1]) {
        var ocPanel = document.getElementById('tab-' + tabCall[1]);
        if (ocPanel) {
          linkedEl = ocPanel;
          targetExists = true;
          linkedSelector = getCleanSelector(ocPanel);
          linkedTagLabel = shortLabel(ocPanel);
        }
      }
      var idCall = onclickCode.match(/getElementById\\s*\\(\\s*['"]([^'"]+)['"]/);
      if (!linkedEl && idCall && idCall[1]) {
        var idEl = document.getElementById(idCall[1]);
        if (idEl) {
          linkedEl = idEl;
          targetExists = true;
          linkedSelector = getCleanSelector(idEl);
          linkedTagLabel = shortLabel(idEl);
        }
      }
    }

    var kind = 'empty';
    var destination = 'غير مرتبط برابط أو حدث';
    var status = 'valid';

    if (bloggerExpr) {
      kind = 'blogger-expr';
      destination = bloggerExpr;
      status = 'dynamic';
    } else if (/^(https?:\\/\\/|mailto:|tel:|\\/\\/)/i.test(rawHref)) {
      kind = 'external';
      destination = rawHref;
      status = 'valid';
    } else if (rawHref.startsWith('#') && rawHref.length > 1) {
      kind = 'anchor';
      destination = rawHref;
      status = targetExists === false ? 'warning' : 'valid';
    } else if (tag === 'form') {
      kind = 'form';
      destination = rawHref || '(إرسال لنفس الصفحة)';
      status = rawHref ? 'valid' : 'warning';
    } else if (linkedSelector) {
      kind = 'component-trigger';
      destination = linkedSelector;
      status = targetExists === false ? 'warning' : 'valid';
    } else if (onclickCode) {
      kind = 'js-action';
      destination = onclickCode.slice(0, 80);
      status = 'valid';
    } else if (listeners.length > 0) {
      kind = 'js-action';
      destination = 'حدث JS (' + listeners[0].type + ')';
      status = 'valid';
    } else if (rawHref && rawHref !== '#' && !rawHref.toLowerCase().startsWith('javascript:void')) {
      kind = 'external';
      destination = rawHref;
      status = 'valid';
    } else {
      kind = 'empty';
      destination = rawHref === '#' ? 'رابط فارغ (#)' : 'بدون رابط أو تفاعل';
      status = 'warning';
    }

    return {
      id: 'link-' + idx + '-' + sel,
      selector: sel,
      tagName: tag,
      label: getReadableElementLabel(el),
      kind: kind,
      destination: destination,
      rawHref: rawHref,
      bloggerExpr: bloggerExpr || undefined,
      onclickCode: onclickCode || undefined,
      targetAttr: targetAttr || undefined,
      relAttr: relAttr || undefined,
      linkedSelector: linkedSelector || undefined,
      linkedTagLabel: linkedTagLabel || undefined,
      targetExists: targetExists,
      listenerCount: listeners.length,
      status: status
    };
  }

  function scanPageLinks() {
    if (!document.body) return [];
    var candidates = document.body.querySelectorAll(
      'a, button, [role="button"], input[type="submit"], input[type="button"], form[action], [onclick], [aria-controls], [data-tab]'
    );
    var seen = new Set();
    var out = [];
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (isIgnored(el) || seen.has(el)) continue;
      seen.add(el);
      out.push(analyzeInteractiveElement(el, out.length));
    }
    return out;
  }

  function sendPageLinks() {
    parent.postMessage({ type: 'PAGE_LINKS', payload: scanPageLinks() }, '*');
  }

  // =========================================================
  // Compound Element Atomic Decomposer
  // =========================================================
  function decomposeCompoundElement(el) {
    if (!el || el.nodeType !== 1) return [];
    var parts = [];
    var parentSel = getCleanSelector(el);

    var textNodeCounter = 0;
    for (var n = 0; n < el.childNodes.length; n++) {
      var cn = el.childNodes[n];
      if (cn.nodeType === 3) {
        var currentTextIdx = textNodeCounter++;
        var trimmed = (cn.nodeValue || '').replace(/\\s+/g, ' ').trim();
        if (trimmed.length > 0) {
          parts.push({
            id: 'dtext-' + currentTextIdx,
            kind: 'direct-text',
            tagName: '#text',
            label: 'نص مدمج مباشر',
            selector: parentSel,
            textValue: trimmed,
            textNodeIndex: currentTextIdx
          });
        }
      }
    }

    function collectChildren(container, depth) {
      if (!container || depth > 2 || parts.length >= 18) return;
      var kids = container.children || [];
      for (var i = 0; i < kids.length && parts.length < 18; i++) {
        var child = kids[i];
        if (isIgnored(child)) continue;
        var cTag = child.tagName.toLowerCase();
        var cSel = getCleanSelector(child);

        if (cTag === 'svg' || (cTag === 'i' && (child.innerText || '').trim() === '')) {
          var iCls = child.getAttribute('class') || '';
          parts.push({
            id: 'icon-' + parts.length,
            kind: 'icon',
            tagName: cTag,
            label: cTag === 'svg' ? 'رسم متجهي SVG' : ('أيقونة ' + (iCls.split(/\\s+/).pop() || '<i>')),
            selector: cSel,
            textValue: '',
            iconClass: iCls
          });
          continue;
        }

        if (cTag === 'img' || cTag === 'video') {
          parts.push({
            id: 'media-' + parts.length,
            kind: 'media',
            tagName: cTag,
            label: child.getAttribute('alt') || ('عنصر وسائط <' + cTag + '>'),
            selector: cSel,
            textValue: child.getAttribute('alt') || '',
            href: child.getAttribute('src') || ''
          });
          continue;
        }

        if (cTag === 'a' || cTag === 'button') {
          var btnTxt = getDirectText(child) || (child.innerText || '').replace(/\\s+/g, ' ').trim();
          var btnHref = child.getAttribute('data-blogger-expr') || child.getAttribute('href') || child.getAttribute('onclick') || '';
          parts.push({
            id: 'btn-' + parts.length,
            kind: 'link-btn',
            tagName: cTag,
            label: cTag === 'a' ? 'رابط فرعي <a>' : 'زر فرعي <button>',
            selector: cSel,
            textValue: btnTxt,
            href: btnHref
          });
          continue;
        }

        var grandKids = child.children ? child.children.length : 0;
        var childText = (child.innerText || '').replace(/\\s+/g, ' ').trim();

        if (grandKids === 0 && childText.length > 0) {
          var firstCls = child.className && typeof child.className === 'string' ? child.className.trim().split(/\\s+/)[0] : '';
          parts.push({
            id: 'txt-' + parts.length,
            kind: 'text-el',
            tagName: cTag,
            label: firstCls ? ('.' + firstCls) : ('عنصر نصي (' + cTag + ')'),
            selector: cSel,
            textValue: childText
          });
        } else if (grandKids > 0) {
          var dTxt = getDirectText(child);
          if (dTxt.length > 0) {
            parts.push({
              id: 'txt-' + parts.length,
              kind: 'text-el',
              tagName: cTag,
              label: '<' + cTag + '> (عنوان مع أيقونة)',
              selector: cSel,
              textValue: dTxt
            });
          }
          if (depth < 2) {
            collectChildren(child, depth + 1);
          } else {
            parts.push({
              id: 'box-' + parts.length,
              kind: 'container',
              tagName: cTag,
              label: 'حاوية فرعية ' + shortLabel(child),
              selector: cSel,
              textValue: childText.slice(0, 40),
              childCount: grandKids
            });
          }
        }
      }
    }

    collectChildren(el, 1);
    return parts;
  }

  // =========================================================
  // Color, Contrast & Serialization
  // =========================================================
  function parseRgba(str) {
    if (!str) return null;
    var m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
    if (!m) return null;
    return [
      parseInt(m[1], 10),
      parseInt(m[2], 10),
      parseInt(m[3], 10),
      m[4] !== undefined ? parseFloat(m[4]) : 1
    ];
  }

  function blend(fg, bg) {
    var a = fg[3] + bg[3] * (1 - fg[3]);
    if (a === 0) return [255, 255, 255, 0];
    return [
      Math.round((fg[0] * fg[3] + bg[0] * bg[3] * (1 - fg[3])) / a),
      Math.round((fg[1] * fg[3] + bg[1] * bg[3] * (1 - fg[3])) / a),
      Math.round((fg[2] * fg[3] + bg[2] * bg[3] * (1 - fg[3])) / a),
      a
    ];
  }

  function getEffectiveBg(el) {
    var layers = [];
    var cur = el;
    while (cur && cur.nodeType === 1) {
      var bg = parseRgba(window.getComputedStyle(cur).backgroundColor);
      if (bg && bg[3] > 0) {
        layers.unshift(bg);
        if (bg[3] >= 0.999) break;
      }
      cur = cur.parentElement;
    }
    var acc = [255, 255, 255, 1];
    for (var i = 0; i < layers.length; i++) {
      acc = blend(layers[i], acc);
    }
    return acc;
  }

  function relLum(rgb) {
    var chan = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255].map(function (c) {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  }

  function toHex(rgb) {
    function h(n) { var s = Math.max(0, Math.min(255, Math.round(n))).toString(16); return s.length === 1 ? '0' + s : s; }
    return '#' + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
  }

  function computeContrast(el, cs) {
    var fgRaw = parseRgba(cs.color);
    if (!fgRaw) return null;
    var bg = getEffectiveBg(el);
    var fg = fgRaw[3] < 1 ? blend(fgRaw, bg) : fgRaw;
    var l1 = relLum(fg);
    var l2 = relLum(bg);
    var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    var rounded = Math.round(ratio * 100) / 100;
    var fontSize = parseFloat(cs.fontSize) || 16;
    var weight = parseInt(cs.fontWeight, 10) || 400;
    var isLarge = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    var level = 'Fail';
    if (ratio >= 7) level = 'AAA';
    else if (ratio >= 4.5) level = 'AA';
    else if (isLarge && ratio >= 3) level = 'AA Large';
    return {
      ratio: rounded,
      level: level,
      fg: toHex(fg),
      bg: toHex(bg),
      bgLum: l2
    };
  }

  function numPx(v) { return Math.round(parseFloat(v) || 0); }

  function getDirectText(el) {
    var out = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) out += el.childNodes[i].nodeValue;
    }
    return out.trim();
  }

  function getCleanOuterHTML(el) {
    var raw = el.outerHTML || '';
    return raw
      .replace(/\\s*data-blogger-expr="[^"]*"/g, '')
      .replace(/\\s*class="([^"]*)"/g, function (_m, cls) {
        var clean = cls.split(/\\s+/).filter(function (c) { return c && !c.startsWith('__ux'); }).join(' ');
        return clean ? ' class="' + clean + '"' : '';
      })
      .slice(0, 6000);
  }

  function serializeElement(el) {
    var cs = window.getComputedStyle(el);
    var r = el.getBoundingClientRect();
    var props = [
      'color', 'backgroundColor', 'borderColor',
      'padding', 'margin', 'borderRadius',
      'fontSize', 'fontWeight', 'textAlign', 'lineHeight',
      'display', 'width', 'height', 'boxShadow'
    ];
    var computed = {};
    for (var i = 0; i < props.length; i++) {
      computed[props[i]] = cs[props[i]] || '';
    }

    var attrs = {};
    if (el.attributes) {
      for (var a = 0; a < el.attributes.length; a++) {
        var at = el.attributes[a];
        if (!at.name.startsWith('data-ux') && at.name !== 'data-blogger-expr') attrs[at.name] = at.value;
      }
    }

    var classes = getValidClasses(el);
    var sharedClassSelector = null;
    var sharedMatchCount = 1;
    if (!el.id && classes.length > 0) {
      sharedClassSelector = '.' + cssEscapeIdent(classes[0]);
      try {
        sharedMatchCount = document.querySelectorAll(sharedClassSelector).length;
      } catch (_) {}
    }

    var boxModel = {
      margin: { top: numPx(cs.marginTop), right: numPx(cs.marginRight), bottom: numPx(cs.marginBottom), left: numPx(cs.marginLeft) },
      border: { top: numPx(cs.borderTopWidth), right: numPx(cs.borderRightWidth), bottom: numPx(cs.borderBottomWidth), left: numPx(cs.borderLeftWidth) },
      padding: { top: numPx(cs.paddingTop), right: numPx(cs.paddingRight), bottom: numPx(cs.paddingBottom), left: numPx(cs.paddingLeft) },
      content: {
        width: Math.max(0, Math.round(r.width) - numPx(cs.paddingLeft) - numPx(cs.paddingRight) - numPx(cs.borderLeftWidth) - numPx(cs.borderRightWidth)),
        height: Math.max(0, Math.round(r.height) - numPx(cs.paddingTop) - numPx(cs.paddingBottom) - numPx(cs.borderTopWidth) - numPx(cs.borderBottomWidth))
      }
    };

    var cInfo = computeContrast(el, cs);
    var hasChildren = el.children && el.children.length > 0;

    var tag = el.tagName.toLowerCase();
    var isLinkish =
      tag === 'a' ||
      tag === 'button' ||
      tag === 'form' ||
      el.hasAttribute('href') ||
      el.hasAttribute('onclick') ||
      el.hasAttribute('aria-controls') ||
      el.hasAttribute('data-tab') ||
      el.getAttribute('role') === 'button';
    var linkInfo = isLinkish ? analyzeInteractiveElement(el, 0) : null;

    // Collect attachedLinks: element itself + any interactive links/buttons nested inside it
    var attachedLinks = [];
    if (linkInfo) attachedLinks.push(linkInfo);
    if (el.querySelectorAll) {
      var nested = el.querySelectorAll('a, button, [onclick], [aria-controls], [data-tab]');
      for (var nl = 0; nl < nested.length && attachedLinks.length < 12; nl++) {
        if (!isIgnored(nested[nl]) && nested[nl] !== el) {
          attachedLinks.push(analyzeInteractiveElement(nested[nl], nl + 1));
        }
      }
    }

    if (linkInfo && linkInfo.linkedSelector && linkInfo.targetExists) {
      try {
        var targetDom = document.querySelector(linkInfo.linkedSelector);
        activeConnectionPair = targetDom ? { fromEl: el, toEl: targetDom } : null;
      } catch (_) {
        activeConnectionPair = null;
      }
    } else {
      activeConnectionPair = null;
    }

    var parentEl = el.parentElement;
    var parentSelector = (parentEl && !isIgnored(parentEl) && el !== document.body)
      ? getCleanSelector(parentEl)
      : null;

    var prevSib = el.previousElementSibling;
    while (prevSib && isIgnored(prevSib)) prevSib = prevSib.previousElementSibling;
    var nextSib = el.nextElementSibling;
    while (nextSib && isIgnored(nextSib)) nextSib = nextSib.nextElementSibling;

    return {
      tagName: tag,
      id: el.id || '',
      classes: classes,
      selector: getCleanSelector(el),
      parentSelector: parentSelector,
      canMovePrev: Boolean(prevSib) && el !== document.body,
      canMoveNext: Boolean(nextSib) && el !== document.body,
      currentTranslate: getCurrentTranslate(el),
      sharedClassSelector: sharedClassSelector,
      sharedMatchCount: sharedMatchCount,
      breadcrumbs: getBreadcrumbs(el),
      rect: {
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left)
      },
      boxModel: boxModel,
      computedStyles: computed,
      contrast: cInfo ? { ratio: cInfo.ratio, level: cInfo.level, fg: cInfo.fg, bg: cInfo.bg } : null,
      innerText: (el.innerText || '').trim(),
      directText: getDirectText(el),
      hasChildElements: Boolean(hasChildren),
      outerHTML: getCleanOuterHTML(el),
      attributes: attrs,
      listeners: window.__getListeners ? window.__getListeners(el) : [],
      linkInfo: linkInfo,
      attachedLinks: attachedLinks,
      compoundParts: hasChildren ? decomposeCompoundElement(el) : []
    };
  }

  function buildDomTree(rootEl, depth) {
    if (!rootEl || depth > 7 || isIgnored(rootEl)) return null;
    var kids = [];
    var children = rootEl.children || [];
    for (var i = 0; i < children.length && kids.length < 45; i++) {
      var childNode = buildDomTree(children[i], depth + 1);
      if (childNode) kids.push(childNode);
    }
    var txt = getDirectText(rootEl);
    if (txt.length > 32) txt = txt.slice(0, 32) + '…';
    return {
      tagName: rootEl.tagName.toLowerCase(),
      id: rootEl.id || '',
      classes: getValidClasses(rootEl).slice(0, 2),
      selector: getCleanSelector(rootEl),
      textPreview: txt,
      children: kids
    };
  }

  function sendDomTree() {
    if (!document.body) return;
    var tree = buildDomTree(document.body, 0);
    parent.postMessage({ type: 'DOM_TREE', payload: tree ? [tree] : [] }, '*');
  }

  // =========================================================
  // Precision CAD Geometric Move Overlay & Rulers
  // =========================================================
  function computeParentDistances(el) {
    var r = el.getBoundingClientRect();
    var p = el.parentElement && el.parentElement !== document.documentElement
      ? el.parentElement.getBoundingClientRect()
      : { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight };
    return {
      top: Math.round(r.top - p.top),
      left: Math.round(r.left - p.left),
      right: Math.round(p.right - r.right),
      bottom: Math.round(p.bottom - r.bottom),
      parentRect: p,
      elRect: r
    };
  }

  function renderCadMoveOverlay() {
    if (!geoMove.active || !geoMove.el || !geoMove.el.isConnected) {
      cadFrame.style.display = 'none';
      cadHudBadge.style.display = 'none';
      cadGuidesGroup.innerHTML = '';
      return;
    }

    var d = computeParentDistances(geoMove.el);
    var r = d.elRect;
    var p = d.parentRect;

    cadFrame.style.display = 'block';
    cadFrame.style.top = r.top + 'px';
    cadFrame.style.left = r.left + 'px';
    cadFrame.style.width = r.width + 'px';
    cadFrame.style.height = r.height + 'px';

    cadHudBadge.style.display = 'block';
    cadHudBadge.textContent =
      'X: ' + (geoMove.x >= 0 ? '+' : '') + geoMove.x + 'px   Y: ' + (geoMove.y >= 0 ? '+' : '') + geoMove.y + 'px   |   ' +
      Math.round(r.width) + '×' + Math.round(r.height);
    var hudTop = r.top - 30;
    if (hudTop < 6) hudTop = Math.min(window.innerHeight - 28, r.bottom + 8);
    cadHudBadge.style.top = hudTop + 'px';
    cadHudBadge.style.left = Math.max(6, Math.min(window.innerWidth - 230, r.left)) + 'px';

    // Build SVG distance rulers to parent + magnetic snap lines
    var svgParts = [];
    var midX = r.left + r.width / 2;
    var midY = r.top + r.height / 2;

    // Parent boundary outline
    svgParts.push(
      '<rect x="' + p.left + '" y="' + p.top + '" width="' + Math.max(0, p.width) + '" height="' + Math.max(0, p.height) + '" fill="none" stroke="rgba(56,189,248,0.3)" stroke-width="1" stroke-dasharray="4 4"/>'
    );

    // Top ruler line
    if (Math.abs(d.top) > 4 && r.top > p.top) {
      svgParts.push(
        '<line x1="' + midX + '" y1="' + p.top + '" x2="' + midX + '" y2="' + r.top + '" stroke="#fb923c" stroke-width="1.2" stroke-dasharray="3 3"/>' +
        '<rect x="' + (midX - 18) + '" y="' + ((p.top + r.top) / 2 - 8) + '" width="36" height="15" rx="4" fill="#090b11" stroke="#fb923c" stroke-width="0.8"/>' +
        '<text x="' + midX + '" y="' + ((p.top + r.top) / 2 + 3) + '" fill="#fb923c" font-size="9.5" font-family="monospace" text-anchor="middle">' + d.top + '</text>'
      );
    }

    // Left ruler line
    if (Math.abs(d.left) > 4 && r.left > p.left) {
      svgParts.push(
        '<line x1="' + p.left + '" y1="' + midY + '" x2="' + r.left + '" y2="' + midY + '" stroke="#fb923c" stroke-width="1.2" stroke-dasharray="3 3"/>' +
        '<rect x="' + ((p.left + r.left) / 2 - 18) + '" y="' + (midY - 8) + '" width="36" height="15" rx="4" fill="#090b11" stroke="#fb923c" stroke-width="0.8"/>' +
        '<text x="' + ((p.left + r.left) / 2) + '" y="' + (midY + 3) + '" fill="#fb923c" font-size="9.5" font-family="monospace" text-anchor="middle">' + d.left + '</text>'
      );
    }

    // Magnetic alignment snap lines
    if (geoMove.snapLineX !== null) {
      svgParts.push(
        '<line x1="' + geoMove.snapLineX + '" y1="0" x2="' + geoMove.snapLineX + '" y2="' + window.innerHeight + '" stroke="#f472b6" stroke-width="1.6"/>'
      );
    }
    if (geoMove.snapLineY !== null) {
      svgParts.push(
        '<line x1="0" y1="' + geoMove.snapLineY + '" x2="' + window.innerWidth + '" y2="' + geoMove.snapLineY + '" stroke="#f472b6" stroke-width="1.6"/>'
      );
    }

    cadGuidesGroup.innerHTML = svgParts.join('');
  }

  function applyLiveTranslateToMoveEl(nx, ny) {
    if (!geoMove.el) return;
    geoMove.x = Math.round(nx);
    geoMove.y = Math.round(ny);
    if (!patchRules[geoMove.selector]) patchRules[geoMove.selector] = Object.create(null);
    patchRules[geoMove.selector]['transform'] = 'translate(' + geoMove.x + 'px, ' + geoMove.y + 'px)';
    rebuildPatchSheet();
    renderCadMoveOverlay();
    var dists = computeParentDistances(geoMove.el);
    parent.postMessage({
      type: 'GEOMETRIC_MOVE_PROGRESS',
      payload: {
        x: geoMove.x,
        y: geoMove.y,
        distances: { top: dists.top, right: dists.right, bottom: dists.bottom, left: dists.left }
      }
    }, '*');
  }

  function beginDragMove(e) {
    if (!geoMove.active || !geoMove.el) return;
    e.preventDefault();
    e.stopPropagation();
    geoMove.dragging = true;
    geoMove.dragStartMouseX = e.clientX;
    geoMove.dragStartMouseY = e.clientY;
    geoMove.dragOriginX = geoMove.x;
    geoMove.dragOriginY = geoMove.y;
  }

  cadFrame.addEventListener('mousedown', beginDragMove);

  window.addEventListener('mousemove', function (e) {
    if (!geoMove.active || !geoMove.dragging || !geoMove.el) return;
    e.preventDefault();
    var rawDx = e.clientX - geoMove.dragStartMouseX;
    var rawDy = e.clientY - geoMove.dragStartMouseY;
    var candX = geoMove.dragOriginX + rawDx;
    var candY = geoMove.dragOriginY + rawDy;

    if (e.shiftKey) {
      if (Math.abs(rawDx) >= Math.abs(rawDy)) candY = geoMove.dragOriginY;
      else candX = geoMove.dragOriginX;
    }

    var step = geoMove.gridStep || 1;
    if (step > 1) {
      candX = Math.round(candX / step) * step;
      candY = Math.round(candY / step) * step;
    }

    geoMove.snapLineX = null;
    geoMove.snapLineY = null;

    // Apply candidate first so we can check alignment with parent center & zero origin
    if (!patchRules[geoMove.selector]) patchRules[geoMove.selector] = Object.create(null);
    patchRules[geoMove.selector]['transform'] = 'translate(' + Math.round(candX) + 'px, ' + Math.round(candY) + 'px)';
    rebuildPatchSheet();

    if (geoMove.smartSnap && !e.altKey) {
      var r = geoMove.el.getBoundingClientRect();
      var p = geoMove.el.parentElement ? geoMove.el.parentElement.getBoundingClientRect() : null;
      // Snap to original X=0 or Y=0 axis
      if (Math.abs(candX) <= 5) {
        candX = 0;
        geoMove.snapLineX = Math.round(r.left - candX + r.width / 2);
      }
      if (Math.abs(candY) <= 5) {
        candY = 0;
        geoMove.snapLineY = Math.round(r.top - candY + r.height / 2);
      }
      // Snap to parent horizontal/vertical center
      if (p) {
        var elCenterX = r.left + r.width / 2;
        var pCenterX = p.left + p.width / 2;
        if (Math.abs(elCenterX - pCenterX) <= 6) {
          candX += (pCenterX - elCenterX);
          geoMove.snapLineX = Math.round(pCenterX);
        }
        var elCenterY = r.top + r.height / 2;
        var pCenterY = p.top + p.height / 2;
        if (Math.abs(elCenterY - pCenterY) <= 6) {
          candY += (pCenterY - elCenterY);
          geoMove.snapLineY = Math.round(pCenterY);
        }
      }
    }

    applyLiveTranslateToMoveEl(candX, candY);
  }, true);

  window.addEventListener('mouseup', function () {
    if (geoMove.dragging) {
      geoMove.dragging = false;
      geoMove.snapLineX = null;
      geoMove.snapLineY = null;
      renderCadMoveOverlay();
    }
  }, true);

  // =========================================================
  // Overlays, Link Badges & Connection Curve Drawing
  // =========================================================
  function drawConnectionCurve() {
    if (!activeConnectionPair || !activeConnectionPair.fromEl || !activeConnectionPair.toEl) {
      connGlowPath.setAttribute('d', '');
      connMainPath.setAttribute('d', '');
      targetHighlightBox.style.display = 'none';
      return;
    }
    var a = activeConnectionPair.fromEl;
    var b = activeConnectionPair.toEl;
    if (!a.isConnected || !b.isConnected || a === b) {
      connGlowPath.setAttribute('d', '');
      connMainPath.setAttribute('d', '');
      targetHighlightBox.style.display = 'none';
      return;
    }
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    if ((ra.width === 0 && ra.height === 0) || (rb.width === 0 && rb.height === 0)) {
      connGlowPath.setAttribute('d', '');
      connMainPath.setAttribute('d', '');
      targetHighlightBox.style.display = 'none';
      return;
    }

    targetHighlightBox.style.display = 'block';
    targetHighlightBox.style.top = rb.top + 'px';
    targetHighlightBox.style.left = rb.left + 'px';
    targetHighlightBox.style.width = rb.width + 'px';
    targetHighlightBox.style.height = rb.height + 'px';

    var x1 = ra.left + ra.width / 2;
    var y1 = ra.top + ra.height / 2;
    var x2 = rb.left + rb.width / 2;
    var y2 = Math.max(12, Math.min(window.innerHeight - 12, rb.top + Math.min(28, rb.height / 2)));
    var dy = Math.abs(y2 - y1);
    var cx1 = x1;
    var cy1 = y1 + (y2 >= y1 ? Math.max(40, dy * 0.45) : -Math.max(40, dy * 0.45));
    var cx2 = x2;
    var cy2 = y2 - (y2 >= y1 ? Math.max(40, dy * 0.45) : -Math.max(40, dy * 0.45));
    var d = 'M ' + x1 + ' ' + y1 + ' C ' + cx1 + ' ' + cy1 + ', ' + cx2 + ' ' + cy2 + ', ' + x2 + ' ' + y2;
    connGlowPath.setAttribute('d', d);
    connMainPath.setAttribute('d', d);
  }

  function renderLinkOverlayBadges() {
    linkBadgesLayer.innerHTML = '';
    if (!linkOverlayEnabled || !document.body) return;

    var links = scanPageLinks();
    for (var i = 0; i < links.length && i < 40; i++) {
      var item = links[i];
      var el = null;
      try { el = document.querySelector(item.selector); } catch (_) {}
      if (!el) continue;
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      var r = el.getBoundingClientRect();
      if (r.width < 12 || r.height < 12) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;

      var badge = document.createElement('button');
      badge.type = 'button';
      badge.setAttribute('data-ux-ignore', 'true');
      var shortDest = item.destination;
      if (item.kind === 'external') {
        try {
          var u = new URL(item.destination, window.location.href);
          shortDest = '↗ ' + u.hostname.replace(/^www\\./, '');
        } catch (_) {
          shortDest = '↗ ' + item.destination.slice(0, 22);
        }
      } else if (item.kind === 'anchor') {
        shortDest = (item.targetExists === false ? '! ' : '') + item.destination;
      } else if (item.kind === 'component-trigger') {
        shortDest = '→ ' + item.destination;
      } else if (item.kind === 'blogger-expr') {
        shortDest = 'xml:' + item.destination.replace(/^data:/, '');
      } else if (item.kind === 'js-action') {
        shortDest = 'JS()';
      } else {
        shortDest = '! بدون رابط';
      }

      var borderColor = item.status === 'warning' ? '#fbbf24' : item.kind === 'external' ? '#34d399' : item.kind === 'blogger-expr' ? '#fb923c' : '#60a5fa';
      badge.textContent = shortDest;
      badge.style.cssText =
        'position:fixed;pointer-events:auto;cursor:pointer;z-index:2147483647;' +
        'background:rgba(9,11,17,0.92);color:#eef2ff;border:1px solid ' + borderColor + ';' +
        'padding:1px 6px;border-radius:999px;font-size:9.5px;font-family:monospace;font-weight:700;' +
        'white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.4);' +
        'top:' + Math.max(2, r.top - 10) + 'px;left:' + Math.max(4, Math.min(window.innerWidth - 130, r.left)) + 'px;';

      (function (targetElement) {
        badge.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          selectedEl = targetElement;
          refreshOverlays();
          parent.postMessage({ type: 'ELEMENT_SELECTED', payload: serializeElement(targetElement) }, '*');
        });
      })(el);

      linkBadgesLayer.appendChild(badge);
    }
  }

  function positionBox(box, label, el, text) {
    if (!el || !el.isConnected) {
      box.style.display = 'none';
      label.style.display = 'none';
      return;
    }
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      box.style.display = 'none';
      label.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    box.style.top = r.top + 'px';
    box.style.left = r.left + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';

    if (!text) {
      var tag = el.tagName.toLowerCase();
      var extra = '';
      if (smartEditEnabled && !inspectEnabled) {
        extra = ' • كليك يمين للتعديل الذكي';
      } else if (tag === 'a' || tag === 'button' || el.hasAttribute('onclick')) {
        var li = analyzeInteractiveElement(el, 0);
        if (li && li.kind !== 'empty') extra = ' → ' + li.destination.slice(0, 26);
      } else if (el.children && el.children.length > 1) {
        extra = ' • مركّب (' + el.children.length + ')';
      }
      text = shortLabel(el) + '  ' + Math.round(r.width) + '×' + Math.round(r.height) + extra;
    }

    label.textContent = text;
    label.style.display = 'block';
    var labelTop = r.top - 26;
    if (labelTop < 4) labelTop = Math.min(window.innerHeight - 24, r.bottom + 4);
    var labelLeft = Math.max(4, Math.min(window.innerWidth - 260, r.left));
    label.style.top = labelTop + 'px';
    label.style.left = labelLeft + 'px';
  }

  function refreshOverlays() {
    if (geoMove.active) {
      selectBox.style.display = 'none';
      selectLabel.style.display = 'none';
      hoverBox.style.display = 'none';
      hoverLabel.style.display = 'none';
      renderCadMoveOverlay();
      return;
    } else {
      cadFrame.style.display = 'none';
      cadHudBadge.style.display = 'none';
      cadGuidesGroup.innerHTML = '';
    }

    if (selectedEl) {
      positionBox(selectBox, selectLabel, selectedEl, '✓ ' + shortLabel(selectedEl));
    } else {
      selectBox.style.display = 'none';
      selectLabel.style.display = 'none';
    }
    var activeHover = externalHoverEl || ((inspectEnabled || smartEditEnabled) ? hoveredEl : null);
    if (activeHover && activeHover !== selectedEl) {
      hoverBox.style.borderColor = smartEditEnabled && !inspectEnabled ? '#c084fc' : '#60a5fa';
      positionBox(hoverBox, hoverLabel, activeHover);
    } else {
      hoverBox.style.display = 'none';
      hoverLabel.style.display = 'none';
    }
    drawConnectionCurve();
    if (linkOverlayEnabled) renderLinkOverlayBadges();
  }

  window.addEventListener('scroll', refreshOverlays, true);
  window.addEventListener('resize', refreshOverlays);

  document.addEventListener('mousemove', function (e) {
    if (geoMove.active) return;
    if (!inspectEnabled && !smartEditEnabled) return;
    var t = e.target;
    if (isIgnored(t)) return;
    hoveredEl = t;
    refreshOverlays();
  }, true);

  document.addEventListener('mouseleave', function () {
    hoveredEl = null;
    refreshOverlays();
  }, true);

  // Right-click Context Menu handler for Smart Edit Mode!
  document.addEventListener('contextmenu', function (e) {
    if (!smartEditEnabled) return;
    var t = e.target;
    if (isIgnored(t)) return;
    e.preventDefault();
    e.stopPropagation();

    if (geoMove.active) return;

    selectedEl = t;
    hoveredEl = null;
    var payload = serializeElement(t);
    refreshOverlays();
    parent.postMessage({
      type: 'SMART_CONTEXT_MENU',
      payload: {
        element: payload,
        clientX: e.clientX,
        clientY: e.clientY,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight
      }
    }, '*');
  }, true);

  // Left-click handler
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (isIgnored(t)) return;

    if (smartEditEnabled) {
      parent.postMessage({ type: 'SMART_CLOSE_MENU' }, '*');
    }

    if (geoMove.active) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (inspectEnabled) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      selectedEl = t;
      hoveredEl = null;
      var payload = serializeElement(t);
      refreshOverlays();
      parent.postMessage({ type: 'ELEMENT_SELECTED', payload: payload }, '*');
      return;
    }

    // Safe interactive browsing inside preview (including Smart Edit Mode!)
    var anchor = t.closest ? t.closest('a[href]') : null;
    if (anchor && !isIgnored(anchor)) {
      var raw = (anchor.getAttribute('href') || '').trim();
      if (raw === '#' || raw === '') {
        e.preventDefault();
      } else if (raw.startsWith('#') && raw.length > 1) {
        var destEl = document.getElementById(decodeURIComponent(raw.slice(1)));
        if (destEl) {
          e.preventDefault();
          destEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          e.preventDefault();
        }
      } else if (/^https?:\\/\\//i.test(raw) || /^mailto:/i.test(raw) || /^tel:/i.test(raw)) {
        // Forward external links to the TOP-LEVEL app so they open in a clean,
        // COOP-exempt tab (opening from this sandboxed iframe gets blocked).
        e.preventDefault();
        try {
          parent.postMessage({ type: 'OPEN_EXTERNAL_URL', payload: { url: raw } }, '*');
        } catch (_) {
          window.open(raw, '_blank', 'noopener,noreferrer');
        }
      }
    }
  }, true);

  // =========================================================
  // Component Spotlight Isolation & Explode Compound Mode
  // =========================================================
  function clearIsolationClasses() {
    var marked = document.querySelectorAll('.__ux_iso_dim__, .__ux_iso_focus__');
    for (var i = 0; i < marked.length; i++) {
      marked[i].classList.remove('__ux_iso_dim__', '__ux_iso_focus__');
    }
  }

  function applyComponentIsolation(selector) {
    clearIsolationClasses();
    isolatedSelector = selector;
    if (!selector) {
      isolateStyle.textContent = '';
      parent.postMessage({ type: 'ISOLATION_CHANGED', payload: { selector: null } }, '*');
      return;
    }
    var target = null;
    try { target = document.querySelector(selector); } catch (_) {}
    if (!target || target === document.body || target === document.documentElement) {
      isolatedSelector = null;
      isolateStyle.textContent = '';
      parent.postMessage({ type: 'ISOLATION_CHANGED', payload: { selector: null } }, '*');
      return;
    }

    isolateStyle.textContent =
      '.__ux_iso_dim__ { opacity: 0.1 !important; filter: grayscale(0.8) blur(1.5px) !important; pointer-events: none !important; transition: opacity 0.25s ease, filter 0.25s ease !important; }' +
      '.__ux_iso_focus__ { position: relative !important; z-index: 50 !important; box-shadow: 0 0 0 2px #60a5fa, 0 20px 60px rgba(0,0,0,0.45) !important; border-radius: 8px; }';

    target.classList.add('__ux_iso_focus__');
    var cur = target;
    while (cur && cur.parentElement && cur !== document.body) {
      var sibs = cur.parentElement.children;
      for (var s = 0; s < sibs.length; s++) {
        var sib = sibs[s];
        if (sib !== cur && !isIgnored(sib)) {
          sib.classList.add('__ux_iso_dim__');
        }
      }
      cur = cur.parentElement;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    setTimeout(refreshOverlays, 150);
    parent.postMessage({ type: 'ISOLATION_CHANGED', payload: { selector: selector } }, '*');
  }

  function applyExplodeMode(enabled) {
    explodeEnabled = Boolean(enabled);
    explodeStyle.textContent = explodeEnabled
      ? 'body *:not([data-ux-ignore="true"]):not([data-ux-ignore="true"] *):not(svg):not(path):not(circle):not(stop):not(defs):not(linearGradient):not(radialGradient) {' +
        '  outline: 1px dashed rgba(192, 132, 252, 0.55) !important;' +
        '  outline-offset: 2px !important;' +
        '}' +
        'a:not([data-ux-ignore="true"]), button:not([data-ux-ignore="true"]) {' +
        '  gap: 8px !important;' +
        '}' +
        'body div > *:not(svg), body section > *, body article > *, body header > *, body nav > * {' +
        '  margin-top: 3px; margin-bottom: 3px;' +
        '}'
      : '';
    setTimeout(refreshOverlays, 60);
  }

  function rebuildPatchSheet() {
    var css = '';
    var selectors = Object.keys(patchRules);
    for (var i = 0; i < selectors.length; i++) {
      var sel = selectors[i];
      var map = patchRules[sel];
      var props = Object.keys(map);
      if (props.length === 0) continue;
      css += sel + ' { ';
      for (var j = 0; j < props.length; j++) {
        css += props[j] + ': ' + map[props[j]] + ' !important; ';
      }
      css += '}\\n';
    }
    liveStyleEl.textContent = css;
  }

  // =========================================================
  // Automated UX & Accessibility Audit
  // =========================================================
  function runUxAudit() {
    var issues = [];
    var passed = 0;
    var all = document.body ? document.body.querySelectorAll('*') : [];
    var count = 0;

    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (isIgnored(el)) continue;
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      count++;

      var tag = el.tagName.toLowerCase();
      var sel = getCleanSelector(el);
      var direct = getDirectText(el);

      if (direct.length > 0) {
        var cInfo = computeContrast(el, cs);
        if (cInfo) {
          var fs = parseFloat(cs.fontSize) || 16;
          var fw = parseInt(cs.fontWeight, 10) || 400;
          var large = fs >= 24 || (fs >= 18.66 && fw >= 700);
          var minRatio = large ? 3.0 : 4.5;
          if (cInfo.ratio < minRatio) {
            var idealFg = cInfo.bgLum > 0.42 ? '#0f172a' : '#f8fafc';
            issues.push({
              id: 'contrast-' + i,
              severity: cInfo.ratio < 3.0 ? 'error' : 'warning',
              category: 'contrast',
              title: 'تباين ألوان منخفض للنص',
              description: 'نسبة التباين الحالية ' + cInfo.ratio + ':1 أقل من المعيار القياسي (' + minRatio + ':1 WCAG AA).',
              selector: sel,
              tagName: tag,
              metric: cInfo.ratio + ':1',
              autoFix: {
                label: 'تحسين التباين تلقائياً (' + idealFg + ')',
                patches: [{ property: 'color', value: idealFg }]
              }
            });
          } else {
            passed++;
          }
        }

        var fontPx = parseFloat(cs.fontSize) || 16;
        if (fontPx < 12) {
          issues.push({
            id: 'font-' + i,
            severity: 'warning',
            category: 'typography',
            title: 'حجم خط صغير يصعب قراءته',
            description: 'حجم الخط ' + Math.round(fontPx) + 'px أقل من الحد الموصى به لراحة القراءة (13px+).',
            selector: sel,
            tagName: tag,
            metric: Math.round(fontPx) + 'px',
            autoFix: {
              label: 'تكبير الخط إلى 13px',
              patches: [{ property: 'fontSize', value: '13px' }]
            }
          });
        } else {
          passed++;
        }
      }

      var isInteractive = tag === 'button' || (tag === 'a' && el.hasAttribute('href')) || tag === 'input' || tag === 'select' || el.getAttribute('role') === 'button';
      if (isInteractive) {
        if (r.width < 38 || r.height < 34) {
          var fixPatches = [
            { property: 'minHeight', value: '42px' },
            { property: 'minWidth', value: '42px' }
          ];
          if (numPx(cs.paddingTop) < 8) {
            fixPatches.push({ property: 'padding', value: '10px 16px' });
          }
          if (cs.display === 'inline') {
            fixPatches.push({ property: 'display', value: 'inline-flex' });
          }
          issues.push({
            id: 'touch-' + i,
            severity: (r.width < 28 || r.height < 28) ? 'error' : 'warning',
            category: 'touch',
            title: 'مساحة نقر/لمس ضيقة',
            description: 'أبعاد العنصر التفاعلي ' + Math.round(r.width) + '×' + Math.round(r.height) + 'px (يُنصح بـ 42×42px على الأقل).',
            selector: sel,
            tagName: tag,
            metric: Math.round(r.width) + '×' + Math.round(r.height) + 'px',
            autoFix: {
              label: 'توسيع مساحة اللمس إلى 42px',
              patches: fixPatches
            }
          });
        } else {
          passed++;
        }

        if (tag === 'button' || tag === 'a') {
          var label = (el.innerText || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title');
          var hasAltImg = el.querySelector('img[alt]:not([alt=""])');
          if (!label && !hasAltImg) {
            issues.push({
              id: 'a11y-btn-' + i,
              severity: 'error',
              category: 'a11y',
              title: 'عنصر تفاعلي بدون نص وصفي',
              description: 'أضف نصاً واضحاً للزر أو سمة aria-label لتمكين قارئات الشاشة.',
              selector: sel,
              tagName: tag
            });
          } else {
            passed++;
          }
        }
      }

      if (tag === 'img' && !el.hasAttribute('alt')) {
        issues.push({
          id: 'a11y-img-' + i,
          severity: 'error',
          category: 'a11y',
          title: 'صورة بدون نص بديل (alt)',
          description: 'سمة alt ضرورية لتحسين الوصول وتجربة المستخدم عند تعذّر تحميل الصورة.',
          selector: sel,
          tagName: tag
        });
      }
    }

    var docW = document.documentElement.clientWidth;
    if (docW > 0 && document.documentElement.scrollWidth > docW + 4) {
      issues.push({
        id: 'layout-overflow',
        severity: 'warning',
        category: 'layout',
        title: 'تجاوز أفقي لعرض الصفحة',
        description: 'عرض المحتوى (' + document.documentElement.scrollWidth + 'px) يتجاوز عرض النافذة (' + docW + 'px).',
        selector: 'body',
        tagName: 'body',
        metric: document.documentElement.scrollWidth + 'px',
        autoFix: {
          label: 'منع التجاوز الأفقي (overflow-x: hidden)',
          patches: [{ property: 'overflowX', value: 'hidden' }]
        }
      });
    } else {
      passed++;
    }

    var errors = 0, warnings = 0;
    for (var m = 0; m < issues.length; m++) {
      if (issues[m].severity === 'error') errors++;
      else warnings++;
    }
    var penalty = errors * 14 + warnings * 6;
    var score = Math.max(15, Math.min(100, 100 - penalty));

    return {
      score: score,
      totalElements: count,
      issues: issues,
      counts: { errors: errors, warnings: warnings, passedChecks: passed }
    };
  }

  // =========================================================
  // Message Bus Listener
  // =========================================================
  window.addEventListener('message', function (e) {
    var msg = e.data;
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'TOGGLE_INSPECT') {
      inspectEnabled = Boolean(msg.payload && msg.payload.enabled);
      inspectCursorStyle.textContent = inspectEnabled ? '* { cursor: crosshair !important; }' : '';
      if (!inspectEnabled) {
        hoveredEl = null;
        refreshOverlays();
      }
    }

    if (msg.type === 'TOGGLE_SMART_EDIT') {
      smartEditEnabled = Boolean(msg.payload && msg.payload.enabled);
      if (!smartEditEnabled) {
        hoveredEl = null;
        geoMove.active = false;
        geoMove.dragging = false;
        refreshOverlays();
      }
    }

    if (msg.type === 'START_GEOMETRIC_MOVE') {
      var gm = msg.payload || {};
      try {
        var moveTarget = document.querySelector(gm.selector);
        if (moveTarget && !isIgnored(moveTarget)) {
          selectedEl = moveTarget;
          var curT = getCurrentTranslate(moveTarget);
          geoMove.active = true;
          geoMove.el = moveTarget;
          geoMove.selector = gm.selector;
          geoMove.initialX = curT.x;
          geoMove.initialY = curT.y;
          geoMove.x = curT.x;
          geoMove.y = curT.y;
          geoMove.gridStep = gm.gridStep || 1;
          geoMove.smartSnap = gm.smartSnap !== false;
          geoMove.snapLineX = null;
          geoMove.snapLineY = null;
          refreshOverlays();
        }
      } catch (_) {}
    }

    if (msg.type === 'UPDATE_GEOMETRIC_MOVE_CONFIG') {
      var cfg = msg.payload || {};
      if (cfg.gridStep) geoMove.gridStep = cfg.gridStep;
      if (cfg.smartSnap !== undefined) geoMove.smartSnap = Boolean(cfg.smartSnap);
    }

    if (msg.type === 'SET_GEOMETRIC_TRANSLATE') {
      var st = msg.payload || {};
      if (geoMove.active && geoMove.el) {
        applyLiveTranslateToMoveEl(Number(st.x) || 0, Number(st.y) || 0);
      }
    }

    if (msg.type === 'FINISH_GEOMETRIC_MOVE') {
      var fm = msg.payload || {};
      if (geoMove.el) {
        if (!fm.commit) {
          // Revert to initial translate!
          if (!patchRules[geoMove.selector]) patchRules[geoMove.selector] = Object.create(null);
          if (geoMove.initialX === 0 && geoMove.initialY === 0) {
            delete patchRules[geoMove.selector]['transform'];
          } else {
            patchRules[geoMove.selector]['transform'] = 'translate(' + geoMove.initialX + 'px, ' + geoMove.initialY + 'px)';
          }
          rebuildPatchSheet();
        }
        var updatedTarget = geoMove.el;
        geoMove.active = false;
        geoMove.dragging = false;
        geoMove.snapLineX = null;
        geoMove.snapLineY = null;
        refreshOverlays();
        if (updatedTarget && updatedTarget.isConnected) {
          parent.postMessage({ type: 'ELEMENT_UPDATED', payload: serializeElement(updatedTarget) }, '*');
        }
      } else {
        geoMove.active = false;
        refreshOverlays();
      }
    }

    if (msg.type === 'REORDER_DOM_SIBLING') {
      var ro = msg.payload || {};
      try {
        var rEl = document.querySelector(ro.selector);
        if (rEl && rEl.parentElement && !isIgnored(rEl)) {
          if (ro.direction === 'prev') {
            var pSib = rEl.previousElementSibling;
            while (pSib && isIgnored(pSib)) pSib = pSib.previousElementSibling;
            if (pSib) rEl.parentElement.insertBefore(rEl, pSib);
          } else if (ro.direction === 'next') {
            var nSib = rEl.nextElementSibling;
            while (nSib && isIgnored(nSib)) nSib = nSib.nextElementSibling;
            if (nSib) rEl.parentElement.insertBefore(nSib, rEl);
          }
          selectedEl = rEl;
          var newSer = serializeElement(rEl);
          if (geoMove.active) {
            geoMove.selector = newSer.selector;
          }
          refreshOverlays();
          parent.postMessage({ type: 'ELEMENT_SELECTED', payload: newSer }, '*');
          sendDomTree();
          sendPageLinks();
        }
      } catch (_) {}
    }

    if (msg.type === 'REPLACE_ELEMENT_HTML') {
      var rh = msg.payload || {};
      try {
        var oldDom = document.querySelector(rh.selector);
        if (oldDom && oldDom.parentElement && typeof rh.html === 'string') {
          var temp = document.createElement('div');
          temp.innerHTML = rh.html.trim();
          var replacement = temp.firstElementChild;
          if (replacement) {
            oldDom.parentElement.replaceChild(replacement, oldDom);
            selectedEl = replacement;
            refreshOverlays();
            parent.postMessage({ type: 'ELEMENT_SELECTED', payload: serializeElement(replacement) }, '*');
            sendDomTree();
            sendPageLinks();
            parent.postMessage({ type: 'AUDIT_RESULT', payload: runUxAudit() }, '*');
          }
        }
      } catch (err) {
        parent.postMessage({
          type: 'SANDBOX_ERROR',
          payload: { message: err && err.message ? err.message : 'Invalid HTML replacement' }
        }, '*');
      }
    }

    if (msg.type === 'TOGGLE_XRAY') {
      var xrayOn = Boolean(msg.payload && msg.payload.enabled);
      xrayStyle.textContent = xrayOn
        ? 'body *:not([data-ux-ignore="true"]):not([data-ux-ignore="true"] *) { outline: 1px dashed rgba(96, 165, 250, 0.42) !important; outline-offset: -1px !important; }'
        : '';
    }

    if (msg.type === 'TOGGLE_LINK_OVERLAY') {
      linkOverlayEnabled = Boolean(msg.payload && msg.payload.enabled);
      renderLinkOverlayBadges();
    }

    if (msg.type === 'TOGGLE_EXPLODE_MODE') {
      applyExplodeMode(msg.payload && msg.payload.enabled);
    }

    if (msg.type === 'ISOLATE_ELEMENT') {
      applyComponentIsolation(msg.payload ? msg.payload.selector : null);
    }

    if (msg.type === 'HOVER_ELEMENT') {
      var hoverSel = msg.payload && msg.payload.selector;
      var targetLinkSel = msg.payload && msg.payload.linkedSelector;
      if (!hoverSel) {
        externalHoverEl = null;
        if (!selectedEl) activeConnectionPair = null;
      } else {
        try {
          var hFound = document.querySelector(hoverSel);
          externalHoverEl = hFound && !isIgnored(hFound) ? hFound : null;
          if (externalHoverEl && targetLinkSel) {
            var tFound = document.querySelector(targetLinkSel);
            activeConnectionPair = tFound ? { fromEl: externalHoverEl, toEl: tFound } : null;
          }
        } catch (_) {
          externalHoverEl = null;
        }
      }
      refreshOverlays();
    }

    if (msg.type === 'SELECT_ELEMENT') {
      var targetSel = msg.payload && msg.payload.selector;
      if (targetSel) {
        try {
          var found = document.querySelector(targetSel);
          if (found && !isIgnored(found)) {
            selectedEl = found;
            externalHoverEl = null;
            found.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            var ser = serializeElement(found);
            setTimeout(refreshOverlays, 120);
            refreshOverlays();
            parent.postMessage({ type: 'ELEMENT_SELECTED', payload: ser }, '*');
          }
        } catch (_) {}
      }
    }

    if (msg.type === 'CLEAR_SELECTION') {
      selectedEl = null;
      externalHoverEl = null;
      activeConnectionPair = null;
      geoMove.active = false;
      refreshOverlays();
    }

    if (msg.type === 'CLEAR_SELECTOR_PATCHES') {
      var cpSel = msg.payload && msg.payload.selector;
      if (cpSel && patchRules[cpSel]) {
        if (msg.payload.property) {
          delete patchRules[cpSel][msg.payload.property];
        } else {
          delete patchRules[cpSel];
        }
        rebuildPatchSheet();
        refreshOverlays();
        if (selectedEl && selectedEl.isConnected) {
          parent.postMessage({ type: 'ELEMENT_UPDATED', payload: serializeElement(selectedEl) }, '*');
        }
      }
    }

    if (msg.type === 'APPLY_STYLE_PATCH') {
      var p = msg.payload || {};
      if (p.selector && p.property !== undefined) {
        var kebab = String(p.property).replace(/[A-Z]/g, function (l) { return '-' + l.toLowerCase(); });
        if (!patchRules[p.selector]) patchRules[p.selector] = Object.create(null);
        patchRules[p.selector][kebab] = p.value;
        rebuildPatchSheet();
        refreshOverlays();
        if (selectedEl && selectedEl.isConnected) {
          parent.postMessage({ type: 'ELEMENT_UPDATED', payload: serializeElement(selectedEl) }, '*');
        }
        parent.postMessage({ type: 'AUDIT_RESULT', payload: runUxAudit() }, '*');
      }
    }

    if (msg.type === 'APPLY_TEXT_PATCH') {
      var tp = msg.payload || {};
      if (tp.selector) {
        try {
          var el = document.querySelector(tp.selector);
          if (el && !isIgnored(el)) {
            if (el.children && el.children.length > 0) {
              var updatedNode = false;
              for (var n = 0; n < el.childNodes.length; n++) {
                if (el.childNodes[n].nodeType === 3 && el.childNodes[n].nodeValue.trim().length > 0) {
                  el.childNodes[n].nodeValue = ' ' + tp.text + ' ';
                  updatedNode = true;
                  break;
                }
              }
              if (!updatedNode) el.appendChild(document.createTextNode(' ' + tp.text));
            } else {
              el.textContent = tp.text;
            }
            refreshOverlays();
            if (selectedEl && selectedEl.isConnected) {
              parent.postMessage({ type: 'ELEMENT_UPDATED', payload: serializeElement(selectedEl) }, '*');
            }
            parent.postMessage({ type: 'AUDIT_RESULT', payload: runUxAudit() }, '*');
            sendDomTree();
            sendPageLinks();
          }
        } catch (_) {}
      }
    }

    if (msg.type === 'APPLY_PART_TEXT_PATCH') {
      var ptp = msg.payload || {};
      try {
        if (ptp.textNodeIndex !== undefined && ptp.parentSelector) {
          var pEl = document.querySelector(ptp.parentSelector);
          if (pEl) {
            var tCounter = 0;
            for (var c = 0; c < pEl.childNodes.length; c++) {
              if (pEl.childNodes[c].nodeType === 3) {
                if (tCounter === ptp.textNodeIndex) {
                  pEl.childNodes[c].nodeValue = ' ' + ptp.text + ' ';
                  break;
                }
                tCounter++;
              }
            }
          }
        } else if (ptp.partSelector) {
          var subEl = document.querySelector(ptp.partSelector);
          if (subEl) {
            if (subEl.children && subEl.children.length > 0) {
              var doneSub = false;
              for (var s = 0; s < subEl.childNodes.length; s++) {
                if (subEl.childNodes[s].nodeType === 3 && subEl.childNodes[s].nodeValue.trim().length > 0) {
                  subEl.childNodes[s].nodeValue = ' ' + ptp.text + ' ';
                  doneSub = true;
                  break;
                }
              }
              if (!doneSub) subEl.appendChild(document.createTextNode(' ' + ptp.text));
            } else {
              subEl.textContent = ptp.text;
            }
          }
        }
        refreshOverlays();
        if (selectedEl && selectedEl.isConnected) {
          parent.postMessage({ type: 'ELEMENT_UPDATED', payload: serializeElement(selectedEl) }, '*');
        }
        sendDomTree();
        sendPageLinks();
      } catch (_) {}
    }

    if (msg.type === 'APPLY_ATTR_PATCH') {
      var ap = msg.payload || {};
      if (ap.selector && ap.attr) {
        try {
          var aEl = document.querySelector(ap.selector);
          if (aEl && !isIgnored(aEl)) {
            if (ap.value === '' || ap.value === null || ap.value === undefined) {
              aEl.removeAttribute(ap.attr);
            } else {
              aEl.setAttribute(ap.attr, ap.value);
              if (ap.attr === 'href') aEl.removeAttribute('data-blogger-expr');
            }
            refreshOverlays();
            if (selectedEl && selectedEl.isConnected) {
              parent.postMessage({ type: 'ELEMENT_UPDATED', payload: serializeElement(selectedEl) }, '*');
            }
            sendPageLinks();
            sendDomTree();
          }
        } catch (_) {}
      }
    }

    if (msg.type === 'UNWRAP_ELEMENT') {
      var uSel = msg.payload && msg.payload.selector;
      if (uSel && uSel !== 'body' && uSel !== 'html') {
        try {
          var uEl = document.querySelector(uSel);
          if (uEl && uEl.parentNode && !isIgnored(uEl)) {
            var parentNode = uEl.parentNode;
            var firstChildEl = uEl.firstElementChild;
            while (uEl.firstChild) {
              parentNode.insertBefore(uEl.firstChild, uEl);
            }
            parentNode.removeChild(uEl);
            selectedEl = firstChildEl || (parentNode.nodeType === 1 ? parentNode : null);
            refreshOverlays();
            if (selectedEl && selectedEl !== document.documentElement) {
              parent.postMessage({ type: 'ELEMENT_SELECTED', payload: serializeElement(selectedEl) }, '*');
            } else {
              parent.postMessage({ type: 'CLEAR_SELECTION' }, '*');
            }
            sendDomTree();
            sendPageLinks();
            parent.postMessage({ type: 'AUDIT_RESULT', payload: runUxAudit() }, '*');
          }
        } catch (_) {}
      }
    }

    if (msg.type === 'RUN_AUDIT') {
      parent.postMessage({ type: 'AUDIT_RESULT', payload: runUxAudit() }, '*');
      sendDomTree();
      sendPageLinks();
    }
  });

  window.__agentInternal = false;

  parent.postMessage({ type: 'SANDBOX_READY' }, '*');
  setTimeout(function () {
    parent.postMessage({ type: 'AUDIT_RESULT', payload: runUxAudit() }, '*');
    sendDomTree();
    sendPageLinks();
  }, 90);
})();`;
