import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCopy,
  faCrosshairs,
  faEye,
  faFileCode,
  faLink,
  faObjectUngroup,
  faPuzzlePiece,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { CompoundSubPart, SelectedElementPayload } from "@/types/analyzer";
import { cn } from "@/utils/cn";

interface CompoundDecomposerCardProps {
  selectedElement: SelectedElementPayload;
  selectionSeq: number;
  isolatedSelector: string | null;
  explodeMode: boolean;
  onToggleIsolate: (selector: string | null) => void;
  onToggleExplode: () => void;
  onSplitSharedStyle: () => void;
  onUnwrapContainer: () => void;
  onOpenExtractModal: () => void;
  onSelectSubPart: (selector: string) => void;
  onHoverSubPart: (selector: string | null) => void;
  onEditSubPartText: (part: CompoundSubPart, newText: string) => void;
}

export function CompoundDecomposerCard({
  selectedElement,
  selectionSeq,
  isolatedSelector,
  explodeMode,
  onToggleIsolate,
  onToggleExplode,
  onSplitSharedStyle,
  onUnwrapContainer,
  onOpenExtractModal,
  onSelectSubPart,
  onHoverSubPart,
  onEditSubPartText,
}: CompoundDecomposerCardProps) {
  const parts = selectedElement.compoundParts;
  const isIsolated = isolatedSelector === selectedElement.selector;
  const canUnwrap =
    selectedElement.hasChildElements &&
    selectedElement.tagName !== "body" &&
    selectedElement.tagName !== "html";

  const [partTexts, setPartTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const p of selectedElement.compoundParts) {
      map[p.id] = p.textValue;
    }
    setPartTexts(map);
  }, [selectionSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onMouseLeave={() => onHoverSubPart(null)}
      className="studio-card border-mauve/25 bg-gradient-to-b from-mauve/[0.06] to-transparent p-3"
    >
      {/* Header */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-xs font-extrabold text-text">
          <FontAwesomeIcon icon={faPuzzlePiece} className="text-mauve" />
          <span>تفكيك وفصل العناصر المركبة</span>
        </h3>
        {parts.length > 0 && (
          <span className="rounded-full bg-mauve/20 px-2 py-0.5 font-mono text-[10px] font-bold text-mauve">
            {parts.length} أجزاء
          </span>
        )}
      </div>

      {/* Quick Isolation, Visual Explode, Unwrap & Extract Actions */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onToggleIsolate(isIsolated ? null : selectedElement.selector)}
          title="عزل هذا المكوّن بصرياً وإعتام بقية الصفحة للتركيز عليه"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl border py-1.5 px-2 text-[11px] font-bold transition",
            isIsolated
              ? "border-blue bg-blue text-crust shadow-[0_0_14px_rgba(96,165,250,0.35)]"
              : "border-white/10 bg-crust/80 text-subtext1 hover:border-blue/45 hover:text-text"
          )}
        >
          <FontAwesomeIcon icon={faEye} className="text-[10px]" />
          <span>{isIsolated ? "إنهاء العزل" : "عزل المكوّن"}</span>
        </button>

        <button
          type="button"
          onClick={onToggleExplode}
          title="إظهار حدود ومسافات فاصلة بين الطبقات المتداخلة لتسهيل النقر"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl border py-1.5 px-2 text-[11px] font-bold transition",
            explodeMode
              ? "border-mauve bg-mauve text-crust shadow-[0_0_14px_rgba(192,132,252,0.35)]"
              : "border-white/10 bg-crust/80 text-subtext1 hover:border-mauve/45 hover:text-text"
          )}
        >
          <FontAwesomeIcon icon={faPuzzlePiece} className="text-[10px]" />
          <span>{explodeMode ? "إيقاف التفكيك" : "تفكيك بصري"}</span>
        </button>

        {canUnwrap && (
          <button
            type="button"
            onClick={onUnwrapContainer}
            title="إزالة الحاوية الخارجية مع الإبقاء على جميع العناصر الداخلية مستقلة في مكانها"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-crust/80 py-1.5 px-2 text-[11px] font-bold text-subtext1 transition hover:border-peach/50 hover:text-peach"
          >
            <FontAwesomeIcon icon={faObjectUngroup} className="text-[10px]" />
            <span>فك تجميع الحاوية</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenExtractModal}
          title="استخراج كود HTML + CSS المستقل لهذا المكوّن فقط"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-crust/80 py-1.5 px-2 text-[11px] font-bold text-subtext1 transition hover:border-green/50 hover:text-green",
            !canUnwrap && "col-span-2"
          )}
        >
          <FontAwesomeIcon icon={faFileCode} className="text-[10px]" />
          <span>استخراج المكوّن</span>
        </button>
      </div>

      {/* Shared Class Style Separator Banner */}
      {selectedElement.sharedMatchCount > 1 && selectedElement.sharedClassSelector && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-peach/30 bg-peach/8 px-2.5 py-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1 text-[10.5px] font-extrabold text-peach">
              <span>مشترك مع {selectedElement.sharedMatchCount} عناصر</span>
              <code dir="ltr" className="rounded bg-crust/70 px-1 font-mono text-[10px]">
                {selectedElement.sharedClassSelector}
              </code>
            </div>
            <div className="text-[10px] text-subtext0">
              افصل تنسيقه بمحدد خاص لتعديله وحده دون تغيير العناصر الشقيقة
            </div>
          </div>
          <button
            type="button"
            onClick={onSplitSharedStyle}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-peach px-2.5 py-1 text-[10.5px] font-extrabold text-crust transition hover:brightness-110"
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[9.5px]" />
            <span>فصل التنسيق</span>
          </button>
        </div>
      )}

      {/* Atomic Sub-Parts Breakdown */}
      {parts.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-white/8 pt-2.5">
          <div className="text-[10.5px] font-extrabold text-subtext1">
            الأجزاء الداخلية المفككة (عدّل كل جزء أو افحصه منفرداً):
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
            {parts.map((part) => {
              const isEditableText =
                part.kind === "direct-text" ||
                part.kind === "text-el" ||
                part.kind === "link-btn";

              return (
                <div
                  key={part.id}
                  onMouseEnter={() =>
                    part.kind !== "direct-text" && onHoverSubPart(part.selector)
                  }
                  className="rounded-xl border border-white/7 bg-crust/75 p-2 transition hover:border-mauve/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        dir="ltr"
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.2 font-mono text-[9.5px] font-bold",
                          part.kind === "icon" && "bg-yellow/15 text-yellow",
                          part.kind === "link-btn" && "bg-green/15 text-green",
                          part.kind === "direct-text" && "bg-sapphire/15 text-sapphire",
                          part.kind === "text-el" && "bg-blue/15 text-blue",
                          (part.kind === "media" || part.kind === "container") &&
                            "bg-mauve/15 text-mauve"
                        )}
                      >
                        {part.tagName}
                      </span>
                      <span
                        dir={part.label.startsWith(".") || part.label.startsWith("#") || part.label.startsWith("<") ? "ltr" : "auto"}
                        className="truncate text-[11px] font-bold text-subtext1"
                      >
                        {part.label}
                      </span>
                    </div>

                    {part.kind !== "direct-text" && (
                      <button
                        type="button"
                        onClick={() => onSelectSubPart(part.selector)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-surface0 px-2 py-0.5 text-[10px] font-bold text-text transition hover:bg-mauve hover:text-crust"
                      >
                        <FontAwesomeIcon icon={faCrosshairs} className="text-[9px]" />
                        <span>فحص منفرد</span>
                      </button>
                    )}
                  </div>

                  {/* Independent Text Input for Text Parts (preserves icons & siblings!) */}
                  {isEditableText && (
                    <input
                      type="text"
                      value={partTexts[part.id] ?? part.textValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPartTexts((prev) => ({ ...prev, [part.id]: val }));
                        onEditSubPartText(part, val);
                      }}
                      placeholder="عدّل نص هذا الجزء..."
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-mantle px-2.5 py-1 text-[11.5px] text-text focus:border-mauve focus:outline-none"
                    />
                  )}

                  {/* Link destination chip if sub-part is a button/link */}
                  {part.href && (
                    <div
                      dir="ltr"
                      className="mt-1 flex items-center gap-1 truncate font-mono text-[10px] text-green"
                    >
                      <FontAwesomeIcon icon={faLink} className="text-[9px]" />
                      <span className="truncate">{part.href}</span>
                    </div>
                  )}

                  {/* Icon class preview */}
                  {part.iconClass && (
                    <div
                      dir="ltr"
                      className="mt-1 truncate font-mono text-[10px] text-yellow/90"
                    >
                      class="{part.iconClass}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Modal displaying the standalone extracted HTML + CSS of a single compound component.
 */
export function ComponentExtractModal({
  open,
  html,
  css,
  onClose,
}: {
  open: boolean;
  html: string;
  css: string;
  onClose: () => void;
}) {
  const [copiedType, setCopiedType] = useState<"html" | "css" | "all" | null>(null);

  if (!open) return null;

  const copyText = async (type: "html" | "css" | "all", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const combined = `<style>\n${css}\n</style>\n\n${html}`;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="studio-card flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border-white/15 bg-mantle p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-green/15 text-green">
              <FontAwesomeIcon icon={faFileCode} />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-text">
                استخراج المكوّن المفصول (HTML + CSS)
              </h2>
              <p className="text-[11px] text-subtext0">
                كود مستقل نظيف للمكوّن المحدد مع قواعد التنسيق المرتبطة به فقط
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => copyText("all", combined)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3 py-1.5 text-xs font-extrabold text-crust transition hover:brightness-110"
            >
              <FontAwesomeIcon icon={copiedType === "all" ? faCheck : faCopy} />
              <span>{copiedType === "all" ? "تم نسخ المكوّن" : "نسخ الكل"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-lg bg-surface0 text-subtext0 hover:text-text"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2" dir="ltr">
          <div className="flex flex-col overflow-hidden rounded-xl border border-white/8 bg-crust">
            <div className="flex items-center justify-between border-b border-white/6 bg-surface0/40 px-3 py-1.5 text-xs font-bold text-peach">
              <span>Component HTML</span>
              <button
                type="button"
                onClick={() => copyText("html", html)}
                className="text-[11px] text-subtext0 hover:text-text"
              >
                {copiedType === "html" ? "✓ Copied" : "Copy HTML"}
              </button>
            </div>
            <pre className="max-h-80 flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-subtext1">
              {html}
            </pre>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl border border-white/8 bg-crust">
            <div className="flex items-center justify-between border-b border-white/6 bg-surface0/40 px-3 py-1.5 text-xs font-bold text-sapphire">
              <span>Matched CSS Rules</span>
              <button
                type="button"
                onClick={() => copyText("css", css)}
                className="text-[11px] text-subtext0 hover:text-text"
              >
                {copiedType === "css" ? "✓ Copied" : "Copy CSS"}
              </button>
            </div>
            <pre className="max-h-80 flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-subtext1">
              {css}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
