# UI/UX Improvement Suggestions

> Collected Feb 8, 2026. Each idea is grounded in the product design axioms: free writing, delayed structure, and borrowed (never manufactured) attention.

---

## Home (`/`)

### 1. Empty-state illustration
The empty state currently shows plain text. A small SVG illustration (similar to the About hero) would make the first-open experience feel warmer and reinforce brand identity.

### 2. Question age / tension indicator
Each question card shows "Last active: date" but nothing about how old the question is or how much activity it has. A subtle heat indicator (e.g. a tiny colored dot: warm = recently active, cool = dormant) would honor the "living questions" metaphor without adding noise.

### 3. Keyboard shortcut for Write
The FAB is mobile-friendly, but desktop power users would benefit from a global `N` or `Ctrl+N` shortcut to jump straight to `/write`. Aligns with the "low cognitive cost" principle.

### 4. Inline question count
The page title "Living Questions" doesn't show how many exist. A subtle `tabular-nums` counter beside the title (e.g. "Living Questions · 7") would give at-a-glance orientation.

---

## Write (`/write`)

### 5. Character / word count
A tiny, muted counter at the bottom-left (only visible after ~50 chars) would help users gauge length without adding pressure. Use `text-micro tabular-nums muted-label` styling.

### 6. Markdown-lite preview on long entries
For notes exceeding ~300 words, a "Preview" toggle (eye icon) could render basic markdown. Respects free-form writing while being useful for longer, structured entries.

### 7. "Saved" micro-feedback
After casting, the "Absorbing..." state transitions to nothing. A brief "Cast ✓" toast or inline checkmark that fades after 1.5s would give closure without being intrusive.

---

## Question Detail (`/question/:id`)

### 8. Collapsible type sections
Claims / Evidence / Triggers / Other sections are always open. A chevron toggle (default open) would help when a question accumulates many notes — users can collapse sections they've already reviewed.

### 9. Note count badges on section headers
e.g. "Claims (3)" so users can scan density at a glance without counting.

### 10. Drag-to-reorder notes within a section
Notes are currently ordered by creation time. Letting users drag to reorder (or at least pin a key note) supports deliberate review — what the product doc calls "the cross-section of a thinking scene."

### 11. Quick-link a note to another question
If a note under Question A feels more relevant to Question B, a "Move to..." action (already exposed in Wandering Planet) would reduce friction.

---

## Wandering Planet (`/wandering-planet`)

### 12. Multi-select for batch actions
When many fragments accumulate, linking them one-by-one is tedious. A checkbox mode (`Select` pill button) + batch "Link all to..." or "Promote to question" would drastically speed up triage.

### 13. Inline fragment preview on AI suggestions
AI suggestion cards show note IDs but not their content snippets. Showing the first ~60 chars of each fragment inline would help users evaluate suggestions without scrolling to find the matching card.

### 14. Fragment age sort toggle
Currently sorted newest-first. An "Oldest first" toggle would help users tend to neglected fragments — "the ones drifting longest in the void."

---

## Global / Cross-cutting

### 15. Route transition animations
The app currently hard-cuts between views. A subtle slide or fade (150–200ms, respecting `prefers-reduced-motion`) would reinforce spatial awareness and make navigation feel more organic.

### 16. Undo for destructive actions
Delete confirmations are good, but an undo-toast pattern (delete immediately, show "Undo" for 5s) would feel lighter and more confident than a modal dialog, especially for deleting fragments.

### 17. Onboarding nudge for first-time users
A one-time, dismissible explainer card on the Home page for new users ("No questions yet? Start writing — structure will come later.") would connect the empty state to the app's philosophy.
