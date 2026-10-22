<div align="center">

<img src="public/icon.png" alt="Kotori Logo" width="100" />

# Kotoba Reader AI

**Kotoba Reader AI** (Kotori): An All-in-One, Fast, and Immersive Platform for Reading Japanese Light Novels & Web Novels.

<a href="https://kotori.kaisaaru.dev" target="_blank" rel="noopener noreferrer"><strong>Official Domain: kotori.kaisaaru.dev</strong></a>

[![Official Domain](https://img.shields.io/badge/Official_Domain-kotori.kaisaaru.dev-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://kotori.kaisaaru.dev)
[![Version](https://img.shields.io/badge/Version-v1.1.0-6366F1?style=for-the-badge)](package.json)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Dictionary-SQLite_Indexed-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-4F46E5?style=for-the-badge&logo=database&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
[![CI Pipeline](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)

</div>

---

## Overview

Kotoba Reader AI is purpose-built to deliver an authentic Japanese novel (*EPUB*) reading experience. It comes with an integrated Yomitan-style pop-up dictionary, ultra-fast indexed SQLite lookup engine, multi-pass Japanese de-inflector, grammar and Kanji breakdown tools, high-accuracy Japanese Text-to-Speech, and full offline library backup and restore.

---

## Key Features

### 1. Native Japanese EPUB Reader
- **Vertical (縦書き) & Horizontal (横書き) Text**: Authentic Japanese reading modes with smart mouse-scroll conversion and seamless chapter transitions.
- **Authentic Typography**: A curated selection of Japanese fonts (*Noto Serif JP*, *Yu Mincho*, *Hiragino Mincho ProN*, *Noto Sans JP*).
- **Full Customization**: Font size, line height, layout margins, and theme options (*Dark, Light, Sepia*).

### 2. Yomitan-Style Pop-Up Dictionary (*Click & Block Selection*)
- **Auto-Lookup**: Simply click or highlight a word/sentence to open the dictionary pop-up instantly.
- **Smart Docking**: Automatically anchors to the left of the active column in vertical text mode, or directly aligned underneath in horizontal mode.
- **Theme-Adaptive Pop-up**: Dynamically matches the active reader mode (*Dark slate, Clean White, Warm Sepia/Krem*) with auto-hiding custom scrollbars.
- **Multi-Dictionary Integration**: Connects to **JIDict (Indonesian)**, **Jitendex (English)**, **三省堂国語辞典**, and **JLPT Level Badges**.
- **Yomitan AST Parser**: Renders structured dictionary definitions into clean, numbered, readable points.

### 3. High-Performance SQLite & BFS De-inflector Engine
- **Sub-Millisecond Query Latency**: Dictionary data is indexed into a local SQLite database (`node:sqlite`). Database open takes **< 0.5 ms** and single-word lookups execute in **~0.08 ms** without memory bloat or serverless cold starts.
- **Multi-Pass Recursive De-inflection**: BFS search accurately resolves compound conjugations, passive/causative stacks, conditionals, and Light Novel conversational contractions (`〜ちゃう`, `〜ちゃった`, `〜てる`, `〜てた`, `〜とく`).
- **Strict Word Boundary Isolation**: Sentence punctuation stops segmentation immediately, preventing adjacent sentences from leaking into dictionary results.

### 4. High-Precision Text-to-Speech (TTS)
- **Contextual Pronunciation**: Uses the Web Speech API with Japanese-specific context handling (e.g. correctly reading `今日は` as *"Kyou wa"*).
- **Full-Sentence Narration**: Supports audio narration for any selected block of text.

### 5. Full Library Backup & Restore (`.kotori`)
- **Complete Library Portability**: Easily compress and export all novels, covers, chapters, reader settings, and exact reading progress into a portable `.kotori` archive.
- **Precise Scroll Synchronization**: Preserves the exact paragraph and scroll percentage per chapter, letting you resume reading smoothly after restoring.
- **Selective Backup & Restore**: Individual checkboxes allow backing up or restoring only selected novels, with *Select All / Deselect All* controls and memory-efficient chapter streaming.
- **Pre-Restore Inspection & Progress Comparison**: Preview summary stats and compare reading positions (`Local` vs `Backup`) before restoring data to IndexedDB.
- **Security-First Restoration**: Automatically sanitizes every restored chapter with DOMPurify to prevent malicious payload injections.

### 6. Responsive Design & Immersive 3D Effects
- **Adaptive Layout**: A tidy 2-column library view on mobile devices with an overlap-free toolbar.
- **View Transitions API**: Smooth page transitions and a "flying book" effect.
- **3D Preview Modal**: Interactive 3D preview animation (*rotateY* & *scale zoom*) with multi-layered paper stack shadows, live excerpt previews, and dynamic page flipping.

### 7. Privacy & Offline Support
- **Local Storage (IndexedDB)**: All EPUB files and reading progress are stored 100% in the user's local browser. No reading data is sent to external servers.

---

## Getting Started

### Prerequisites
- **Node.js**: v22.0.0 or newer (required for built-in `node:sqlite` and native test runner)
- **Package Manager**: `npm`, `pnpm`, or `yarn`

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/kaisaaru/kotori.git
cd kotori

# 2. Install dependencies
npm install

# 3. Run the development server (automatically prebuilds dictionary cache)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests & Linting

```bash
# Run automated unit test suite (de-inflector, database latency, and security)
npm test

# Run TypeScript typecheck
npx tsc --noEmit

# Run ESLint quality checks
npm run lint

# Production build
npm run build
```

---

## Project Structure

```text
kotori/
├── .github/
│   └── workflows/
│       └── ci.yml            # Automated CI pipeline (typecheck, lint, test, build)
├── public/                   # Static assets (logo, icon, sitemap)
├── scripts/
│   └── build-dict-cache.mjs  # Prebuild script: indexes Yomitan ZIPs into SQLite db
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dictionary/   # SQLite dictionary query API
│   │   │   ├── feedback/     # Rate-limited feedback webhook (Discord/Telegram)
│   │   │   └── translate/    # Rate-limited Gemini AI sentence translation API
│   │   ├── reader/[bookId]/  # Novel reader page (Vertical & Horizontal views)
│   │   ├── globals.css       # Semantic tokens, themes, custom scrollbars, & 3D CSS
│   │   ├── layout.tsx        # Root layout with background services & analytics
│   │   └── page.tsx          # Modular home & library shelf page
│   ├── components/
│   │   ├── home/
│   │   │   ├── BookCard.tsx          # Animated novel shelf/grid card
│   │   │   └── BookPreviewModal.tsx  # Interactive 3D preview & flipping pages modal
│   │   ├── reader/
│   │   │   ├── SelectionPopup.tsx      # Theme-adaptive docked dictionary pop-up
│   │   │   ├── ReaderSettingsPanel.tsx # Reading display & typography options
│   │   │   └── TableOfContents.tsx     # Chapter navigation drawer
│   │   ├── BackupModal.tsx             # Selective backup & restore modal
│   │   ├── DictionaryResults.tsx       # Clean Yomitan-style definition renderer
│   │   └── DictionarySearchModal.tsx   # Standalone theme-adaptive search modal
│   ├── data/
│   │   └── translations.ts   # UI localization dictionaries (ID / EN)
│   ├── lib/
│   │   ├── japanese/
│   │   │   ├── deinflector.ts        # BFS multi-pass Japanese conjugation engine
│   │   │   └── pointer-tokenizer.ts  # Viewport caret & character bounding box detector
│   │   └── reader/
│   │       └── reader-helpers.ts     # Range traversal, text extraction, & scroll utilities
│   ├── services/
│   │   ├── backup-service.ts     # Selective .kotori archive exporter/importer
│   │   ├── book-storage.ts       # IndexedDB persistence for books & progress
│   │   ├── dictionary-db.ts      # Native node:sqlite high-performance query service
│   │   ├── dictionary-service.ts # Client-side cache & API bridge
│   │   └── epub-parser.ts        # Client-side EPUB extractor & DOMPurify sanitizer
│   ├── stores/
│   │   ├── dictionary-store.ts   # Dictionary status state (Zustand)
│   │   └── reader-store.ts       # Reader display & progress state (Zustand)
│   └── types/
│       └── book.ts               # Core domain TypeScript interfaces
├── tests/
│   ├── deinflector.test.ts       # Unit tests for Japanese conjugation engine
│   └── security-and-db.test.ts   # Unit tests for XSS mitigation & SQLite query latency
└── README.md
```

---

## Credits & Acknowledgments

Kotori was built with reference to the following open-source projects:

- **[Yomitan](https://github.com/yomidevs/yomitan)** (GPL-3.0): Kotori follows Yomitan's dictionary schema for compatibility with community dictionaries, with pop-up typography and layout inspired by Yomitan. Kotori's Japanese verb de-inflection engine ([src/lib/japanese/deinflector.ts](src/lib/japanese/deinflector.ts)) is independently derived from standard Godan/Ichidan grammar.
- **[ebook-reader (ttu-ttu)](https://github.com/ttu-ttu/ebook-reader)** (BSD-3-Clause): Conceptually adapted techniques for handling scroll-position sign in vertical writing mode and guard timing when restoring reading position, implemented with independently written code.

Thanks to the maintainers and contributors of both projects.

---

## License

This project is licensed under the [MIT License](LICENSE).
