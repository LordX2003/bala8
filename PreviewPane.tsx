import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsLeftRight,
  faArrowsRotate,
  faBorderAll,
  faChevronLeft,
  faCompress,
  faDesktop,
  faExpand,
  faEye,
  faLink,
  faMobileScreen,
  faPuzzlePiece,
  faTabletScreenButton,
  faTerminal,
  faTrashCan,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type {
  BloggerViewType,
  BreadcrumbItem,
  ConsoleEntry,
  DirectionOverride,
  EditorMode,
  ViewportPreset,
} from "@/types/analyzer";
import { cn } from "@/utils/cn";

interface PreviewPaneProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  srcDoc: string;
  runKey: number;
  mode: EditorMode;
  bloggerView: BloggerViewType;
  dirOverride: DirectionOverride;
  viewport: ViewportPreset;
  inspectMode: boolean;
  xrayMode: boolean;
  linkOverlayMode: boolean;
  explodeMode: boolean;
  isolatedSelector: string | null;
  fullscreenPreview: boolean;
  smartEditMode?: boolean;
  isResizingPanes: boolean;
  breadcrumbs: BreadcrumbItem[];
  consoleEntries: ConsoleEntry[];
  onChangeViewport: (vp: ViewportPreset) => void;
  onChangeDirOverride: (dir: DirectionOverride) => void;
  onToggleXray: () => void;
  onToggleLinkOverlay: () => void;
  onToggleExplodeMode: () => void;
  onClearIsolation: () => void;
  onToggleFullscreen: () => void;
  onReloadPreview: () => void;
  onSelectBreadcrumb: (selector: string) => void;
  onHoverBreadcrumb: (selector: string | null) => void;
  onClearConsole: () => void;
}

const VIEWPORT_CONFIG: Record<
  ViewportPreset,
  { label: string; targetWidth: number | null; short: string }
> = {
  "desktop-hd": {
    label: "سطح مكتب واقعي (1366px مع ملاءمة ذكية)",
    targetWidth: 1366,
    short: "1366px",
  },
  fluid: {
    label: "عرض مرن يملأ المساحة المتاحة",
    targetWidth: null,
    short: "مرن",
  },
  tablet: {
    label: "جهاز لوحي / تابلت (768px)",
    targetWidth: 768,
    short: "768px",
  },
  mobile: {
    label: "هاتف ذكي (390×844px)",
    targetWidth: 390,
    short: "390px",
  },
};

