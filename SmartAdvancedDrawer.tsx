import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsLeftRight,
  faCode,
  faLink,
  faMinus,
  faPalette,
  faPenToSquare,
  faPlus,
  faPuzzlePiece,
  faSliders,
  faTurnUp,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { isTransparentColor, rgbToHex } from "@/lib/codeEngine";
import type {
  CompoundSubPart,
  PageLinkItem,
  SelectedElementPayload,
} from "@/types/analyzer";
import { cn } from "@/utils/cn";
import { CompoundDecomposerCard } from "./CompoundDecomposerCard";
import { SelectedElementLinkCard } from "./LinksExplorerTab";

interface SmartAdvancedDrawerProps {
  open: boolean;
  selectedElement: SelectedElementPayload | null;
  selectionSeq: number;
  isolatedSelector: string | null;
  explodeMode: boolean;
  textSyncNote: string | null;
  onClose: () => void;
  onOpenCodeModal: () => void;
  onStartMove: () => void;
  onSelectElement: (selector: string) => void;
  onHoverElement: (selector: string | null) => void;
  onToggleIsolate: (selector: string | null) => void;
  onToggleExplodeMode: () => void;
  onSplitSharedStyle: () => void;
  onUnwrapContainer: () => void;
  onOpenExtractModal: () => void;
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
  onAttachLinkToElement: (href: string, openNewTab: boolean) => void;
  onPreviewStyle: (selector: string, prop: string, value: string) => void;
  onCommitStyle: (selector: string, prop: string, value: string) => void;
  onOpenExternalUrl: (url: string) => void;
}

