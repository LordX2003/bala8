export type EditorMode = "normal" | "blogger";

export type NormalEditorTab = "html" | "css" | "js";

export type BloggerViewType = "homepage" | "post" | "archive";

export type ViewportPreset = "desktop-hd" | "fluid" | "tablet" | "mobile";

export type DirectionOverride = "auto" | "rtl" | "ltr";

export type SandboxStatus = "loading" | "ready" | "error";

export type InspectorTab = "inspector" | "links" | "layers" | "audit";

export type MobileWorkspaceTab = "editor" | "preview" | "inspector";

export type SmartEditTool = "none" | "move" | "code" | "advanced";

export interface BoxSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxModelMetrics {
  margin: BoxSides;
  border: BoxSides;
  padding: BoxSides;
  content: { width: number; height: number };
}

export interface BreadcrumbItem {
  label: string;
  selector: string;
}

export interface AttachedListener {
  type: string;
  source: string;
}

export interface ContrastInfo {
  ratio: number;
  level: "AAA" | "AA" | "AA Large" | "Fail";
  fg: string;
  bg: string;
}

export type PageLinkKind =
  | "external"
  | "anchor"
  | "component-trigger"
  | "js-action"
  | "blogger-expr"
  | "form"
  | "empty";

export interface PageLinkItem {
  id: string;
  selector: string;
  tagName: string;
  label: string;
  kind: PageLinkKind;
  destination: string;
  rawHref: string;
  bloggerExpr?: string;
  onclickCode?: string;
  targetAttr?: string;
  relAttr?: string;
  linkedSelector?: string;
  linkedTagLabel?: string;
  targetExists?: boolean;
  listenerCount: number;
  status: "valid" | "warning" | "dynamic";
}

export type CompoundPartKind =
  | "direct-text"
  | "text-el"
  | "icon"
  | "link-btn"
  | "media"
  | "container";

export interface CompoundSubPart {
  id: string;
  kind: CompoundPartKind;
  tagName: string;
  label: string;
  selector: string;
  textValue: string;
  textNodeIndex?: number;
  href?: string;
  iconClass?: string;
  childCount?: number;
}

export interface SelectedElementPayload {
  tagName: string;
  id: string;
  classes: string[];
  selector: string;
  parentSelector: string | null;
  canMovePrev: boolean;
  canMoveNext: boolean;
  currentTranslate: { x: number; y: number };
  sharedClassSelector: string | null;
  sharedMatchCount: number;
  breadcrumbs: BreadcrumbItem[];
  rect: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  boxModel: BoxModelMetrics;
  computedStyles: Record<string, string>;
  contrast: ContrastInfo | null;
  innerText: string;
  directText: string;
  hasChildElements: boolean;
  outerHTML: string;
  attributes: Record<string, string>;
  listeners: AttachedListener[];
  linkInfo: PageLinkItem | null;
  attachedLinks: PageLinkItem[];
  compoundParts: CompoundSubPart[];
}

export interface SmartContextMenuState {
  open: boolean;
  x: number;
  y: number;
  element: SelectedElementPayload | null;
}

export interface SmartMoveSession {
  active: boolean;
  selector: string;
  tagName: string;
  initialX: number;
  initialY: number;
  x: number;
  y: number;
  gridStep: 1 | 8 | 16;
  smartSnap: boolean;
  isolateShared: boolean;
  distances?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface DomTreeNode {
  tagName: string;
  id: string;
  classes: string[];
  selector: string;
  textPreview: string;
  children: DomTreeNode[];
}

export type UxIssueSeverity = "error" | "warning" | "info";
export type UxIssueCategory = "contrast" | "touch" | "a11y" | "typography" | "layout";

export interface UxAutoFix {
  label: string;
  patches: { property: string; value: string }[];
}

export interface UxIssue {
  id: string;
  severity: UxIssueSeverity;
  category: UxIssueCategory;
  title: string;
  description: string;
  selector: string;
  tagName: string;
  metric?: string;
  autoFix?: UxAutoFix;
}

export interface UxAuditReport {
  score: number;
  totalElements: number;
  issues: UxIssue[];
  counts: {
    errors: number;
    warnings: number;
    passedChecks: number;
  };
}

export interface ConsoleEntry {
  id: string;
  level: "log" | "warn" | "error" | "alert";
  message: string;
  timestamp: string;
}

export interface TemplatePreset {
  id: string;
  label: string;
  description: string;
  mode: EditorMode;
  normalHtml?: string;
  normalCss?: string;
  normalJs?: string;
  bloggerXml?: string;
}

export interface ToastItem {
  id: string;
  title: string;
  variant: "success" | "info" | "warning";
}
