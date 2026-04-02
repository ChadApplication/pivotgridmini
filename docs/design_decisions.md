# PivotGrid Mini — Design Decisions

**Date**: 2026-04-02
**Status**: Open for discussion

---

## 1. Data Structure & Field Design

### Current Schema

```typescript
interface Item {
  id: number;
  title: string;
  category: string;
  author: string;
  year: number;
  image: string;
}
```

### Proposed Extended Schema

```typescript
interface Item {
  // Core identity
  id: string | number;
  title: string;
  description?: string;

  // Classification
  category: string;
  tags?: string[];              // Multi-tag support for cross-cutting facets

  // Attribution
  author: string;
  source?: string;              // Origin/publisher

  // Temporal
  year: number;
  date?: string;                // ISO date for finer granularity

  // Visual
  image: string;                // Primary image URL or local path
  thumbnailUrl?: string;        // Optimized small version
  color?: string;               // Fallback color when no image

  // External
  url?: string;                 // Link to external resource

  // Flexible
  metadata?: Record<string, string | number | boolean>;  // Custom key-value pairs
}
```

### Information Display Strategy

| View Mode | Displayed Fields | Rationale |
|-----------|-----------------|-----------|
| **Grid — Large** | image + title + category badge + year | Full card with readable text |
| **Grid — Medium** | image + title + year | Balanced density |
| **Grid — Small** | image only (hover: title overlay) | Maximum density, pattern recognition |
| **Stacked** | image thumbnail only | Bar chart metaphor, quantity focus |
| **Detail Modal** | All fields | Full semantic context |

### Open Questions

- Should `category` support multiple values (array) or remain single?
- Should `metadata` fields be filterable in the sidebar?
- How to handle items with no image?

---

## 2. Image Handling Strategy

### Options Evaluated

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. URL Reference** | `image: "https://..."` | Simple, no storage, scalable | External dependency, offline broken |
| **B. Local Files** | `image: "./images/001.jpg"` | Offline capable, fast | Storage burden, deployment complexity |
| **C. Base64 Embedded** | `image: "data:image/..."` | Single-file distribution | JSON bloat, slow parsing, impractical at scale |
| **D. Hybrid** | URL first → local fallback → color placeholder | Best UX across scenarios | Implementation complexity |

### Recommendation: Option D (Hybrid)

```
Image Resolution Order:
1. item.image (URL) → load from network
2. item.thumbnailUrl (local path) → load from local /images/ folder
3. item.color → render colored placeholder with initials
4. Category-based default color → fallback
```

### Thumbnail Generation

For local images, auto-generate thumbnails at import time:
- Grid: 300x400px (current picsum size)
- Stacked: 80x80px (small square)
- Detail: original size

### Error Handling

- `<img onError>` → show category-colored placeholder with item initials
- `loading="lazy"` on all images for performance
- Intersection Observer for stacked view (only load visible cards)

---

## 3. Data Input/Output Strategy

### Options

| Option | Description | Use Case |
|--------|-------------|----------|
| **A. File Import Only** | Drag-and-drop CSV/JSON/Excel | Research data visualization, analysis |
| **B. In-App CRUD Only** | Create/Read/Update/Delete within UI | Collection management, portfolio, catalog |
| **C. Hybrid (Import + CRUD)** | File import + in-app editing | General purpose, most flexible |

### Option A — File Import

```
Supported Formats:
- CSV (.csv) — most universal
- JSON (.json) — structured, supports nested metadata
- Excel (.xlsx) — business-friendly (requires xlsx library)

Flow:
1. User drags file onto app (or clicks import button)
2. App parses file, validates schema
3. Auto-detects column mapping (id, title, category, etc.)
4. Preview → Confirm → Render
```

**Pros**: Zero backend, instant visualization, works with existing datasets
**Cons**: No persistence (refresh = data gone unless saved to localStorage)

### Option B — In-App CRUD

```
Features:
- Add Item form (title, category, author, year, image URL/upload)
- Edit Item (click to edit in detail modal)
- Delete Item (with confirmation)
- Bulk operations (select multiple → delete/re-categorize)

Storage:
- localStorage for persistence across sessions
- Export to CSV/JSON for backup
```

**Pros**: Full content management, persistent
**Cons**: More complex UI, storage limits (~5MB localStorage)

### Option C — Hybrid

```
Import: CSV/JSON/Excel drag-and-drop → populate grid
Edit: Click item → edit fields in detail modal
Add: "+" button → new item form
Delete: Select → delete
Export: Download filtered/all items as CSV
Persist: localStorage + file export
```

**Pros**: Maximum flexibility
**Cons**: Most complex to implement

### Decision: Option C (Hybrid) — Import + CRUD

Primary use case is file import (research data visualization), but full CRUD is also desired.

**Implementation Phases**:
- **Phase 1**: CSV/JSON drag-and-drop import + localStorage auto-save
- **Phase 2**: In-app edit (click item → edit in modal) + delete
- **Phase 3**: Add new item form + bulk operations + Excel import/export

---

## 4. Storage & Persistence