export function PreviewPane({
  iframeRef,
  srcDoc,
  runKey,
  mode,
  bloggerView,
  dirOverride,
  viewport,
  inspectMode,
  xrayMode,
  linkOverlayMode,
  explodeMode,
  isolatedSelector,
  fullscreenPreview,
  smartEditMode = false,
  isResizingPanes,
  breadcrumbs,
  consoleEntries,
  onChangeViewport,
  onChangeDirOverride,
  onToggleXray,
  onToggleLinkOverlay,
  onToggleExplodeMode,
  onClearIsolation,
  onToggleFullscreen,
  onReloadPreview,
  onSelectBreadcrumb,
  onHoverBreadcrumb,
  onClearConsole,
}: PreviewPaneProps) {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleFilter, setConsoleFilter] = useState<"all" | "error" | "log">("all");
  const [autoFit, setAutoFit] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 960, h: 640 });

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      setStageSize({
        w: Math.max(240, el.clientWidth),
        h: Math.max(240, el.clientHeight),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullscreenPreview, smartEditMode, consoleOpen, breadcrumbs.length]);

  // Exit fullscreen preview on Escape
  useEffect(() => {
    if (!fullscreenPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreenPreview, onToggleFullscreen]);

  const errorCount = consoleEntries.filter((e) => e.level === "error").length;

  const filteredEntries = consoleEntries.filter((e) => {
    if (consoleFilter === "error") return e.level === "error" || e.level === "warn";
    if (consoleFilter === "log") return e.level === "log" || e.level === "alert";
    return true;
  });

  // Compute exact realistic viewport dimensions & scale factor
  const cfg = VIEWPORT_CONFIG[viewport];
  const isDeviceFrame = viewport === "tablet" || viewport === "mobile";
  const framePad = isDeviceFrame ? 28 : 0;
  const availW = Math.max(200, stageSize.w - framePad);
  const availH = Math.max(200, stageSize.h - framePad);

  let logicalW = availW;
  let logicalH = availH;
  let scale = 1;

  if (cfg.targetWidth !== null) {
    logicalW = cfg.targetWidth;
    if (viewport === "mobile") {
      const idealMobileH = 844;
      if (autoFit) {
        const sW = availW / logicalW;
        const sH = availH / idealMobileH;
        scale = Math.min(1, sW, sH);
        logicalH = idealMobileH;
      } else {
        scale = 1;
        logicalH = idealMobileH;
      }
    } else if (viewport === "tablet") {
      if (autoFit && availW < logicalW) {
        scale = availW / logicalW;
      }
      logicalH = Math.round(availH / scale);
    } else {
      // desktop-hd (1366px): renders real desktop width & scales smoothly when pane < 1366px
      if (autoFit && availW < logicalW) {
        scale = availW / logicalW;
        logicalH = Math.round(availH / scale);
      } else if (availW >= logicalW && autoFit) {
        // When screen/fullscreen is wider than 1366px, let desktop breathe naturally at full width!
        logicalW = availW;
        scale = 1;
        logicalH = availH;
      } else {
        scale = 1;
        logicalH = availH;
      }
    }
  }

  const scaledW = Math.round(logicalW * scale);
  const scaledH = Math.round(logicalH * scale);
  const scalePct = Math.round(scale * 100);

  return (
    <section
      className={cn(
        "preview-pane flex flex-col bg-crust",
        fullscreenPreview
          ? "fixed inset-0 z-40 h-screen w-screen"
          : "h-full min-h-[480px] min-w-0 flex-1 lg:min-h-0"
      )}
    >
      {/* Top Studio Viewport & Canvas Control Bar (hidden in full-screen Smart Edit Mode) */}
      {!smartEditMode && (
      <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-white/8 bg-crust/95 px-2.5 py-1.5 select-none">
        {/* Right (RTL Start): Device Switcher + Live Resolution Pill */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className="inline-flex items-center gap-0.5 rounded-lg border border-white/8 bg-mantle p-0.5"
            role="group"
            aria-label="أحجام عرض الموقع الواقعية"
          >
            {(
              [
                { id: "desktop-hd", icon: faDesktop, label: "سطح مكتب" },
                { id: "fluid", icon: faArrowsLeftRight, label: "مرن" },
                { id: "tablet", icon: faTabletScreenButton, label: "تابلت" },
                { id: "mobile", icon: faMobileScreen, label: "جوال" },
              ] as const
            ).map((vp) => (
              <button
                key={vp.id}
                type="button"
                title={VIEWPORT_CONFIG[vp.id].label}
                onClick={() => onChangeViewport(vp.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition",
                  viewport === vp.id
                    ? "bg-blue text-crust shadow-sm"
                    : "text-subtext0 hover:bg-surface0 hover:text-text"
                )}
              >
                <FontAwesomeIcon icon={vp.icon} className="text-[10.5px]" />
                <span className="hidden xl:inline">{vp.label}</span>
              </button>
            ))}
          </div>

          {/* Live Resolution & Smart Auto-Fit Toggle */}
          <button
            type="button"
            onClick={() => setAutoFit((v) => !v)}
            title={
              autoFit
                ? "الملاءمة التلقائية مفعّلة (يعرض أبعاد سطح المكتب الحقيقية متناسبة مع اللوحة) — انقر للتبديل إلى 1:1"
                : "الحجم الفعلي 1:1 مفعّل — انقر لتفعيل الملاءمة التلقائية الذكية"
            }
            dir="ltr"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10.5px] font-bold transition",
              scale < 0.99
                ? "border-blue/35 bg-blue/12 text-blue"
                : "border-white/8 bg-mantle text-subtext1 hover:text-text"
            )}
          >
            <span>
              {Math.round(logicalW)}×{Math.round(logicalH)}
            </span>
            {scale < 0.99 && (
              <span className="rounded bg-blue/20 px-1 text-[9.5px] text-blue">
                {scalePct}%
              </span>
            )}
          </button>

          {/* Direction Override (helpful when testing LTR vs RTL templates) */}
          <select
            aria-label="اتجاه الصفحة"
            title="اتجاه الصفحة (تلقائي حسب لغة الموقع أو فرض RTL / LTR)"
            value={dirOverride}
            onChange={(e) => onChangeDirOverride(e.target.value as DirectionOverride)}
            className="h-7 rounded-lg border border-white/8 bg-mantle px-1.5 text-[10.5px] font-bold text-subtext1 focus:border-blue focus:outline-none"
          >
            <option value="auto">اتجاه تلقائي</option>
            <option value="rtl">فرض RTL</option>
            <option value="ltr">فرض LTR</option>
          </select>
        </div>

        {/* Left (RTL End): Link Map + Layer Explode + X-Ray + Reload + Console + Fullscreen */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Show Page Links Overlay */}
          <button
            type="button"
            onClick={onToggleLinkOverlay}
            title="إظهار شارات وخطوط الروابط المرتبطة بالأزرار ومكونات الصفحة"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition",
              linkOverlayMode
                ? "border-green/60 bg-green/15 text-green"
                : "border-white/8 bg-mantle text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faLink} className="text-[10px]" />
            <span className="hidden sm:inline">الروابط</span>
          </button>

          {/* Explode Compound Layers */}
          <button
            type="button"
            onClick={onToggleExplodeMode}
            title="تفكيك بصري للعناصر المركبة والطبقات المتداخلة لتسهيل تحديد أجزائها"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition",
              explodeMode
                ? "border-mauve/60 bg-mauve/15 text-mauve"
                : "border-white/8 bg-mantle text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faPuzzlePiece} className="text-[10px]" />
            <span className="hidden sm:inline">تفكيك</span>
          </button>

          {/* X-Ray Wireframe */}
          <button
            type="button"
            onClick={onToggleXray}
            title="إظهار حدود تخطيط جميع العناصر (X-Ray)"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition",
              xrayMode
                ? "border-sapphire/50 bg-sapphire/15 text-sapphire"
                : "border-white/8 bg-mantle text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faBorderAll} className="text-[10px]" />
            <span className="hidden 2xl:inline">أشعة</span>
          </button>

          {/* Reload */}
          <button
            type="button"
            onClick={onReloadPreview}
            title={`إعادة تحميل المعاينة (${mode === "blogger" ? bloggerView : "HTML"})`}
            className="inline-flex size-7 items-center justify-center rounded-lg border border-white/8 bg-mantle text-subtext0 transition hover:text-blue"
          >
            <FontAwesomeIcon icon={faArrowsRotate} className="text-[10.5px]" />
          </button>

          {/* Console Toggle */}
          <button
            type="button"
            onClick={() => setConsoleOpen((o) => !o)}
            title="فتح أو إغلاق سجل Console"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition",
              consoleOpen
                ? "border-blue/50 bg-blue/15 text-blue"
                : errorCount > 0
                  ? "border-red/45 bg-red/15 text-red"
                  : "border-white/8 bg-mantle text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faTerminal} className="text-[10px]" />
            {consoleEntries.length > 0 && (
              <span className="rounded-full bg-surface0 px-1.5 font-mono text-[9.5px] text-text">
                {consoleEntries.length}
              </span>
            )}
          </button>

          {/* Fullscreen 1:1 Reality Toggle */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={
              fullscreenPreview
                ? "العودة إلى وضع الاستوديو المقسّم (Esc)"
                : "عرض الموقع بملء الشاشة الكامل 1:1 كما يظهر في المتصفح الحقيقي"
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-extrabold transition",
              fullscreenPreview
                ? "border-peach bg-peach text-crust"
                : "border-blue/35 bg-blue/12 text-blue hover:bg-blue hover:text-crust"
            )}
          >
            <FontAwesomeIcon
              icon={fullscreenPreview ? faCompress : faExpand}
              className="text-[10px]"
            />
            <span>{fullscreenPreview ? "إنهاء الملء" : "ملء الشاشة"}</span>
          </button>
        </div>
      </div>
      )}

      {/* Interactive DOM Breadcrumb Bar */}
      {!smartEditMode && breadcrumbs.length > 0 && (
        <div
          dir="ltr"
          onMouseLeave={() => onHoverBreadcrumb(null)}
          className="flex items-center gap-1 overflow-x-auto border-b border-white/7 bg-mantle/95 px-3 py-1 font-mono text-[11px]"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={`${crumb.selector}-${idx}`} className="flex shrink-0 items-center gap-1">
                {idx > 0 && (
                  <FontAwesomeIcon
                    icon={faChevronLeft}
                    className="rotate-180 text-[8px] text-overlay0"
                  />
                )}
                <button
                  type="button"
                  onMouseEnter={() => onHoverBreadcrumb(crumb.selector)}
                  onClick={() => onSelectBreadcrumb(crumb.selector)}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 transition",
                    isLast
                      ? "bg-green/20 font-bold text-green ring-1 ring-green/35"
                      : "text-subtext0 hover:bg-surface0 hover:text-text"
                  )}
                >
                  {crumb.label}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Sandboxed Website Stage */}
      <div
        ref={stageRef}
        className={cn(
          "preview-stage-bg relative flex min-h-0 flex-1 items-center justify-center overflow-auto",
          isDeviceFrame && "p-3.5"
        )}
      >
        {/* Active Isolation Spotlight Banner */}
        {isolatedSelector && (
          <div className="absolute top-3 left-1/2 z-30 inline-flex max-w-[92%] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-blue/50 bg-crust/92 px-3.5 py-1 text-[11px] font-bold text-blue shadow-xl backdrop-blur-md">
            <FontAwesomeIcon icon={faEye} className="text-[10px]" />
            <span>وضع عزل المكوّن نشط:</span>
            <code dir="ltr" className="font-mono text-text">
              {isolatedSelector}
            </code>
            <button
              type="button"
              onClick={onClearIsolation}
              className="inline-flex size-5 items-center justify-center rounded-full bg-surface0 text-subtext0 hover:bg-red/20 hover:text-red"
              title="إنهاء العزل"
            >
              <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
            </button>
          </div>
        )}

        {/* Bottom Non-Intrusive Inspect Hint */}
        {inspectMode && breadcrumbs.length === 0 && !isolatedSelector && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-green/40 bg-crust/90 px-3.5 py-1 text-[11px] font-bold text-green shadow-lg backdrop-blur-md whitespace-nowrap">
            <span className="size-1.5 animate-ping rounded-full bg-green" />
            <span>انقر على أي عنصر أو زر داخل الموقع لفحصه وتفكيكه</span>
          </div>
        )}

        {/* Splitter drag shield */}
        {isResizingPanes && <div className="absolute inset-0 z-30 cursor-col-resize" />}

        {/* Proportional Viewport Wrapper (dir="ltr" guarantees exact top-left transform origin) */}
        <div
          dir="ltr"
          style={{
            width: `${scaledW}px`,
            height: `${scaledH}px`,
          }}
          className={cn(
            "relative shrink-0 overflow-hidden bg-white transition-[width,height] duration-150",
            isDeviceFrame &&
              "rounded-[22px] ring-[6px] ring-[#1c2336] shadow-[0_25px_70px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.12)]"
          )}
        >
          <iframe
            key={runKey}
            ref={iframeRef}
            id="preview"
            title="معاينة الموقع الحية"
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            srcDoc={srcDoc}
            style={{
              width: `${logicalW}px`,
              height: `${logicalH}px`,
              transform: scale !== 1 ? `scale(${scale})` : undefined,
              transformOrigin: "0 0",
            }}
            className="block border-0 bg-white"
          />
        </div>
      </div>

      {/* Collapsible Console / Runtime Log Drawer */}
      {consoleOpen && (
        <div className="flex h-36 shrink-0 flex-col border-t border-white/8 bg-mantle">
          <div className="flex items-center justify-between border-b border-white/6 px-3 py-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-subtext1">سجل التشغيل والتنبيهات</span>
              <div className="inline-flex items-center gap-0.5 rounded-md bg-crust p-0.5 text-[10px]">
                {(
                  [
                    { id: "all", label: "الكل" },
                    { id: "error", label: "أخطاء" },
                    { id: "log", label: "رسائل" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setConsoleFilter(f.id)}
                    className={cn(
                      "rounded px-2 py-0.5 font-bold transition",
                      consoleFilter === f.id
                        ? "bg-surface0 text-text"
                        : "text-subtext0 hover:text-text"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onClearConsole}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-subtext0 transition hover:bg-red/12 hover:text-red"
            >
              <FontAwesomeIcon icon={faTrashCan} className="text-[10px]" />
              <span>مسح</span>
            </button>
          </div>

          <div dir="ltr" className="flex-1 overflow-y-auto p-2 font-mono text-[11px]">
            {filteredEntries.length === 0 ? (
              <div className="py-4 text-center font-sans text-xs text-overlay0" dir="rtl">
                لا توجد رسائل مطابقة في السجل حالياً
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "mb-1 flex items-start gap-2 rounded-md border px-2.5 py-1",
                    entry.level === "error" && "border-red/25 bg-red/10 text-red",
                    entry.level === "warn" && "border-yellow/25 bg-yellow/10 text-yellow",
                    entry.level === "alert" && "border-mauve/25 bg-mauve/12 text-mauve",
                    entry.level === "log" && "border-white/5 bg-surface0/40 text-text"
                  )}
                >
                  <span className="shrink-0 text-[10px] opacity-60">[{entry.timestamp}]</span>
                  <span className="shrink-0 text-[10px] font-bold uppercase">
                    {entry.level}
                  </span>
                  <span className="break-all">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
