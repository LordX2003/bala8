import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBloggerB } from "@fortawesome/free-brands-svg-icons";
import {
  faCode,
  faColumns,
  faCrosshairs,
  faDownload,
  faFileArrowUp,
  faFolderOpen,
  faKeyboard,
  faPlay,
  faRotateLeft,
  faRotateRight,
  faSliders,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { PRESETS } from "@/data/templates";
import type { EditorMode, SandboxStatus, TemplatePreset } from "@/types/analyzer";
import { cn } from "@/utils/cn";

interface ToolbarProps {
  mode: EditorMode;
  status: SandboxStatus;
  inspectMode: boolean;
  smartEditMode: boolean;
  uxScore: number | null;
  uxIssueCount: number;
  canUndo: boolean;
  canRedo: boolean;
  showEditorPane: boolean;
  showInspectorPane: boolean;
  onSwitchMode: (mode: EditorMode) => void;
  onRun: () => void;
  onToggleInspect: () => void;
  onToggleSmartEdit: () => void;
  onOpenAudit: () => void;
  onExport: () => void;
  onRevert: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleEditorPane: () => void;
  onToggleInspectorPane: () => void;
  onOpenShortcuts: () => void;
  onSelectPreset: (preset: TemplatePreset) => void;
  onImportFile: (filename: string, content: string) => void;
}

function MiniScoreRing({ score }: { score: number | null }) {
  const r = 8;
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

  return (
    <svg width="20" height="20" viewBox="0 0 22 22" className="-rotate-90 shrink-0">
      <circle
        cx="11"
        cy="11"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="2.6"
      />
      <circle
        cx="11"
        cy="11"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function Toolbar({
  mode,
  status,
  inspectMode,
  smartEditMode,
  uxScore,
  uxIssueCount,
  canUndo,
  canRedo,
  showEditorPane,
  showInspectorPane,
  onSwitchMode,
  onRun,
  onToggleInspect,
  onToggleSmartEdit,
  onOpenAudit,
  onExport,
  onRevert,
  onUndo,
  onRedo,
  onToggleEditorPane,
  onToggleInspectorPane,
  onOpenShortcuts,
  onSelectPreset,
  onImportFile,
}: ToolbarProps) {
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!presetMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPresetMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [presetMenuOpen]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onImportFile(file.name, reader.result);
      }
      e.target.value = "";
      setPresetMenuOpen(false);
    };
    reader.readAsText(file);
  };

  const normalPresets = PRESETS.filter((p) => p.mode === "normal");
  const bloggerPresets = PRESETS.filter((p) => p.mode === "blogger");

  return (
    <header className="toolbar studio-toolbar z-40 flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 select-none">
      {/* Right Cluster (RTL Start): Brand + Mode Switch + Templates + Status */}
      <div className="toolbar-left flex flex-wrap items-center gap-2.5">
        {/* Studio Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue via-sapphire to-mauve p-[1px] shadow-[0_0_18px_rgba(96,165,250,0.3)]">
            <div className="flex size-full items-center justify-center rounded-[11px] bg-crust">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M13.5 2L4.5 13.5H11.5L10 22L19.5 10.5H12.5L13.5 2Z"
                  fill="url(#boltGrad)"
                />
                <defs>
                  <linearGradient id="boltGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#60a5fa" />
                    <stop offset="1" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-[13.5px] font-extrabold tracking-tight text-text whitespace-nowrap">
              UI/UX Analyzer
            </h1>
            <span className="rounded-md bg-gradient-to-r from-blue/20 to-mauve/20 px-1.5 py-0.5 font-mono text-[9px] font-extrabold tracking-wider text-blue ring-1 ring-blue/30">
              PRO
            </span>
          </div>
        </div>

        <div className="hidden h-5 w-px bg-white/8 sm:block" />

        {/* Dual Mode Switcher */}
        <div className="mode-switch" role="group" aria-label="وضع المحرر">
          <button
            id="modeNormal"
            type="button"
            onClick={() => onSwitchMode("normal")}
            className={cn("mode-btn", mode === "normal" && "active")}
          >
            <FontAwesomeIcon icon={faCode} className="text-[11px]" />
            <span>كود عادي (HTML/CSS/JS)</span>
          </button>
          <button
            id="modeBlogger"
            type="button"
            onClick={() => onSwitchMode("blogger")}
            className={cn("mode-btn", mode === "blogger" && "active")}
          >
            <FontAwesomeIcon icon={faBloggerB} className="text-[11px]" />
            <span>قالب بلوجر (XML)</span>
          </button>
        </div>

        {/* Rich Templates & Import Gallery */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setPresetMenuOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition",
              presetMenuOpen
                ? "border-blue/50 bg-surface0 text-text"
                : "border-white/8 bg-surface0/60 text-subtext1 hover:border-white/15 hover:bg-surface0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faFolderOpen} className="text-[11px] text-blue" />
            <span>القوالب</span>
          </button>

          {presetMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-mantle/98 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl">
              <div className="px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-blue">
                نماذج الويب القياسية (HTML / CSS / JS)
              </div>
              <div className="space-y-0.5">
                {normalPresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset(p);
                      setPresetMenuOpen(false);
                    }}
                    className="group flex w-full flex-col items-start gap-0.5 rounded-xl px-2.5 py-2 text-right transition hover:bg-surface0/80"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text group-hover:text-blue">
                        {p.label}
                      </span>
                      <span className="rounded-md bg-blue/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue">
                        HTML
                      </span>
                    </div>
                    <span className="text-[11px] leading-snug text-subtext0">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>

              <div className="my-1.5 border-t border-white/6" />

              <div className="px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-peach">
                قوالب بلوجر الجاهزة (Blogger XML)
              </div>
              <div className="space-y-0.5">
                {bloggerPresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset(p);
                      setPresetMenuOpen(false);
                    }}
                    className="group flex w-full flex-col items-start gap-0.5 rounded-xl px-2.5 py-2 text-right transition hover:bg-surface0/80"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text group-hover:text-peach">
                        {p.label}
                      </span>
                      <span className="rounded-md bg-peach/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-peach">
                        XML
                      </span>
                    </div>
                    <span className="text-[11px] leading-snug text-subtext0">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>

              <div className="my-1.5 border-t border-white/6" />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue/35 bg-blue/8 px-3 py-2.5 text-xs font-bold text-blue transition hover:border-blue/60 hover:bg-blue/15"
              >
                <FontAwesomeIcon icon={faFileArrowUp} />
                <span>استيراد ملف من جهازك (.html / .xml)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.xml,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Live Status Pill */}
        <span
          id="status-badge"
          className={cn(
            "status inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition",
            status === "ready" &&
              !inspectMode &&
              "ready border-green/30 bg-green/10 text-green",
            status === "ready" &&
              inspectMode &&
              "border-blue/45 bg-blue/15 text-blue shadow-[0_0_12px_rgba(96,165,250,0.2)]",
            status === "loading" && "border-yellow/35 bg-yellow/10 text-yellow",
            status === "error" && "error border-red/40 bg-red/15 text-red"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              status === "ready" && !inspectMode && "bg-green",
              status === "ready" && inspectMode && "animate-ping bg-blue",
              status === "loading" && "animate-pulse bg-yellow",
              status === "error" && "bg-red"
            )}
          />
          {status === "loading" && "جارٍ التحميل..."}
          {status === "error" && "خطأ برمجي"}
          {status === "ready" && (inspectMode ? "وضع الفحص نشط" : "جاهز")}
        </span>
      </div>

      {/* Left Cluster (RTL End): Workspace Toggles + Undo/Redo + Main Actions */}
      <div className="actions flex flex-wrap items-center gap-1.5">
        {/* Desktop Pane Visibility Toggles */}
        <div
          className="hidden items-center rounded-lg border border-white/8 bg-crust/70 p-0.5 lg:inline-flex"
          role="group"
          aria-label="إظهار أو إخفاء اللوحات"
        >
          <button
            type="button"
            onClick={onToggleEditorPane}
            title={showEditorPane ? "إخفاء محرر الكود" : "إظهار محرر الكود"}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition",
              showEditorPane
                ? "bg-surface0 text-text"
                : "text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faColumns} className="text-[10px] text-blue" />
            <span className="hidden 2xl:inline">المحرر</span>
          </button>
          <button
            type="button"
            onClick={onToggleInspectorPane}
            title={showInspectorPane ? "إخفاء لوحة المفتش" : "إظهار لوحة المفتش"}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition",
              showInspectorPane
                ? "bg-surface0 text-text"
                : "text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faSliders} className="text-[10px] text-mauve" />
            <span className="hidden 2xl:inline">المفتش</span>
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="inline-flex items-center rounded-lg border border-white/8 bg-crust/70 p-0.5">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="تراجع عن آخر تعديل (Ctrl + Z)"
            className="inline-flex size-7 items-center justify-center rounded-md text-xs text-subtext1 transition hover:bg-surface0 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faRotateRight} className="text-[11px]" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="إعادة التعديل (Ctrl + Y)"
            className="inline-flex size-7 items-center justify-center rounded-md text-xs text-subtext1 transition hover:bg-surface0 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="text-[11px]" />
          </button>
        </div>

        <div className="hidden h-5 w-px bg-white/8 sm:block" />

        {/* Run Button */}
        <button
          id="runBtn"
          type="button"
          onClick={onRun}
          title="تشغيل وتحديث المعاينة (Ctrl + Enter)"
          className="primary inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-blue to-[#3b82f6] px-3.5 py-1.5 text-xs font-extrabold text-crust shadow-[0_2px_12px_rgba(59,130,246,0.38),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
          <span>تشغيل</span>
        </button>

        {/* Inspect Toggle */}
        <button
          id="inspectBtn"
          type="button"
          onClick={onToggleInspect}
          title="فحص العناصر وتعديلها مباشرة (Ctrl + Shift + C)"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition",
            inspectMode
              ? "active border-green/70 bg-green/18 text-green shadow-[0_0_16px_rgba(52,211,153,0.25)]"
              : "border-white/10 bg-surface0/80 text-text hover:border-blue/45 hover:bg-surface1/80"
          )}
        >
          <FontAwesomeIcon icon={faCrosshairs} className="text-[11px]" />
          <span>فحص</span>
        </button>

        {/* Smart Edit Full-Screen Mode Toggle */}
        <button
          id="smartEditBtn"
          type="button"
          onClick={onToggleSmartEdit}
          title="وضع التعديل الذكي بالعرض الكامل وقائمة النقر الأيمن (Ctrl + Shift + E)"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition",
            smartEditMode
              ? "border-mauve bg-gradient-to-r from-mauve to-blue text-crust shadow-[0_0_18px_rgba(192,132,252,0.4)]"
              : "border-mauve/40 bg-gradient-to-r from-mauve/15 to-blue/15 text-mauve hover:border-mauve/70 hover:text-text"
          )}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[11px]" />
          <span>التعديل الذكي</span>
        </button>

        {/* UX Score Gauge Button */}
        <button
          type="button"
          onClick={onOpenAudit}
          title="فتح تقرير فحص تجربة المستخدم وإمكانية الوصول"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface0/80 px-2.5 py-1 text-xs font-bold text-text transition hover:border-white/20 hover:bg-surface1/80"
        >
          <MiniScoreRing score={uxScore} />
          <span>تقرير UX</span>
          {uxScore !== null && (
            <span className="font-mono text-[11px] font-extrabold text-subtext1">
              {uxScore}%
            </span>
          )}
          {uxIssueCount > 0 && (
            <span className="rounded-full bg-yellow/20 px-1.5 font-mono text-[10px] font-bold text-yellow">
              {uxIssueCount}
            </span>
          )}
        </button>

        {/* Export / Download */}
        <button
          id="exportBtn"
          type="button"
          onClick={onExport}
          title={
            mode === "normal"
              ? "تنزيل المشروع بصيغة my-project.html (Ctrl + S)"
              : "تنزيل القالب بصيغة blogger-template.xml (Ctrl + S)"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface0/70 px-2.5 py-1.5 text-xs font-bold text-subtext1 transition hover:border-mauve/50 hover:bg-mauve/12 hover:text-text"
        >
          <FontAwesomeIcon icon={faDownload} className="text-[11px] text-mauve" />
          <span>تنزيل</span>
        </button>

        {/* Revert */}
        <button
          id="revertBtn"
          type="button"
          onClick={onRevert}
          title="استعادة الكود الأصلي للقالب الحالي"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface0/70 px-2.5 py-1.5 text-xs font-bold text-subtext1 transition hover:border-red/50 hover:bg-red/12 hover:text-red"
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[11px]" />
          <span className="hidden sm:inline">إرجاع</span>
        </button>

        {/* Shortcuts Reference */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          title="اختصارات لوحة المفاتيح (?)"
          aria-label="اختصارات لوحة المفاتيح"
          className="inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-surface0/60 text-subtext0 transition hover:border-blue/40 hover:text-text"
        >
          <FontAwesomeIcon icon={faKeyboard} className="text-xs" />
        </button>
      </div>
    </header>
  );
}