export function SmartAdvancedDrawer({
  open,
  selectedElement,
  selectionSeq,
  isolatedSelector,
  explodeMode,
  textSyncNote,
  onClose,
  onOpenCodeModal,
  onStartMove,
  onSelectElement,
  onHoverElement,
  onToggleIsolate,
  onToggleExplodeMode,
  onSplitSharedStyle,
  onUnwrapContainer,
  onOpenExtractModal,
  onEditText,
  onEditSubPartText,
  onUpdateElementAttribute,
  onAttachLinkToElement,
  onPreviewStyle,
  onCommitStyle,
  onOpenExternalUrl,
}: SmartAdvancedDrawerProps) {
  const [dockSide, setDockSide] = useState<"left" | "right">("left");
  const [subTab, setSubTab] = useState<"compound" | "text-links" | "style">("text-links");
  const [draftText, setDraftText] = useState("");
  const [draftStyles, setDraftStyles] = useState<Record<string, string>>({});
  const [newLinkHref, setNewLinkHref] = useState("https://");
  const [newLinkBlank, setNewLinkBlank] = useState(true);
  const [nestedLinkDrafts, setNestedLinkDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedElement) return;
    setDraftText(
      selectedElement.hasChildElements
        ? selectedElement.directText
        : selectedElement.innerText
    );
    setDraftStyles({ ...selectedElement.computedStyles });

    const nestedMap: Record<string, string> = {};
    for (const ln of selectedElement.attachedLinks) {
      nestedMap[ln.id] =
        ln.tagName === "a" ? ln.rawHref || ln.bloggerExpr || "" : ln.onclickCode || "";
    }
    setNestedLinkDrafts(nestedMap);

    // Smart default sub-tab based on element composition
    if (selectedElement.compoundParts.length > 1 && !selectedElement.linkInfo) {
      setSubTab("compound");
    } else {
      setSubTab("text-links");
    }
  }, [selectionSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !selectedElement) return null;

  const nestedOnlyLinks: PageLinkItem[] = selectedElement.attachedLinks.filter(
    (l) => l.selector !== selectedElement.selector
  );

  const applyStyle = (prop: string, val: string) => {
    setDraftStyles((prev) => ({ ...prev, [prop]: val }));
    onPreviewStyle(selectedElement.selector, prop, val);
    onCommitStyle(selectedElement.selector, prop, val);
  };

  const stepPx = (prop: string, delta: number, min = 0, max = 160) => {
    const cur = Math.round(parseFloat(draftStyles[prop] ?? "0") || 0);
    const next = Math.max(min, Math.min(max, cur + delta));
    applyStyle(prop, `${next}px`);
  };

  return (
    <aside
      className={cn(
        "fixed top-14 bottom-4 z-40 flex w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-white/14 bg-mantle/96 shadow-[0_24px_70px_rgba(0,0,0,0.72)] backdrop-blur-xl",
        dockSide === "left" ? "left-3" : "right-3"
      )}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/8 bg-crust/90 px-3.5 py-2.5 select-none">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-mauve/20 text-mauve ring-1 ring-mauve/35">
            <FontAwesomeIcon icon={faSliders} className="text-xs" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-text">التعديل المتقدم للعنصر</div>
            <div dir="ltr" className="truncate font-mono text-[10px] text-mauve">
              {selectedElement.selector}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {selectedElement.parentSelector && (
            <button
              type="button"
              onClick={() => onSelectElement(selectedElement.parentSelector!)}
              title="الصعود للعنصر الأب"
              className="inline-flex size-7 items-center justify-center rounded-lg border border-white/8 bg-surface0/80 text-xs text-subtext1 hover:text-blue"
            >
              <FontAwesomeIcon icon={faTurnUp} className="text-[10.5px]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDockSide((s) => (s === "left" ? "right" : "left"))}
            title="نقل اللوحة للجهة المقابلة"
            className="inline-flex size-7 items-center justify-center rounded-lg border border-white/8 bg-surface0/80 text-xs text-subtext1 hover:text-text"
          >
            <FontAwesomeIcon icon={faArrowsLeftRight} className="text-[10.5px]" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="إغلاق اللوحة"
            className="inline-flex size-7 items-center justify-center rounded-lg border border-white/8 bg-surface0/80 text-xs text-subtext0 hover:text-red"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>

      {/* Quick Switch Bar to Sibling Smart Tools (Move / Code) */}
      <div className="flex items-center gap-1.5 border-b border-white/6 bg-base/75 px-3 py-1.5">
        <button
          type="button"
          onClick={onStartMove}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/8 bg-crust/75 py-1 text-[10.5px] font-bold text-subtext1 transition hover:border-mauve/50 hover:text-mauve"
        >
          <span>✥ تحريك هندسي</span>
        </button>
        <button
          type="button"
          onClick={onOpenCodeModal}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/8 bg-crust/75 py-1 text-[10.5px] font-bold text-subtext1 transition hover:border-blue/50 hover:text-blue"
        >
          <FontAwesomeIcon icon={faCode} className="text-[10px]" />
          <span>التعديل البرمجي</span>
        </button>
      </div>

      {/* 3 Sub-Tabs */}
      <div className="grid grid-cols-3 gap-1 border-b border-white/7 bg-crust/65 p-1.5 select-none">
        <button
          type="button"
          onClick={() => setSubTab("text-links")}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition",
            subTab === "text-links"
              ? "bg-surface0 text-blue ring-1 ring-blue/35"
              : "text-subtext0 hover:text-text"
          )}
        >
          <FontAwesomeIcon icon={faLink} className="text-[9.5px]" />
          <span>النصوص والروابط</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("compound")}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition",
            subTab === "compound"
              ? "bg-surface0 text-mauve ring-1 ring-mauve/35"
              : "text-subtext0 hover:text-text"
          )}
        >
          <FontAwesomeIcon icon={faPuzzlePiece} className="text-[9.5px]" />
          <span>فصل المركّب</span>
          {selectedElement.compoundParts.length > 0 && (
            <span className="rounded-full bg-mauve/20 px-1 font-mono text-[9px] text-mauve">
              {selectedElement.compoundParts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab("style")}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition",
            subTab === "style"
              ? "bg-surface0 text-green ring-1 ring-green/35"
              : "text-subtext0 hover:text-text"
          )}
        >
          <FontAwesomeIcon icon={faPalette} className="text-[9.5px]" />
          <span>المظهر</span>
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* =====================================================
            SUB-TAB 1: TEXTS & ATTACHED LINKS
           ===================================================== */}
        {subTab === "text-links" && (
          <>
            {/* Direct Text Editor */}
            {(!selectedElement.hasChildElements || selectedElement.directText.length > 0) ? (
              <div className="studio-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="inline-flex items-center gap-1.5 text-xs font-extrabold text-text">
                    <FontAwesomeIcon icon={faPenToSquare} className="text-sapphire" />
                    <span>تعديل النص المباشر</span>
                  </h3>
                  {textSyncNote && (
                    <span className="rounded bg-green/15 px-1.5 py-0.5 text-[10px] font-bold text-green">
                      {textSyncNote}
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={draftText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftText(val);
                    onEditText(selectedElement.selector, val);
                  }}
                  placeholder="عدّل نص العنصر مباشرة..."
                  className="w-full rounded-xl border border-white/10 bg-crust p-2.5 text-xs leading-relaxed text-text focus:border-blue focus:outline-none"
                />
              </div>
            ) : (
              <div className="studio-card border-mauve/25 bg-mauve/6 p-3">
                <div className="text-xs font-extrabold text-mauve">
                  عنصر مركّب يضم {selectedElement.compoundParts.length} نصوص/أجزاء داخلية
                </div>
                <p className="mt-1 text-[11px] text-subtext0">
                  يمكنك تعديل نص كل جزء فرعي على حدة دون المساس بالأيقونات من تبويب{" "}
                  <button
                    type="button"
                    onClick={() => setSubTab("compound")}
                    className="font-extrabold text-mauve underline"
                  >
                    فصل المركّب
                  </button>
                  .
                </p>
              </div>
            )}

            {/* Direct Link Card if the element itself is a link/button */}
            {selectedElement.linkInfo ? (
              <SelectedElementLinkCard
                key={`adv-link-${selectionSeq}-${selectedElement.selector}`}
                linkInfo={selectedElement.linkInfo}
                onJumpToTarget={(sel) => onSelectElement(sel)}
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
            ) : (
              /* Attach a new link if element is not yet a link! */
              <div className="studio-card p-3">
                <h3 className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-text">
                  <FontAwesomeIcon icon={faLink} className="text-blue" />
                  <span>إلحاق رابط جديد بهذا العنصر</span>
                </h3>
                <p className="mb-2 text-[10.5px] text-subtext0">
                  حوّل هذا العنصر إلى عنصر قابل للنقر يوجّه لرابط خارجي أو لقسم داخلي (#id):
                </p>
                <div className="flex items-center gap-1.5" dir="ltr">
                  <input
                    type="text"
                    value={newLinkHref}
                    onChange={(e) => setNewLinkHref(e.target.value)}
                    placeholder="https://... or #section"
                    className="min-w-0 flex-1 rounded-lg border border-white/12 bg-crust px-2.5 py-1.5 font-mono text-[11px] text-text focus:border-blue focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newLinkHref.trim()) {
                        onAttachLinkToElement(newLinkHref.trim(), newLinkBlank);
                      }
                    }}
                    className="shrink-0 rounded-lg bg-blue px-2.5 py-1.5 font-sans text-[11px] font-extrabold text-crust transition hover:brightness-110"
                  >
                    ربط
                  </button>
                </div>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-subtext1">
                  <input
                    type="checkbox"
                    checked={newLinkBlank}
                    onChange={(e) => setNewLinkBlank(e.target.checked)}
                    className="size-3.5 rounded accent-blue"
                  />
                  <span>فتح في نافذة جديدة (_blank)</span>
                </label>
              </div>
            )}

            {/* Nested Links Inside Compound Element (e.g., WhatsApp button inside a Team Card!) */}
            {nestedOnlyLinks.length > 0 && (
              <div className="studio-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="inline-flex items-center gap-1.5 text-xs font-extrabold text-text">
                    <FontAwesomeIcon icon={faLink} className="text-green" />
                    <span>الروابط والأزرار الملحقة داخل المكوّن</span>
                  </h3>
                  <span className="rounded-full bg-green/15 px-2 py-0.5 font-mono text-[10px] font-bold text-green">
                    {nestedOnlyLinks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {nestedOnlyLinks.map((nl) => {
                    const attrName = nl.tagName === "a" ? "href" : "onclick";
                    const val = nestedLinkDrafts[nl.id] ?? "";
                    return (
                      <div
                        key={nl.id}
                        onMouseEnter={() => onHoverElement(nl.selector)}
                        onMouseLeave={() => onHoverElement(null)}
                        className="rounded-xl border border-white/8 bg-crust/80 p-2.5"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-bold text-text">
                            {nl.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectElement(nl.selector)}
                            className="shrink-0 rounded bg-surface0 px-2 py-0.5 text-[10px] font-bold text-blue hover:bg-blue hover:text-crust"
                          >
                            تحديد الزر
                          </button>
                        </div>

                        <div className="flex items-center gap-1" dir="ltr">
                          <input
                            type="text"
                            value={val}
                            onChange={(e) =>
                              setNestedLinkDrafts((prev) => ({
                                ...prev,
                                [nl.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onUpdateElementAttribute(
                                  {
                                    selector: nl.selector,
                                    tagName: nl.tagName,
                                    rawHref: nl.rawHref,
                                    label: nl.label,
                                  },
                                  attrName,
                                  val.trim()
                                );
                              }
                            }}
                            placeholder={attrName === "href" ? "https://..." : "fn()"}
                            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-mantle px-2 py-1 font-mono text-[10.5px] text-text focus:border-green focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateElementAttribute(
                                {
                                  selector: nl.selector,
                                  tagName: nl.tagName,
                                  rawHref: nl.rawHref,
                                  label: nl.label,
                                },
                                attrName,
                                val.trim()
                              )
                            }
                            className="shrink-0 rounded-lg bg-green px-2.5 py-1 font-sans text-[10.5px] font-extrabold text-crust"
                          >
                            حفظ
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* =====================================================
            SUB-TAB 2: COMPOUND ELEMENT SEPARATION & DECOMPOSER
           ===================================================== */}
        {subTab === "compound" && (
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
            onSelectSubPart={(sel) => onSelectElement(sel)}
            onHoverSubPart={(sel) => onHoverElement(sel)}
            onEditSubPartText={onEditSubPartText}
          />
        )}

        {/* =====================================================
            SUB-TAB 3: QUICK APPEARANCE & DIMENSIONS
           ===================================================== */}
        {subTab === "style" && (
          <div className="space-y-3">
            {/* Contrast Card */}
            {selectedElement.contrast && (
              <div className="studio-card flex items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{
                      backgroundColor: selectedElement.contrast.bg,
                      color: selectedElement.contrast.fg,
                    }}
                    className="flex h-9 w-11 items-center justify-center rounded-lg border border-white/15 text-sm font-extrabold"
                  >
                    أب Aa
                  </div>
                  <div>
                    <div className="font-mono text-xs font-extrabold text-text" dir="ltr">
                      {selectedElement.contrast.ratio}:1 ({selectedElement.contrast.level})
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
                      applyStyle("color", bright ? "#0f172a" : "#f8fafc");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue px-2.5 py-1 text-[10.5px] font-extrabold text-crust"
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[9px]" />
                    <span>تحسين</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Colors */}
            <div className="studio-card space-y-2.5 p-3">
              <div className="text-xs font-extrabold text-text">الألوان الأساسية</div>
              {(
                [
                  { key: "color", label: "لون النص" },
                  { key: "backgroundColor", label: "لون الخلفية" },
                  { key: "borderColor", label: "لون الإطار" },
                ] as const
              ).map(({ key, label }) => {
                const raw = draftStyles[key] ?? "";
                const hex = rgbToHex(raw);
                const trans = isTransparentColor(raw);
                return (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-subtext1">{label}</span>
                    <div className="flex items-center gap-1.5" dir="ltr">
                      {key !== "color" && (
                        <button
                          type="button"
                          onClick={() => applyStyle(key, "transparent")}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[9.5px] font-bold",
                            trans ? "bg-blue/20 text-blue" : "bg-surface0 text-subtext0"
                          )}
                        >
                          شفاف
                        </button>
                      )}
                      <input
                        type="color"
                        value={hex}
                        onChange={(e) => applyStyle(key, e.target.value)}
                        className="inspector-color-input"
                      />
                      <input
                        type="text"
                        value={trans ? "transparent" : raw}
                        onChange={(e) => {
                          setDraftStyles((p) => ({ ...p, [key]: e.target.value }));
                          onPreviewStyle(selectedElement.selector, key, e.target.value);
                        }}
                        onBlur={(e) =>
                          onCommitStyle(selectedElement.selector, key, e.target.value)
                        }
                        className="w-24 rounded-lg border border-white/10 bg-crust px-2 py-1 font-mono text-[11px] text-text focus:border-blue focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Spacing & Font Size */}
            <div className="studio-card space-y-2.5 p-3">
              <div className="text-xs font-extrabold text-text">الأبعاد وحجم الخط</div>
              {(
                [
                  { key: "fontSize", label: "حجم الخط", step: 1 },
                  { key: "padding", label: "الحشو الداخلي", step: 2 },
                  { key: "borderRadius", label: "استدارة الحواف", step: 2 },
                ] as const
              ).map(({ key, label, step }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-subtext1">{label}</span>
                  <div className="flex items-center gap-1" dir="ltr">
                    <button
                      type="button"
                      onClick={() => stepPx(key, -step)}
                      className="inline-flex size-6 items-center justify-center rounded-md border border-white/8 bg-crust text-[9px] text-subtext0 hover:text-text"
                    >
                      <FontAwesomeIcon icon={faMinus} />
                    </button>
                    <input
                      type="text"
                      value={draftStyles[key] ?? ""}
                      onChange={(e) => {
                        setDraftStyles((p) => ({ ...p, [key]: e.target.value }));
                        onPreviewStyle(selectedElement.selector, key, e.target.value);
                      }}
                      onBlur={(e) =>
                        onCommitStyle(selectedElement.selector, key, e.target.value)
                      }
                      className="w-20 rounded-lg border border-white/10 bg-crust px-2 py-0.5 text-center font-mono text-[11px] text-text focus:border-blue focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => stepPx(key, step)}
                      className="inline-flex size-6 items-center justify-center rounded-md border border-white/8 bg-crust text-[9px] text-subtext0 hover:text-text"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
