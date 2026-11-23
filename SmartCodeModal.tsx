import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type UIEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCode,
  faCodeCompare,
  faCopy,
  faExpand,
  faEye,
  faFloppyDisk,
  faRotateLeft,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { formatCode, highlightCode } from "@/lib/syntaxHighlight";
import type { EditorMode, SelectedElementPayload } from "@/types/analyzer";
import { cn } from "@/utils/cn";

interface SmartCodeModalProps {
  open: boolean;
  mode: EditorMode;
  element: SelectedElementPayload | null;
  oldHtml: string;
  oldCss: string;
  targetCssSelector: string;
  onClose: () => void;
  onLivePreview: (draftHtml: string, draftCss: string) => void;
  onRevertToOld: (oldHtml: string, oldCss: string) => void;
  onSaveCommit: (newHtml: string, newCss: string) => void;
}

export function SmartCodeModal({
  open,
  mode,
  element,
  oldHtml,
  oldCss,
  targetCssSelector,
  onClose,
  onLivePreview,
  onRevertToOld,
  onSaveCommit,
}: SmartCodeModalProps) {
  const [codeTab, setCodeTab] = useState<"markup" | "css">("markup");
  const [splitCompare, setSplitCompare] = useState(true);
  const [draftHtml, setDraftHtml] = useState(oldHtml);
  const [draftCss, setDraftCss] = useState(oldCss);
  const [copiedOld, setCopiedOld] = useState(false);

  const editGutterRef = useRef<HTMLDivElement>(null);
  const editPreRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraftHtml(oldHtml);
    setDraftCss(oldCss);
    setCodeTab("markup");
  }, [open, oldHtml, oldCss]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeLang: "html" | "xml" | "css" =
    codeTab === "css" ? "css" : mode === "blogger" ? "xml" : "html";

  const oldContent = codeTab === "markup" ? oldHtml : oldCss;
  const newContent = codeTab === "markup" ? draftHtml : draftCss;

  const oldHighlighted = useMemo(
    () => highlightCode(oldContent, activeLang),
    [oldContent, activeLang]
  );
  const newHighlighted = useMemo(
    () => highlightCode(newContent, activeLang),
    [newContent, activeLang]
  );

  const oldLines = useMemo(() => Math.max(1, oldContent.split("\n").length), [oldContent]);
  const newLines = useMemo(() => Math.max(1, newContent.split("\n").length), [newContent]);

  const hasMarkupChanged = draftHtml.trim() !== oldHtml.trim();
  const hasCssChanged = draftCss.trim() !== oldCss.trim();
  const hasAnyChanges = hasMarkupChanged || hasCssChanged;

  const changedLinesCount = useMemo(() => {
    const a = oldContent.split("\n");
    const b = newContent.split("\n");
    const maxLen = Math.max(a.length, b.length);
    let diff = 0;
    for (let i = 0; i < maxLen; i++) {
      if ((a[i] ?? "").trim() !== (b[i] ?? "").trim()) diff++;
    }
    return diff;
  }, [oldContent, newContent]);

  if (!open || !element) return null;

  const syncEditorScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (editGutterRef.current) editGutterRef.current.scrollTop = scrollTop;
    if (editPreRef.current) {
      editPreRef.current.scrollTop = scrollTop;
      editPreRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.code === "KeyS")) {
      e.preventDefault();
      onSaveCommit(draftHtml, draftCss);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const cur = codeTab === "markup" ? draftHtml : draftCss;
      const updated = cur.slice(0, start) + "  " + cur.slice(end);
      if (codeTab === "markup") setDraftHtml(updated);
      else setDraftCss(updated);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const handleFormat = () => {
    if (codeTab === "markup") {
      setDraftHtml(formatCode(draftHtml, activeLang));
    } else {
      setDraftCss(formatCode(draftCss, "css"));
    }
  };

  const handleRevert = () => {
    setDraftHtml(oldHtml);
    setDraftCss(oldCss);
    onRevertToOld(oldHtml, oldCss);
  };

  const handleCopyOld = async () => {
    try {
      await navigator.clipboard.writeText(oldContent);
      setCopiedOld(true);
      setTimeout(() => setCopiedOld(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5"
    >
      <div className="studio-card flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden border-white/15 bg-mantle shadow-[0_30px_90px_rgba(0,0,0,0.75)]">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/8 bg-crust/90 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue/25 to-mauve/25 text-blue ring-1 ring-blue/35">
              <FontAwesomeIcon icon={faCode} className="text-sm" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-text">
                  التعديل البرمجي المباشر للعنصر
                </h2>
                <code
                  dir="ltr"
                  className="rounded-md bg-surface0 px-2 py-0.5 font-mono text-[11px] font-bold text-mauve"
                >
                  {element.selector}
                </code>
              </div>
              <p className="mt-0.5 text-[11px] text-subtext0">
                قارن الكود القديم (الأصلي) بالكود الجديد، وعاين التغييرات أو احفظها أو أرجعها بضغطة واحدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                hasAnyChanges
                  ? "border-yellow/40 bg-yellow/12 text-yellow"
                  : "border-green/35 bg-green/10 text-green"
              )}
            >
              {hasAnyChanges
                ? `تعديلات غير محفوظة (${changedLinesCount} سطر)`
                : "مطابق للكود القديم"}
            </span>

            <button
              type="button"
              onClick={onClose}
              title="إغلاق النافذة (Esc)"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-surface0 text-subtext0 transition hover:text-text"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* Sub-Toolbar: Markup vs CSS Tabs + Compare Layout Toggle + Tools */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/7 bg-base/80 px-4 py-2 select-none">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCodeTab("markup")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                codeTab === "markup"
                  ? "bg-blue text-crust shadow-sm"
                  : "bg-surface0/70 text-subtext1 hover:text-text"
              )}
            >
              <span>هيكل العنصر ({mode === "blogger" ? "XML / HTML" : "HTML"})</span>
              {hasMarkupChanged && (
                <span className="size-2 rounded-full bg-yellow ring-2 ring-crust" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setCodeTab("css")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                codeTab === "css"
                  ? "bg-sapphire text-crust shadow-sm"
                  : "bg-surface0/70 text-subtext1 hover:text-text"
              )}
            >
              <span dir="ltr" className="font-mono text-[11px]">
                CSS ({targetCssSelector})
              </span>
              {hasCssChanged && (
                <span className="size-2 rounded-full bg-yellow ring-2 ring-crust" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSplitCompare((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition",
                splitCompare
                  ? "border-mauve/50 bg-mauve/15 text-mauve"
                  : "border-white/10 bg-surface0/70 text-subtext1 hover:text-text"
              )}
            >
              <FontAwesomeIcon icon={splitCompare ? faCodeCompare : faExpand} className="text-[10px]" />
              <span>{splitCompare ? "مقارنة مع الكود القديم" : "محرر موسّع"}</span>
            </button>

            <button
              type="button"
              onClick={handleFormat}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-surface0/70 px-2.5 py-1 text-[11px] font-bold text-subtext1 transition hover:border-blue/40 hover:text-text"
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px] text-blue" />
              <span>تنسيق الكود</span>
            </button>
          </div>
        </div>

        {/* Main Code Comparison & Editing Body */}
        <div
          className={cn(
            "grid min-h-0 flex-1 gap-3 overflow-hidden bg-crust/60 p-3",
            splitCompare ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
          )}
        >
          {/* Pane A: OLD / ORIGINAL CODE (Read-Only Reference) */}
          {splitCompare && (
            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b0e17]">
              <div className="flex items-center justify-between border-b border-white/7 bg-surface0/40 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-peach" />
                  <span className="text-xs font-extrabold text-peach">
                    الكود القديم (قبل التعديل)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyOld}
                  className="inline-flex items-center gap-1 rounded-md bg-crust/80 px-2 py-0.5 text-[10.5px] font-bold text-subtext0 hover:text-text"
                >
                  <FontAwesomeIcon
                    icon={copiedOld ? faCheck : faCopy}
                    className={cn("text-[10px]", copiedOld && "text-green")}
                  />
                  <span>{copiedOld ? "تم النسخ" : "نسخ القديم"}</span>
                </button>
              </div>

              <div dir="ltr" className="flex min-h-0 flex-1 overflow-auto">
                <div
                  aria-hidden="true"
                  className="w-10 shrink-0 border-r border-white/6 bg-crust/70 py-3 pr-2 text-right font-mono text-[11.5px] leading-[20px] text-overlay0 select-none"
                >
                  {Array.from({ length: oldLines }, (_, i) => (
                    <div key={i + 1}>{i + 1}</div>
                  ))}
                </div>
                <pre
                  className="code-editor-font m-0 flex-1 overflow-x-auto p-3 text-[12.5px] leading-[20px] text-subtext1 select-text"
                  dangerouslySetInnerHTML={{ __html: oldHighlighted }}
                />
              </div>
            </div>
          )}

          {/* Pane B: NEW / EDITABLE CODE */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-blue/35 bg-[#0c0f18] shadow-[inset_0_0_0_1px_rgba(96,165,250,0.12)]">
            <div className="flex items-center justify-between border-b border-white/7 bg-blue/10 px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-green" />
                <span className="text-xs font-extrabold text-text">
                  الكود الجديد (قابل للتعديل المباشر)
                </span>
              </div>
              <span dir="ltr" className="font-mono text-[10.5px] text-blue">
                {newLines} lines
              </span>
            </div>

            <div dir="ltr" className="relative flex min-h-0 flex-1 overflow-hidden">
              <div
                ref={editGutterRef}
                aria-hidden="true"
                className="w-10 shrink-0 overflow-hidden border-r border-white/6 bg-crust/70 py-3 pr-2 text-right font-mono text-[11.5px] leading-[20px] text-overlay0 select-none"
              >
                {Array.from({ length: newLines }, (_, i) => (
                  <div key={i + 1}>{i + 1}</div>
                ))}
              </div>

              <div className="relative min-w-0 flex-1 overflow-hidden">
                <pre
                  ref={editPreRef}
                  aria-hidden="true"
                  className="code-editor-font code-highlight-pre absolute inset-0 p-3 text-[12.5px] leading-[20px]"
                  dangerouslySetInnerHTML={{ __html: newHighlighted }}
                />
                <textarea
                  spellCheck={false}
                  value={newContent}
                  onChange={(e) => {
                    if (codeTab === "markup") setDraftHtml(e.target.value);
                    else setDraftCss(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  onScroll={syncEditorScroll}
                  aria-label="محرر الكود الجديد للعنصر"
                  className="code-editor-font code-textarea absolute inset-0 h-full w-full p-3 text-[12.5px] leading-[20px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Bar: Revert to Old, Live Preview, Save & Commit */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-white/8 bg-crust/95 px-4 py-3">
          <button
            type="button"
            onClick={handleRevert}
            disabled={!hasAnyChanges}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red/35 bg-red/10 px-3.5 py-2 text-xs font-extrabold text-red transition hover:bg-red hover:text-crust disabled:cursor-not-allowed disabled:opacity-35"
          >
            <FontAwesomeIcon icon={faRotateLeft} />
            <span>إرجاع للكود القديم</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onLivePreview(draftHtml, draftCss)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue/40 bg-blue/12 px-3.5 py-2 text-xs font-extrabold text-blue transition hover:bg-blue/20"
            >
              <FontAwesomeIcon icon={faEye} />
              <span>معاينة التعديل بالصفحة</span>
            </button>

            <button
              type="button"
              onClick={() => onSaveCommit(draftHtml, draftCss)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green to-[#10b981] px-5 py-2 text-xs font-extrabold text-crust shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition hover:brightness-110"
            >
              <FontAwesomeIcon icon={faFloppyDisk} />
              <span>حفظ واعتماد التعديل</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
