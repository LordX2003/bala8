import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
  type UIEvent,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBloggerB,
  faCss3Alt,
  faHtml5,
  faJs,
} from "@fortawesome/free-brands-svg-icons";
import {
  faCheck,
  faChevronDown,
  faCopy,
  faMagnifyingGlass,
  faMinus,
  faPlus,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { formatCode, highlightCode } from "@/lib/syntaxHighlight";
import type { BloggerViewType, EditorMode, NormalEditorTab } from "@/types/analyzer";
import { cn } from "@/utils/cn";

interface EditorPaneProps {
  mode: EditorMode;
  activeTab: NormalEditorTab;
  normalHtml: string;
  normalCss: string;
  normalJs: string;
  bloggerXml: string;
  bloggerView: BloggerViewType;
  autoRun: boolean;
  lastSyncedLabel: string | null;
  flashSeq: number;
  styleWidth?: number;
  onSelectTab: (tab: NormalEditorTab) => void;
  onChangeNormalHtml: (val: string) => void;
  onChangeNormalCss: (val: string) => void;
  onChangeNormalJs: (val: string) => void;
  onChangeBloggerXml: (val: string) => void;
  onChangeBloggerView: (view: BloggerViewType) => void;
  onToggleAutoRun: () => void;
  onRunShortcut: () => void;
}

export function EditorPane({
  mode,
  activeTab,
  normalHtml,
  normalCss,
  normalJs,
  bloggerXml,
  bloggerView,
  autoRun,
  lastSyncedLabel,
  flashSeq,
  styleWidth,
  onSelectTab,
  onChangeNormalHtml,
  onChangeNormalCss,
  onChangeNormalJs,
  onChangeBloggerXml,
  onChangeBloggerView,
  onToggleAutoRun,
  onRunShortcut,
}: EditorPaneProps) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const gutterRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const cssRef = useRef<HTMLTextAreaElement>(null);
  const jsRef = useRef<HTMLTextAreaElement>(null);

  const lineHeight = Math.round(fontSize * 1.62);

  const activeLang: "html" | "xml" | "css" | "js" =
    mode === "blogger"
      ? "xml"
      : activeTab === "html"
        ? "html"
        : activeTab === "css"
          ? "css"
          : "js";

  const currentCode =
    mode === "blogger"
      ? bloggerXml
      : activeTab === "html"
        ? normalHtml
        : activeTab === "css"
          ? normalCss
          : normalJs;

  const highlightedHtml = useMemo(
    () => highlightCode(currentCode, activeLang),
    [currentCode, activeLang]
  );

  const lineCount = useMemo(() => Math.max(1, currentCode.split("\n").length), [currentCode]);
  const htmlLines = useMemo(() => normalHtml.split("\n").length, [normalHtml]);
  const cssLines = useMemo(() => normalCss.split("\n").length, [normalCss]);
  const jsLines = useMemo(() => normalJs.split("\n").length, [normalJs]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const hay = currentCode.toLowerCase();
    const indices: number[] = [];
    let pos = hay.indexOf(q);
    while (pos !== -1 && indices.length < 200) {
      indices.push(pos);
      pos = hay.indexOf(q, pos + q.length);
    }
    return indices;
  }, [currentCode, searchQuery]);

  const getActiveTextarea = () => {
    if (mode === "blogger" || activeTab === "html") return htmlRef.current;
    if (activeTab === "css") return cssRef.current;
    return jsRef.current;
  };

  const syncScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
  };

  const updateCursor = (e: SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const pos = ta.selectionStart ?? 0;
    const before = ta.value.slice(0, pos);
    const lines = before.split("\n");
    setCursorPos({
      line: lines.length,
      col: (lines[lines.length - 1]?.length ?? 0) + 1,
    });
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement>,
    value: string,
    onChange: (next: string) => void
  ) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRunShortcut();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyF") {
      e.preventDefault();
      setSearchOpen(true);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = value.slice(0, start) + "  " + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const jumpToNextMatch = () => {
    if (searchMatches.length === 0) return;
    const ta = getActiveTextarea();
    if (!ta) return;
    const cur = ta.selectionEnd ?? 0;
    const nextIdx = searchMatches.find((idx) => idx >= cur) ?? searchMatches[0];
    ta.focus();
    ta.setSelectionRange(nextIdx, nextIdx + searchQuery.trim().length);
    const lineBefore = currentCode.slice(0, nextIdx).split("\n").length;
    const targetScroll = Math.max(0, (lineBefore - 4) * lineHeight);
    ta.scrollTop = targetScroll;
    if (gutterRef.current) gutterRef.current.scrollTop = targetScroll;
    if (preRef.current) preRef.current.scrollTop = targetScroll;
  };

  const handleFormat = () => {
    const formatted = formatCode(currentCode, activeLang);
    if (mode === "blogger") onChangeBloggerXml(formatted);
    else if (activeTab === "html") onChangeNormalHtml(formatted);
    else if (activeTab === "css") onChangeNormalCss(formatted);
    else onChangeNormalJs(formatted);
  };

  const copyCurrentCode = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      style={styleWidth ? { width: `${styleWidth}px` } : undefined}
      className="editor-pane flex h-full min-h-[380px] shrink-0 flex-col bg-mantle lg:min-h-0"
    >
      {/* Top IDE File Tabs + Action Bar */}
      <div className="tabs flex items-center justify-between gap-1.5 overflow-x-auto border-b border-white/7 bg-crust/90 px-2 py-1.5 select-none">
        {/* File Tabs (LTR) */}
        <div className="flex shrink-0 items-center gap-1" dir="ltr">
          <button
            id="tab-html"
            type="button"
            data-tab="html"
            onClick={() => onSelectTab("html")}
            className={cn(
              "tab group relative inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[11px] font-semibold transition",
              mode === "blogger" || activeTab === "html"
                ? "active bg-surface0 text-text shadow-sm ring-1 ring-white/10"
                : "text-subtext0 hover:bg-surface0/50 hover:text-text"
            )}
          >
            <FontAwesomeIcon
              icon={mode === "blogger" ? faBloggerB : faHtml5}
              className="text-[11px] text-peach"
            />
            <span>{mode === "blogger" ? "template.xml" : "HTML"}</span>
            <span className="rounded bg-crust/80 px-1 text-[9px] text-overlay0">
              {mode === "blogger" ? lineCount : htmlLines}
            </span>
          </button>

          {mode === "normal" && (
            <>
              <button
                id="tab-css"
                type="button"
                data-tab="css"
                onClick={() => onSelectTab("css")}
                className={cn(
                  "tab inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[11px] font-semibold transition",
                  activeTab === "css"
                    ? "active bg-surface0 text-text shadow-sm ring-1 ring-white/10"
                    : "text-subtext0 hover:bg-surface0/50 hover:text-text"
                )}
              >
                <FontAwesomeIcon icon={faCss3Alt} className="text-[11px] text-sapphire" />
                <span>CSS</span>
                <span className="rounded bg-crust/80 px-1 text-[9px] text-overlay0">
                  {cssLines}
                </span>
              </button>

              <button
                id="tab-js"
                type="button"
                data-tab="js"
                onClick={() => onSelectTab("js")}
                className={cn(
                  "tab inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[11px] font-semibold transition",
                  activeTab === "js"
                    ? "active bg-surface0 text-text shadow-sm ring-1 ring-white/10"
                    : "text-subtext0 hover:bg-surface0/50 hover:text-text"
                )}
              >
                <FontAwesomeIcon icon={faJs} className="text-[11px] text-yellow" />
                <span>JS</span>
                <span className="rounded bg-crust/80 px-1 text-[9px] text-overlay0">
                  {jsLines}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Editor Micro-Tools */}
        <div className="flex shrink-0 items-center gap-1">
          {mode === "blogger" && (
            <div
              className="inline-flex items-center rounded-lg border border-white/8 bg-surface0/60 p-0.5 text-[10px]"
              title="محاكاة نوع صفحة بلوجر لاختبار شروط b:if"
            >
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
                    "rounded-md px-1.5 py-0.5 font-bold transition",
                    bloggerView === v.id
                      ? "bg-peach text-crust shadow-sm"
                      : "text-subtext0 hover:text-text"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            title="البحث داخل الكود (Ctrl + F)"
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md border text-[10px] transition",
              searchOpen
                ? "border-blue/50 bg-blue/15 text-blue"
                : "border-white/8 bg-surface0/60 text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </button>

          <button
            type="button"
            onClick={handleFormat}
            title="تنسيق وترتيب الكود"
            className="inline-flex size-6 items-center justify-center rounded-md border border-white/8 bg-surface0/60 text-[10px] text-subtext0 transition hover:border-mauve/40 hover:text-mauve"
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} />
          </button>

          <button
            type="button"
            onClick={copyCurrentCode}
            title={copied ? "تم نسخ الكود" : "نسخ الكود بالكامل"}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md border text-[10px] transition",
              copied
                ? "border-green/50 bg-green/15 text-green"
                : "border-white/8 bg-surface0/60 text-subtext0 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
          </button>
        </div>
      </div>

      {/* Collapsible Quick Find Bar */}
      {searchOpen && (
        <div
          dir="ltr"
          className="flex items-center gap-1.5 border-b border-white/7 bg-base px-2.5 py-1.5 text-xs"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[11px] text-subtext0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                jumpToNextMatch();
              }
              if (e.key === "Escape") setSearchOpen(false);
            }}
            placeholder="Find in code..."
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-crust px-2 py-1 font-mono text-xs text-text placeholder:text-overlay0 focus:border-blue focus:outline-none"
          />
          <span className="font-mono text-[10px] text-subtext0">
            {searchQuery.trim() ? `${searchMatches.length} نتائج` : ""}
          </span>
          <button
            type="button"
            onClick={jumpToNextMatch}
            disabled={searchMatches.length === 0}
            title="الانتقال للنتيجة التالية"
            className="inline-flex size-6 items-center justify-center rounded bg-surface0 text-[10px] text-text hover:bg-surface1 disabled:opacity-35"
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="inline-flex size-6 items-center justify-center rounded text-subtext0 hover:bg-surface0 hover:text-text"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {/* Main Layered Syntax Code Canvas */}
      <div
        key={`flash-${flashSeq}`}
        dir="ltr"
        className={cn(
          "relative flex min-h-0 flex-1 overflow-hidden bg-[#0c0f18]",
          flashSeq > 0 && "animate-code-flash"
        )}
      >
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          style={{ fontSize: `${fontSize - 1}px`, lineHeight: `${lineHeight}px` }}
          className="w-12 shrink-0 overflow-hidden border-r border-white/6 bg-crust/65 py-3 pr-2.5 text-right font-mono text-overlay0 select-none"
        >
          {Array.from({ length: lineCount }, (_, idx) => {
            const lineNum = idx + 1;
            const isActiveLine = lineNum === cursorPos.line;
            return (
              <div
                key={lineNum}
                className={cn(
                  "transition-colors",
                  isActiveLine && "font-bold text-blue"
                )}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Synchronized Highlight Layer + Editable Textareas */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden="true"
            style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px` }}
            className="code-editor-font code-highlight-pre absolute inset-0 p-3"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />

          {/* HTML / Blogger XML Editor */}
          <textarea
            ref={htmlRef}
            id="html-editor"
            spellCheck={false}
            style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px` }}
            value={mode === "blogger" ? bloggerXml : normalHtml}
            onChange={(e) => {
              updateCursor(e);
              if (mode === "blogger") onChangeBloggerXml(e.target.value);
              else onChangeNormalHtml(e.target.value);
            }}
            onClick={updateCursor}
            onKeyUp={updateCursor}
            onKeyDown={(e) =>
              handleKeyDown(
                e,
                mode === "blogger" ? bloggerXml : normalHtml,
                mode === "blogger" ? onChangeBloggerXml : onChangeNormalHtml
              )
            }
            onScroll={syncScroll}
            aria-label={mode === "blogger" ? "محرر قالب بلوجر XML" : "محرر HTML"}
            className={cn(
              "code-editor code-editor-font code-textarea absolute inset-0 h-full w-full p-3",
              mode === "blogger" || activeTab === "html" ? "active block" : "hidden"
            )}
          />

          {/* CSS Editor */}
          <textarea
            ref={cssRef}
            id="css-editor"
            spellCheck={false}
            style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px` }}
            value={normalCss}
            onChange={(e) => {
              updateCursor(e);
              onChangeNormalCss(e.target.value);
            }}
            onClick={updateCursor}
            onKeyUp={updateCursor}
            onKeyDown={(e) => handleKeyDown(e, normalCss, onChangeNormalCss)}
            onScroll={syncScroll}
            aria-label="محرر CSS"
            className={cn(
              "code-editor code-editor-font code-textarea absolute inset-0 h-full w-full p-3",
              mode === "normal" && activeTab === "css" ? "active block" : "hidden"
            )}
          />

          {/* JavaScript Editor */}
          <textarea
            ref={jsRef}
            id="js-editor"
            spellCheck={false}
            style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px` }}
            value={normalJs}
            onChange={(e) => {
              updateCursor(e);
              onChangeNormalJs(e.target.value);
            }}
            onClick={updateCursor}
            onKeyUp={updateCursor}
            onKeyDown={(e) => handleKeyDown(e, normalJs, onChangeNormalJs)}
            onScroll={syncScroll}
            aria-label="محرر JavaScript"
            className={cn(
              "code-editor code-editor-font code-textarea absolute inset-0 h-full w-full p-3",
              mode === "normal" && activeTab === "js" ? "active block" : "hidden"
            )}
          />
        </div>
      </div>

      {/* Bottom IDE Status Bar */}
      <div className="flex items-center justify-between gap-2 border-t border-white/7 bg-crust/90 px-3 py-1.5 text-[11px] text-subtext0 select-none">
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={autoRun}
            onChange={onToggleAutoRun}
            className="size-3.5 rounded accent-blue"
          />
          <span>تحديث تلقائي</span>
        </label>

        <div className="flex items-center gap-2.5" dir="ltr">
          {lastSyncedLabel ? (
            <span
              dir="rtl"
              className="rounded-md bg-green/15 px-2 py-0.5 text-[10px] font-bold text-green ring-1 ring-green/30"
            >
              ✓ {lastSyncedLabel}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-overlay0">
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
          )}

          <div className="inline-flex items-center gap-0.5 rounded border border-white/8 bg-surface0/50 px-1 py-0.5">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(11, s - 1))}
              title="تصغير خط المحرر"
              className="px-1 text-[9px] text-subtext0 hover:text-text"
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <span className="px-0.5 font-mono text-[9.5px] text-subtext1">{fontSize}px</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(17, s + 1))}
              title="تكبير خط المحرر"
              className="px-1 text-[9px] text-subtext0 hover:text-text"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
