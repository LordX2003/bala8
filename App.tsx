import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_BLOGGER_XML,
  DEFAULT_NORMAL_CSS,
  DEFAULT_NORMAL_HTML,
  DEFAULT_NORMAL_JS,
} from "@/data/templates";
import {
  applyCssRuleBlockToSource,
  assignUniqueIdInSource,
  attachLinkToElementInSource,
  buildSrcdocBlogger,
  buildSrcdocNormal,
  extractElementCssSnippet,
  extractStandaloneComponentCode,
  modifyAttributeInBloggerXml,
  modifyAttributeInNormalHtml,
  modifyCssInXml,
  modifyCssRule,
  modifyPartTextInNormalHtml,
  modifyTextInBloggerXml,
  modifyTextInNormalHtml,
  parseCssDeclarations,
  prettyFormatHtmlSnippet,
  reorderElementInBloggerXml,
  reorderElementInNormalHtml,
  replaceElementOuterHtmlInBloggerXml,
  replaceElementOuterHtmlInNormalHtml,
  unwrapElementInBloggerXml,
  unwrapElementInNormalHtml,
} from "@/lib/codeEngine";
import { openExternalUrl } from "@/lib/openUrl";
import type {
  BloggerViewType,
  CompoundSubPart,
  ConsoleEntry,
  DirectionOverride,
  DomTreeNode,
  EditorMode,
  InspectorTab,
  MobileWorkspaceTab,
  NormalEditorTab,
  PageLinkItem,
  SandboxStatus,
  SelectedElementPayload,
  SmartContextMenuState,
  SmartMoveSession,
  TemplatePreset,
  ToastItem,
  UxAuditReport,
  UxIssue,
  ViewportPreset,
} from "@/types/analyzer";
import { Toolbar } from "@/components/Toolbar";
import { EditorPane } from "@/components/EditorPane";
import { PreviewPane } from "@/components/PreviewPane";
import { InspectorPane } from "@/components/InspectorPane";
import { ComponentExtractModal } from "@/components/CompoundDecomposerCard";
import {
  SmartContextMenu,
  SmartEditTopHud,
  SmartMoveHud,
} from "@/components/SmartEditOverlay";
import { SmartCodeModal } from "@/components/SmartCodeModal";
import { SmartAdvancedDrawer } from "@/components/SmartAdvancedDrawer";
import {
  MobileWorkspaceBar,
  ShortcutsModal,
  ToastStack,
} from "@/components/StudioOverlays";
import { cn } from "@/utils/cn";

interface CodeSnapshot {
  mode: EditorMode;
  normalHtml: string;
  normalCss: string;
  normalJs: string;
  bloggerXml: string;
}

const DEFAULT_EDITOR_WIDTH = 360;
const DEFAULT_INSPECTOR_WIDTH = 355;

