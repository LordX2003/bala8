import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCircleInfo,
  faCode,
  faDesktop,
  faKeyboard,
  faSliders,
  faTriangleExclamation,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { MobileWorkspaceTab, ToastItem } from "@/types/analyzer";
import { cn } from "@/utils/cn";

export function ShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const shortcuts = [
    { keys: ["Ctrl", "Enter"], label: "تشغيل وتحديث المعاينة الحية" },
    { keys: ["Ctrl", "Shift", "E"], label: "تفعيل أو إيقاف وضع التعديل الذكي الكامل" },
    { keys: ["Ctrl", "Shift", "C"], label: "تفعيل أو إيقاف مؤشر فحص العناصر" },
    { keys: ["Ctrl", "S"], label: "تنزيل الملف الحالي (HTML أو XML)" },
    { keys: ["Ctrl", "Z"], label: "التراجع عن آخر تعديل" },
    { keys: ["Ctrl", "Y"], label: "إعادة التعديل المتراجع عنه" },
    { keys: ["Ctrl", "F"], label: "البحث داخل محرر الكود" },
    { keys: ["?"], label: "فتح نافذة اختصارات لوحة المفاتيح" },
  ];

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
    >
      <div className="studio-card w-full max-w-md overflow-hidden border-white/12 bg-mantle p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-blue/15 text-blue">
              <FontAwesomeIcon icon={faKeyboard} />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-text">اختصارات الاستوديو السريعة</h2>
              <p className="text-[11px] text-subtext0">تحكّم أسرع أثناء كتابة الكود والفحص</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex size-7 items-center justify-center rounded-lg bg-surface0 text-subtext0 hover:text-text"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-crust/70 px-3 py-2"
            >
              <span className="text-xs font-semibold text-subtext1">{s.label}</span>
              <div className="flex items-center gap-1" dir="ltr">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-white/12 bg-surface0 px-2 py-0.5 font-mono text-[10.5px] font-bold text-blue shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-14 left-4 z-50 flex flex-col gap-2 lg:bottom-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-md",
            t.variant === "success" && "border-green/35 bg-mantle/95 text-green",
            t.variant === "info" && "border-blue/35 bg-mantle/95 text-blue",
            t.variant === "warning" && "border-yellow/35 bg-mantle/95 text-yellow"
          )}
        >
          <FontAwesomeIcon
            icon={
              t.variant === "success"
                ? faCheck
                : t.variant === "warning"
                  ? faTriangleExclamation
                  : faCircleInfo
            }
          />
          <span className="text-text">{t.title}</span>
        </div>
      ))}
    </div>
  );
}

export function MobileWorkspaceBar({
  active,
  issueCount,
  onSelect,
}: {
  active: MobileWorkspaceTab;
  issueCount: number;
  onSelect: (tab: MobileWorkspaceTab) => void;
}) {
  return (
    <nav
      aria-label="التنقل بين أقسام الاستوديو"
      className="grid shrink-0 grid-cols-3 gap-1 border-t border-white/10 bg-crust px-2 py-1.5 lg:hidden"
    >
      <button
        type="button"
        onClick={() => onSelect("editor")}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition",
          active === "editor"
            ? "bg-surface0 text-blue ring-1 ring-blue/30"
            : "text-subtext0"
        )}
      >
        <FontAwesomeIcon icon={faCode} />
        <span>المحرر</span>
      </button>

      <button
        type="button"
        onClick={() => onSelect("preview")}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition",
          active === "preview"
            ? "bg-surface0 text-green ring-1 ring-green/30"
            : "text-subtext0"
        )}
      >
        <FontAwesomeIcon icon={faDesktop} />
        <span>المعاينة</span>
      </button>

      <button
        type="button"
        onClick={() => onSelect("inspector")}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition",
          active === "inspector"
            ? "bg-surface0 text-mauve ring-1 ring-mauve/30"
            : "text-subtext0"
        )}
      >
        <FontAwesomeIcon icon={faSliders} />
        <span>المفتش</span>
        {issueCount > 0 && (
          <span className="rounded-full bg-yellow/20 px-1.5 font-mono text-[10px] text-yellow">
            {issueCount}
          </span>
        )}
      </button>
    </nav>
  );
}
