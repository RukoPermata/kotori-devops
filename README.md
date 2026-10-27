<div align="center">

<img src="public/icon.png" alt="Kotori Logo" width="100" />

# Kotoba Reader AI

**Kotoba Reader AI** (Kotori): An All-in-One, Fast, and Immersive Platform for Reading Japanese Light Novels & Web Novels.

<a href="https://kotori.kaisaaru.dev" target="_blank" rel="noopener noreferrer"><strong>Official Domain: kotori.kaisaaru.dev</strong></a>

[![Official Domain](https://img.shields.io/badge/Official_Domain-kotori.kaisaaru.dev-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://kotori.kaisaaru.dev)
[![Version](https://img.shields.io/badge/Version-v1.2.0-6366F1?style=for-the-badge)](package.json)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Dictionary-SQLite_Indexed-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-4F46E5?style=for-the-badge&logo=database&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
[![PWA](https://img.shields.io/badge/PWA-Standalone_Ready-10B981?style=for-the-badge&logo=pwa&logoColor=white)](src/app/manifest.ts)
[![CI Pipeline](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)
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

### 4. High-Precision Text-to-Speech (TTS) & Audio Player
- **Intelligent Japanese Voice Selection**: Automatically discovers and prioritizes native `ja-JP` / Japanese voices installed in the OS or browser.
- **Chromium V8 Engine Fix**: Employs persistent component refs (`activeUtteranceRef`) and resume watchers to prevent Chromium/Brave from garbage-collecting speech audio mid-playback.
- **Natural Text Sanitization**: Cleans Japanese quotation brackets (`『』`, `「」`, `【】`, `《》`) and inline furigana markup so dialogue and narration read fluently without spelling punctuation marks.
- **Integrated Audio Fallback Player (`/api/tts`)**: Seamlessly falls back to an internal online Japanese audio player if running on Linux or privacy-hardened browsers (like Brave) where native Japanese voice packages are absent.

### 5. Progressive Web App (PWA) & 1-Click Offline Dictionary
- **Standalone Installation**: Install Kotori directly to your Home Screen on Android, iOS, or Desktop as a standalone application without browser URL address bars.
- **1-Click Offline Dictionary Pack (Airplane Mode)**: Download an essential offline dictionary bundle (15,000 high-frequency terms with JPDB ranks + all 10,384 kanji) into local IndexedDB. Word lookup and verb de-inflection work 100% offline.
- **Service Worker Caching**: Employs an offline caching strategy with automatic local development bypass for smooth HMR.
- **Real-Time Network Status Indicator**: Floating banner instantly alerts when switching between online and offline modes.
### 6. Full Library Backup & Restore (`.kotori`)
- **Complete Library Portability**: Easily compress and export all novels, covers, chapters, reader settings, and exact reading progress into a portable `.kotori` archive.
- **Precise Scroll Synchronization**: Preserves the exact paragraph and scroll percentage per chapter, letting you resume reading smoothly after restoring.
- **Selective Backup & Restore**: Individual checkboxes allow backing up or restoring only selected novels, with *Select All / Deselect All* controls and memory-efficient chapter streaming.
- **Pre-Restore Inspection & Progress Comparison**: Preview summary stats and compare reading positions (`Local` vs `Backup`) before restoring data to IndexedDB.
- **Security-First Restoration**: Automatically sanitizes every restored chapter with DOMPurify to prevent malicious payload injections.

### 7. Responsive Design & Immersive 3D Effects
- **Adaptive Layout**: A tidy 2-column library view on mobile devices with an overlap-free toolbar.
- **View Transitions API**: Smooth page transitions and a "flying book" effect.
- **3D Preview Modal**: Interactive 3D preview animation (*rotateY* & *scale zoom*) with multi-layered paper stack shadows, live excerpt previews, and dynamic page flipping.

### 8. Security Hardening & Anti-Abuse Protections
- **Anti-Spam & Anti-Bot Feedback**: Strict 45-second burst cooldown, 2 submissions per 5 minutes limit, invisible honeypot field, time-to-submit verification, and `@everyone` mention sanitization on Discord webhooks.
- **Memory-Leak Elimination**: All rate limiters feature automated TTL pruning to prevent unbounded RAM growth on long-running servers.
- **EPUB Zip Bomb Protection**: Enforces safe decompression thresholds (max 250 MB uncompressed and max 2,000 files) to protect client memory from malicious archives.
- **Standard HTTP Security Headers**: Configured with `X-Frame-Options: SAMEORIGIN` (anti-clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and strict `Permissions-Policy`.
- **100% Client-Side Privacy (IndexedDB)**: All EPUB books, reading history, and offline caches reside purely in the user's browser without telemetry or tracking.

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
│   │   │   ├── dictionary/   # SQLite dictionary query & offline pack APIs
│   │   │   ├── feedback/     # Anti-spam rate-limited feedback webhook (Discord/Telegram)
│   │   │   ├── translate/    # Origin-verified Gemini AI translation API
│   │   │   └── tts/          # Rate-limited Japanese TTS audio streaming proxy
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
│   │   │   ├── ReaderSettingsPanel.tsx # Reading display, offline pack, & typography drawer
│   │   │   └── TableOfContents.tsx     # Chapter navigation drawer
│   │   ├── BackupModal.tsx             # Selective backup & restore modal
│   │   ├── DictionaryResults.tsx       # Clean Yomitan-style definition & TTS renderer
│   │   ├── DictionarySearchModal.tsx   # Standalone theme-adaptive search modal
│   │   ├── FeedbackModal.tsx           # Anti-bot feedback modal with countdown timer
│   │   ├── InstallPromptButton.tsx     # 1-click PWA standalone install button
│   │   └── NetworkStatusBanner.tsx     # Real-time online/offline connection banner
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

Kotori is an independent open-source project built with reference to and inspiration from the following projects and linguistic resources:

### Open-Source Implementations & Architecture
- **[Yomitan](https://github.com/yomidevs/yomitan)** (GPL-3.0): Inspired Kotori's pop-up dictionary UX design and schema interoperability with community dictionary formats. Kotori's codebase—including its Japanese verb de-inflection engine ([src/lib/japanese/deinflector.ts](src/lib/japanese/deinflector.ts)), DOM range traversal, and IndexedDB storage—is an original, independent implementation written from scratch under the MIT License.
- **[ebook-reader (ttu-ttu)](https://github.com/ttu-ttu/ebook-reader)** (BSD-3-Clause): Provided conceptual reference for handling vertical writing mode scroll mathematics and reading position synchronization.

### Dictionary Data & Linguistic Resources
Kotori integrates linguistic datasets conforming to their respective open community licenses:
- **[JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) & [KANJIDIC](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project)**: This application uses the JMdict and KANJIDIC dictionary files. These files are the property of the **Electronic Dictionary Research and Development Group (EDRDG)**, and are used in conformance with the Group's [licence](https://www.edrdg.org/edrdg/licence.html) (CC BY-SA 3.0 / 4.0).
- **[Jitendex](https://jitendex.org/)**: Open-source English-Japanese dictionary format derived from JMdict, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- **[JIDict](https://github.com/JIDict)**: Open community Indonesian-Japanese dictionary data curated for Indonesian Japanese learners.
- **[JPDB.io](https://jpdb.io/)**: Word frequency ranking data referenced under fair educational non-commercial terms.

---

## Disclaimer

- **No Copyrighted Content Hosted**: Kotori does not host, provide, or distribute any copyrighted Japanese light novels, books, or texts. All EPUB files are uploaded directly by individual users and stored 100% locally within their own browser's private IndexedDB storage.
- **Educational & Non-Commercial**: Kotori is provided as a free, open-source educational platform for personal Japanese language learning under the MIT License.
---

## License

This project is licensed under the [MIT License](LICENSE).
