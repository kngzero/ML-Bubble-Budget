# Subscription Bubble Tracker


Visual, bubble-based subscription dashboard. Each circle is a payment — **size** = amount, **color** = days until due. Secondary **table view** for quick edits.


https://github.com/yourname/subscription-bubble-tracker


## Features
- Tangent (non-overlapping) bubbles with size-by-amount & color-by-due-date
- Sticky popovers (clickable) with Mark Paid / Edit / Delete
- Dual view: Bubbles ↔ Table
- Autopay vs manual (dashed outline) filter
- Dark/Light themes (toggle + persistence)
- Import/Export JSON, localStorage persistence
- Unit tests (Vitest) for core utilities


## Develop
```bash
npm i
npm run dev