export default function App() {
  // Mode & editor buffers
  const [mode, setMode] = useState<EditorMode>("normal");
  const [activeEditorTab, setActiveEditorTab] = useState<NormalEditorTab>("html");

  const [normalHtml, setNormalHtml] = useState(DEFAULT_NORMAL_HTML);
  const [normalCss, setNormalCss] = useState(DEFAULT_NORMAL_CSS);
  const [normalJs, setNormalJs] = useState(DEFAULT_NORMAL_JS);
  const [bloggerXml, setBloggerXml] = useState(DEFAULT_BLOGGER_XML);
  const [bloggerView, setBloggerView] = useState<BloggerViewType>("homepage");
  const [dirOverride, setDirOverride] = useState<DirectionOverride>("auto");

  // Baseline snapshot for Revert button
  const [baselineNormal, setBaselineNormal] = useState({
    html: DEFAULT_NORMAL_HTML,
    css: DEFAULT_NORMAL_CSS,
    js: DEFAULT_NORMAL_JS,
  });
  const [baselineBlogger, setBaselineBlogger] = useState(DEFAULT_BLOGGER_XML);

  // Undo / Redo History
  const [past, setPast] = useState<CodeSnapshot[]>([]);
  const [future, setFuture] = useState<CodeSnapshot[]>([]);

  // Workspace Layout & Responsive Splitters
  const [showEditorPane, setShowEditorPane] = useState(true);
  const [showInspectorPane, setShowInspectorPane] = useState(true);
  const [editorWidth, setEditorWidth] = useState(DEFAULT_EDITOR_WIDTH);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);
  const [draggingHandle, setDraggingHandle] = useState<"editor" | "inspector" | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileWorkspaceTab>("preview");
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  // Preview & Sandbox state
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [srcDoc, setSrcDoc] = useState(() =>
    buildSrcdocNormal(DEFAULT_NORMAL_HTML, DEFAULT_NORMAL_CSS, DEFAULT_NORMAL_JS, "auto")
  );
  const [runKey, setRunKey] = useState(1);
  const [status, setStatus] = useState<SandboxStatus>("loading");
  const [iframeReady, setIframeReady] = useState(false);

  const [inspectMode, setInspectMode] = useState(false);
  const [smartEditMode, setSmartEditMode] = useState(false);
  const [xrayMode, setXrayMode] = useState(false);
  const [linkOverlayMode, setLinkOverlayMode] = useState(false);
  const [explodeMode, setExplodeMode] = useState(false);
  const [isolatedSelector, setIsolatedSelector] = useState<string | null>(null);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);

  // Smart Edit Sub-States (Context Menu, Geometric Move, Code Surgery Modal, Advanced Drawer)
  const [smartMenu, setSmartMenu] = useState<SmartContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    element: null,
  });
  const keepContextMenuOpenRef = useRef(false);

  const [moveSession, setMoveSession] = useState<SmartMoveSession>({
    active: false,
    selector: "",
    tagName: "",
    initialX: 0,
    initialY: 0,
    x: 0,
    y: 0,
    gridStep: 1,
    smartSnap: true,
    isolateShared: true,
  });

  const [codeModalState, setCodeModalState] = useState<{
    open: boolean;
    originElement: SelectedElementPayload | null;
    oldHtml: string;
    oldCss: string;
    targetCssSelector: string;
  }>({
    open: false,
    originElement: null,
    oldHtml: "",
    oldCss: "",
    targetCssSelector: "",
  });

  const [smartAdvancedOpen, setSmartAdvancedOpen] = useState(false);

  // Refs for syncing sandbox flags on iframe reload
  const inspectModeRef = useRef(false);
  inspectModeRef.current = inspectMode;
  const smartEditModeRef = useRef(false);
  smartEditModeRef.current = smartEditMode;
  const xrayModeRef = useRef(false);
  xrayModeRef.current = xrayMode;
  const linkOverlayRef = useRef(false);
  linkOverlayRef.current = linkOverlayMode;
  const explodeModeRef = useRef(false);
  explodeModeRef.current = explodeMode;

  const [viewport, setViewport] = useState<ViewportPreset>("desktop-hd");
  const [autoRun, setAutoRun] = useState(true);
  const [manualEditTick, setManualEditTick] = useState(0);

  // Inspector, Links, DOM Layers & UX Audit state
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("inspector");
  const [selectedElement, setSelectedElement] = useState<SelectedElementPayload | null>(null);
  const [selectionSeq, setSelectionSeq] = useState(0);
  const lastCommittedTextRef = useRef<string>("");

  const [pageLinks, setPageLinks] = useState<PageLinkItem[]>([]);
  const [domTree, setDomTree] = useState<DomTreeNode[]>([]);
  const [auditReport, setAuditReport] = useState<UxAuditReport | null>(null);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);

  // Component Extract Modal
  const [extractModalData, setExtractModalData] = useState<{
    open: boolean;
    html: string;
    css: string;
  }>({ open: false, html: "", css: "" });

  // Overlays & Feedback
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string | null>(null);
  const [textSyncNote, setTextSyncNote] = useState<string | null>(null);
  const [flashSeq, setFlashSeq] = useState(0);
  const syncTimerRef = useRef<number | null>(null);

  const currentRef = useRef({ mode, normalHtml, normalCss, normalJs, bloggerXml });
  currentRef.current = { mode, normalHtml, normalCss, normalJs, bloggerXml };

  const pushToast = useCallback(
    (title: string, variant: ToastItem["variant"] = "success") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2600);
    },
    []
  );

  const recordSnapshot = useCallback(() => {
    const snap: CodeSnapshot = { ...currentRef.current };
    setPast((prev) => [...prev.slice(-34), snap]);
    setFuture([]);
  }, []);

  const notifyCodeSync = useCallback((label: string) => {
    setLastSyncedLabel(label);
    setFlashSeq((n) => n + 1);
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      setLastSyncedLabel(null);
      setTextSyncNote(null);
    }, 2200);
  }, []);

  const postToSandbox = useCallback((type: string, payload?: unknown) => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.postMessage({ type, payload }, "*");
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Compile and run preview
  const executeRun = useCallback(
    (
      targetMode: EditorMode,
      htmlVal: string,
      cssVal: string,
      jsVal: string,
      xmlVal: string,
      viewVal: BloggerViewType,
      dirVal: DirectionOverride,
      forceReload = false
    ) => {
      setIframeReady(false);
      setStatus("loading");
      setSelectedElement(null);
      setIsolatedSelector(null);
      setSmartMenu((m) => ({ ...m, open: false }));
      setMoveSession((s) => ({ ...s, active: false }));

      const compiled =
        targetMode === "normal"
          ? buildSrcdocNormal(htmlVal, cssVal, jsVal, dirVal)
          : buildSrcdocBlogger(xmlVal, viewVal, dirVal);

      setSrcDoc(compiled);
      if (forceReload) setRunKey((k) => k + 1);
    },
    []
  );

  const handleManualRun = useCallback(() => {
    setConsoleEntries([]);
    executeRun(
      mode,
      normalHtml,
      normalCss,
      normalJs,
      bloggerXml,
      bloggerView,
      dirOverride,
      true
    );
  }, [bloggerView, bloggerXml, dirOverride, executeRun, mode, normalCss, normalHtml, normalJs]);

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const currentSnap: CodeSnapshot = { ...currentRef.current };
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [currentSnap, ...f.slice(0, 34)]);

    setMode(previous.mode);
    setNormalHtml(previous.normalHtml);
    setNormalCss(previous.normalCss);
    setNormalJs(previous.normalJs);
    setBloggerXml(previous.bloggerXml);
    executeRun(
      previous.mode,
      previous.normalHtml,
      previous.normalCss,
      previous.normalJs,
      previous.bloggerXml,
      bloggerView,
      dirOverride,
      true
    );
    pushToast("تم التراجع عن آخر تعديل", "info");
  }, [bloggerView, dirOverride, executeRun, past, pushToast]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const nextSnap = future[0];
    const currentSnap: CodeSnapshot = { ...currentRef.current };
    setFuture((f) => f.slice(1));
    setPast((p) => [...p.slice(-34), currentSnap]);

    setMode(nextSnap.mode);
    setNormalHtml(nextSnap.normalHtml);
    setNormalCss(nextSnap.normalCss);
    setNormalJs(nextSnap.normalJs);
    setBloggerXml(nextSnap.bloggerXml);
    executeRun(
      nextSnap.mode,
      nextSnap.normalHtml,
      nextSnap.normalCss,
      nextSnap.normalJs,
      nextSnap.bloggerXml,
      bloggerView,
      dirOverride,
      true
    );
    pushToast("تمت إعادة التعديل", "info");
  }, [bloggerView, dirOverride, executeRun, future, pushToast]);

  // Debounced auto-run when user types in the code editor
  useEffect(() => {
    if (!autoRun || manualEditTick === 0) return;
    const t = window.setTimeout(() => {
      executeRun(
        mode,
        normalHtml,
        normalCss,
        normalJs,
        bloggerXml,
        bloggerView,
        dirOverride,
        false
      );
    }, 420);
    return () => window.clearTimeout(t);
  }, [autoRun, manualEditTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen to messages from sandboxed preview iframe
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      const msg = e.data;
      if (!msg || typeof msg.type !== "string") return;

      if (msg.type === "SANDBOX_READY") {
        setIframeReady(true);
        setStatus((prev) => (prev === "error" ? "error" : "ready"));
        if (inspectModeRef.current) postToSandbox("TOGGLE_INSPECT", { enabled: true });
        if (smartEditModeRef.current) postToSandbox("TOGGLE_SMART_EDIT", { enabled: true });
        if (xrayModeRef.current) postToSandbox("TOGGLE_XRAY", { enabled: true });
        if (linkOverlayRef.current) postToSandbox("TOGGLE_LINK_OVERLAY", { enabled: true });
        if (explodeModeRef.current) postToSandbox("TOGGLE_EXPLODE_MODE", { enabled: true });
      } else if (msg.type === "SMART_CONTEXT_MENU") {
        const { element, clientX, clientY, viewportW, viewportH } = msg.payload as {
          element: SelectedElementPayload;
          clientX: number;
          clientY: number;
          viewportW: number;
          viewportH: number;
        };
        const frameRect = iframeRef.current?.getBoundingClientRect();
        const scaleX = frameRect && viewportW ? frameRect.width / viewportW : 1;
        const scaleY = frameRect && viewportH ? frameRect.height / viewportH : 1;
        const screenX = (frameRect?.left ?? 0) + clientX * scaleX;
        const screenY = (frameRect?.top ?? 0) + clientY * scaleY;

        setSelectedElement(element);
        lastCommittedTextRef.current = element.hasChildElements
          ? element.directText
          : element.innerText;
        setSelectionSeq((s) => s + 1);
        setSmartMenu({
          open: true,
          x: Math.round(screenX),
          y: Math.round(screenY),
          element,
        });
      } else if (msg.type === "SMART_CLOSE_MENU") {
        setSmartMenu((m) => (m.open ? { ...m, open: false } : m));
      } else if (msg.type === "GEOMETRIC_MOVE_PROGRESS") {
        const { x, y, distances } = msg.payload as {
          x: number;
          y: number;
          distances?: { top: number; right: number; bottom: number; left: number };
        };
        setMoveSession((prev) => ({ ...prev, x, y, distances }));
      } else if (msg.type === "ELEMENT_SELECTED") {
        const payload = msg.payload as SelectedElementPayload;
        setSelectedElement(payload);
        lastCommittedTextRef.current = payload.hasChildElements
          ? payload.directText
          : payload.innerText;
        setSelectionSeq((s) => s + 1);

        if (keepContextMenuOpenRef.current) {
          keepContextMenuOpenRef.current = false;
          setSmartMenu((m) => ({ ...m, element: payload }));
        } else if (!smartEditModeRef.current) {
          setInspectorTab("inspector");
          setShowInspectorPane(true);
        }
      } else if (msg.type === "ELEMENT_UPDATED") {
        const payload = msg.payload as SelectedElementPayload;
        setSelectedElement(payload);
        setSmartMenu((m) => (m.open ? { ...m, element: payload } : m));
      } else if (msg.type === "CLEAR_SELECTION") {
        setSelectedElement(null);
      } else if (msg.type === "ISOLATION_CHANGED") {
        setIsolatedSelector(msg.payload?.selector ?? null);
      } else if (msg.type === "OPEN_EXTERNAL_URL") {
        // Links clicked inside the sandboxed preview are opened here (top-level)
        // so they land in a clean, COOP-exempt tab.
        const url = msg.payload?.url;
        if (typeof url === "string" && url.trim()) {
          const res = openExternalUrl(url);
          if (res === "copied") {
            pushToast("تم نسخ الرابط إلى الحافظة — ألصقه في متصفحك لفتحه", "info");
          }
        }
      } else if (msg.type === "PAGE_LINKS") {
        setPageLinks((msg.payload as PageLinkItem[]) || []);
      } else if (msg.type === "DOM_TREE") {
        setDomTree((msg.payload as DomTreeNode[]) || []);
      } else if (msg.type === "AUDIT_RESULT") {
        setAuditReport(msg.payload as UxAuditReport);
      } else if (msg.type === "SANDBOX_ERROR") {
        setStatus("error");
        const errText = msg.payload?.message || "خطأ برمجي داخل المعاينة";
        setConsoleEntries((prev) => [
          ...prev.slice(-49),
          {
            id: `${Date.now()}-${Math.random()}`,
            level: "error",
            message: String(errText),
            timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
          },
        ]);
      } else if (msg.type === "SANDBOX_CONSOLE") {
        const lvl = msg.payload?.level || "log";
        const message = String(msg.payload?.message ?? "");
        setConsoleEntries((prev) => [
          ...prev.slice(-49),
          {
            id: `${Date.now()}-${Math.random()}`,
            level: lvl,
            message,
            timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
          },
        ]);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postToSandbox]);

  // Export / Download current project
  const handleExport = useCallback(() => {
    let content = "";
    let filename = "";
    if (mode === "normal") {
      const isFull = /<!doctype\s+html|<html\b/i.test(normalHtml);
      if (isFull) {
        content = normalCss.trim()
          ? normalHtml.replace(/<\/head>/i, `<style>\n${normalCss}\n</style>\n</head>`)
          : normalHtml;
      } else {
        content = `<!DOCTYPE html>\n<html dir="rtl" lang="ar">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <style>\n${normalCss}\n  </style>\n</head>\n<body>\n${normalHtml}\n<script>\n${normalJs}\n</script>\n</body>\n</html>`;
      }
      filename = "my-project.html";
    } else {
      content = bloggerXml;
      filename = "blogger-template.xml";
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    pushToast(`تم تنزيل ${filename} بنجاح`);
  }, [bloggerXml, mode, normalCss, normalHtml, normalJs, pushToast]);

  // Toggle Smart Edit Full-Screen Mode (Additive & Non-Destructive)
  const handleToggleSmartEdit = useCallback(() => {
    setSmartEditMode((prev) => {
      const next = !prev;
      if (next) {
        // Disable left-click inspect interception so full website browsing works naturally
        setInspectMode(false);
        setFullscreenPreview(false);
        if (iframeReady) {
          postToSandbox("TOGGLE_INSPECT", { enabled: false });
          postToSandbox("TOGGLE_SMART_EDIT", { enabled: true });
        }
        pushToast("وضع التعديل الذكي نشط — انقر بزر الفأرة الأيمن على أي عنصر", "info");
      } else {
        // Exit Smart Edit cleanly and return to 3-pane Studio with all edits preserved
        if (moveSession.active && iframeReady) {
          postToSandbox("FINISH_GEOMETRIC_MOVE", { commit: false });
        }
        setMoveSession((s) => ({ ...s, active: false }));
        setSmartMenu((m) => ({ ...m, open: false }));
        setCodeModalState((c) => ({ ...c, open: false }));
        setSmartAdvancedOpen(false);
        if (iframeReady) {
          postToSandbox("TOGGLE_SMART_EDIT", { enabled: false });
        }
      }
      return next;
    });
  }, [iframeReady, moveSession.active, postToSandbox, pushToast]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyE") {
        e.preventDefault();
        handleToggleSmartEdit();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyC") {
        e.preventDefault();
        if (smartEditModeRef.current) {
          handleToggleSmartEdit();
        }
        setInspectMode((prev) => {
          const next = !prev;
          postToSandbox("TOGGLE_INSPECT", { enabled: next });
          return next;
        });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "KeyS") {
        e.preventDefault();
        handleExport();
        return;
      }

      if (!isInput && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (!isInput && (e.ctrlKey || e.metaKey) && e.code === "KeyY") {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (!isInput && !e.ctrlKey && !e.metaKey && e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleExport, handleRedo, handleToggleSmartEdit, handleUndo, postToSandbox]);

  // Draggable RTL Splitters
  const startResize = (which: "editor" | "inspector", startX: number) => {
    setDraggingHandle(which);
    const initialWidth = which === "editor" ? editorWidth : inspectorWidth;

    const onMove = (ev: MouseEvent) => {
      if (which === "editor") {
        const delta = startX - ev.clientX;
        setEditorWidth(Math.max(260, Math.min(580, initialWidth + delta)));
      } else {
        const delta = ev.clientX - startX;
        setInspectorWidth(Math.max(280, Math.min(500, initialWidth + delta)));
      }
    };

    const onUp = () => {
      setDraggingHandle(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Switch between Normal (HTML/CSS/JS) and Blogger XML modes
  const handleSwitchMode = (nextMode: EditorMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setActiveEditorTab("html");
    setConsoleEntries([]);
    executeRun(
      nextMode,
      normalHtml,
      normalCss,
      normalJs,
      bloggerXml,
      bloggerView,
      dirOverride,
      true
    );
    pushToast(
      nextMode === "blogger"
        ? "تم التبديل إلى وضع قوالب بلوجر (XML)"
        : "تم التبديل إلى وضع الكود القياسي (HTML/CSS/JS)",
      "info"
    );
  };

  const handleChangeBloggerView = (nextView: BloggerViewType) => {
    setBloggerView(nextView);
    if (mode === "blogger") {
      executeRun(
        "blogger",
        normalHtml,
        normalCss,
        normalJs,
        bloggerXml,
        nextView,
        dirOverride,
        true
      );
    }
  };

  const handleChangeDirOverride = (nextDir: DirectionOverride) => {
    setDirOverride(nextDir);
    executeRun(
      mode,
      normalHtml,
      normalCss,
      normalJs,
      bloggerXml,
      bloggerView,
      nextDir,
      true
    );
  };

  const handleToggleInspect = () => {
    if (smartEditMode) {
      setSmartEditMode(false);
      if (iframeReady) postToSandbox("TOGGLE_SMART_EDIT", { enabled: false });
    }
    const next = !inspectMode;
    setInspectMode(next);
    if (iframeReady) postToSandbox("TOGGLE_INSPECT", { enabled: next });
    if (next) {
      setInspectorTab("inspector");
      setShowInspectorPane(true);
      if (!isDesktop) setMobileTab("preview");
    }
  };

  const handleEnableInspect = () => {
    setInspectMode(true);
    if (iframeReady) postToSandbox("TOGGLE_INSPECT", { enabled: true });
    if (!isDesktop) setMobileTab("preview");
  };

  const handleToggleXray = () => {
    const next = !xrayMode;
    setXrayMode(next);
    if (iframeReady) postToSandbox("TOGGLE_XRAY", { enabled: next });
  };

  const handleToggleLinkOverlay = () => {
    const next = !linkOverlayMode;
    setLinkOverlayMode(next);
    if (iframeReady) postToSandbox("TOGGLE_LINK_OVERLAY", { enabled: next });
  };

  const handleToggleExplodeMode = () => {
    const next = !explodeMode;
    setExplodeMode(next);
    if (iframeReady) postToSandbox("TOGGLE_EXPLODE_MODE", { enabled: next });
    pushToast(
      next ? "تم تفعيل التفكيك البصري للطبقات المتداخلة" : "تم إيقاف التفكيك البصري",
      "info"
    );
  };

  const handleToggleIsolate = useCallback(
    (selector: string | null) => {
      const next = isolatedSelector === selector ? null : selector;
      setIsolatedSelector(next);
      if (iframeReady) postToSandbox("ISOLATE_ELEMENT", { selector: next });
    },
    [iframeReady, isolatedSelector, postToSandbox]
  );

  const handleClearSelection = () => {
    setSelectedElement(null);
    if (iframeReady) postToSandbox("CLEAR_SELECTION");
  };

  // =========================================================
  // SMART EDIT HANDLERS (1: Geometric Move, 2: Code Surgery, 3: Advanced Props)
  // =========================================================

  // 1. Start Precision Geometric Move
  const handleStartSmartMove = useCallback(
    (el: SelectedElementPayload) => {
      setSmartMenu((m) => ({ ...m, open: false }));
      setSmartAdvancedOpen(false);
      setCodeModalState((c) => ({ ...c, open: false }));

      const initX = el.currentTranslate?.x ?? 0;
      const initY = el.currentTranslate?.y ?? 0;
      const shouldIsolate = el.sharedMatchCount > 1 && !el.id;

      setMoveSession({
        active: true,
        selector: el.selector,
        tagName: el.tagName,
        initialX: initX,
        initialY: initY,
        x: initX,
        y: initY,
        gridStep: 1,
        smartSnap: true,
        isolateShared: shouldIsolate,
      });

      if (iframeReady) {
        postToSandbox("START_GEOMETRIC_MOVE", {
          selector: el.selector,
          gridStep: 1,
          smartSnap: true,
        });
      }
    },
    [iframeReady, postToSandbox]
  );

  const handleSetMoveCoords = useCallback(
    (nx: number, ny: number) => {
      setMoveSession((prev) => ({ ...prev, x: nx, y: ny }));
      if (iframeReady) {
        postToSandbox("SET_GEOMETRIC_TRANSLATE", {
          selector: moveSession.selector,
          x: nx,
          y: ny,
        });
      }
    },
    [iframeReady, moveSession.selector, postToSandbox]
  );

  const handleUpdateMoveConfig = useCallback(
    (gridStep: 1 | 8 | 16, smartSnap: boolean) => {
      setMoveSession((prev) => ({ ...prev, gridStep, smartSnap }));
      if (iframeReady) {
        postToSandbox("UPDATE_GEOMETRIC_MOVE_CONFIG", { gridStep, smartSnap });
      }
    },
    [iframeReady, postToSandbox]
  );

  const handleReorderDomSibling = useCallback(
    (direction: "prev" | "next") => {
      if (!selectedElement) return;
      recordSnapshot();
      if (iframeReady) {
        postToSandbox("REORDER_DOM_SIBLING", {
          selector: selectedElement.selector,
          direction,
        });
      }
      if (mode === "normal") {
        setNormalHtml(
          (prev) => reorderElementInNormalHtml(prev, selectedElement.selector, direction).html
        );
        notifyCodeSync("تم تحديث الترتيب الهيكلي في HTML");
      } else {
        setBloggerXml(
          (prev) => reorderElementInBloggerXml(prev, selectedElement, direction).xml
        );
        notifyCodeSync("تم تحديث الترتيب الهيكلي في XML");
      }
      pushToast(
        direction === "prev" ? "↑ تم تقديم العنصر في الهيكل" : "↓ تم تأخير العنصر في الهيكل",
        "info"
      );
    },
    [iframeReady, mode, notifyCodeSync, postToSandbox, pushToast, recordSnapshot, selectedElement]
  );

  const handleCommitSmartMove = useCallback(() => {
    if (!moveSession.active) return;
    recordSnapshot();

    let targetSel = moveSession.selector;
    const tx = moveSession.x;
    const ty = moveSession.y;
    const transformVal = tx === 0 && ty === 0 ? "none" : `translate(${tx}px, ${ty}px)`;

    // If element shares a class with siblings and user opted to isolate this element's position
    if (
      moveSession.isolateShared &&
      selectedElement &&
      selectedElement.sharedMatchCount > 1 &&
      !selectedElement.id
    ) {
      const baseCls = (selectedElement.classes[0] || selectedElement.tagName).replace(
        /[^a-zA-Z0-9_-]/g,
        ""
      );
      const uniqueId = `${baseCls}-pos-${Math.floor(100 + Math.random() * 899)}`;
      targetSel = `#${uniqueId}`;

      if (iframeReady) {
        postToSandbox("CLEAR_SELECTOR_PATCHES", {
          selector: moveSession.selector,
          property: "transform",
        });
        postToSandbox("APPLY_ATTR_PATCH", {
          selector: selectedElement.selector,
          attr: "id",
          value: uniqueId,
        });
        postToSandbox("APPLY_STYLE_PATCH", {
          selector: targetSel,
          property: "transform",
          value: transformVal,
        });
      }

      if (mode === "normal") {
        setNormalHtml(
          (prev) => assignUniqueIdInSource("normal", prev, selectedElement, uniqueId).source
        );
        setNormalCss((prev) => modifyCssRule(prev, targetSel, "transform", transformVal));
      } else {
        setBloggerXml((prev) => {
          const withId = assignUniqueIdInSource("blogger", prev, selectedElement, uniqueId).source;
          return modifyCssInXml(withId, targetSel, "transform", transformVal);
        });
      }
    } else {
      if (mode === "normal") {
        setNormalCss((prev) => modifyCssRule(prev, targetSel, "transform", transformVal));
      } else {
        setBloggerXml((prev) => modifyCssInXml(prev, targetSel, "transform", transformVal));
      }
    }

    if (iframeReady) {
      postToSandbox("FINISH_GEOMETRIC_MOVE", { commit: true });
    }
    setMoveSession((s) => ({ ...s, active: false }));
    notifyCodeSync(`تم حفظ الموضع الهندسي (${tx}px, ${ty}px)`);
    pushToast(`تم حفظ موضع العنصر (${tx}px, ${ty}px) ومزامنته مع الكود`);
  }, [
    iframeReady,
    mode,
    moveSession,
    notifyCodeSync,
    postToSandbox,
    pushToast,
    recordSnapshot,
    selectedElement,
  ]);

  const handleCancelSmartMove = useCallback(() => {
    if (iframeReady) {
      postToSandbox("FINISH_GEOMETRIC_MOVE", { commit: false });
    }
    setMoveSession((s) => ({ ...s, active: false }));
    pushToast("تم إلغاء التحريك واستعادة الموضع السابق", "info");
  }, [iframeReady, postToSandbox, pushToast]);

  // 2. Open Programmatic Code Comparison & Edit Modal
  const handleOpenSmartCodeEdit = useCallback(
    (el: SelectedElementPayload) => {
      setSmartMenu((m) => ({ ...m, open: false }));
      if (moveSession.active && iframeReady) {
        postToSandbox("FINISH_GEOMETRIC_MOVE", { commit: false });
        setMoveSession((s) => ({ ...s, active: false }));
      }

      const formattedOldHtml = prettyFormatHtmlSnippet(el.outerHTML);
      const cssExtract = extractElementCssSnippet(
        el,
        mode === "normal" ? normalCss : bloggerXml,
        mode
      );

      setCodeModalState({
        open: true,
        originElement: el,
        oldHtml: formattedOldHtml,
        oldCss: cssExtract.cssBlock,
        targetCssSelector: cssExtract.targetSelector,
      });
    },
    [bloggerXml, iframeReady, mode, moveSession.active, normalCss, postToSandbox]
  );

  const handleLivePreviewSmartCode = useCallback(
    (draftHtml: string, draftCss: string) => {
      if (!selectedElement || !iframeReady) return;
      const cssSel = codeModalState.targetCssSelector || selectedElement.selector;
      postToSandbox("REPLACE_ELEMENT_HTML", {
        selector: selectedElement.selector,
        html: draftHtml,
      });
      postToSandbox("CLEAR_SELECTOR_PATCHES", { selector: cssSel });
      const decls = parseCssDeclarations(draftCss);
      for (const d of decls) {
        postToSandbox("APPLY_STYLE_PATCH", {
          selector: cssSel,
          property: d.property,
          value: d.value,
        });
      }
      pushToast("تمت معاينة التعديل البرمجي على الصفحة", "info");
    },
    [codeModalState.targetCssSelector, iframeReady, postToSandbox, pushToast, selectedElement]
  );

  const handleRevertSmartCode = useCallback(
    (origHtml: string, origCss: string) => {
      if (!selectedElement || !iframeReady) return;
      const cssSel = codeModalState.targetCssSelector || selectedElement.selector;
      postToSandbox("REPLACE_ELEMENT_HTML", {
        selector: selectedElement.selector,
        html: origHtml,
      });
      postToSandbox("CLEAR_SELECTOR_PATCHES", { selector: cssSel });
      const decls = parseCssDeclarations(origCss);
      for (const d of decls) {
        postToSandbox("APPLY_STYLE_PATCH", {
          selector: cssSel,
          property: d.property,
          value: d.value,
        });
      }
      pushToast("↺ تم إرجاع العنصر إلى الكود القديم الأصلي", "warning");
    },
    [codeModalState.targetCssSelector, iframeReady, postToSandbox, pushToast, selectedElement]
  );

  const handleSaveSmartCode = useCallback(
    (newHtml: string, newCss: string) => {
      const sourceTarget = codeModalState.originElement ?? selectedElement;
      if (!sourceTarget || !selectedElement) return;
      recordSnapshot();

      const markupChanged = newHtml.trim() !== codeModalState.oldHtml.trim();
      const cssChanged = newCss.trim() !== codeModalState.oldCss.trim();
      const cssSel = codeModalState.targetCssSelector || sourceTarget.selector;

      if (iframeReady) {
        if (markupChanged) {
          postToSandbox("REPLACE_ELEMENT_HTML", {
            selector: selectedElement.selector,
            html: newHtml,
          });
        }
        if (cssChanged) {
          postToSandbox("CLEAR_SELECTOR_PATCHES", { selector: cssSel });
          const decls = parseCssDeclarations(newCss);
          for (const d of decls) {
            postToSandbox("APPLY_STYLE_PATCH", {
              selector: cssSel,
              property: d.property,
              value: d.value,
            });
          }
        }
      }

      if (mode === "normal") {
        if (markupChanged) {
          setNormalHtml(
            (prev) =>
              replaceElementOuterHtmlInNormalHtml(prev, sourceTarget.selector, newHtml).html
          );
        }
        if (cssChanged) {
          setNormalCss((prev) =>
            applyCssRuleBlockToSource("normal", prev, cssSel, newCss)
          );
        }
        notifyCodeSync("تم حفظ التعديل البرمجي في HTML/CSS");
      } else {
        setBloggerXml((prev) => {
          let updated = prev;
          if (markupChanged) {
            updated = replaceElementOuterHtmlInBloggerXml(updated, sourceTarget, newHtml).xml;
          }
          if (cssChanged) {
            updated = applyCssRuleBlockToSource("blogger", updated, cssSel, newCss);
          }
          return updated;
        });
        notifyCodeSync("تم حفظ التعديل البرمجي في XML");
      }

      setCodeModalState((c) => ({ ...c, open: false }));
      pushToast("تم حفظ التعديلات البرمجية ومزامنتها بالكامل");
    },
    [
      codeModalState.oldCss,
      codeModalState.oldHtml,
      codeModalState.targetCssSelector,
      iframeReady,
      mode,
      notifyCodeSync,
      postToSandbox,
      pushToast,
      recordSnapshot,
      selectedElement,
    ]
  );

  // 3. Open Advanced Element Properties Drawer
  const handleOpenSmartAdvanced = useCallback(
    (el: SelectedElementPayload) => {
      setSelectedElement(el);
      setSmartMenu((m) => ({ ...m, open: false }));
      if (moveSession.active && iframeReady) {
        postToSandbox("FINISH_GEOMETRIC_MOVE", { commit: false });
        setMoveSession((s) => ({ ...s, active: false }));
      }
      setSmartAdvancedOpen(true);
    },
    [iframeReady, moveSession.active, postToSandbox]
  );

  // Attach Link to a non-link element
  const handleAttachLinkToElement = useCallback(
    (href: string, openNewTab: boolean) => {
      if (!selectedElement) return;
      recordSnapshot();

      const res = attachLinkToElementInSource(
        mode,
        mode === "normal" ? normalHtml : bloggerXml,
        selectedElement,
        href,
        openNewTab
      );

      if (iframeReady) {
        postToSandbox("REPLACE_ELEMENT_HTML", {
          selector: selectedElement.selector,
          html: res.wrappedHtml,
        });
      }

      if (mode === "normal") {
        setNormalHtml(res.source);
        notifyCodeSync("تم إلحاق الرابط في HTML");
      } else {
        setBloggerXml(res.source);
        notifyCodeSync("تم إلحاق الرابط في XML");
      }

      pushToast(`تم إلحاق الرابط (${href}) بالعنصر بنجاح`);
    },
    [
      bloggerXml,
      iframeReady,
      mode,
      normalHtml,
      notifyCodeSync,
      postToSandbox,
      pushToast,
      recordSnapshot,
      selectedElement,
    ]
  );

  // =========================================================
  // CORE STUDIO HANDLERS (Presets, Import, Styles, Attributes, Decomposer)
  // =========================================================
  const handleSelectPreset = (preset: TemplatePreset) => {
    recordSnapshot();
    setConsoleEntries([]);
    if (preset.mode === "normal") {
      const h = preset.normalHtml ?? DEFAULT_NORMAL_HTML;
      const c = preset.normalCss ?? DEFAULT_NORMAL_CSS;
      const j = preset.normalJs ?? DEFAULT_NORMAL_JS;
      setMode("normal");
      setActiveEditorTab("html");
      setNormalHtml(h);
      setNormalCss(c);
      setNormalJs(j);
      setBaselineNormal({ html: h, css: c, js: j });
      executeRun("normal", h, c, j, bloggerXml, bloggerView, dirOverride, true);
    } else {
      const x = preset.bloggerXml ?? DEFAULT_BLOGGER_XML;
      setMode("blogger");
      setActiveEditorTab("html");
      setBloggerXml(x);
      setBaselineBlogger(x);
      setBloggerView("homepage");
      executeRun("blogger", normalHtml, normalCss, normalJs, x, "homepage", dirOverride, true);
    }
    pushToast(`تم تحميل قالب: ${preset.label}`);
  };

  const handleImportFile = (filename: string, content: string) => {
    recordSnapshot();
    const isBlogger =
      filename.toLowerCase().endsWith(".xml") ||
      /<b:skin|<b:section|xmlns:b=/i.test(content);

    setConsoleEntries([]);
    if (isBlogger) {
      setMode("blogger");
      setActiveEditorTab("html");
      setBloggerXml(content);
      setBaselineBlogger(content);
      setBloggerView("homepage");
      executeRun(
        "blogger",
        normalHtml,
        normalCss,
        normalJs,
        content,
        "homepage",
        dirOverride,
        true
      );
    } else {
      const isFullHtml = /<!doctype\s+html|<html\b/i.test(content);
      const nextHtml = content.trim();
      const nextCss = isFullHtml ? "/* التنسيقات الإضافية المضافة عبر المفتش */\n" : normalCss;
      const nextJs = "";

      setMode("normal");
      setActiveEditorTab("html");
      setNormalHtml(nextHtml);
      setNormalCss(nextCss);
      setNormalJs(nextJs);
      setBaselineNormal({ html: nextHtml, css: nextCss, js: nextJs });
      executeRun("normal", nextHtml, nextCss, nextJs, bloggerXml, bloggerView, dirOverride, true);
    }
    pushToast(`تم استيراد الملف ${filename} بدقة كاملة`);
  };

  const handleRevert = () => {
    recordSnapshot();
    setConsoleEntries([]);
    if (mode === "normal") {
      setNormalHtml(baselineNormal.html);
      setNormalCss(baselineNormal.css);
      setNormalJs(baselineNormal.js);
      executeRun(
        "normal",
        baselineNormal.html,
        baselineNormal.css,
        baselineNormal.js,
        bloggerXml,
        bloggerView,
        dirOverride,
        true
      );
    } else {
      setBloggerXml(baselineBlogger);
      executeRun(
        "blogger",
        normalHtml,
        normalCss,
        normalJs,
        baselineBlogger,
        bloggerView,
        dirOverride,
        true
      );
    }
    pushToast("تمت استعادة الكود الأصلي للقالب", "warning");
  };

  const handlePreviewStyle = useCallback(
    (selector: string, prop: string, value: string) => {
      if (!iframeReady) return;
      postToSandbox("APPLY_STYLE_PATCH", { selector, property: prop, value });
    },
    [iframeReady, postToSandbox]
  );

  const handleCommitStyle = useCallback(
    (selector: string, prop: string, value: string) => {
      if (!value.trim()) return;
      recordSnapshot();
      if (iframeReady) {
        postToSandbox("APPLY_STYLE_PATCH", { selector, property: prop, value });
      }
      if (mode === "normal") {
        setNormalCss((prev) => modifyCssRule(prev, selector, prop, value));
        setActiveEditorTab("css");
        notifyCodeSync("تم تحديث styles.css");
      } else {
        setBloggerXml((prev) => modifyCssInXml(prev, selector, prop, value));
        notifyCodeSync("تم تحديث b:skin في XML");
      }
    },
    [iframeReady, mode, notifyCodeSync, postToSandbox, recordSnapshot]
  );

  const handleUpdateElementAttribute = useCallback(
    (
      target: {
        selector: string;
        tagName: string;
        id?: string;
        classes?: string[];
        rawHref?: string;
        label?: string;
      },
      attr: string,
      value: string
    ) => {
      recordSnapshot();
      if (iframeReady) {
        postToSandbox("APPLY_ATTR_PATCH", {
          selector: target.selector,
          attr,
          value,
        });
      }

      if (mode === "normal") {
        setNormalHtml((prev) => modifyAttributeInNormalHtml(prev, target.selector, attr, value).html);
        setActiveEditorTab("html");
        notifyCodeSync(`تم تحديث السمة ${attr}`);
      } else {
        setBloggerXml(
          (prev) =>
            modifyAttributeInBloggerXml(
              prev,
              target.tagName,
              target.id ?? "",
              target.classes ?? [],
              target.rawHref ?? "",
              target.label ?? "",
              attr,
              value
            ).xml
        );
        notifyCodeSync(`تم تحديث ${attr} في XML`);
      }
      pushToast(`تم حفظ تعديل ${attr === "href" ? "الرابط" : attr}`);
    },
    [iframeReady, mode, notifyCodeSync, postToSandbox, pushToast, recordSnapshot]
  );

  const handleSplitSharedStyle = useCallback(() => {
    if (!selectedElement) return;
    recordSnapshot();
    const baseCls = selectedElement.classes[0] || selectedElement.tagName;
    const cleanBase = baseCls.replace(/[^a-zA-Z0-9_-]/g, "");
    const uniqueId = `${cleanBase}-custom-${Math.floor(100 + Math.random() * 899)}`;

    if (iframeReady) {
      postToSandbox("APPLY_ATTR_PATCH", {
        selector: selectedElement.selector,
        attr: "id",
        value: uniqueId,
      });
      setTimeout(() => {
        postToSandbox("SELECT_ELEMENT", { selector: `#${uniqueId}` });
      }, 60);
    }

    if (mode === "normal") {
      setNormalHtml(
        (prev) => assignUniqueIdInSource("normal", prev, selectedElement, uniqueId).source
      );
      notifyCodeSync(`تم فصل العنصر بـ #${uniqueId}`);
    } else {
      setBloggerXml(
        (prev) => assignUniqueIdInSource("blogger", prev, selectedElement, uniqueId).source
      );
      notifyCodeSync(`تم فصل العنصر بـ #${uniqueId}`);
    }
    pushToast(`تم فصل تنسيق العنصر بالمحدد المستقل #${uniqueId}`);
  }, [iframeReady, mode, notifyCodeSync, postToSandbox, pushToast, recordSnapshot, selectedElement]);

  const handleUnwrapContainer = useCallback(() => {
    if (!selectedElement) return;
    recordSnapshot();
    const sel = selectedElement.selector;

    if (iframeReady) {
      postToSandbox("UNWRAP_ELEMENT", { selector: sel });
    }

    if (mode === "normal") {
      setNormalHtml((prev) => unwrapElementInNormalHtml(prev, sel).html);
      setActiveEditorTab("html");
      notifyCodeSync("تم فك تجميع الحاوية في HTML");
    } else {
      setBloggerXml(
        (prev) =>
          unwrapElementInBloggerXml(
            prev,
            selectedElement.tagName,
            selectedElement.id,
            selectedElement.classes
          ).xml
      );
      notifyCodeSync("تم فك تجميع الحاوية في XML");
    }
    pushToast("تم فك تجميع الحاوية وفصل عناصرها الداخلية");
  }, [iframeReady, mode, notifyCodeSync, postToSandbox, pushToast, recordSnapshot, selectedElement]);

  const handleOpenExtractModal = useCallback(() => {
    if (!selectedElement) return;
    const res = extractStandaloneComponentCode(
      selectedElement,
      mode === "normal" ? normalCss : bloggerXml,
      mode
    );
    setExtractModalData({ open: true, html: res.html, css: res.css });
  }, [bloggerXml, mode, normalCss, selectedElement]);

  const handleEditSubPartText = useCallback(
    (part: CompoundSubPart, newText: string) => {
      if (!selectedElement) return;
      if (iframeReady) {
        postToSandbox("APPLY_PART_TEXT_PATCH", {
          parentSelector: selectedElement.selector,
          textNodeIndex: part.textNodeIndex,
          partSelector: part.kind !== "direct-text" ? part.selector : undefined,
          text: newText,
        });
      }

      if (mode === "normal") {
        setNormalHtml((prev) => {
          const res = modifyPartTextInNormalHtml(
            prev,
            selectedElement.selector,
            part.textNodeIndex,
            part.kind !== "direct-text" ? part.selector : undefined,
            newText
          );
          if (res.matched) notifyCodeSync("تم تحديث الجزء النصي في HTML");
          return res.html;
        });
      } else {
        setBloggerXml((prev) => {
          const targetMock: SelectedElementPayload = {
            ...selectedElement,
            tagName: part.kind === "direct-text" ? selectedElement.tagName : part.tagName,
            id: part.kind === "direct-text" ? selectedElement.id : "",
            classes: part.kind === "direct-text" ? selectedElement.classes : [],
            directText: part.textValue,
            innerText: part.textValue,
            hasChildElements: false,
          };
          const res = modifyTextInBloggerXml(prev, targetMock, newText, part.textValue);
          if (res.matched) notifyCodeSync("تم تحديث الجزء النصي في XML");
          return res.xml;
        });
      }
    },
    [iframeReady, mode, notifyCodeSync, postToSandbox, selectedElement]
  );

  const handleApplyAutoFix = useCallback(
    (issue: UxIssue) => {
      if (!issue.autoFix) return;
      recordSnapshot();

      for (const patch of issue.autoFix.patches) {
        if (iframeReady) {
          postToSandbox("APPLY_STYLE_PATCH", {
            selector: issue.selector,
            property: patch.property,
            value: patch.value,
          });
        }
      }

      if (mode === "normal") {
        setNormalCss((prev) => {
          let updated = prev;
          for (const patch of issue.autoFix!.patches) {
            updated = modifyCssRule(updated, issue.selector, patch.property, patch.value);
          }
          return updated;
        });
        setActiveEditorTab("css");
        notifyCodeSync("تم تطبيق الإصلاح في CSS");
      } else {
        setBloggerXml((prev) => {
          let updated = prev;
          for (const patch of issue.autoFix!.patches) {
            updated = modifyCssInXml(updated, issue.selector, patch.property, patch.value);
          }
          return updated;
        });
        notifyCodeSync("تم تطبيق الإصلاح في XML");
      }

      pushToast(`⚡ ${issue.autoFix.label}`);
    },
    [iframeReady, mode, notifyCodeSync, postToSandbox, pushToast, recordSnapshot]
  );

  const handleEditText = useCallback(
    (selector: string, newText: string) => {
      if (iframeReady) {
        postToSandbox("APPLY_TEXT_PATCH", { selector, text: newText });
      }

      if (mode === "normal") {
        setNormalHtml((prev) => {
          const res = modifyTextInNormalHtml(prev, selector, newText);
          if (res.matched) {
            setTextSyncNote("✓ حُفظ في HTML");
            notifyCodeSync("تم تحديث النص في HTML");
          }
          return res.html;
        });
        setActiveEditorTab("html");
      } else if (selectedElement) {
        const prevCommitted = lastCommittedTextRef.current;
        setBloggerXml((prev) => {
          const res = modifyTextInBloggerXml(prev, selectedElement, newText, prevCommitted);
          if (res.matched) {
            lastCommittedTextRef.current = newText;
            setTextSyncNote("✓ حُفظ في XML");
            notifyCodeSync("تم تحديث النص في XML");
          } else {
            setTextSyncNote("معاينة فورية");
          }
          return res.xml;
        });
      }
    },
    [iframeReady, mode, notifyCodeSync, postToSandbox, selectedElement]
  );

  const handleSelectBySelector = useCallback(
    (selector: string) => {
      if (!iframeReady) return;
      postToSandbox("SELECT_ELEMENT", { selector });
      if (!smartEditModeRef.current) {
        setInspectorTab("inspector");
        setShowInspectorPane(true);
        if (fullscreenPreview) setFullscreenPreview(false);
      }
    },
    [fullscreenPreview, iframeReady, postToSandbox]
  );

  const handleHoverBySelector = useCallback(
    (selector: string | null, linkedSelector?: string) => {
      if (!iframeReady) return;
      postToSandbox("HOVER_ELEMENT", { selector, linkedSelector });
    },
    [iframeReady, postToSandbox]
  );

  const handleRunAudit = useCallback(() => {
    if (iframeReady) postToSandbox("RUN_AUDIT");
  }, [iframeReady, postToSandbox]);

  // Open an external URL in a clean, COOP-exempt top-level tab.
  const handleOpenExternalUrl = useCallback(
    (url: string) => {
      const res = openExternalUrl(url);
      if (res === "copied") {
        pushToast("تم نسخ الرابط إلى الحافظة — ألصقه في متصفحك لفتحه", "info");
      } else if (res === "failed") {
        pushToast("تعذّر فتح الرابط تلقائياً — انسخه يدوياً", "warning");
      }
    },
    [pushToast]
  );

  const editorVisible = !smartEditMode && (isDesktop ? showEditorPane : mobileTab === "editor");
  const previewVisible = smartEditMode || (isDesktop ? true : mobileTab === "preview");
  const inspectorVisible =
    !smartEditMode && (isDesktop ? showInspectorPane : mobileTab === "inspector");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-crust text-text">
      {/* Top Bar: Classic Studio Toolbar OR Minimal Full-Screen Smart Edit HUD */}
      {smartEditMode ? (
        <SmartEditTopHud
          mode={mode}
          bloggerView={bloggerView}
          viewport={viewport}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onChangeBloggerView={handleChangeBloggerView}
          onChangeViewport={setViewport}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExitSmartEdit={handleToggleSmartEdit}
        />
      ) : (
        <Toolbar
          mode={mode}
          status={status}
          inspectMode={inspectMode}
          smartEditMode={smartEditMode}
          uxScore={auditReport ? auditReport.score : null}
          uxIssueCount={auditReport ? auditReport.issues.length : 0}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          showEditorPane={showEditorPane}
          showInspectorPane={showInspectorPane}
          onSwitchMode={handleSwitchMode}
          onRun={handleManualRun}
          onToggleInspect={handleToggleInspect}
          onToggleSmartEdit={handleToggleSmartEdit}
          onOpenAudit={() => {
            setInspectorTab("audit");
            setShowInspectorPane(true);
            if (!isDesktop) setMobileTab("inspector");
            handleRunAudit();
          }}
          onExport={handleExport}
          onRevert={handleRevert}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onToggleEditorPane={() => setShowEditorPane((v) => !v)}
          onToggleInspectorPane={() => setShowInspectorPane((v) => !v)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onSelectPreset={handleSelectPreset}
          onImportFile={handleImportFile}
        />
      )}

      {/* Main Workspace */}
      <main className="layout flex min-h-0 flex-1 overflow-hidden">
        {editorVisible && !fullscreenPreview && (
          <EditorPane
            mode={mode}
            activeTab={activeEditorTab}
            normalHtml={normalHtml}
            normalCss={normalCss}
            normalJs={normalJs}
            bloggerXml={bloggerXml}
            bloggerView={bloggerView}
            autoRun={autoRun}
            lastSyncedLabel={lastSyncedLabel}
            flashSeq={flashSeq}
            styleWidth={isDesktop ? editorWidth : undefined}
            onSelectTab={setActiveEditorTab}
            onChangeNormalHtml={(v) => {
              setNormalHtml(v);
              setManualEditTick((t) => t + 1);
            }}
            onChangeNormalCss={(v) => {
              setNormalCss(v);
              setManualEditTick((t) => t + 1);
            }}
            onChangeNormalJs={(v) => {
              setNormalJs(v);
              setManualEditTick((t) => t + 1);
            }}
            onChangeBloggerXml={(v) => {
              setBloggerXml(v);
              setManualEditTick((t) => t + 1);
            }}
            onChangeBloggerView={handleChangeBloggerView}
            onToggleAutoRun={() => setAutoRun((a) => !a)}
            onRunShortcut={handleManualRun}
          />
        )}

        {/* Splitter 1: Editor <-> Preview */}
        {!smartEditMode && isDesktop && showEditorPane && !fullscreenPreview && (
          <div
            role="separator"
            aria-orientation="vertical"
            title="اسحب لتغيير عرض المحرر (نقر مزدوج لإعادة الضبط)"
            onMouseDown={(e) => startResize("editor", e.clientX)}
            onDoubleClick={() => setEditorWidth(DEFAULT_EDITOR_WIDTH)}
            className={cn("pane-resizer", draggingHandle === "editor" && "dragging")}
          />
        )}

        <div className={cn("min-w-0 flex-1", !previewVisible && !fullscreenPreview && "hidden")}>
          <PreviewPane
            iframeRef={iframeRef}
            srcDoc={srcDoc}
            runKey={runKey}
            mode={mode}
            bloggerView={bloggerView}
            dirOverride={dirOverride}
            viewport={viewport}
            inspectMode={inspectMode}
            xrayMode={xrayMode}
            linkOverlayMode={linkOverlayMode}
            explodeMode={explodeMode}
            isolatedSelector={isolatedSelector}
            fullscreenPreview={fullscreenPreview}
            smartEditMode={smartEditMode}
            isResizingPanes={draggingHandle !== null}
            breadcrumbs={selectedElement ? selectedElement.breadcrumbs : []}
            consoleEntries={consoleEntries}
            onChangeViewport={setViewport}
            onChangeDirOverride={handleChangeDirOverride}
            onToggleXray={handleToggleXray}
            onToggleLinkOverlay={handleToggleLinkOverlay}
            onToggleExplodeMode={handleToggleExplodeMode}
            onClearIsolation={() => handleToggleIsolate(null)}
            onToggleFullscreen={() => setFullscreenPreview((f) => !f)}
            onReloadPreview={handleManualRun}
            onSelectBreadcrumb={handleSelectBySelector}
            onHoverBreadcrumb={(sel) => handleHoverBySelector(sel)}
            onClearConsole={() => setConsoleEntries([])}
          />
        </div>

        {/* Splitter 2: Preview <-> Inspector */}
        {!smartEditMode && isDesktop && showInspectorPane && !fullscreenPreview && (
          <div
            role="separator"
            aria-orientation="vertical"
            title="اسحب لتغيير عرض المفتش (نقر مزدوج لإعادة الضبط)"
            onMouseDown={(e) => startResize("inspector", e.clientX)}
            onDoubleClick={() => setInspectorWidth(DEFAULT_INSPECTOR_WIDTH)}
            className={cn("pane-resizer", draggingHandle === "inspector" && "dragging")}
          />
        )}

        {inspectorVisible && !fullscreenPreview && (
          <InspectorPane
            activeTab={inspectorTab}
            inspectMode={inspectMode}
            linkOverlayMode={linkOverlayMode}
            explodeMode={explodeMode}
            isolatedSelector={isolatedSelector}
            selectedElement={selectedElement}
            selectionSeq={selectionSeq}
            pageLinks={pageLinks}
            domTree={domTree}
            auditReport={auditReport}
            textSyncNote={textSyncNote}
            styleWidth={isDesktop ? inspectorWidth : undefined}
            onChangeTab={setInspectorTab}
            onEnableInspect={handleEnableInspect}
            onClearSelection={handleClearSelection}
            onToggleLinkOverlay={handleToggleLinkOverlay}
            onToggleExplodeMode={handleToggleExplodeMode}
            onToggleIsolate={handleToggleIsolate}
            onSplitSharedStyle={handleSplitSharedStyle}
            onUnwrapContainer={handleUnwrapContainer}
            onOpenExtractModal={handleOpenExtractModal}
            onPreviewStyle={handlePreviewStyle}
            onCommitStyle={handleCommitStyle}
            onEditText={handleEditText}
            onEditSubPartText={handleEditSubPartText}
            onUpdateElementAttribute={handleUpdateElementAttribute}
            onRunAudit={handleRunAudit}
            onInspectSelector={handleSelectBySelector}
            onHoverSelector={handleHoverBySelector}
            onApplyAutoFix={handleApplyAutoFix}
            onOpenExternalUrl={handleOpenExternalUrl}
          />
        )}
      </main>

      {!smartEditMode && (
        <MobileWorkspaceBar
          active={mobileTab}
          issueCount={auditReport ? auditReport.issues.length : 0}
          onSelect={setMobileTab}
        />
      )}

      {/* =========================================================
          SMART EDIT OVERLAYS (Active only during Smart Edit Mode)
         ========================================================= */}
      {smartEditMode && (
        <>
          <SmartContextMenu
            menu={smartMenu}
            onClose={() => setSmartMenu((m) => ({ ...m, open: false }))}
            onSelectParent={(parentSel) => {
              keepContextMenuOpenRef.current = true;
              postToSandbox("SELECT_ELEMENT", { selector: parentSel });
            }}
            onStartMove={handleStartSmartMove}
            onOpenCodeEdit={handleOpenSmartCodeEdit}
            onOpenAdvancedProps={handleOpenSmartAdvanced}
            onToggleIsolate={(sel) => handleToggleIsolate(sel)}
            onOpenInFullStudio={() => {
              setSmartMenu((m) => ({ ...m, open: false }));
              setSmartEditMode(false);
              if (iframeReady) postToSandbox("TOGGLE_SMART_EDIT", { enabled: false });
              setInspectorTab("inspector");
              setShowInspectorPane(true);
            }}
          />

          <SmartMoveHud
            session={moveSession}
            selectedElement={selectedElement}
            onSetCoords={handleSetMoveCoords}
            onUpdateConfig={handleUpdateMoveConfig}
            onToggleIsolateShared={() =>
              setMoveSession((s) => ({ ...s, isolateShared: !s.isolateShared }))
            }
            onReorderDom={handleReorderDomSibling}
            onCommit={handleCommitSmartMove}
            onCancel={handleCancelSmartMove}
          />

          <SmartCodeModal
            open={codeModalState.open}
            mode={mode}
            element={selectedElement}
            oldHtml={codeModalState.oldHtml}
            oldCss={codeModalState.oldCss}
            targetCssSelector={codeModalState.targetCssSelector}
            onClose={() => setCodeModalState((c) => ({ ...c, open: false }))}
            onLivePreview={handleLivePreviewSmartCode}
            onRevertToOld={handleRevertSmartCode}
            onSaveCommit={handleSaveSmartCode}
          />

          <SmartAdvancedDrawer
            open={smartAdvancedOpen}
            selectedElement={selectedElement}
            selectionSeq={selectionSeq}
            isolatedSelector={isolatedSelector}
            explodeMode={explodeMode}
            textSyncNote={textSyncNote}
            onClose={() => setSmartAdvancedOpen(false)}
            onOpenCodeModal={() => {
              if (selectedElement) {
                setSmartAdvancedOpen(false);
                handleOpenSmartCodeEdit(selectedElement);
              }
            }}
            onStartMove={() => {
              if (selectedElement) {
                setSmartAdvancedOpen(false);
                handleStartSmartMove(selectedElement);
              }
            }}
            onSelectElement={(sel) => handleSelectBySelector(sel)}
            onHoverElement={(sel) => handleHoverBySelector(sel)}
            onToggleIsolate={handleToggleIsolate}
            onToggleExplodeMode={handleToggleExplodeMode}
            onSplitSharedStyle={handleSplitSharedStyle}
            onUnwrapContainer={handleUnwrapContainer}
            onOpenExtractModal={handleOpenExtractModal}
            onEditText={handleEditText}
            onEditSubPartText={handleEditSubPartText}
            onUpdateElementAttribute={handleUpdateElementAttribute}
            onAttachLinkToElement={handleAttachLinkToElement}
            onPreviewStyle={handlePreviewStyle}
            onCommitStyle={handleCommitStyle}
            onOpenExternalUrl={handleOpenExternalUrl}
          />
        </>
      )}

      <ComponentExtractModal
        open={extractModalData.open}
        html={extractModalData.html}
        css={extractModalData.css}
        onClose={() => setExtractModalData((d) => ({ ...d, open: false }))}
      />

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastStack toasts={toasts} />
    </div>
  );
}