| Approach | Capacity | Persistence | Sharing |
|----------|----------|-------------|---------|
| **In-memory** (current) | Unlimited | None (refresh = reset) | Export only |
| **localStorage** | ~5MB (~5,000 items) | Browser-local | Export only |
| **IndexedDB** | ~50MB+ | Browser-local | Export only |
| **File System API** | Unlimited | User-managed | File sharing |
| **Backend API** | Unlimited | Server-side | Multi-user |

### Recommendation

For a client-side app without backend:
1. **Default**: localStorage (auto-save, survives refresh)
2. **Scale**: IndexedDB if items exceed 5,000
3. **Backup**: CSV/JSON export always available

---

## 5. Decision Log

| # | Decision | Status | Date |
|---|----------|--------|------|
| 1 | Data schema extension | Pending | 2026-04-02 |
| 2 | Image handling: Hybrid (D) | Proposed | 2026-04-02 |
| 3 | Data I/O: Option C Hybrid (Import + CRUD) | **Decided** | 2026-04-02 |
| 4 | Storage: localStorage default | Proposed | 2026-04-02 |
| 5 | Multi-column threshold: 25 | Decided | 2026-04-02 |
| 6 | 3-level zoom architecture | Decided | 2026-04-02 |
| 7 | 2-step data loading (load → column role mapping) | **Decided** | 2026-04-02 |
| 8 | Cmd/Ctrl + scroll zoom + zoom slider | **Decided** | 2026-04-02 |
| 9 | Dummy variable group detection (prefix-based OR groups) | **Planned** | 2026-04-02 |

---

## 6. Two-Step Data Loading Architecture

### Problem

Current implementation hardcodes filter/stack fields (category, year, author, tags). When data schema changes, code must be modified.

### Solution: 2-Step Load → Map

**Step 1: Data Load**
- CSV/JSON/Excel drag-and-drop or manual entry
- Auto-detect all columns from file headers or JSON keys
- Show column preview (first 5 rows)

**Step 2: Column Role Mapping**
User assigns semantic roles to detected columns:

```
Role Assignment UI:
┌──────────────────────────────────────────┐
│  REQUIRED ROLES                          │
│  Title:       [column_name    ▼]         │
│  Image:       [image_url      ▼] (opt)   │
│                                          │
│  GROUPABLE FIELDS (check all that apply) │
│  ☑ category    → Stack By, Filter        │
│  ☑ year        → Stack By, Filter, Range │
│  ☑ author      → Stack By, Filter        │
│  ☑ tags        → Stack By, Filter        │
│  ☐ department  → Stack By, Filter        │
│  ☐ status      → Stack By, Filter        │
│                                          │
│  DISPLAY FIELDS (shown in detail modal)  │
│  ☑ description                           │
│  ☑ email                                 │
│  ☑ url                                   │
│                                          │
│  YEAR FIELD (for histogram range slider) │
│  Year Column:  [pub_year      ▼]         │
│                                          │
│  [Cancel]              [Apply & Render]  │
└──────────────────────────────────────────┘
```

### Data Flow

```
File Upload / Manual Entry
      ↓
Column Detection (auto)
      ↓
Role Mapping UI (user)
      ↓
Schema Config saved to localStorage
      ↓
Dynamic Filter/Stack/Display rendering
      ↓
PivotGrid View
```

### Implementation Notes

- Sidebar filters are generated dynamically from "groupable" columns
- Stack By options are generated from "groupable" columns
- Detail modal shows all "display" fields
- Year histogram uses the designated "year" column
- Schema config persists in localStorage so re-upload of same format auto-maps

---

## 7. Dummy Variable Group Detection (Planned)

### Problem

Datasets with dummy-encoded columns (0/1) that share a common prefix (e.g., `DT추진부서_전담조직`, `DT추진부서_전담인력`) are treated as independent filters with AND logic. Selecting 1 in two dummy columns from the same group yields 0 results because no single row has both = 1.

### Current Filter Logic

- Same field, multiple values: **OR** (correct)
- Different fields: **AND** (correct for independent concepts, incorrect for dummy groups)

### Normal Data: Works Correctly

| Scenario | Logic | Status |
|----------|-------|:------:|
| Same field multi-select (industry: A, B) | OR | OK |
| Cross-field (industry + region) | AND | OK |
| Search + filter | AND | OK |
| Range slider + filter | AND | OK |
| Multi-value field (tags: React;TS) | OR | OK |

### Dummy Variable Problem

When columns share a prefix and contain only 0/1:
- `DT추진부서_전담조직=1` AND `DT추진부서_전담인력=1` → 0 results (should be OR)
- `업종_기계금속=1` AND `업종_전기전자=1` → 0 results (mutually exclusive)

### Proposed Solution

**Step 1: Auto-detect at import time**
- Scan for columns sharing prefix (split by `_`)
- Check if values are only 0/1
- Group them: `{prefix: "DT추진부서", columns: ["전담조직","전담인력","겸직인력","추후확보"]}`

**Step 2: Merge into single filter**
- Instead of 4 separate 0/1 filters, show one "DT추진부서" filter with 4 checkbox values
- Selecting "전담조직" = filtering rows where `DT추진부서_전담조직 = 1`
- Selecting multiple = OR within group

**Step 3: User override**
- Toggle OR/AND per group in Map Columns UI

### Detection Heuristics

1. Column name prefix match (`_` separator)
2. Only 0/1 values in column
3. Mutual exclusivity check (max one 1 per row in group → exclusive)
