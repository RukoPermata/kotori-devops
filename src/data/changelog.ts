export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    id: string[];
    en: string[];
  };
}

// Newest first. Add a new entry at the top when you ship something worth telling users about -
// CURRENT_VERSION below always follows automatically.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.2.0",
    date: "2026-10-28",
    changes: {
      id: [
        "- Dukungan PWA Standalone & Mode Offline: aplikasi kini dapat diinstal langsung ke homescreen HP dan Desktop tanpa bilah browser, dilengkapi banner status koneksi otomatis dan service worker caching.",
        "- Paket Kamus Offline 1-Klik (Mode Pesawat): fitur unduh leksikon esensial (15.000 kosakata terpopuler + 10.384 kanji) ke IndexedDB lokal untuk pencarian kata dan dekonjugasi 100% offline.",
        "- Penyempurnaan Mesin Audio TTS: pemilihan suara Jepang otomatis, penanganan antrean audio macet (V8 GC fix), sanitasi tanda baca kutipan 『』, dan integrasi fallback audio player internal /api/tts untuk lingkungan Linux & Brave.",
        "- Proteksi Keamanan Anti-Spam & Anti-Bot: implementasi honeypot field, validasi durasi ketik time-to-submit pada form feedback, sanitasi mention massal @everyone, dan auto-pruning TTL eliminasi kebocoran memori pada rate limiter.",
        "- Peningkatan Keamanan Parsing EPUB: perlindungan terhadap arsip berbahaya (Zip Bomb protection) dengan batas akumulasi dekompresi aman 250 MB.",
        "- Penyempurnaan UI & Security Headers: migrasi alert upload EPUB ke notifikasi toast UI non-blocking, penyelesaian dependency hooks reader, dan penambahan standard HTTP security headers.",
      ],
      en: [
        "- Standalone PWA & Offline Support: Kotori can now be installed directly to home screens on mobile and desktop, equipped with connection status detection and service worker caching.",
        "- 1-Click Offline Dictionary Pack: download essential lexicons (15,000 common terms + 10,384 kanji) into local IndexedDB for seamless airplane-mode reading and offline de-inflection.",
        "- TTS Audio Engine Overhaul: automatic Japanese voice selection, V8 garbage collection stalling fix, quote bracket sanitation, and integrated internal /api/tts audio fallback player for Linux & Brave.",
        "- Anti-Bot & Anti-Spam Hardening: implemented invisible honeypot, time-to-submit timing verification on feedback, @everyone mention sanitation, and TTL auto-pruning to prevent rate-limiter memory leaks.",
        "- EPUB Safety & Zip Bomb Protection: enforced decompression size limits (up to 250 MB safe threshold) to prevent browser memory exhaustion from malicious archives.",
        "- UI Refinements & Security Headers: migrated upload alerts to elegant toast notifications, resolved reader dependency hooks, and configured standard HTTP security headers.",
      ],
    },
  },
  {
    version: "1.1.0",
    date: "2026-10-22",
    changes: {
      id: [
        "- Database Kamus SQLite Sub-milidetik: migrasi sistem kamus ke SQLite terindeks (node:sqlite) dengan latensi query ~0.08ms, mengeliminasi lag cold start Vercel dan menghemat 99% memori RAM.",
        "- Multi-Pass BFS De-inflector: penguraian konjugasi bertingkat, bentuk pasif/kausatif ganda, kondisional, dan kontraksi santai Light Novel (〜ちゃう, 〜ちゃった, 〜てる, 〜てた, 〜とく).",
        "- Peningkatan Keamanan Kritis: penutupan celah Stored XSS pada parser EPUB dan fitur restore backup melalui sanitasi ketat DOMPurify, serta proteksi rate limiting pada API publik.",
        "- Pop-up Kamus Adaptif Tema: tampilan kamus otomatis menyesuaikan tema pembaca (Dark, Light/Putih, Sepia/Krem) dengan kontras tinggi, auto-hide scrollbar, dan docking posisi presisi (vertikal di kiri kolom, horizontal tepat di bawah kata).",
        "- Perbaikan Bug Segmentasi & UI: mencegah kata dari kalimat berikutnya menyusup ke kamus, menyederhanakan badge kamus ala Yomitan, dan merapikan layout pratinjau buku 3D.",
        "- Pipeline CI/CD & Automated Tests: integrasi GitHub Actions untuk typecheck, linting ESLint 9 Flat Config, dan test suite otomatis bawaan Node.js 22.",
      ],
      en: [
        "- Sub-Millisecond SQLite Dictionary: migrated lookup engine to native indexed SQLite (node:sqlite) with ~0.08ms query latency, completely eliminating Vercel cold starts and saving 99% RAM.",
        "- Multi-Pass BFS De-inflector: accurate resolution for multi-step conjugations, passive/causative stacks, conditionals, and Light Novel colloquial contractions (〜chau, 〜chatta, 〜teru, 〜teta, 〜toku).",
        "- Critical Security Hardening: eliminated Stored XSS vectors in EPUB parsing and backup restoration via strict DOMPurify enforcement, plus rate limiting on public APIs.",
        "- Theme-Adaptive Dictionary Pop-up: pop-up seamlessly matches the active reader theme (Dark, Clean White, Warm Sepia) with high contrast, auto-hide custom scrollbars, and smart docking.",
        "- Segmentation & UI Polish: prevented sentence bleed-through into dictionary results, simplified Yomitan-style dictionary tags, and refined 3D book preview layout.",
        "- CI/CD Pipeline & Automated Testing: integrated GitHub Actions workflow running TypeScript checks, ESLint 9 Flat Config, and native Node.js 22 automated test suites.",
      ],
    },
  },
  {
    version: "1.0.0",
    date: "2026-10-15",
    changes: {
      id: [
        "- Fitur Penuh Cadangkan & Pulihkan (Full Backup & Restore): amankan seluruh perpustakaan, bab, cover, posisi scroll bacaan presisi, dan pengaturan ke file kompresi .kotori.",
        "- Pemilihan Novel Selektif: centang buku tertentu yang ingin dicadangkan atau dipulihkan dengan tombol Pilih Semua / Batal Pilih.",
        "- Perbandingan Progres Cerdas: pratinjau detail posisi bab & persentase bacaan antara perpustakaan lokal dan data cadangan sebelum pemulihan.",
        "- Proteksi Progres Lokal: opsi cerdas untuk mempertahankan progres bacaan lokal yang posisinya lebih maju agar tidak tertimpa cadangan lama.",
        "- Pengumuman Migrasi Domain: info resmi perpindahan domain ke kotori.kaisaaru.dev dengan tautan langsung.",
        "- Penyempurnaan UI/UX: ikon SVG modern menggantikan emoji mentah, checkbox kustom selaras tema, dan perbaikan tampilan responsif di layar mobile.",
      ],
      en: [
        "- Full Backup & Restore: safeguard your entire library, chapters, covers, exact reading scroll positions, and settings into a compressed .kotori archive.",
        "- Selective Novel Backup/Restore: easily choose specific novels with individual checkboxes and Select All / Deselect All controls.",
        "- Smart Progress Comparison: preview detailed chapter and percentage comparisons between your local library and backup data before restoring.",
        "- Local Progress Safeguard: smart option to keep local reading progress if currently further ahead, preventing older backups from rolling it back.",
        "- Domain Migration Notice: official notice for the move to kotori.kaisaaru.dev with direct links.",
        "- UI/UX Refinements: clean modern SVG icons replacing raw emojis, custom themed checkboxes, and improved mobile responsive layouts.",
      ],
    },
  },
  {
    version: "0.4.2",
    date: "2026-09-13",
    changes: {
      id: [
        "- Fitur Kunci Navigasi Bab: tombol di header reader & opsi pengaturan untuk mencegah perpindahan bab tidak sengaja saat membaca di layar sentuh mobile.",
        "- Tombol navigasi bab samping otomatis disembunyikan dan tombol navigasi bilah bawah dinonaktifkan saat mode kunci aktif.",
        "- Menghapus tombol manual bookmark dari header karena progres bacaan tersimpan secara otomatis dan instan.",
        "- Posisi notifikasi toast dipindahkan ke pojok kanan atas dengan fitur jeda timer saat kursor diarahkan ke atasnya (pause on hover).",
        "- Perbaikan bilah pencarian mobile agar responsif dan memenuhi lebar layar.",
      ],
      en: [
        "- Chapter Navigation Lock: quick header button & settings toggle to prevent accidental chapter turns while reading on mobile touchscreens.",
        "- Floating side chevron buttons are automatically hidden and bottom bar buttons disabled when navigation is locked.",
        "- Removed redundant manual bookmark button from header in favor of real-time automatic progress saving.",
        "- Moved toast notifications to the top-right corner with pause-on-hover timer interaction.",
        "- Fixed mobile search bar responsiveness to comfortably span 100% width on phone screens.",
      ],
    },
  },
  {
    version: "0.4.1",
    date: "2026-09-07",
    changes: {
      id: [
        "- Pengecekan otomatis novel non-Jepang saat memilih/mengunggah file EPUB dengan dialog konfirmasi.",
        "- Tombol kamus dan fitur pencarian kata otomatis dinonaktifkan saat membuka novel yang bukan berbahasa Jepang.",
        "- Perbaikan tata letak & responsivitas header: mencegah teks subtitle logo terlipat menjadi 2 baris serta penyesuaian tombol adaptif pada layar laptop dan tablet.",
      ],
      en: [
        "- Automatic non-Japanese novel detection when uploading EPUB files with confirmation modal prompt.",
        "- Dictionary toggle button and word lookup features are automatically disabled when reading non-Japanese novels.",
        "- Improved header layout & responsiveness: prevented logo subtitle from wrapping into 2 lines and made header controls adapt seamlessly on laptop and tablet screens.",
      ],
    },
  },
  {
    version: "0.4.0",
    date: "2026-09-07",
    changes: {
      id: [
        "- Perbaikan gestur layar sentuh mobile: menggulir (scroll) halaman kini mulus tanpa sengaja memicu terbukanya kamus.",
        "- Tombol pintas di topbar reader untuk mengaktifkan atau menonaktifkan kamus bawaan dalam 1 klik (cocok bagi pengguna ekstensi Yomitan sendiri).",
        "- Deteksi otomatis ekstensi browser Yomitan dengan prompt konfirmasi untuk mencegah bentrok dua popup kamus.",
        "- Perbaikan posisi popup kamus: selalu berada 100% di dalam layar dan secara cerdas memilih posisi terbaik saat kata terpotong antar-kolom/baris.",
        "- Judul tab browser kini dinamis menampilkan judul buku yang sedang dibaca (misal: 'Baca [Judul Buku] | Kotori').",
      ],
      en: [
        "- Mobile touch gesture fix: scrolling through pages is now smooth without accidentally triggering dictionary popups.",
        "- Quick toggle button in reader topbar to enable or disable the built-in dictionary in 1 click (ideal for external Yomitan extension users).",
        "- Automatic Yomitan browser extension detection with confirmation prompt to prevent double popup conflicts.",
        "- Fixed dictionary popup positioning: always 100% visible on-screen and smartly docks to the best anchor when words wrap across columns or lines.",
        "- Dynamic browser tab title now displays the book currently being read (e.g. 'Read [Book Title] | Kotori').",
      ],
    },
  },
  {
    version: "0.3.0",
    date: "2026-08-26",
    changes: {
      id: [
        "- Tambah halaman Change Log agar Anda bisa lihat riwayat versi & pembaruan.",
        "- Tombol Cari Kamus dipindah jadi tombol melayang di kanan bawah (muncul di halaman utama & saat membaca) supaya lebih mudah dijangkau.",
      ],
      en: [
        "- Added a Change Log page so you can see version history and updates.",
        "- Moved the dictionary search button to a floating button in the bottom-right corner (on both the home page and while reading) for easier access.",
      ],
    },
  },
  {
    version: "0.2.0",
    date: "2026-08-26",
    changes: {
      id: [
        "- Tambah pencarian kamus langsung - ketik kata bahasa Jepang tanpa perlu buka buku dulu.",
        "- Hasil kamus sekarang lebih lengkap: contoh kalimat, bentuk kata lain, peringkat frekuensi, dan aksen nada per kata.",
        "- Data kanji diperluas dari 11 menjadi lebih dari 10.000 karakter (KANJIDIC).",
        "- Perbaikan aksesibilitas: semua tombol kini punya label yang bisa dibaca pembaca layar.",
        "- Peningkatan performa: waktu muat halaman lebih cepat dan lebih ringan di perangkat mobile.",
      ],
      en: [
        "- Added standalone dictionary search - type a Japanese word without opening a book first.",
        "- Dictionary results are now richer: example sentences, alternate word forms, frequency ranking, and pitch accent per word.",
        "- Kanji data expanded from 11 to over 10,000 characters (KANJIDIC).",
        "- Accessibility fixes: every button now has a label screen readers can announce.",
        "- Performance improvements: faster page loads and a lighter footprint on mobile devices.",
      ],
    },
  },
  {
    version: "0.1.0",
    date: "2026-08-21",
    changes: {
      id: [
        "- Rilis awal Kotori: pembaca EPUB dengan kamus bawaan, furigana, dan pembedah kata otomatis.",
      ],
      en: [
        "- Initial release of Kotori: an EPUB reader with a built-in dictionary, furigana, and automatic word segmentation.",
      ],
    },
  },
];

export const CURRENT_VERSION = CHANGELOG[0].version;
