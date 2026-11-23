import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignCenter,
  faAlignJustify,
  faAlignLeft,
  faAlignRight,
  faBolt,
  faCheck,
  faChevronDown,
  faCircleCheck,
  faCircleXmark,
  faCopy,
  faCrosshairs,
  faCube,
  faExpand,
  faFont,
  faLayerGroup,
  faLink,
  faMagnifyingGlass,
  faMinus,
  faPalette,
  faPenToSquare,
  faPlus,
  faRotateLeft,
  faShieldHalved,
  faSliders,
  faTriangleExclamation,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { isTransparentColor, rgbToHex } from "@/lib/codeEngine";
import type {
  CompoundSubPart,
  DomTreeNode,
  InspectorTab,
  PageLinkItem,
  SelectedElementPayload,
  UxAuditReport,
  UxIssue,
  UxIssueCategory,
} from "@/types/analyzer";
import { cn } from "@/utils/cn";
import { LinksExplorerTab, SelectedElementLinkCard } from "./LinksExplorerTab";
import { CompoundDecomposerCard } from "./CompoundDecomposerCard";

interface InspectorPaneProps {
  activeTab: InspectorTab;
  inspectMode: boolean;
  linkOverlayMode: boolean;
  explodeMode: boolean;
  isolatedSelector: string | null;
  selectedElement: SelectedElementPayload | null;
  selectionSeq: number;
  pageLinks: PageLinkItem[];
  domTree: DomTreeNode[];
  auditReport: UxAuditReport | null;
  textSyncNote: string | null;
  styleWidth?: number;
  onChangeTab: (tab: InspectorTab) => void;
  onEnableInspect: () => void;
  onClearSelection: () => void;
  onToggleLinkOverlay: () => void;
  onToggleExplodeMode: () => void;
  onToggleIsolate: (selector: string | null) => void;
  onSplitSharedStyle: () => void;
  onUnwrapContainer: () => void;
  onOpenExtractModal: () => void;
  onPreviewStyle: (selector: string, prop: string, value: string) => void;
  onCommitStyle: (selector: string, prop: string, value: string) => void;
  onEditText: (selector: string, newText: string) => void;
  onEditSubPartText: (part: CompoundSubPart, newText: string) => void;
  onUpdateElementAttribute: (
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
  ) => void;
  onRunAudit: () => void;
  onInspectSelector: (selector: string) => void;
  onHoverSelector: (selector: string | null, linkedSelector?: string) => void;
  onApplyAutoFix: (issue: UxIssue) => void;
  onOpenExternalUrl: (url: string) => void;
}

const COLOR_PROPS = [
  { key: "color", label: "لون النص", allowTransparent: false },
  { key: "backgroundColor", label: "لون الخلفية", allowTransparent: true },
  { key: "borderColor", label: "لون الإطار", allowTransparent: true },
] as const;

const QUICK_SWATCHES = [
  "#0f172a",
  "#1e293b",
  "#ffffff",
  "#f8fafc",
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#c9a961",
];

const SHADOW_PRESETS = [
  { label: "بدون", value: "none" },
  { label: "ناعم", value: "0 4px 12px rgba(15, 23, 42, 0.08)" },
  { label: "متوسط", value: "0 10px 28px rgba(15, 23, 42, 0.14)" },
  { label: "عميق", value: "0 20px 48px rgba(15, 23, 42, 0.24)" },
] as const;

const SPACING_PROPS = [
  { key: "padding", label: "الحشو الداخلي (padding)", max: 80 },
  { key: "margin", label: "الهامش الخارجي (margin)", max: 80 },
  { key: "borderRadius", label: "استدارة الحواف (radius)", max: 60 },
] as const;

function AuditScoreGauge({ score }: { score: number | null }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  const offset = circ - (pct / 100) * circ;

  const stroke =
    score === null
      ? "#6e7b9e"
      : score >= 85
        ? "#34d399"
        : score >= 65
          ? "#fbbf24"
          : "#fb7185";

  const grade =
    score === null
      ? "قيد التحليل"
      : score >= 90
        ? "احترافي ممتاز"
        : score >= 75
          ? "جيد جداً"
          : score >= 55
            ? "يحتاج تحسين"
            : "مشكلات حرجة";

  return (
    <div className="flex items-center gap-3.5">
      <div className="relative flex size-20 shrink-0 items-center justify-center">
        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div
          dir="ltr"
          className="absolute inset-0 flex flex-col items-center justify-center font-mono"
        >
          <span className="text-lg font-extrabold leading-none text-text">
            {score !== null ? score : "—"}
          </span>
          <span className="mt-0.5 text-[9px] text-subtext0">/100</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <span
          style={{ color: stroke }}
          className="inline-block rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-extrabold"
        >
          {grade}
        </span>
        <h3 className="mt-1 text-xs font-extrabold text-text">مؤشر جودة الواجهة والوصول</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-subtext0">
          تقييم فوري للتباين اللوني، مساحات اللمس، القراءة، ومعايير WCAG.
        </p>
      </div>
    </div>
  );
}

