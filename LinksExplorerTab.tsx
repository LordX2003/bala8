import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBloggerB, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import {
  faAnchor,
  faArrowUpRightFromSquare,
  faBolt,
  faBullseye,
  faCheck,
  faCopy,
  faCrosshairs,
  faDiagramProject,
  faGlobe,
  faLink,
  faLinkSlash,
  faMagnifyingGlass,
  faPen,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { PageLinkItem, PageLinkKind } from "@/types/analyzer";
import { cn } from "@/utils/cn";

interface LinksExplorerTabProps {
  links: PageLinkItem[];
  linkOverlayMode: boolean;
  selectedSelector: string | null;
  onToggleLinkOverlay: () => void;
  onSelectElement: (selector: string) => void;
  onHoverConnection: (selector: string | null, linkedSelector?: string) => void;
  onUpdateAttribute: (
    item: PageLinkItem,
    attr: string,
    value: string
  ) => void;
  onOpenExternalUrl: (url: string) => void;
}

function getKindBadge(item: PageLinkItem) {
  if (item.kind === "external") {
    const isWa = /whatsapp\.com|wa\.me/i.test(item.destination);
    return {
      icon: isWa ? faWhatsapp : faGlobe,
      label: isWa ? "واتساب خارجي" : "رابط خارجي",
      cls: "bg-green/15 text-green ring-green/30",
    };
  }
  if (item.kind === "anchor") {
    return {
      icon: faAnchor,
      label: "مرساة قسم (#)",
      cls:
        item.targetExists === false
          ? "bg-red/15 text-red ring-red/30"
          : "bg-sapphire/15 text-sapphire ring-sapphire/30",
    };
  }
  if (item.kind === "component-trigger") {
    return {
      icon: faDiagramProject,
      label: "متحكّم بمكوّن",
      cls: "bg-mauve/15 text-mauve ring-mauve/30",
    };
  }
  if (item.kind === "blogger-expr") {
    return {
      icon: faBloggerB,
      label: "رابط بلوجر ديناميكي",
      cls: "bg-peach/15 text-peach ring-peach/30",
    };
  }
  if (item.kind === "js-action") {
    return {
      icon: faBolt,
      label: "تفاعل برمجي JS",
      cls: "bg-yellow/15 text-yellow ring-yellow/30",
    };
  }
  return {
    icon: faLinkSlash,
    label: "بدون وجهة",
    cls: "bg-red/15 text-red ring-red/30",
  };
}

/**
 * Compact card embedded directly inside the Element Inspector when selecting a button or link.
 */
export function SelectedElementLinkCard({
  linkInfo,
  onJumpToTarget,
  onCommitAttr,
  onOpenExternalUrl,
}: {
  linkInfo: PageLinkItem;
  onJumpToTarget: (selector: string) => void;
  onCommitAttr: (attr: string, value: string) => void;
  onOpenExternalUrl: (url: string) => void;
}) {
  const isAnchorTag = linkInfo.tagName === "a";
  const primaryAttr = isAnchorTag ? "href" : "onclick";
  const [draftDest, setDraftDest] = useState(
    isAnchorTag ? linkInfo.rawHref || linkInfo.bloggerExpr || "" : linkInfo.onclickCode || ""
  );
  const [openInNewTab, setOpenInNewTab] = useState(linkInfo.targetAttr === "_blank");
  const [savedFlag, setSavedFlag] = useState(false);

  const badge = getKindBadge(linkInfo);

  const handleSave = () => {
    onCommitAttr(primaryAttr, draftDest.trim());
    if (isAnchorTag) {
      onCommitAttr("target", openInNewTab ? "_blank" : "");
      if (openInNewTab) onCommitAttr("rel", "noopener noreferrer");
    }
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1500);
  };

  return (
    <div className="studio-card border-blue/25 bg-gradient-to-b from-blue/[0.06] to-transparent p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-xs font-extrabold text-text">
          <FontAwesomeIcon icon={faLink} className="text-blue" />
          <span>الرابط والمكوّن المرتبط</span>
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ring-1",
            badge.cls
          )}
        >
          <FontAwesomeIcon icon={badge.icon} className="text-[9.5px]" />
          <span>{badge.label}</span>
        </span>
      </div>

      {/* Linked internal component box */}
      {linkInfo.linkedSelector && (
        <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-sapphire/30 bg-sapphire/8 px-2.5 py-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-sapphire">
              {linkInfo.targetExists === false
                ? "المكوّن الهدف غير موجود بالصفحة:"
                : "مرتبط بمكوّن داخل الصفحة:"}
            </div>
            <div dir="ltr" className="truncate font-mono text-[11px] font-bold text-text">
              {linkInfo.linkedTagLabel || linkInfo.linkedSelector}
            </div>
          </div>

          {linkInfo.targetExists !== false && (
            <button
              type="button"
              onClick={() => onJumpToTarget(linkInfo.linkedSelector!)}
              className="shrink-0 rounded-lg bg-sapphire px-2.5 py-1 text-[10.5px] font-extrabold text-crust transition hover:brightness-110"
            >
              انتقال للهدف
            </button>
          )}
        </div>
      )}

      {/* Direct URL / Action Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10.5px] text-subtext0">
          <span>
            {isAnchorTag ? "عنوان الرابط (href):" : "أمر النقر البرمجي (onclick):"}
          </span>
          {linkInfo.bloggerExpr && (
            <span dir="ltr" className="font-mono text-[10px] text-peach">
              expr: {linkInfo.bloggerExpr}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5" dir="ltr">
          <input
            type="text"
            value={draftDest}
            onChange={(e) => setDraftDest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder={isAnchorTag ? "https://... or #section" : "myFunction()"}
            className="min-w-0 flex-1 rounded-lg border border-white/12 bg-crust px-2.5 py-1.5 font-mono text-[11px] text-text placeholder:text-overlay0 focus:border-blue focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            className="shrink-0 rounded-lg bg-blue px-2.5 py-1.5 font-sans text-[11px] font-extrabold text-crust transition hover:brightness-110"
          >
            {savedFlag ? "✓ حُفظ" : "تطبيق"}
          </button>
        </div>

        {isAnchorTag && (
          <div className="flex items-center justify-between pt-0.5">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-subtext1">
              <input
                type="checkbox"
                checked={openInNewTab}
                onChange={(e) => {
                  const next = e.target.checked;
                  setOpenInNewTab(next);
                  onCommitAttr("target", next ? "_blank" : "");
                  if (next) onCommitAttr("rel", "noopener noreferrer");
                }}
                className="size-3.5 rounded accent-blue"
              />
              <span>فتح في تبويب جديد (_blank)</span>
            </label>

            {/^https?:\/\//i.test(linkInfo.rawHref) && (
              <button
                type="button"
                onClick={() => onOpenExternalUrl(linkInfo.rawHref)}
                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue hover:underline"
              >
                <span>معاينة الرابط</span>
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[9px]" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Full Tab View listing all Links, Buttons, Anchors & Component Triggers across the page.
 */
export function LinksExplorerTab({
  links,
  linkOverlayMode,
  selectedSelector,
  onToggleLinkOverlay,
  onSelectElement,
  onHoverConnection,
  onUpdateAttribute,
  onOpenExternalUrl,
}: LinksExplorerTabProps) {
  const [filter, setFilter] = useState<"all" | PageLinkKind | "warnings">("all");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    let external = 0;
    let internal = 0;
    let triggers = 0;
    let warnings = 0;
    for (const l of links) {
      if (l.kind === "external") external++;
      else if (l.kind === "anchor") internal++;
      else if (l.kind === "component-trigger" || l.kind === "js-action") triggers++;
      if (l.status === "warning") warnings++;
    }
    return { external, internal, triggers, warnings };
  }, [links]);

  const filteredLinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter((item) => {
      if (filter === "warnings" && item.status !== "warning") return false;
      if (filter !== "all" && filter !== "warnings") {
        if (filter === "component-trigger") {
          if (item.kind !== "component-trigger" && item.kind !== "js-action") return false;
        } else if (item.kind !== filter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.destination.toLowerCase().includes(q) ||
        item.selector.toLowerCase().includes(q)
      );
    });
  }, [filter, links, query]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      onMouseLeave={() => onHoverConnection(null)}
      className="flex flex-1 flex-col overflow-hidden p-3"
    >
      {/* Summary Header Card */}
      <div className="studio-card mb-2.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-extrabold text-text">
              خريطة الروابط وتفاعلات الأزرار
            </h3>
            <p className="mt-0.5 text-[10.5px] text-subtext0">
              {links.length} عنصر تفاعلي مكتشف في الصفحة الحالية
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleLinkOverlay}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold transition",
              linkOverlayMode
                ? "border-blue bg-blue text-crust shadow-[0_0_14px_rgba(96,165,250,0.35)]"
                : "border-white/10 bg-surface0 text-subtext1 hover:border-blue/45 hover:text-text"
            )}
          >
            <FontAwesomeIcon icon={faBullseye} className="text-[10px]" />
            <span>{linkOverlayMode ? "إخفاء الشارات" : "إظهار على المعاينة"}</span>
          </button>
        </div>

        {/* 4 Mini Counters */}
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-[10px]">
          <div className="rounded-lg border border-green/20 bg-green/8 py-1.5 text-green">
            <div className="font-mono text-xs font-extrabold">{counts.external}</div>
            <div>خارجي</div>
          </div>
          <div className="rounded-lg border border-sapphire/20 bg-sapphire/8 py-1.5 text-sapphire">
            <div className="font-mono text-xs font-extrabold">{counts.internal}</div>
            <div>مرساة #</div>
          </div>
          <div className="rounded-lg border border-mauve/20 bg-mauve/8 py-1.5 text-mauve">
            <div className="font-mono text-xs font-extrabold">{counts.triggers}</div>
            <div>مشغّلات</div>
          </div>
          <div className="rounded-lg border border-yellow/20 bg-yellow/8 py-1.5 text-yellow">
            <div className="font-mono text-xs font-extrabold">{counts.warnings}</div>
            <div>تنبيهات</div>
          </div>
        </div>
      </div>

      {/* Search + Filter Pills */}
      <div className="mb-2 space-y-2">
        <div className="relative">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-subtext0"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الزر أو الرابط أو المحدد..."
            className="w-full rounded-xl border border-white/10 bg-crust py-1.5 pr-8 pl-3 text-xs text-text placeholder:text-overlay0 focus:border-blue focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: "all", label: "الكل" },
              { id: "external", label: "خارجية" },
              { id: "anchor", label: "داخلية #" },
              { id: "component-trigger", label: "أزرار ومكوّنات" },
              { id: "blogger-expr", label: "بلوجر" },
              { id: "warnings", label: "غير مكتملة" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-2 py-0.5 text-[10.5px] font-bold transition",
                filter === f.id
                  ? "bg-blue text-crust"
                  : "bg-surface0/60 text-subtext0 hover:text-text"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Links & Buttons Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
        {filteredLinks.length === 0 ? (
          <div className="studio-card py-8 text-center text-xs text-subtext0">
            لا توجد أزرار أو روابط مطابقة لفلتر البحث الحالي
          </div>
        ) : (
          filteredLinks.map((item) => {
            const badge = getKindBadge(item);
            const isSelected = selectedSelector === item.selector;
            const isEditing = editingId === item.id;
            const editAttr = item.tagName === "a" ? "href" : "onclick";

            return (
              <div
                key={item.id}
                onMouseEnter={() => onHoverConnection(item.selector, item.linkedSelector)}
                className={cn(
                  "studio-card p-2.5 transition",
                  isSelected
                    ? "border-green/50 ring-1 ring-green/30"
                    : "hover:border-blue/40"
                )}
              >
                {/* Top Row: Label + Kind Badge */}
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectElement(item.selector)}
                    className="min-w-0 flex-1 text-right"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        dir="ltr"
                        className="shrink-0 rounded bg-surface0 px-1.5 py-0.2 font-mono text-[9.5px] font-bold text-blue"
                      >
                        &lt;{item.tagName}&gt;
                      </span>
                      <span className="truncate text-xs font-extrabold text-text hover:text-blue">
                        {item.label}
                      </span>
                    </div>
                  </button>

                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold ring-1",
                      badge.cls
                    )}
                  >
                    <FontAwesomeIcon icon={badge.icon} className="text-[9px]" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Destination / URL Box */}
                <div
                  dir="ltr"
                  className="mt-2 flex items-center justify-between gap-1.5 rounded-lg border border-white/6 bg-crust/85 px-2 py-1"
                >
                  <span
                    className={cn(
                      "truncate font-mono text-[10.5px]",
                      item.status === "warning" ? "text-yellow" : "text-subtext1"
                    )}
                    title={item.destination}
                  >
                    {item.destination}
                  </span>

                  <div className="flex shrink-0 items-center gap-1">
                    {item.targetAttr === "_blank" && (
                      <span className="rounded bg-surface0 px-1 py-0.2 font-mono text-[9px] text-subtext0">
                        _blank
                      </span>
                    )}
                    {item.rawHref && (
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.rawHref)}
                        title="نسخ الرابط"
                        className="p-0.5 text-subtext0 hover:text-text"
                      >
                        <FontAwesomeIcon
                          icon={copiedId === item.id ? faCheck : faCopy}
                          className={cn(
                            "text-[10px]",
                            copiedId === item.id && "text-green"
                          )}
                        />
                      </button>
                    )}
                    {/^https?:\/\//i.test(item.rawHref) && (
                      <button
                        type="button"
                        onClick={() => onOpenExternalUrl(item.rawHref)}
                        title="فتح الرابط في تبويب جديد"
                        className="p-0.5 text-blue hover:text-sapphire"
                      >
                        <FontAwesomeIcon
                          icon={faArrowUpRightFromSquare}
                          className="text-[10px]"
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Linked Target Component Status Row */}
                {item.linkedSelector && (
                  <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-sapphire/8 px-2 py-1 text-[10.5px]">
                    <span className="inline-flex items-center gap-1 font-semibold text-sapphire">
                      {item.targetExists === false ? (
                        <>
                          <FontAwesomeIcon
                            icon={faTriangleExclamation}
                            className="text-yellow"
                          />
                          <span className="text-yellow">هدف مفقود:</span>
                        </>
                      ) : (
                        <span>مرتبط بـ:</span>
                      )}
                      <code dir="ltr" className="font-mono font-bold text-text">
                        {item.linkedTagLabel || item.linkedSelector}
                      </code>
                    </span>

                    {item.targetExists !== false && (
                      <button
                        type="button"
                        onClick={() => onSelectElement(item.linkedSelector!)}
                        className="font-bold text-sapphire hover:underline"
                      >
                        فحص المكوّن ←
                      </button>
                    )}
                  </div>
                )}

                {/* Inline Link Editor when opened */}
                {isEditing ? (
                  <div className="mt-2 space-y-1.5 border-t border-white/6 pt-2" dir="ltr">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onUpdateAttribute(item, editAttr, editValue.trim());
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        placeholder={editAttr === "href" ? "https://... or #id" : "myFn()"}
                        autoFocus
                        className="min-w-0 flex-1 rounded-lg border border-blue/50 bg-crust px-2 py-1 font-mono text-[11px] text-text focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateAttribute(item, editAttr, editValue.trim());
                          setEditingId(null);
                        }}
                        className="rounded-lg bg-blue px-2.5 py-1 font-sans text-[10.5px] font-bold text-crust"
                      >
                        حفظ
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Footer */
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectElement(item.selector)}
                      className="inline-flex items-center gap-1 rounded-md bg-surface0/80 px-2 py-0.5 text-[10.5px] font-bold text-subtext1 transition hover:bg-surface1 hover:text-text"
                    >
                      <FontAwesomeIcon icon={faCrosshairs} className="text-[9.5px] text-blue" />
                      <span>تحديد وفحص</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditValue(
                          editAttr === "href"
                            ? item.rawHref || ""
                            : item.onclickCode || ""
                        );
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-surface0/80 px-2 py-0.5 text-[10.5px] font-bold text-subtext1 transition hover:bg-blue/15 hover:text-blue"
                    >
                      <FontAwesomeIcon icon={faPen} className="text-[9px]" />
                      <span>{editAttr === "href" ? "تعديل الرابط" : "تعديل الحدث"}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
