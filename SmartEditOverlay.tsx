import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowsUpDownLeftRight,
  faArrowUp,
  faCode,
  faColumns,
  faDesktop,
  faEye,
  faFloppyDisk,
  faMagnet,
  faMobileScreen,
  faRotateLeft,
  faRotateRight,
  faSliders,
  faTabletScreenButton,
  faTurnUp,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type {
  BloggerViewType,
  EditorMode,
  SelectedElementPayload,
  SmartContextMenuState,
  SmartMoveSession,
  ViewportPreset,
} from "@/types/analyzer";
import { cn } from "@/utils/cn";

/* =========================================================
   1. Minimal Floating Top HUD in Smart Edit Full-Canvas Mode
   ========================================================= */
export function SmartEditTopHud({
  mode,
  bloggerView,
  viewport,
  canUndo,
  canRedo,
  onChangeBloggerView,
  onChangeViewport,
  onUndo,
  onRedo,
  onExitSmartEdit,
}: {
  mode: EditorMode;
  bloggerView: BloggerViewType;
  viewport: ViewportPreset;
  canUndo: boolean;
  canRedo: boolean;
  onChangeBloggerView: (v: BloggerViewType) => void;
  onChangeViewport: (vp: ViewportPreset) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExitSmartEdit: () => void;
}) {
  return (
    <header className="z-30 flex flex-wrap items-center justify-between gap-2 border-b border-mauve/25 bg-crust/95 px-3.5 py-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.45)] backdrop-blur-xl select-none">
      {/* Right: Smart Edit Active Pill + Right-click hint */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex items-center gap-2 rounded-full border border-mauve/45 bg-gradient-to-r from-mauve/20 to-blue/20 px-3 py-1 text-xs font-extrabold text-text shadow-[0_0_18px_rgba(192,132,252,0.22)]">
          <FontAwesomeIcon icon={faWandMagicSparkles} className="text-mauve" />
          <span>وضع التعديل الذكي — العرض الكامل</span>
        </div>

        <span className="hidden items-center gap-1.5 text-[11px] font-semibold text-subtext0 md:inline-flex">
          <span className="size-1.5 rounded-full bg-green" />
          <span>تصفّح الموقع بشكل طبيعي، وانقر بزر الفأرة الأيمن على أي عنصر للتعديل الذكي</span>
        </span>
      </div>

      {/* Left: Blogger View + Device Switcher + Undo/Redo + Exit to Studio */}
      <div className="flex items-center gap-1.5">
        {mode === "blogger" && (
          <div className="inline-flex items-center rounded-lg border border-white/10 bg-mantle p-0.5 text-[10.5px]">
            {(
              [
                { id: "homepage", label: "الرئيسية" },
                { id: "post", label: "مقال" },
                { id: "archive", label: "أرشيف" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onChangeBloggerView(v.id)}
                className={cn(
                  "rounded-md px-2 py-0.5 font-bold transition",
                  bloggerView === v.id
                    ? "bg-peach text-crust"
                    : "text-subtext0 hover:text-text"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-mantle p-0.5">
          {(
            [
              { id: "desktop-hd", icon: faDesktop, title: "سطح المكتب" },
              { id: "tablet", icon: faTabletScreenButton, title: "تابلت (768px)" },
              { id: "mobile", icon: faMobileScreen, title: "جوال (390px)" },
            ] as const
          ).map((vp) => (
            <button
              key={vp.id}
              type="button"
              title={vp.title}
              onClick={() => onChangeViewport(vp.id)}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-md text-xs transition",
                viewport === vp.id || (vp.id === "desktop-hd" && viewport === "fluid")
                  ? "bg-blue text-crust"
                  : "text-subtext0 hover:text-text"
              )}
            >
              <FontAwesomeIcon icon={vp.icon} className="text-[10.5px]" />
            </button>
          ))}
        </div>

        <div className="inline-flex items-center rounded-lg border border-white/10 bg-mantle p-0.5">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="تراجع (Ctrl + Z)"
            className="inline-flex size-6 items-center justify-center rounded-md text-subtext1 hover:bg-surface0 disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faRotateRight} className="text-[10px]" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="إعادة (Ctrl + Y)"
            className="inline-flex size-6 items-center justify-center rounded-md text-subtext1 hover:bg-surface0 disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
          </button>
        </div>

        <button
          type="button"
          onClick={onExitSmartEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-surface0 px-3 py-1 text-xs font-extrabold text-text transition hover:border-blue/50 hover:bg-surface1"
        >
          <FontAwesomeIcon icon={faColumns} className="text-[10.5px] text-blue" />
          <span>العودة للاستوديو</span>
        </button>
      </div>
    </header>
  );
}

/* =========================================================
   2. Right-Click Smart Context Menu
   ========================================================= */
export function SmartContextMenu({
  menu,
  onClose,
  onSelectParent,
  onStartMove,
  onOpenCodeEdit,
  onOpenAdvancedProps,
  onToggleIsolate,
  onOpenInFullStudio,
}: {
  menu: SmartContextMenuState;
  onClose: () => void;
  onSelectParent: (parentSelector: string) => void;
  onStartMove: (el: SelectedElementPayload) => void;
  onOpenCodeEdit: (el: SelectedElementPayload) => void;
  onOpenAdvancedProps: (el: SelectedElementPayload) => void;
  onToggleIsolate: (selector: string) => void;
  onOpenInFullStudio: (el: SelectedElementPayload) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });

  useLayoutEffect(() => {
    if (!menu.open) return;
    const el = menuRef.current;
    const w = el?.offsetWidth ?? 305;
    const h = el?.offsetHeight ?? 310;
    const clampedLeft = Math.max(12, Math.min(window.innerWidth - w - 12, menu.x));
    const clampedTop = Math.max(52, Math.min(window.innerHeight - h - 12, menu.y));
    setPos({ left: clampedLeft, top: clampedTop });
  }, [menu.open, menu.x, menu.y, menu.element?.selector]);

  useEffect(() => {
    if (!menu.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDocDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocDown);
    };
  }, [menu.open, onClose]);

  if (!menu.open || !menu.element) return null;
  const target = menu.element;

  return (
    <div
      ref={menuRef}
      style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
      onContextMenu={(e) => e.preventDefault()}
      className="animate-toast-in fixed z-50 w-[308px] overflow-hidden rounded-2xl border border-white/15 bg-mantle/96 p-2 shadow-[0_24px_65px_rgba(0,0,0,0.78),0_0_0_1px_rgba(192,132,252,0.18)] backdrop-blur-xl select-none"
    >
      {/* Target Element Header */}
      <div className="mb-1.5 flex items-center justify-between gap-2 rounded-xl border border-white/7 bg-crust/85 px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-1.5" dir="ltr">
          <span className="shrink-0 rounded-md bg-mauve/20 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-mauve">
            &lt;{target.tagName}&gt;
          </span>
          <span className="truncate font-mono text-[10.5px] text-subtext1">
            {target.selector}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span dir="ltr" className="font-mono text-[9.5px] text-overlay0">
            {target.rect.width}×{target.rect.height}
          </span>
          {target.parentSelector && (
            <button
              type="button"
              onClick={() => onSelectParent(target.parentSelector!)}
              title={`تحديد العنصر الأب (${target.parentSelector})`}
              className="inline-flex items-center gap-1 rounded-md bg-surface0 px-1.5 py-0.5 text-[9.5px] font-bold text-blue transition hover:bg-blue hover:text-crust"
            >
              <FontAwesomeIcon icon={faTurnUp} className="text-[8.5px]" />
              <span>الأب</span>
            </button>
          )}
        </div>
      </div>

      {/* The 3 Core Smart Actions */}
      <div className="space-y-1">
        {/* 1. Geometric Element Move */}
        <button
          type="button"
          onClick={() => onStartMove(target)}
          className="group flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-right transition hover:bg-mauve/14"
        >
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-mauve/18 text-mauve ring-1 ring-mauve/35 transition group-hover:bg-mauve group-hover:text-crust">
            <FontAwesomeIcon icon={faArrowsUpDownLeftRight} className="text-xs" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold text-text group-hover:text-mauve">
              1. تحريك العنصر هندسياً
            </div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-subtext0">
              تحريك حر بالمساطر الذكية والشبكة والمحاذاة أو نقل ترتيبي
            </div>
          </div>
        </button>

        {/* 2. Programmatic Code Edit (Old vs New + Save + Revert) */}
        <button
          type="button"
          onClick={() => onOpenCodeEdit(target)}
          className="group flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-right transition hover:bg-blue/14"
        >
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue/18 text-blue ring-1 ring-blue/35 transition group-hover:bg-blue group-hover:text-crust">
            <FontAwesomeIcon icon={faCode} className="text-xs" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold text-text group-hover:text-blue">
              2. التعديل البرمجي المباشر
            </div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-subtext0">
              عرض الكود القديم ومقارنته مع التعديل والحفظ والإرجاع
            </div>
          </div>
        </button>

        {/* 3. Advanced Properties (Split Compound + Texts + Attached Links) */}
        <button
          type="button"
          onClick={() => onOpenAdvancedProps(target)}
          className="group flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-right transition hover:bg-green/14"
        >
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-green/18 text-green ring-1 ring-green/35 transition group-hover:bg-green group-hover:text-crust">
            <FontAwesomeIcon icon={faSliders} className="text-xs" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold text-text group-hover:text-green">
              3. التعديل المتقدم للخصائص
            </div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-subtext0">
              فصل العناصر المركبة وتعديل النصوص والروابط الملحقة
            </div>
          </div>
        </button>
      </div>

      {/* Secondary Quick Utilities Footer */}
      <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-white/8 pt-1.5">
        <button
          type="button"
          onClick={() => {
            onToggleIsolate(target.selector);
            onClose();
          }}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-crust/70 py-1.5 text-[10.5px] font-bold text-subtext1 transition hover:bg-surface0 hover:text-blue"
        >
          <FontAwesomeIcon icon={faEye} className="text-[10px]" />
          <span>عزل بصري</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenInFullStudio(target)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-crust/70 py-1.5 text-[10.5px] font-bold text-subtext1 transition hover:bg-surface0 hover:text-text"
        >
          <FontAwesomeIcon icon={faColumns} className="text-[10px]" />
          <span>فتح بالاستوديو</span>
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   3. Floating CAD Geometric Move Controller HUD
   ========================================================= */
export function SmartMoveHud({
  session,
  selectedElement,
  onSetCoords,
  onUpdateConfig,
  onToggleIsolateShared,
  onReorderDom,
  onCommit,
  onCancel,
}: {
  session: SmartMoveSession;
  selectedElement: SelectedElementPayload | null;
  onSetCoords: (x: number, y: number) => void;
  onUpdateConfig: (gridStep: 1 | 8 | 16, smartSnap: boolean) => void;
  onToggleIsolateShared: () => void;
  onReorderDom: (dir: "prev" | "next") => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!session.active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const step = e.shiftKey ? 10 : session.gridStep;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSetCoords(session.x - step, session.y);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onSetCoords(session.x + step, session.y);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onSetCoords(session.x, session.y - step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onSetCoords(session.x, session.y + step);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onCommit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onCommit, onSetCoords, session]);

  if (!session.active) return null;

  const isSharedClass =
    selectedElement &&
    selectedElement.sharedMatchCount > 1 &&
    !selectedElement.id;

  return (
    <div className="animate-toast-in fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center gap-2.5 rounded-2xl border border-mauve/45 bg-mantle/96 px-4 py-2.5 shadow-[0_24px_70px_rgba(0,0,0,0.8)] backdrop-blur-xl select-none">
      {/* Title & Coordinates */}
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-xl bg-mauve/20 text-mauve ring-1 ring-mauve/35">
          <FontAwesomeIcon icon={faArrowsUpDownLeftRight} className="text-xs" />
        </span>
        <div>
          <div className="text-[11px] font-extrabold text-text">
            تحريك هندسي: <code dir="ltr" className="font-mono text-mauve">{session.selector}</code>
          </div>
          <div className="text-[10px] text-subtext0">
            اسحب العنصر مباشرة أو استخدم الأسهم (Shift = 10px)
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-white/10" />

      {/* Direct X / Y Inputs */}
      <div className="flex items-center gap-1.5" dir="ltr">
        <label className="flex items-center gap-1 rounded-lg border border-white/10 bg-crust px-2 py-1 font-mono text-[11px]">
          <span className="font-bold text-blue">X</span>
          <input
            type="number"
            value={session.x}
            onChange={(e) => onSetCoords(Number(e.target.value) || 0, session.y)}
            className="w-14 bg-transparent text-center text-text focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1 rounded-lg border border-white/10 bg-crust px-2 py-1 font-mono text-[11px]">
          <span className="font-bold text-peach">Y</span>
          <input
            type="number"
            value={session.y}
            onChange={(e) => onSetCoords(session.x, Number(e.target.value) || 0)}
            className="w-14 bg-transparent text-center text-text focus:outline-none"
          />
        </label>
      </div>

      {/* Directional Nudge Buttons */}
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-crust p-0.5" dir="ltr">
        <button
          type="button"
          onClick={() => onSetCoords(session.x - session.gridStep, session.y)}
          title="إزاحة لليسار"
          className="inline-flex size-6 items-center justify-center rounded text-[10px] text-subtext1 hover:bg-surface0 hover:text-text"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <button
          type="button"
          onClick={() => onSetCoords(session.x, session.y - session.gridStep)}
          title="إزاحة للأعلى"
          className="inline-flex size-6 items-center justify-center rounded text-[10px] text-subtext1 hover:bg-surface0 hover:text-text"
        >
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
        <button
          type="button"
          onClick={() => onSetCoords(session.x, session.y + session.gridStep)}
          title="إزاحة للأسفل"
          className="inline-flex size-6 items-center justify-center rounded text-[10px] text-subtext1 hover:bg-surface0 hover:text-text"
        >
          <FontAwesomeIcon icon={faArrowDown} />
        </button>
        <button
          type="button"
          onClick={() => onSetCoords(session.x + session.gridStep, session.y)}
          title="إزاحة لليمين"
          className="inline-flex size-6 items-center justify-center rounded text-[10px] text-subtext1 hover:bg-surface0 hover:text-text"
        >
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

      {/* Grid Step + Smart Magnetic Snap */}
      <div className="flex items-center gap-1" dir="ltr">
        {([1, 8, 16] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onUpdateConfig(g, session.smartSnap)}
            title={`خطوة الشبكة الهندسية ${g}px`}
            className={cn(
              "rounded-lg border px-2 py-1 font-mono text-[10.5px] font-bold transition",
              session.gridStep === g
                ? "border-mauve bg-mauve/20 text-mauve"
                : "border-white/8 bg-crust text-subtext0 hover:text-text"
            )}
          >
            {g}px
          </button>
        ))}

        <button
          type="button"
          onClick={() => onUpdateConfig(session.gridStep, !session.smartSnap)}
          title="تفعيل أو إيقاف خطوط المحاذاة المغناطيسية"
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-sans text-[10.5px] font-bold transition",
            session.smartSnap
              ? "border-sapphire/60 bg-sapphire/15 text-sapphire"
              : "border-white/8 bg-crust text-subtext0"
          )}
        >
          <FontAwesomeIcon icon={faMagnet} className="text-[9.5px]" />
          <span>محاذاة</span>
        </button>
      </div>

      {/* Structural DOM Sibling Reordering */}
      {selectedElement && (selectedElement.canMovePrev || selectedElement.canMoveNext) && (
        <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-crust p-0.5">
          <button
            type="button"
            disabled={!selectedElement.canMovePrev}
            onClick={() => onReorderDom("prev")}
            title="نقل ترتيبي في الهيكل: تقديم قبل العنصر السابق"
            className="rounded-md px-2 py-1 text-[10.5px] font-bold text-subtext1 hover:bg-surface0 hover:text-text disabled:opacity-30"
          >
            ↑ تقديم بالهيكل
          </button>
          <button
            type="button"
            disabled={!selectedElement.canMoveNext}
            onClick={() => onReorderDom("next")}
            title="نقل ترتيبي في الهيكل: تأخير بعد العنصر التالي"
            className="rounded-md px-2 py-1 text-[10.5px] font-bold text-subtext1 hover:bg-surface0 hover:text-text disabled:opacity-30"
          >
            ↓ تأخير بالهيكل
          </button>
        </div>
      )}

      {/* Shared Class Auto-Isolate Checkbox */}
      {isSharedClass && (
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-peach/30 bg-peach/8 px-2.5 py-1 text-[10.5px] font-bold text-peach">
          <input
            type="checkbox"
            checked={session.isolateShared}
            onChange={onToggleIsolateShared}
            className="size-3.5 rounded accent-peach"
          />
          <span>فصل لهذا العنصر فقط</span>
        </label>
      )}

      {/* Reset / Save / Cancel */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSetCoords(0, 0)}
          title="تصفير الإحداثيات (0, 0)"
          className="rounded-lg border border-white/10 bg-crust px-2.5 py-1.5 text-[11px] font-bold text-subtext1 hover:text-text"
        >
          تصفير
        </button>

        <button
          type="button"
          onClick={onCommit}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-green to-[#10b981] px-3.5 py-1.5 text-xs font-extrabold text-crust shadow-[0_4px_14px_rgba(16,185,129,0.35)] transition hover:brightness-110"
        >
          <FontAwesomeIcon icon={faFloppyDisk} />
          <span>حفظ الموضع</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-xl border border-red/35 bg-red/12 px-3 py-1.5 text-xs font-extrabold text-red transition hover:bg-red hover:text-crust"
        >
          <FontAwesomeIcon icon={faXmark} />
          <span>إلغاء</span>
        </button>
      </div>
    </div>
  );
}