function DomTreeItem({
  node,
  depth,
  selectedSelector,
  filterQuery,
  onSelect,
  onHover,
}: {
  node: DomTreeNode;
  depth: number;
  selectedSelector: string | null;
  filterQuery: string;
  onSelect: (selector: string) => void;
  onHover: (selector: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 3);
  const hasKids = node.children.length > 0;
  const isSelected = selectedSelector === node.selector;

  const matchesFilter = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return true;
    const check = (n: DomTreeNode): boolean => {
      const hay = `${n.tagName} ${n.id} ${n.classes.join(" ")} ${n.textPreview}`.toLowerCase();
      if (hay.includes(q)) return true;
      return n.children.some(check);
    };
    return check(node);
  }, [filterQuery, node]);

  if (!matchesFilter) return null;

  const open = filterQuery.trim() ? true : expanded;

  return (
    <div>
      <div
        dir="ltr"
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onMouseEnter={() => onHover(node.selector)}
        onClick={() => onSelect(node.selector)}
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-lg py-1 pr-2 font-mono text-[11px] transition",
          isSelected
            ? "bg-green/18 text-green ring-1 ring-green/35"
            : "text-subtext1 hover:bg-surface0/70 hover:text-text"
        )}
      >
        {hasKids ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded text-[9px] text-overlay0 hover:bg-surface1 hover:text-text"
          >
            <FontAwesomeIcon
              icon={faChevronDown}
              className={cn("transition-transform", !open && "-rotate-90")}
            />
          </button>
        ) : (
          <span className="inline-block size-4 shrink-0" />
        )}

        <span className="inline-flex min-w-0 items-center truncate">
          <span className={cn("font-semibold", isSelected ? "text-green" : "text-blue")}>
            &lt;{node.tagName}
          </span>
          {node.id && <span className="text-peach">#{node.id}</span>}
          {node.classes.length > 0 && (
            <span className="truncate text-mauve">.{node.classes[0]}</span>
          )}
          <span className={cn(isSelected ? "text-green" : "text-blue")}>&gt;</span>
        </span>

        {node.textPreview && (
          <span className="ml-1 truncate font-sans text-[10px] text-overlay0">
            "{node.textPreview}"
          </span>
        )}
      </div>

      {hasKids && open && (
        <div>
          {node.children.map((child, idx) => (
            <DomTreeItem
              key={`${child.selector}-${idx}`}
              node={child}
              depth={depth + 1}
              selectedSelector={selectedSelector}
              filterQuery={filterQuery}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function InspectorPane({
  activeTab,
  inspectMode,
  linkOverlayMode,
  explodeMode,
  isolatedSelector,
  selectedElement,
  selectionSeq,
  pageLinks,
  domTree,
  auditReport,
  textSyncNote,
  styleWidth,
  onChangeTab,
  onEnableInspect,
  onClearSelection,
  onToggleLinkOverlay,
  onToggleExplodeMode,
  onToggleIsolate,
  onSplitSharedStyle,
  onUnwrapContainer,
  onOpenExtractModal,
  onPreviewStyle,
  onCommitStyle,
  onEditText,
  onEditSubPartText,
  onUpdateElementAttribute,
  onRunAudit,
  onInspectSelector,
  onHoverSelector,
  onApplyAutoFix,
  onOpenExternalUrl,
}: InspectorPaneProps) {
  const [draftStyles, setDraftStyles] = useState<Record<string, string>>({});
  const [draftText, setDraftText] = useState("");
  const [copiedSelector, setCopiedSelector] = useState(false);
  const [showBoxModel, setShowBoxModel] = useState(false);
  const [activeColorPaletteProp, setActiveColorPaletteProp] = useState<string | null>(null);
  const [treeFilter, setTreeFilter] = useState("");
  const [auditFilter, setAuditFilter] = useState<"all" | UxIssueCategory>("all");

  const [openSections, setOpenSections] = useState({
    colors: true,
    spacing: true,
    typo: false,
    layout: false,
  });

  const normalizeColorStyles = (styles: Record<string, string>) => {
    const out = { ...styles };
    for (const k of ["color", "backgroundColor", "borderColor"]) {
      const v = out[k];
      if (!v) continue;
      if (isTransparentColor(v)) {
        out[k] = "transparent";
      } else if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(v.trim())) {
        out[k] = rgbToHex(v).toUpperCase();
      }
    }
    return out;
  };

  useEffect(() => {
    if (!selectedElement) {
      setDraftStyles({});
      setDraftText("");
      return;
    }
    setDraftStyles(normalizeColorStyles(selectedElement.computedStyles));
    setDraftText(
      selectedElement.hasChildElements
        ? selectedElement.directText
        : selectedElement.innerText
    );
  }, [selectionSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedElement) return;
    setDraftStyles((prev) => ({
      ...normalizeColorStyles(selectedElement.computedStyles),
      ...prev,
    }));
  }, [selectedElement]);

  const updateStyleDraft = (prop: string, val: string) => {
    setDraftStyles((prev) => ({ ...prev, [prop]: val }));
  };

  const applyAndCommit = (prop: string, val: string) => {
    if (!selectedElement) return;
    updateStyleDraft(prop, val);
    onPreviewStyle(selectedElement.selector, prop, val);
    onCommitStyle(selectedElement.selector, prop, val);
  };

  const stepPxValue = (prop: string, delta: number, min = 0, max = 200) => {
    const raw = draftStyles[prop] ?? "0px";
    const cur = Math.round(parseFloat(raw) || 0);
    const next = Math.max(min, Math.min(max, cur + delta));
    applyAndCommit(prop, `${next}px`);
  };

  const handleCopySelector = async () => {
    if (!selectedElement) return;
    try {
      await navigator.clipboard.writeText(selectedElement.selector);
      setCopiedSelector(true);
      setTimeout(() => setCopiedSelector(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const issueCount = auditReport ? auditReport.issues.length : 0;

  const filteredIssues = useMemo(() => {
    if (!auditReport) return [];
    if (auditFilter === "all") return auditReport.issues;
    return auditReport.issues.filter((i) => i.category === auditFilter);
  }, [auditFilter, auditReport]);

  return (
    <aside
      style={styleWidth ? { width: `${styleWidth}px` } : undefined}
      className="inspector-pane flex h-full min-h-[420px] shrink-0 flex-col bg-mantle lg:min-h-0"
    >
      {/* Top 4-Tab Studio Switcher */}
      <div className="inspector-header border-b border-white/7 bg-crust/90 p-1.5 select-none">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-mantle p-1 ring-1 ring-white/6">
          <button
            type="button"
            onClick={() => onChangeTab("inspector")}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition",
              activeTab === "inspector"
                ? "bg-surface0 text-blue shadow-sm ring-1 ring-blue/30"
                : "text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faSliders} className="text-[9.5px]" />
            <span>المفتش</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab("links")}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition",
              activeTab === "links"
                ? "bg-surface0 text-sapphire shadow-sm ring-1 ring-sapphire/30"
                : "text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faLink} className="text-[9.5px]" />
            <span>الروابط</span>
            {pageLinks.length > 0 && (
              <span className="rounded-full bg-sapphire/20 px-1 font-mono text-[9px] text-sapphire">
                {pageLinks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeTab("layers")}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition",
              activeTab === "layers"
                ? "bg-surface0 text-mauve shadow-sm ring-1 ring-mauve/30"
                : "text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faLayerGroup} className="text-[9.5px]" />
            <span>الطبقات</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab("audit")}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition",
              activeTab === "audit"
                ? "bg-surface0 text-green shadow-sm ring-1 ring-green/30"
                : "text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faShieldHalved} className="text-[9.5px]" />
            <span>UX</span>
            {issueCount > 0 && (
              <span className="rounded-full bg-yellow/20 px-1 font-mono text-[9px] text-yellow">
                {issueCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================
         TAB 1: VISUAL ELEMENT INSPECTOR + DECOMPOSER + LINK CARD
         ========================================================= */}
      {activeTab === "inspector" && (
        <div id="inspector-content" className="flex-1 overflow-y-auto p-3">
          {!selectedElement ? (
            <div className="empty studio-card my-3 flex flex-col items-center px-4 py-6 text-center">
              <div className="relative mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue/20 to-mauve/20 text-blue ring-1 ring-blue/30">
                <FontAwesomeIcon icon={faCrosshairs} className="text-xl" />
              </div>
              <h3 className="text-sm font-extrabold text-text">
                افحص، فكّك، وعدّل أي مكوّن مباشرة
              </h3>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-subtext0">
                انقر على أي عنصر أو زر في المعاينة لتعديل ألوانه ونصوصه، واستعراض الروابط المرتبطة به، وتفكيك العناصر المركبة إلى أجزاء مستقلة.
              </p>

              <div className="mt-4 flex w-full flex-col gap-2">
                {!inspectMode && (
                  <button
                    type="button"
                    onClick={onEnableInspect}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue to-[#3b82f6] px-4 py-2 text-xs font-extrabold text-crust shadow-[0_4px_14px_rgba(59,130,246,0.35)] transition hover:brightness-110"
                  >
                    <FontAwesomeIcon icon={faCrosshairs} />
                    <span>تفعيل مؤشر الفحص الآن</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChangeTab("links")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface0/70 px-4 py-2 text-xs font-bold text-subtext1 transition hover:bg-surface0 hover:text-text"
                >
                  <FontAwesomeIcon icon={faLink} className="text-sapphire" />
                  <span>عرض خريطة روابط وأزرار الصفحة ({pageLinks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTab("layers")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface0/70 px-4 py-2 text-xs font-bold text-subtext1 transition hover:bg-surface0 hover:text-text"
                >
                  <FontAwesomeIcon icon={faLayerGroup} className="text-mauve" />
                  <span>تصفح شجرة عناصر الصفحة (DOM)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 1. Element Hero Summary Card */}
              <div className="studio-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
                    <span className="badge rounded-md bg-blue/18 px-2 py-0.5 font-mono text-[11px] font-bold text-blue ring-1 ring-blue/30">
                      &lt;{selectedElement.tagName}&gt;
                    </span>
                    {selectedElement.id && (
                      <span className="rounded-md bg-peach/15 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-peach">
                        #{selectedElement.id}
                      </span>
                    )}
                    <span className="badge rounded-md bg-surface0 px-2 py-0.5 font-mono text-[10.5px] text-subtext1">
                      {selectedElement.rect.width}×{selectedElement.rect.height}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowBoxModel((v) => !v)}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10.5px] font-bold transition",
                        showBoxModel
                          ? "bg-peach/20 text-peach"
                          : "bg-surface0/80 text-subtext0 hover:text-text"
                      )}
                    >
                      الصندوق
                    </button>
                    <button
                      type="button"
                      onClick={onClearSelection}
                      title="إلغاء تحديد العنصر"
                      className="inline-flex size-6 items-center justify-center rounded-md text-subtext0 hover:bg-surface0 hover:text-text"
                    >
                      <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                  </div>
                </div>

                {/* Copyable CSS Selector */}
                <div
                  dir="ltr"
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/6 bg-crust/90 px-2.5 py-1.5"
                >
                  <pre className="overflow-x-auto font-mono text-[11px] text-mauve">
                    {selectedElement.selector}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopySelector}
                    title="نسخ المحدد (CSS Selector)"
                    className="shrink-0 text-subtext0 transition hover:text-text"
                  >
                    <FontAwesomeIcon
                      icon={copiedSelector ? faCheck : faCopy}
                      className={cn("text-xs", copiedSelector && "text-green")}
                    />
                  </button>
                </div>

                {/* Visual Contrast Card */}
                {selectedElement.contrast && (
                  <div className="mt-2.5 flex items-center justify-between gap-2.5 rounded-xl border border-white/6 bg-crust/60 p-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        style={{
                          backgroundColor: selectedElement.contrast.bg,
                          color: selectedElement.contrast.fg,
                        }}
                        className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg border border-white/15 font-sans text-sm font-extrabold shadow-inner"
                      >
                        أب Aa
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <span className="font-mono text-xs font-extrabold text-text">
                            {selectedElement.contrast.ratio}:1
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.2 font-mono text-[9.5px] font-bold",
                              selectedElement.contrast.level === "Fail"
                                ? "bg-red/20 text-red"
                                : "bg-green/20 text-green"
                            )}
                          >
                            {selectedElement.contrast.level}
                          </span>
                        </div>
                        <div className="text-[10px] text-subtext0">تباين النص مع الخلفية</div>
                      </div>
                    </div>

                    {selectedElement.contrast.level === "Fail" && (
                      <button
                        type="button"
                        onClick={() => {
                          const bgHex = selectedElement.contrast?.bg ?? "#ffffff";
                          const r = parseInt(bgHex.slice(1, 3), 16) || 255;
                          const g = parseInt(bgHex.slice(3, 5), 16) || 255;
                          const b = parseInt(bgHex.slice(5, 7), 16) || 255;
                          const bright = (r * 299 + g * 587 + b * 114) / 1000 > 135;
                          applyAndCommit("color", bright ? "#0f172a" : "#f8fafc");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue/18 px-2 py-1 text-[10.5px] font-bold text-blue ring-1 ring-blue/35 transition hover:bg-blue hover:text-crust"
                      >
                        <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[9px]" />
                        <span>إصلاح</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Concentric 4-Side DevTools Box Model */}
                {showBoxModel && (
                  <div
                    dir="ltr"
                    className="mt-2.5 rounded-xl border border-dashed border-peach/45 bg-peach/6 p-2 text-center font-mono text-[10px]"
                  >
                    <div className="mb-0.5 flex items-center justify-between px-1 text-[9px] text-peach">
                      <span>margin</span>
                      <span>{selectedElement.boxModel.margin.top}</span>
                      <span />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="w-6 text-peach">{selectedElement.boxModel.margin.left}</span>
                      <div className="flex-1 rounded-lg border border-yellow/45 bg-yellow/6 p-2">
                        <div className="mb-0.5 flex items-center justify-between px-1 text-[9px] text-yellow">
                          <span>padding</span>
                          <span>{selectedElement.boxModel.padding.top}</span>
                          <span />
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="w-5 text-yellow">
                            {selectedElement.boxModel.padding.left}
                          </span>
                          <div className="flex-1 rounded bg-blue/20 py-1.5 font-bold text-blue">
                            {selectedElement.boxModel.content.width} ×{" "}
                            {selectedElement.boxModel.content.height}
                          </div>
                          <span className="w-5 text-yellow">
                            {selectedElement.boxModel.padding.right}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[9px] text-yellow">
                          {selectedElement.boxModel.padding.bottom}
                        </div>
                      </div>
                      <span className="w-6 text-peach">{selectedElement.boxModel.margin.right}</span>
                    </div>
                    <div className="mt-0.5 text-[9px] text-peach">
                      {selectedElement.boxModel.margin.bottom}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Associated Link / Component Connection Card (when selected element is a link or button) */}
              {selectedElement.linkInfo && (
                <SelectedElementLinkCard
                  key={`link-${selectionSeq}-${selectedElement.selector}`}
                  linkInfo={selectedElement.linkInfo}
                  onJumpToTarget={(sel) => onInspectSelector(sel)}
                  onCommitAttr={(attr, val) =>
                    onUpdateElementAttribute(
                      {
                        selector: selectedElement.selector,
                        tagName: selectedElement.tagName,
                        id: selectedElement.id,
                        classes: selectedElement.classes,
                        rawHref: selectedElement.linkInfo?.rawHref,
                        label: selectedElement.linkInfo?.label,
                      },
                      attr,
                      val
                    )
                  }
                  onOpenExternalUrl={onOpenExternalUrl}
                />
              )}

              {/* 3. Compound Element Decomposer & Component Isolator */}
              <CompoundDecomposerCard
                selectedElement={selectedElement}
                selectionSeq={selectionSeq}
                isolatedSelector={isolatedSelector}
                explodeMode={explodeMode}
                onToggleIsolate={onToggleIsolate}
                onToggleExplode={onToggleExplodeMode}
                onSplitSharedStyle={onSplitSharedStyle}
                onUnwrapContainer={onUnwrapContainer}
                onOpenExtractModal={onOpenExtractModal}
                onSelectSubPart={(sel) => onInspectSelector(sel)}
                onHoverSubPart={(sel) => onHoverSelector(sel)}
                onEditSubPartText={onEditSubPartText}
              />

              {/* 4. Direct Leaf Text Editor (shown when element has direct text) */}
              {(!selectedElement.hasChildElements || selectedElement.directText.length > 0) && (
                <div className="studio-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="inline-flex items-center gap-2 text-xs font-extrabold text-text">
                      <FontAwesomeIcon icon={faPenToSquare} className="text-sapphire" />
                      <span>النص الأساسي للعنصر</span>
                    </h3>
                    {textSyncNote && (
                      <span className="rounded bg-green/15 px-1.5 py-0.5 text-[10px] font-bold text-green">
                        {textSyncNote}
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={draftText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftText(val);
                      onEditText(selectedElement.selector, val);
                    }}
                    placeholder="اكتب النص الجديد هنا..."
                    className="live-text-edit w-full rounded-xl border border-white/10 bg-crust p-2.5 text-xs leading-relaxed text-text focus:border-blue focus:outline-none"
                  />
                </div>
              )}

              {/* 5. Colors & Elevation Accordion */}
              <div className="studio-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("colors")}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-extrabold text-text transition hover:bg-white/[0.02]"
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faPalette} className="text-blue" />
                    <span>الألوان والظلال</span>
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={cn(
                      "text-[10px] text-subtext0 transition-transform",
                      !openSections.colors && "rotate-90"
                    )}
                  />
                </button>

                {openSections.colors && (
                  <div className="space-y-2.5 border-t border-white/6 p-3">
                    {COLOR_PROPS.map(({ key, label, allowTransparent }) => {
                      const rawVal = draftStyles[key] ?? "";
                      const transparent = isTransparentColor(rawVal);
                      const hexVal = rgbToHex(rawVal);
                      const paletteOpen = activeColorPaletteProp === key;

                      return (
                        <div key={key} className="space-y-1.5">
                          <div className="edit-row flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] font-semibold text-subtext1">
                                {label}
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveColorPaletteProp(paletteOpen ? null : key)
                                }
                                title="ألوان سريعة"
                                className="rounded bg-surface0/80 px-1.5 py-0.5 text-[9px] text-subtext0 hover:text-blue"
                              >
                                عينات
                              </button>
                            </div>

                            <div className="input-group flex items-center gap-1.5" dir="ltr">
                              {allowTransparent && (
                                <button
                                  type="button"
                                  onClick={() => applyAndCommit(key, "transparent")}
                                  title="جعل اللون شفافاً (transparent)"
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-[9.5px] font-semibold transition",
                                    transparent
                                      ? "bg-blue/20 text-blue ring-1 ring-blue/30"
                                      : "bg-surface0 text-subtext0 hover:text-text"
                                  )}
                                >
                                  شفاف
                                </button>
                              )}
                              <input
                                type="color"
                                value={hexVal}
                                onChange={(e) => applyAndCommit(key, e.target.value)}
                                className="color-picker inspector-color-input"
                              />
                              <input
                                type="text"
                                value={rawVal}
                                onChange={(e) => {
                                  updateStyleDraft(key, e.target.value);
                                  onPreviewStyle(selectedElement.selector, key, e.target.value);
                                }}
                                onBlur={(e) =>
                                  onCommitStyle(selectedElement.selector, key, e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    onCommitStyle(
                                      selectedElement.selector,
                                      key,
                                      e.currentTarget.value
                                    );
                                  }
                                }}
                                className="live-edit w-24 rounded-lg border border-white/10 bg-crust px-2 py-1 font-mono text-[11px] text-text focus:border-blue focus:outline-none"
                              />
                            </div>
                          </div>

                          {paletteOpen && (
                            <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-crust/75 p-2">
                              {QUICK_SWATCHES.map((sw) => (
                                <button
                                  key={sw}
                                  type="button"
                                  title={sw}
                                  onClick={() => applyAndCommit(key, sw)}
                                  style={{ backgroundColor: sw }}
                                  className="size-5 rounded-full border border-white/25 shadow-sm transition hover:scale-115"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="border-t border-white/6 pt-2.5">
                      <div className="mb-1.5 text-[11px] font-semibold text-subtext1">
                        عمق الظل (Box Shadow)
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {SHADOW_PRESETS.map((sp) => (
                          <button
                            key={sp.label}
                            type="button"
                            onClick={() => applyAndCommit("boxShadow", sp.value)}
                            className="rounded-lg border border-white/8 bg-crust/80 py-1 text-[10.5px] font-bold text-subtext1 transition hover:border-blue/45 hover:bg-surface0 hover:text-text"
                          >
                            {sp.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Spacing & Border Radius Accordion */}
              <div className="studio-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("spacing")}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-extrabold text-text transition hover:bg-white/[0.02]"
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faExpand} className="text-peach" />
                    <span>المسافات والاستدارة</span>
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={cn(
                      "text-[10px] text-subtext0 transition-transform",
                      !openSections.spacing && "rotate-90"
                    )}
                  />
                </button>

                {openSections.spacing && (
                  <div className="space-y-3 border-t border-white/6 p-3">
                    {SPACING_PROPS.map(({ key, label, max }) => {
                      const rawVal = draftStyles[key] ?? "0px";
                      const numVal = Math.min(max, Math.max(0, parseFloat(rawVal) || 0));
                      return (
                        <div key={key} className="edit-row space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] font-semibold text-subtext1">
                              {label}
                            </label>
                            <div className="flex items-center gap-1" dir="ltr">
                              <button
                                type="button"
                                onClick={() => stepPxValue(key, -2, 0, max * 2)}
                                className="inline-flex size-6 items-center justify-center rounded-md border border-white/8 bg-crust text-[9px] text-subtext0 hover:text-text"
                              >
                                <FontAwesomeIcon icon={faMinus} />
                              </button>
                              <input
                                type="text"
                                value={rawVal}
                                onChange={(e) => {
                                  updateStyleDraft(key, e.target.value);
                                  onPreviewStyle(selectedElement.selector, key, e.target.value);
                                }}
                                onBlur={(e) =>
                                  onCommitStyle(selectedElement.selector, key, e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    onCommitStyle(
                                      selectedElement.selector,
                                      key,
                                      e.currentTarget.value
                                    );
                                  }
                                }}
                                className="live-edit w-20 rounded-lg border border-white/10 bg-crust px-2 py-0.5 text-center font-mono text-[11px] text-text focus:border-blue focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => stepPxValue(key, 2, 0, max * 2)}
                                className="inline-flex size-6 items-center justify-center rounded-md border border-white/8 bg-crust text-[9px] text-subtext0 hover:text-text"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                            </div>
                          </div>

                          <input
                            dir="ltr"
                            type="range"
                            min={0}
                            max={max}
                            value={numVal}
                            onChange={(e) => {
                              const v = `${e.target.value}px`;
                              updateStyleDraft(key, v);
                              onPreviewStyle(selectedElement.selector, key, v);
                            }}
                            onMouseUp={(e) =>
                              onCommitStyle(
                                selectedElement.selector,
                                key,
                                `${(e.target as HTMLInputElement).value}px`
                              )
                            }
                            onTouchEnd={(e) =>
                              onCommitStyle(
                                selectedElement.selector,
                                key,
                                `${(e.target as HTMLInputElement).value}px`
                              )
                            }
                            className="range-picker inspector-range w-full"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 7. Typography Accordion */}
              <div className="studio-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("typo")}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-extrabold text-text transition hover:bg-white/[0.02]"
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faFont} className="text-mauve" />
                    <span>الخطوط والمحاذاة</span>
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={cn(
                      "text-[10px] text-subtext0 transition-transform",
                      !openSections.typo && "rotate-90"
                    )}
                  />
                </button>

                {openSections.typo && (
                  <div className="space-y-3 border-t border-white/6 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold text-subtext1">
                        حجم الخط (font-size)
                      </label>
                      <div className="flex items-center gap-1" dir="ltr">
                        <button
                          type="button"
                          onClick={() => stepPxValue("fontSize", -1, 10, 96)}
                          className="inline-flex size-6 items-center justify-center rounded-md border border-white/8 bg-crust text-[9px] text-subtext0 hover:text-text"
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>
                        <input
                          type="text"
                          value={draftStyles.fontSize ?? ""}
                          onChange={(e) => {
                            updateStyleDraft("fontSize", e.target.value);
                            onPreviewStyle(
                              selectedElement.selector,
                              "fontSize",
                              e.target.value
                            );
                          }}
                          onBlur={(e) =>
                            onCommitStyle(
                              selectedElement.selector,
                              "fontSize",
                              e.target.value
                            )
                          }
                          className="live-edit w-20 rounded-lg border border-white/10 bg-crust px-2 py-0.5 text-center font-mono text-[11px] text-text focus:border-blue focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => stepPxValue("fontSize", 1, 10, 96)}
                          className="inline-flex size-6 items-center justify-center rounded-md border border-white/8 bg-crust text-[9px] text-subtext0 hover:text-text"
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-subtext1">
                          سماكة الخط (weight)
                        </label>
                        <span className="font-mono text-[10px] text-subtext0">
                          {draftStyles.fontWeight ?? "400"}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1" dir="ltr">
                        {(["400", "600", "700", "800"] as const).map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => applyAndCommit("fontWeight", w)}
                            className={cn(
                              "rounded-lg border py-1 font-mono text-[10.5px] font-bold transition",
                              draftStyles.fontWeight === w
                                ? "border-blue/60 bg-blue/20 text-blue"
                                : "border-white/8 bg-crust/80 text-subtext0 hover:text-text"
                            )}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold text-subtext1">
                        محاذاة النص
                      </label>
                      <div
                        className="inline-flex items-center gap-1 rounded-lg border border-white/8 bg-crust p-0.5"
                        dir="ltr"
                      >
                        {(
                          [
                            { v: "left", icon: faAlignLeft },
                            { v: "center", icon: faAlignCenter },
                            { v: "right", icon: faAlignRight },
                            { v: "justify", icon: faAlignJustify },
                          ] as const
                        ).map((al) => (
                          <button
                            key={al.v}
                            type="button"
                            onClick={() => applyAndCommit("textAlign", al.v)}
                            className={cn(
                              "inline-flex size-6 items-center justify-center rounded-md text-[10px] transition",
                              draftStyles.textAlign === al.v
                                ? "bg-blue text-crust"
                                : "text-subtext0 hover:text-text"
                            )}
                          >
                            <FontAwesomeIcon icon={al.icon} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold text-subtext1">
                        ارتفاع السطر (line-height)
                      </label>
                      <input
                        dir="ltr"
                        type="text"
                        value={draftStyles.lineHeight ?? ""}
                        onChange={(e) => {
                          updateStyleDraft("lineHeight", e.target.value);
                          onPreviewStyle(
                            selectedElement.selector,
                            "lineHeight",
                            e.target.value
                          );
                        }}
                        onBlur={(e) =>
                          onCommitStyle(
                            selectedElement.selector,
                            "lineHeight",
                            e.target.value
                          )
                        }
                        className="live-edit w-24 rounded-lg border border-white/10 bg-crust px-2 py-1 text-center font-mono text-[11px] text-text focus:border-blue focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 8. Layout & Dimensions Accordion */}
              <div className="studio-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("layout")}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-extrabold text-text transition hover:bg-white/[0.02]"
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faCube} className="text-green" />
                    <span>التخطيط والأبعاد</span>
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={cn(
                      "text-[10px] text-subtext0 transition-transform",
                      !openSections.layout && "rotate-90"
                    )}
                  />
                </button>

                {openSections.layout && (
                  <div className="space-y-3 border-t border-white/6 p-3">
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold text-subtext1">
                        نمط العرض (display)
                      </div>
                      <div className="grid grid-cols-5 gap-1" dir="ltr">
                        {(["block", "flex", "inline-flex", "grid", "none"] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => applyAndCommit("display", d)}
                            className={cn(
                              "truncate rounded-lg border px-1 py-1 font-mono text-[10px] font-bold transition",
                              draftStyles.display === d
                                ? "border-green/60 bg-green/18 text-green"
                                : "border-white/8 bg-crust/80 text-subtext0 hover:text-text"
                            )}
                          >
                            {d === "inline-flex" ? "i-flex" : d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { key: "width", label: "العرض (W)" },
                          { key: "height", label: "الارتفاع (H)" },
                        ] as const
                      ).map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <label className="block text-[10.5px] font-semibold text-subtext1">
                            {label}
                          </label>
                          <input
                            dir="ltr"
                            type="text"
                            value={draftStyles[key] ?? ""}
                            onChange={(e) => {
                              updateStyleDraft(key, e.target.value);
                              onPreviewStyle(selectedElement.selector, key, e.target.value);
                            }}
                            onBlur={(e) =>
                              onCommitStyle(selectedElement.selector, key, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onCommitStyle(
                                  selectedElement.selector,
                                  key,
                                  e.currentTarget.value
                                );
                              }
                            }}
                            className="live-edit w-full rounded-lg border border-white/10 bg-crust px-2 py-1 font-mono text-[11px] text-text focus:border-blue focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 9. Attached JS Listeners */}
              {selectedElement.listeners.length > 0 && (
                <div className="studio-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-text">
                      <FontAwesomeIcon icon={faBolt} className="ml-1.5 text-yellow" />
                      تفاعلات JavaScript المرتبطة
                    </h3>
                    <span className="rounded-full bg-surface0 px-2 py-0.5 font-mono text-[10px] font-bold text-subtext1">
                      {selectedElement.listeners.length}
                    </span>
                  </div>

                  <div className="space-y-1.5" dir="ltr">
                    {selectedElement.listeners.map((ln, idx) => (
                      <div
                        key={`${ln.type}-${idx}`}
                        className="rounded-lg border border-white/6 bg-crust p-2 font-mono text-[11px]"
                      >
                        <span className="mb-1 inline-block rounded bg-yellow/15 px-1.5 py-0.5 text-[10px] font-bold text-yellow">
                          on:{ln.type}
                        </span>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-subtext1">
                          {ln.source}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
         TAB 2: LINKS & BUTTON CONNECTIONS EXPLORER
         ========================================================= */}
      {activeTab === "links" && (
        <LinksExplorerTab
          links={pageLinks}
          linkOverlayMode={linkOverlayMode}
          selectedSelector={selectedElement?.selector ?? null}
          onToggleLinkOverlay={onToggleLinkOverlay}
          onSelectElement={(sel) => onInspectSelector(sel)}
          onHoverConnection={(sel, linked) => onHoverSelector(sel, linked)}
          onOpenExternalUrl={onOpenExternalUrl}
          onUpdateAttribute={(item, attr, val) =>
            onUpdateElementAttribute(
              {
                selector: item.selector,
                tagName: item.tagName,
                rawHref: item.rawHref,
                label: item.label,
              },
              attr,
              val
            )
          }
        />
      )}

      {/* =========================================================
         TAB 3: LIVE DOM LAYERS TREE EXPLORER
         ========================================================= */}
      {activeTab === "layers" && (
        <div
          onMouseLeave={() => onHoverSelector(null)}
          className="flex flex-1 flex-col overflow-hidden p-3"
        >
          <div className="relative mb-2.5">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-subtext0"
            />
            <input
              type="text"
              value={treeFilter}
              onChange={(e) => setTreeFilter(e.target.value)}
              placeholder="ابحث عن وسم أو كلاس أو نص..."
              className="w-full rounded-xl border border-white/10 bg-crust py-1.5 pr-8 pl-3 text-xs text-text placeholder:text-overlay0 focus:border-mauve focus:outline-none"
            />
          </div>

          <div className="studio-card flex-1 overflow-y-auto p-2">
            {domTree.length === 0 ? (
              <p className="py-8 text-center text-xs text-subtext0">
                جارٍ استخراج هيكل العناصر...
              </p>
            ) : (
              domTree.map((rootNode, idx) => (
                <DomTreeItem
                  key={`${rootNode.selector}-${idx}`}
                  node={rootNode}
                  depth={0}
                  selectedSelector={selectedElement?.selector ?? null}
                  filterQuery={treeFilter}
                  onSelect={(sel) => onInspectSelector(sel)}
                  onHover={(sel) => onHoverSelector(sel)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================
         TAB 4: UX & ACCESSIBILITY AUDIT + 1-CLICK SMART FIX
         ========================================================= */}
      {activeTab === "audit" && (
        <div
          onMouseLeave={() => onHoverSelector(null)}
          className="flex-1 overflow-y-auto p-3"
        >
          <div className="studio-card mb-3 p-3.5">
            <AuditScoreGauge score={auditReport ? auditReport.score : null} />

            {auditReport && (
              <div className="mt-3.5 grid grid-cols-3 gap-1.5 text-center text-[11px]">
                <div className="rounded-xl border border-red/20 bg-red/10 py-2 text-red">
                  <div className="font-mono text-sm font-extrabold">
                    {auditReport.counts.errors}
                  </div>
                  <div className="text-[10.5px] font-semibold">أخطاء حرجة</div>
                </div>
                <div className="rounded-xl border border-yellow/20 bg-yellow/10 py-2 text-yellow">
                  <div className="font-mono text-sm font-extrabold">
                    {auditReport.counts.warnings}
                  </div>
                  <div className="text-[10.5px] font-semibold">تنبيهات</div>
                </div>
                <div className="rounded-xl border border-green/20 bg-green/10 py-2 text-green">
                  <div className="font-mono text-sm font-extrabold">
                    {auditReport.counts.passedChecks}
                  </div>
                  <div className="text-[10.5px] font-semibold">معايير ناجحة</div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onRunAudit}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface0/80 py-1.5 text-xs font-bold text-text transition hover:border-blue/50 hover:bg-surface1"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="text-[11px] text-blue" />
              <span>إعادة فحص الصفحة بالكامل</span>
            </button>
          </div>

          {auditReport && auditReport.issues.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1">
              {(
                [
                  { id: "all", label: "الكل" },
                  { id: "contrast", label: "التباين" },
                  { id: "touch", label: "اللمس" },
                  { id: "a11y", label: "الوصول" },
                  { id: "typography", label: "الخطوط" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setAuditFilter(cat.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[10.5px] font-bold transition",
                    auditFilter === cat.id
                      ? "bg-blue text-crust"
                      : "bg-surface0/60 text-subtext0 hover:text-text"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {!auditReport ? (
            <p className="py-6 text-center text-xs text-subtext0">جارٍ تحليل عناصر الصفحة...</p>
          ) : filteredIssues.length === 0 ? (
            <div className="studio-card border-green/25 bg-green/8 p-5 text-center">
              <FontAwesomeIcon icon={faCircleCheck} className="mb-2 text-2xl text-green" />
              <div className="text-xs font-extrabold text-green">
                جميع الفحوصات في هذا القسم ممتازة!
              </div>
              <p className="mt-1 text-[11px] text-subtext1">
                لم يتم رصد مشكلات في التباين أو قابلية الاستخدام.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  onMouseEnter={() => onHoverSelector(issue.selector)}
                  className="studio-card p-3 transition hover:border-blue/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onInspectSelector(issue.selector)}
                      className="inline-flex items-center gap-1.5 text-right text-xs font-extrabold text-text hover:text-blue"
                    >
                      <FontAwesomeIcon
                        icon={
                          issue.severity === "error"
                            ? faCircleXmark
                            : faTriangleExclamation
                        }
                        className={cn(
                          "shrink-0 text-xs",
                          issue.severity === "error" ? "text-red" : "text-yellow"
                        )}
                      />
                      <span>{issue.title}</span>
                    </button>

                    {issue.metric && (
                      <span
                        dir="ltr"
                        className="shrink-0 rounded-md bg-crust px-1.5 py-0.5 font-mono text-[10px] font-bold text-subtext1"
                      >
                        {issue.metric}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[11px] leading-relaxed text-subtext0">
                    {issue.description}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      dir="ltr"
                      onClick={() => onInspectSelector(issue.selector)}
                      title="تحديد العنصر في المفتش"
                      className="max-w-[165px] truncate rounded-md bg-crust px-2 py-0.5 font-mono text-[10px] text-mauve hover:ring-1 hover:ring-mauve/50"
                    >
                      {issue.selector}
                    </button>

                    {issue.autoFix && (
                      <button
                        type="button"
                        onClick={() => onApplyAutoFix(issue)}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-green/20 to-blue/20 px-2.5 py-1 text-[10.5px] font-extrabold text-green ring-1 ring-green/35 transition hover:from-green hover:to-green hover:text-crust"
                      >
                        <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[9.5px]" />
                        <span>إصلاح تلقائي</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
