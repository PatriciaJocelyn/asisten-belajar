/**
 * Asisten Belajar Offline & Lokal
 * Architecture: 100% Client-Side Single Page Application
 * Modules:
 * 1. Storage & State Management (LocalStorage & in-memory)
 * 2. Document Upload & File Handling (FileReader API + Drag and Drop)
 * 3. Text Viewer & Markdown/Plain-Text Parser
 * 4. Offline Mock AI Engine (Keyword Search, Ranking, Context Extraction & Typing Stream)
 * 5. Flashcards Engine (Automated Point Extractor, Navigation, 3D Flip)
 * 6. Dynamic Quiz Generator (5 Questions, Exactly 5 Options A-E, Score Calculation & Instant Color Feedback)
 */

(() => {
  'use strict';

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  const STORAGE_KEY_DOCS = 'asisten_belajar_docs_v1';
  const STORAGE_KEY_ACTIVE_ID = 'asisten_belajar_active_doc_id';

  const AppState = {
    documents: [],
    activeDocumentId: null,
    flashcards: [],
    currentCardIndex: 0,
    quizQuestions: [],
    isStreamingResponse: false,
  };

  // Sample document to preload if empty
  const SAMPLE_DOCUMENT = {
    id: 'sample-doc-biologi-01',
    name: 'biologi_sel_bab1.txt',
    size: 14200,
    uploadedAt: new Date().toISOString(),
    content: `BAB I: PENGENALAN STRUKTUR DAN FUNGSI SEL

Sel merupakan unit struktural dan fungsional terkecil dari makhluk hidup. Seluruh organisme hidup, mulai dari bakteri uniseluler bersel tunggal hingga mamalia kompleks tersusun atas sel. Teori sel pertama kali dikemukakan oleh Robert Hooke pada tahun 1665 yang mengamati sayatan jaringan gabus di bawah mikroskop sederhana.

1. Organel-organel Utama pada Sel Eukariotik:
- Nukleus (Inti Sel): Mengandung materi genetik berupa DNA (asam deoksiribonukleat) yang mengendalikan seluruh aktivitas metabolisme, sintesis protein, serta pewarisan sifat.
- Mitokondria: Sering dijuluki sebagai "the powerhouse of the cell". Mitokondria berfungsi sebagai tempat berlangsungnya respirasi seluler aerobik untuk memproduksi energi dalam bentuk ATP (adenosin trifosfat).
- Ribosom: Struktur tanpa membran sel yang berfungsi merakit asam amino menjadi rantai polipeptida atau sintesis protein primer.
- Retikulum Endoplasma (RE): Terbagi menjadi RE Kasar yang ditempeli ribosom untuk pengangkutan protein dan RE Halus untuk sintesis lipid serta detoksifikasi racun.
- Badan Golgi (Kompleks Golgi): Berperan dalam modifikasi kimiawi, penyortiran, dan pengemasan protein serta makromolekul sebelum disekresikan ke luar sel atau ke organel lain.
- Lisosom: Berisi enzim hidrolitik asam untuk pencernaan intraseluler zat asing, autofagi, dan perombakan organel rusak.

2. Perbedaan Sel Tumbuhan dan Sel Hewan:
- Sel Tumbuhan: Memiliki dinding sel kaku berbahan selulosa, kloroplas yang mengandung klorofil untuk fotosintesis, serta vakuola sentral berukuran besar penyimpan cadangan air.
- Sel Hewan: Tidak memiliki dinding sel kaku dan plastida/kloroplas, namun memiliki sentrosom dengan sentriol yang aktif saat proses pembelahan sel (mitosis/meiosis).

3. Membran Plasma dan Transpor Zat:
Membran sel tersusun atas lapisan ganda fosfolipid (phospholipid bilayer) yang bersifat semi-permeabel atau selektif permeabel. Mekanisme transpor pasif seperti difusi dan osmosis berlangsung tanpa membutuhkan energi ATP, sedangkan transpor aktif seperti pompa natrium-kalium membutuhkan hidrolisis ATP untuk memindahkan molekul melawan gradien konsentrasi.`
  };

  // =========================================================================
  // DOM ELEMENT SELECTORS
  // =========================================================================
  const DOM = {
    // Top Bar
    headerActiveDoc: document.getElementById('header-active-doc'),
    
    // Tab Navigation
    tabBtns: {
      upload: document.getElementById('tab-btn-upload'),
      viewer: document.getElementById('tab-btn-viewer'),
      flashcards: document.getElementById('tab-btn-flashcards'),
      quiz: document.getElementById('tab-btn-quiz'),
    },
    tabContents: {
      upload: document.getElementById('content-tab-upload'),
      viewer: document.getElementById('content-tab-viewer'),
      flashcards: document.getElementById('content-tab-flashcards'),
      quiz: document.getElementById('content-tab-quiz'),
    },
    flashcardBadgeCount: document.getElementById('flashcard-badge-count'),

    // Tab 1: Upload
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    btnLoadSample: document.getElementById('btn-load-sample'),
    documentListContainer: document.getElementById('document-list-container'),
    docCountBadge: document.getElementById('doc-count-badge'),

    // Tab 2: Viewer
    viewerTitle: document.getElementById('viewer-title'),
    viewerContent: document.getElementById('viewer-content'),
    btnCopyViewerText: document.getElementById('btn-copy-viewer-text'),
    btnCopyLabel: document.getElementById('btn-copy-label'),

    // Tab 3: Flashcards
    flashcardsEmptyState: document.getElementById('flashcards-empty-state'),
    flashcardViewWrapper: document.getElementById('flashcard-view-wrapper'),
    flashcardContainer: document.getElementById('flashcard-container'),
    flashcardInner: document.getElementById('flashcard-inner'),
    cardFrontText: document.getElementById('card-front-text'),
    cardBackTitle: document.getElementById('card-back-title'),
    cardBackDetail: document.getElementById('card-back-detail'),
    flashcardCounter: document.getElementById('flashcard-counter'),
    btnPrevCard: document.getElementById('btn-prev-card'),
    btnNextCard: document.getElementById('btn-next-card'),
    btnManualFlip: document.getElementById('btn-manual-flip'),

    // Tab 4: Quiz
    quizEmptyState: document.getElementById('quiz-empty-state'),
    quizForm: document.getElementById('quiz-form'),
    quizQuestionsContainer: document.getElementById('quiz-questions-container'),
    quizResultFeedback: document.getElementById('quiz-result-feedback'),
    btnRegenerateQuiz: document.getElementById('btn-regenerate-quiz'),

    // Chatbot Panel
    chatMessages: document.getElementById('chat-messages'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    btnClearChat: document.getElementById('btn-clear-chat'),
    quickChips: document.querySelectorAll('.quick-chip'),
  };

  // =========================================================================
  // STORAGE & INITIALIZATION
  // =========================================================================
  function initStorage() {
    try {
      const savedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
      if (savedDocs) {
        AppState.documents = JSON.parse(savedDocs);
      } else {
        // Preload sample doc
        AppState.documents = [SAMPLE_DOCUMENT];
        saveDocumentsToStorage();
      }

      const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      if (activeId && AppState.documents.some(d => d.id === activeId)) {
        AppState.activeDocumentId = activeId;
      } else if (AppState.documents.length > 0) {
        AppState.activeDocumentId = AppState.documents[0].id;
      }
    } catch (e) {
      console.warn('Storage error:', e);
      AppState.documents = [SAMPLE_DOCUMENT];
      AppState.activeDocumentId = SAMPLE_DOCUMENT.id;
    }
  }

  function saveDocumentsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(AppState.documents));
      if (AppState.activeDocumentId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, AppState.activeDocumentId);
      }
    } catch (err) {
      console.error('Gagal menyimpan ke LocalStorage:', err);
    }
  }

  function getActiveDocument() {
    return AppState.documents.find(doc => doc.id === AppState.activeDocumentId) || null;
  }

  // =========================================================================
  // TAB NAVIGATION
  // =========================================================================
  function switchTab(targetKey) {
    Object.keys(DOM.tabBtns).forEach(key => {
      const btn = DOM.tabBtns[key];
      const content = DOM.tabContents[key];
      if (key === targetKey) {
        btn?.classList.add('active');
        content?.classList.remove('hidden');
      } else {
        btn?.classList.remove('active');
        content?.classList.add('hidden');
      }
    });
  }

  function initTabListeners() {
    Object.keys(DOM.tabBtns).forEach(key => {
      DOM.tabBtns[key]?.addEventListener('click', () => switchTab(key));
    });
  }

  // =========================================================================
  // TAB 1 & 2: DOCUMENT MANAGEMENT & VIEWER
  // =========================================================================
  function renderDocumentList() {
    const list = DOM.documentListContainer;
    if (!list) return;

    list.innerHTML = '';
    const docs = AppState.documents;
    if (DOM.docCountBadge) DOM.docCountBadge.textContent = `${docs.length} File`;

    if (docs.length === 0) {
      list.innerHTML = `
        <div class="text-xs text-slate-500 text-center py-6 border border-dashed border-surface-800 rounded-xl">
          Belum ada dokumen yang diunggah.
        </div>
      `;
      return;
    }

    docs.forEach(doc => {
      const isActive = doc.id === AppState.activeDocumentId;
      const isMd = doc.name.endsWith('.md');
      const sizeKB = (doc.size / 1024).toFixed(1);

      const item = document.createElement('div');
      item.className = `p-3.5 rounded-xl border flex items-center justify-between group transition-all ${
        isActive 
          ? 'bg-surface-900/90 border-brand-500/50 shadow-sm shadow-brand-500/10' 
          : 'bg-surface-900/40 border-surface-800 hover:border-surface-700'
      }`;

      item.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-lg ${isMd ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-500/10 text-brand-400'} flex items-center justify-center font-mono font-bold text-xs shrink-0">
            ${isMd ? 'MD' : 'TXT'}
          </div>
          <div class="truncate">
            <h4 class="text-sm font-semibold text-white truncate flex items-center gap-2">
              <span class="truncate">${escapeHtml(doc.name)}</span>
              ${isActive ? '<span class="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded font-normal">Aktif</span>' : ''}
            </h4>
            <p class="text-[11px] text-slate-400 mt-0.5 font-mono">${sizeKB} KB &bull; ${new Date(doc.uploadedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0 ml-2">
          <button data-action="select" class="px-2.5 py-1.5 text-xs ${isActive ? 'bg-brand-600 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-surface-800'} rounded-lg transition-colors">
            ${isActive ? 'Sedang Dibaca' : 'Buka'}
          </button>
          <button data-action="delete" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Hapus dokumen">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      `;

      item.querySelector('[data-action="select"]')?.addEventListener('click', () => {
        setActiveDocument(doc.id, true);
      });

      item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteDocument(doc.id);
      });

      list.appendChild(item);
    });
  }

  function setActiveDocument(docId, shouldSwitchToViewer = false) {
    AppState.activeDocumentId = docId;
    saveDocumentsToStorage();
    renderDocumentList();
    renderViewer();
    generateFlashcardsFromActiveDoc();
    generateQuizFromActiveDoc();

    const doc = getActiveDocument();
    if (DOM.headerActiveDoc) {
      DOM.headerActiveDoc.textContent = doc ? doc.name : 'Belum Ada Dokumen';
    }

    if (shouldSwitchToViewer) {
      switchTab('viewer');
    }
  }

  function deleteDocument(docId) {
    AppState.documents = AppState.documents.filter(d => d.id !== docId);
    if (AppState.activeDocumentId === docId) {
      AppState.activeDocumentId = AppState.documents.length > 0 ? AppState.documents[0].id : null;
    }
    saveDocumentsToStorage();
    renderDocumentList();
    renderViewer();
    generateFlashcardsFromActiveDoc();
    generateQuizFromActiveDoc();

    const doc = getActiveDocument();
    if (DOM.headerActiveDoc) {
      DOM.headerActiveDoc.textContent = doc ? doc.name : 'Belum Ada Dokumen';
    }
  }

  function renderViewer() {
    const doc = getActiveDocument();
    if (!doc) {
      if (DOM.viewerTitle) DOM.viewerTitle.textContent = 'Belum Ada Materi Aktif';
      if (DOM.viewerContent) {
        DOM.viewerContent.innerHTML = `
          <div class="text-center py-16 text-slate-500 text-xs">
            Belum ada file dokumen yang aktif. Silakan pilih atau unggah dokumen pada tab <b>Upload File</b>.
          </div>
        `;
      }
      return;
    }

    if (DOM.viewerTitle) DOM.viewerTitle.textContent = doc.name;
    if (DOM.viewerContent) {
      DOM.viewerContent.innerHTML = formatDocumentToHtml(doc.content);
    }
  }

  function formatDocumentToHtml(text) {
    if (!text) return '<p class="text-slate-500">Dokumen kosong.</p>';

    // Simple markdown-friendly formatter
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    lines.forEach(rawLine => {
      const line = rawLine.trim();

      if (line.startsWith('# ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h2 class="text-lg font-bold text-white border-b border-surface-800 pb-2 mt-4 mb-2">${escapeHtml(line.slice(2))}</h2>`;
      } else if (line.startsWith('## ') || line.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3 class="text-base font-semibold text-brand-300 mt-3 mb-1">${escapeHtml(line.replace(/^#+\s*/, ''))}</h3>`;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) { html += '<ul class="list-disc pl-5 space-y-1.5 text-slate-300">'; inList = true; }
        const itemText = line.slice(2);
        // Highlight key terms before colon
        const parts = itemText.split(':');
        if (parts.length > 1) {
          html += `<li><strong class="text-white">${escapeHtml(parts[0])}:</strong> ${escapeHtml(parts.slice(1).join(':'))}</li>`;
        } else {
          html += `<li>${escapeHtml(itemText)}</li>`;
        }
      } else if (line === '') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<div class="h-2"></div>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p class="leading-relaxed text-slate-300 mb-2">${escapeHtml(line)}</p>`;
      }
    });

    if (inList) html += '</ul>';
    return html;
  }

  async function extractTextFromPdf(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();

      if (window.pdfjsLib && window.pdfjsLib.getDocument) {
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        let fullText = '';

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageStrings = textContent.items.map(item => item.str).join(' ');
          if (pageStrings.trim().length > 0) {
            fullText += `\n\n--- [Halaman ${pageNum}] ---\n` + pageStrings;
          }
        }

        if (fullText.trim().length > 30) return fullText.trim();
      }

      const uint8Array = new Uint8Array(arrayBuffer);
      const decoder = new TextDecoder('utf-8');
      const rawString = decoder.decode(uint8Array);
      const textBlocks = [];
      const textMatches = rawString.match(/\(([^()]{2,})\)\s*T[jJ]/g) || rawString.match(/\[([^\[\]]{3,})\]\s*TJ/g);

      if (textMatches && textMatches.length > 0) {
        textMatches.forEach(match => {
          const clean = match.replace(/^[(\[]|[)\]]\s*T[jJ]$/g, '').replace(/\\([()\\])/g, '$1').trim();
          if (clean.length > 2) textBlocks.push(clean);
        });
        const parsed = textBlocks.join(' ');
        if (parsed.length > 50) return parsed;
      }

      return `DOKUMEN PDF: ${file.name}\n\nFile PDF telah diunggah ke memori lokal.`;
    } catch (err) {
      console.warn('Gagal membaca PDF:', err);
      return `DOKUMEN PDF: ${file.name}\n\nKendala saat membaca stream PDF.`;
    }
  }

  async function handleMultipleUploadedFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    const validFiles = Array.from(fileList).filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.pdf');
    });

    if (validFiles.length === 0) {
      alert('Mohon pilih file berformat .pdf, .txt, atau .md');
      return;
    }

    const hasPdf = validFiles.some(f => f.name.toLowerCase().endsWith('.pdf'));
    if (hasPdf) {
      addChatMessage({
        sender: 'ai',
        text: `Sedang mengekstraksi teks dokumen PDF secara lokal...`,
        reference: null
      });
    }

    const newlyAddedDocs = [];

    for (const file of validFiles) {
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      let content = '';

      if (isPdf) {
        content = await extractTextFromPdf(file);
      } else {
        content = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsText(file);
        });
      }

      newlyAddedDocs.push({
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        content: content
      });
    }

    AppState.documents = [...newlyAddedDocs, ...AppState.documents];
    setActiveDocument(newlyAddedDocs[0].id, true);

    const fileNamesList = newlyAddedDocs.map(d => `<b>${escapeHtml(d.name)}</b>`).join(', ');
    addChatMessage({
      sender: 'ai',
      text: newlyAddedDocs.length === 1
        ? `Dokumen ${fileNamesList} berhasil diekstraksi dan siap dipelajari!`
        : `Berhasil mengunggah dan mengekstraksi <b>${newlyAddedDocs.length} file dokumen</b> (${fileNamesList}). Dokumen <b>${escapeHtml(newlyAddedDocs[0].name)}</b> sekarang aktif!`,
      reference: null
    });
  }

  function initUploadHandlers() {
    const dropzone = DOM.dropzone;
    const fileInput = DOM.fileInput;

    if (!dropzone || !fileInput) return;

    fileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) handleMultipleUploadedFiles(files);
      fileInput.value = '';
    });

    // Drag and Drop listeners
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) handleMultipleUploadedFiles(dt.files);
    });

    // Load sample button
    DOM.btnLoadSample?.addEventListener('click', () => {
      if (!AppState.documents.some(d => d.id === SAMPLE_DOCUMENT.id)) {
        AppState.documents.unshift(SAMPLE_DOCUMENT);
      }
      setActiveDocument(SAMPLE_DOCUMENT.id, true);
    });

    // Copy viewer content
    DOM.btnCopyViewerText?.addEventListener('click', () => {
      const doc = getActiveDocument();
      if (!doc) return;

      navigator.clipboard.writeText(doc.content).then(() => {
        if (DOM.btnCopyLabel) {
          const original = DOM.btnCopyLabel.textContent;
          DOM.btnCopyLabel.textContent = 'Tersalin!';
          setTimeout(() => {
            DOM.btnCopyLabel.textContent = original;
          }, 1800);
        }
      });
    });
  }

  // =========================================================================
  // TAB 3: FLASHCARDS ENGINE (Point Extractor & 3D Flip)
  // =========================================================================
  function extractKeyPointsFromText(content) {
    if (!content) return [];

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const flashcards = [];

    // Strategy 1: Look for bullet points with key-value pairs (Term: Description)
    lines.forEach(line => {
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const clean = line.replace(/^[-*]\s*/, '');
        const splitIdx = clean.indexOf(':');
        if (splitIdx > 2 && splitIdx < 60) {
          const term = clean.slice(0, splitIdx).trim();
          const desc = clean.slice(splitIdx + 1).trim();
          if (desc.length > 10) {
            flashcards.push({
              front: `Apa konsep atau fungsi dari "${term}"?`,
              backTitle: term,
              backDetail: desc
            });
          }
        }
      }
    });

    // Strategy 2: If few cards found, extract sentences that look like definitions
    if (flashcards.length < 4) {
      const sentences = content
        .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
        .split("|")
        .map(s => s.trim())
        .filter(s => s.length > 35 && s.length < 240);

      sentences.forEach((sentence, idx) => {
        const lower = sentence.toLowerCase();
        if (lower.includes(' merupakan ') || lower.includes(' adalah ') || lower.includes(' berfungsi ')) {
          let words = sentence.split(' ');
          let subject = words.slice(0, 4).join(' ');
          flashcards.push({
            front: `Jelaskan poin materi berikut: "${subject}..."`,
            backTitle: subject,
            backDetail: sentence
          });
        }
      });
    }

    // Fallback if document has unstructured short text
    if (flashcards.length === 0) {
      flashcards.push({
        front: "Apa ide pokok materi yang Anda unggah?",
        backTitle: "Ringkasan Singkat",
        backDetail: content.slice(0, 200) + '...'
      });
    }

    return flashcards.slice(0, 10); // Limit to top 10 cards
  }

  function generateFlashcardsFromActiveDoc() {
    const doc = getActiveDocument();
    if (!doc || !doc.content.trim()) {
      AppState.flashcards = [];
      AppState.currentCardIndex = 0;
      updateFlashcardsUI();
      return;
    }

    AppState.flashcards = extractKeyPointsFromText(doc.content);
    AppState.currentCardIndex = 0;
    updateFlashcardsUI();
  }

  function updateFlashcardsUI() {
    const total = AppState.flashcards.length;
    const badge = DOM.flashcardBadgeCount;
    if (badge) {
      if (total > 0) {
        badge.textContent = total;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (total === 0) {
      DOM.flashcardsEmptyState?.classList.remove('hidden');
      DOM.flashcardViewWrapper?.classList.add('hidden');
      if (DOM.flashcardCounter) DOM.flashcardCounter.textContent = 'Kartu 0 dari 0';
      return;
    }

    DOM.flashcardsEmptyState?.classList.add('hidden');
    DOM.flashcardViewWrapper?.classList.remove('hidden');

    // Reset 3D flip card to front
    DOM.flashcardInner?.classList.remove('flipped');

    const card = AppState.flashcards[AppState.currentCardIndex];
    if (DOM.cardFrontText) DOM.cardFrontText.textContent = card.front;
    if (DOM.cardBackTitle) DOM.cardBackTitle.textContent = card.backTitle;
    if (DOM.cardBackDetail) DOM.cardBackDetail.textContent = card.backDetail;
    if (DOM.flashcardCounter) {
      DOM.flashcardCounter.textContent = `Kartu ${AppState.currentCardIndex + 1} dari ${total}`;
    }
  }

  function initFlashcardListeners() {
    const toggleFlip = () => {
      DOM.flashcardInner?.classList.toggle('flipped');
    };

    DOM.flashcardContainer?.addEventListener('click', toggleFlip);
    DOM.btnManualFlip?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFlip();
    });

    DOM.btnPrevCard?.addEventListener('click', () => {
      if (AppState.flashcards.length === 0) return;
      AppState.currentCardIndex = (AppState.currentCardIndex - 1 + AppState.flashcards.length) % AppState.flashcards.length;
      updateFlashcardsUI();
    });

    DOM.btnNextCard?.addEventListener('click', () => {
      if (AppState.flashcards.length === 0) return;
      AppState.currentCardIndex = (AppState.currentCardIndex + 1) % AppState.flashcards.length;
      updateFlashcardsUI();
    });
  }

  // =========================================================================
  // TAB 4: GENERATOR KUIS (5 Soal Dinamis, WAJIB 5 Opsi A-E)
  // =========================================================================
  function generateQuizFromActiveDoc() {
    const doc = getActiveDocument();
    if (!doc || !doc.content.trim()) {
      AppState.quizQuestions = [];
      updateQuizUI();
      return;
    }

    // Build 5 dynamic questions based on document content
    AppState.quizQuestions = buildDynamicQuizQuestions(doc.content);
    updateQuizUI();
  }

  function buildDynamicQuizQuestions(content) {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const keyPairs = [];

    lines.forEach(line => {
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const clean = line.replace(/^[-*]\s*/, '');
        const splitIdx = clean.indexOf(':');
        if (splitIdx > 2 && splitIdx < 50) {
          keyPairs.push({
            term: clean.slice(0, splitIdx).trim(),
            desc: clean.slice(splitIdx + 1).trim()
          });
        }
      }
    });

    // Default pool of plausible distractor concepts for biology/science
    const generalDistractors = [
      'Sebagai cadangan pigmen klorofil pada dinding sel kaku',
      'Mengatur sintesis lipid membran dan autofagi organel',
      'Sebagai tempat respirasi seluler aerobik menghasilkan energi ATP',
      'Mengendalikan replikasi DNA materi genetik intraseluler',
      'Melakukan modifikasi kimiawi dan pengemasan makromolekul di RE',
      'Sebagai penyeimbang osmoregulasi vakuola sentral',
      'Melindungi sitoplasma dari tekanan turgor eksternal',
      'Menghasilkan enzim hidrolitik untuk mendegradasi zat patogen'
    ];

    const questions = [];

    // Attempt to formulate questions from extracted pairs
    for (let i = 0; i < 5; i++) {
      let qData;

      if (keyPairs.length >= 2 && i < keyPairs.length) {
        const current = keyPairs[i];
        const correctText = current.desc.length > 70 ? current.desc.slice(0, 70) + '...' : current.desc;
        
        // Pick 4 distractors from other pairs or general pool
        const otherDescPool = keyPairs
          .filter((_, idx) => idx !== i)
          .map(p => p.desc.slice(0, 70) + '...')
          .concat(generalDistractors);

        const shuffledDistractors = shuffleArray(otherDescPool).slice(0, 4);

        // We have 1 correct answer + 4 distractors = 5 options
        const allOptionTexts = [correctText, ...shuffledDistractors];
        const randomized = shuffleArray(allOptionTexts);
        const correctIndex = randomized.indexOf(correctText);
        const correctLetter = ['A', 'B', 'C', 'D', 'E'][correctIndex];

        qData = {
          id: i + 1,
          question: `Berdasarkan materi yang dipelajari, fungsi atau karakteristik utama dari "${current.term}" adalah...`,
          correctAnswer: correctLetter,
          options: [
            { key: 'A', text: randomized[0] },
            { key: 'B', text: randomized[1] },
            { key: 'C', text: randomized[2] },
            { key: 'D', text: randomized[3] },
            { key: 'E', text: randomized[4] }
          ]
        };
      } else {
        // Fallback curated science questions relating to common topics
        const fallbackSet = [
          {
            q: "Organel manakah yang berperan krusial dalam respirasi seluler aerob untuk pembentukan ATP?",
            correct: "Mitokondria",
            distractors: ["Retikulum Endoplasma Kasar", "Badan Golgi", "Lisosom Hidrolitik", "Sentriol Nukleolus"]
          },
          {
            q: "Struktur sel yang secara spesifik HANYA dijumpai pada sel tumbuhan dan TIDAK ada pada sel hewan adalah...",
            correct: "Dinding sel selulosa dan kloroplas",
            distractors: ["Membran plasma semi-permeabel", "Mitokondria dan ribosom", "Sentrosom dan lisosom", "Retikulum endoplasma halus"]
          },
          {
            q: "Fungsi mendasar dari ribosom pada struktur sel eukariotik adalah...",
            correct: "Merakit asam amino menjadi rantai polipeptida (sintesis protein)",
            distractors: ["Menyimpan cadangan energi dalam bentuk glikogen", "Membongkar struktur DNA saat metafase", "Melakukan detoksifikasi racun obat-obatan", "Memompa natrium ke luar membran"]
          },
          {
            q: "Apa nama sifat membran plasma yang hanya mengizinkan molekul tertentu melintasinya?",
            correct: "Selektif Permeabel (Semi-permeabel)",
            distractors: ["Impermeabel Total", "Dinding Kaku Pasif", "Osmotik Bebas", "Difusif Terbuka"]
          },
          {
            q: "Ilmuwan pertama yang mengamati sel pada sayatan gabus mikroskop tahun 1665 adalah...",
            correct: "Robert Hooke",
            distractors: ["Louis Pasteur", "Gregor Mendel", "Charles Darwin", "Antonie van Leeuwenhoek"]
          }
        ];

        const f = fallbackSet[i % fallbackSet.length];
        const allOptionTexts = [f.correct, ...f.distractors];
        const randomized = shuffleArray(allOptionTexts);
        const correctIndex = randomized.indexOf(f.correct);
        const correctLetter = ['A', 'B', 'C', 'D', 'E'][correctIndex];

        qData = {
          id: i + 1,
          question: f.q,
          correctAnswer: correctLetter,
          options: [
            { key: 'A', text: randomized[0] },
            { key: 'B', text: randomized[1] },
            { key: 'C', text: randomized[2] },
            { key: 'D', text: randomized[3] },
            { key: 'E', text: randomized[4] }
          ]
        };
      }

      questions.push(qData);
    }

    return questions;
  }

  function updateQuizUI() {
    const questions = AppState.quizQuestions;
    const container = DOM.quizQuestionsContainer;

    if (!container) return;

    if (questions.length === 0) {
      DOM.quizEmptyState?.classList.remove('hidden');
      DOM.quizForm?.classList.add('hidden');
      return;
    }

    DOM.quizEmptyState?.classList.add('hidden');
    DOM.quizForm?.classList.remove('hidden');

    if (DOM.quizResultFeedback) {
      DOM.quizResultFeedback.innerHTML = 'Pilih jawaban A-E pada kelima soal di atas, lalu klik <b>Cek Skor Kuis</b>.';
    }

    container.innerHTML = '';

    questions.forEach((q, idx) => {
      const qBlock = document.createElement('div');
      qBlock.className = 'quiz-question bg-surface-900/60 border border-surface-800/90 rounded-2xl p-5 space-y-4';
      qBlock.setAttribute('data-question-id', q.id);

      let optionsHtml = '';
      q.options.forEach(opt => {
        optionsHtml += `
          <label class="quiz-option flex items-center p-3 rounded-xl border border-surface-800 bg-surface-950/40 hover:bg-surface-800/50 hover:border-surface-700 cursor-pointer transition-colors" data-option-key="${opt.key}">
            <input type="radio" name="q_${q.id}" value="${opt.key}" class="w-4 h-4 text-brand-600 bg-surface-800 border-surface-700 focus:ring-brand-500">
            <span class="ml-3 text-xs text-slate-200">
              <strong class="text-brand-400 font-mono">${opt.key}.</strong> ${escapeHtml(opt.text)}
            </span>
          </label>
        `;
      });

      qBlock.innerHTML = `
        <div class="flex items-start justify-between gap-4">
          <span class="text-xs font-bold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-md border border-brand-500/20 font-mono">
            Soal 0${idx + 1}
          </span>
          <span class="text-[11px] text-slate-400 font-mono">5 Opsi (A, B, C, D, E)</span>
        </div>
        <p class="text-sm font-semibold text-slate-100">
          ${escapeHtml(q.question)}
        </p>
        <div class="grid gap-2.5">
          ${optionsHtml}
        </div>
      `;

      container.appendChild(qBlock);
    });
  }

  function handleQuizEvaluation(e) {
    e.preventDefault();
    const questions = AppState.quizQuestions;
    if (questions.length === 0) return;

    let correctCount = 0;
    let answeredCount = 0;

    questions.forEach(q => {
      const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
      const qBlock = document.querySelector(`[data-question-id="${q.id}"]`);
      if (!qBlock) return;

      const allOptionLabels = qBlock.querySelectorAll('.quiz-option');

      // Clear previous styles
      allOptionLabels.forEach(lbl => {
        lbl.classList.remove('option-correct', 'option-incorrect');
      });

      if (selected) {
        answeredCount++;
        const userChoice = selected.value;

        allOptionLabels.forEach(lbl => {
          const optKey = lbl.getAttribute('data-option-key');

          // Highlight the actual correct answer in green
          if (optKey === q.correctAnswer) {
            lbl.classList.add('option-correct');
          }

          // If user picked wrong, highlight their choice in red
          if (optKey === userChoice && userChoice !== q.correctAnswer) {
            lbl.classList.add('option-incorrect');
          }
        });

        if (userChoice === q.correctAnswer) {
          correctCount++;
        }
      } else {
        // If not answered, reveal correct answer
        allOptionLabels.forEach(lbl => {
          if (lbl.getAttribute('data-option-key') === q.correctAnswer) {
            lbl.classList.add('option-correct');
          }
        });
      }
    });

    const total = questions.length;
    const feedback = DOM.quizResultFeedback;
    if (feedback) {
      if (answeredCount < total) {
        feedback.innerHTML = `
          <div class="text-amber-400 font-medium">
            Anda baru menjawab ${answeredCount} dari ${total} soal. Skor sementara: <span class="text-white font-bold">${correctCount}/${total} Benar</span>. Jawaban benar telah ditandai hijau!
          </div>
        `;
      } else {
        const isPerfect = correctCount === total;
        feedback.innerHTML = `
          <div class="${isPerfect ? 'text-emerald-400' : 'text-brand-300'} font-bold">
            Skor Akhir: ${correctCount}/${total} Benar (${(correctCount/total)*100}%)
            <span class="text-xs font-normal text-slate-300 ml-1">
              ${isPerfect ? '🎉 Luar biasa! Semua jawaban Anda tepat.' : 'Pilihan hijau adalah jawaban tepat, merah adalah jawaban keliru.'}
            </span>
          </div>
        `;
      }
    }
  }

  function initQuizListeners() {
    DOM.quizForm?.addEventListener('submit', handleQuizEvaluation);
    DOM.btnRegenerateQuiz?.addEventListener('click', () => {
      generateQuizFromActiveDoc();
    });
  }

  // =========================================================================
  // PANEL KANAN: DATABASE PENGETAHUAN LOKAL & CHATBOT MULTIFUNGSI
  // =========================================================================
  const LOCAL_KNOWLEDGE_BASE = [
    // Sapaan
    {
      category: 'sapaan',
      keywords: ['halo', 'halo!', 'hai', 'helo', 'hei', 'hi', 'hello', 'hola'],
      responses: [
        'Halo! Senang sekali bisa menemanimu belajar hari ini. Ada topik atau materi yang ingin kita bedah bersama?',
        'Hai! Semangat belajarnya ya. Kamu bisa tanyakan apa saja seputar materi yang diunggah atau sekadar berdiskusi santai denganku!',
        'Halo! Asisten belajarmu siap sedia 100% offline. Mau mulai dari membaca dokumen, kuis, atau ada pertanyaan khusus?'
      ]
    },
    {
      category: 'sapaan_pagi',
      keywords: ['pagi', 'selamat pagi', 'met pagi', 'morning', 'good morning'],
      responses: [
        'Selamat pagi! Waktu yang sangat segar untuk mengasah otak dan memahami konsep baru. Yuk kita mulai!',
        'Pagi yang cerah! Jangan lupa siapkan segelas air putih atau kopi, lalu mari kita pelajari materi hari ini dengan fokus.'
      ]
    },
    {
      category: 'sapaan_siang',
      keywords: ['siang', 'selamat siang', 'met siang', 'afternoon'],
      responses: [
        'Selamat siang! Tetap semangat ya meski siang hari biasanya bikin sedikit mengantuk. Mau lanjut pelajari materi sekarang?',
        'Siang! Semangat belajarnya luar biasa. Kita bisa pelajari poin-poin ringkas di flashcards jika ingin sesi belajar yang santai.'
      ]
    },
    {
      category: 'sapaan_malam',
      keywords: ['malam', 'selamat malam', 'met malam', 'petang', 'sore', 'selamat sore'],
      responses: [
        'Selamat malam! Belajar di waktu tenang seperti ini sering kali bikin materi lebih cepat menempel di ingatan. Ada materi yang perlu kita ulas?',
        'Selamat sore/malam! Hebat sekali kamu masih menyempatkan waktu untuk mengulang materi hari ini. Aku siap membantumu!'
      ]
    },
    // Curhat & Kondisi
    {
      category: 'curhat_stres_pusing',
      keywords: ['stres', 'stress', 'pusing', 'mumet', 'bingung', 'capek', 'lelah', 'penat', 'berat'],
      responses: [
        'Tarik napas dalam-dalam dulu yuk... Wajar banget merasa pusing atau capek saat belajar hal yang baru dan padat. Istirahat sejenak 5-10 menit, minum air, atau regangkan badan. Ingat: belajar itu maraton, bukan lari cepat. Kalau sudah siap, kita pelajari pelan-pelan ya!',
        'Aku paham kok, otak kita memang butuh jeda saat dijejali banyak informasi. Jangan terlalu keras pada dirimu sendiri ya. Luangkan waktu sejenak untuk rileks, setelah itu kita cicil materinya sedikit demi sedikit. Kamu pasti bisa melaluinya!'
      ]
    },
    {
      category: 'curhat_ujian',
      keywords: ['ujian', 'uts', 'uas', 'tryout', 'skripsi', 'sidang', 'ulangan', 'test', 'tes'],
      responses: [
        'Menghadapi ujian memang sering bikin deg-degan, tapi kamu tidak sendirian! Kuncinya adalah pemahaman konsep, bukan menghafal mati. Manfaatkan fitur **Flashcard (3D)** untuk mengingat istilah kunci dan coba **Kuis** di panel kiri untuk menguji kesiapanmu. Kamu sudah berusaha, percayalah pada prosesmu!',
        'Persiapan ujian itu kuncinya konsistensi dan ketenangan. Jangan begadang malam sebelum ujian ya. Fokus pada bab-bab penting yang ada di materi ini. Aku yakin kamu bisa mendapatkan hasil terbaik!'
      ]
    },
    {
      category: 'curhat_malas_bosan',
      keywords: ['malas', 'mager', 'bosan', 'jenuh', 'bosen', 'gabut', 'kurang motivasi'],
      responses: [
        'Rasa malas atau bosan itu hal yang sangat manusiawi, kamu nggak perlu merasa bersalah! Coba pakai teknik 5 menit: paksa diri membaca materi atau membalik 2 kartu flashcard saja. Biasanya setelah mulai, rasa malasnya akan memudar dengan sendirinya. Mau coba sekarang?',
        'Kalau lagi jenuh membaca teks panjang, coba beralih ke Tab 4 dan kerjakan 5 soal kuis acak. Sering kali kuis interaktif bikin otak lebih tertantang dan rasa bosan langsung hilang!'
      ]
    },
    {
      category: 'curhat_sedih_susah',
      keywords: ['sedih', 'susah', 'sulit', 'nggak bisa', 'tidak bisa', 'gagal', 'kecewa', 'payah'],
      responses: [
        'Semua hal terasa sulit sebelum akhirnya menjadi mudah. Fakta bahwa kamu menganggap materi ini menantang artinya otakmu sedang berkembang! Jangan bandingkan langkahmu dengan orang lain. Tanyakan bagian materi mana yang paling rumit, biar kita bedah bareng di sini.',
        'Peluk hangat secara virtual! Tidak apa-apa jika hari ini terasa berat atau belum paham sepenuhnya. Yang terpenting kamu tidak menyerah. Satu paragraf yang kamu pahami hari ini adalah kemenangan besar untuk esok hari.'
      ]
    },
    // Pengetahuan Umum
    {
      category: 'umum_belajar',
      keywords: ['belajar', 'teknik belajar', 'tips belajar', 'cara belajar', 'metode belajar'],
      responses: [
        'Teknik belajar yang terbukti paling efektif secara sains adalah:\n1. **Active Recall**: Menguji ingatan diri sendiri (seperti fitur Flashcards & Kuis kita).\n2. **Spaced Repetition**: Mengulang materi dengan interval hari berkala.\n3. **Feynman Technique**: Menjelaskan konsep rumit dengan kalimat yang sangat sederhana.'
      ]
    },
    {
      category: 'umum_sains',
      keywords: ['sains', 'science', 'metode ilmiah', 'ilmu pengetahuan'],
      responses: [
        '**Sains** adalah metode sistematis untuk membangun dan mengorganisasikan pengetahuan dalam bentuk penjelasan yang dapat diuji dan prediksi tentang alam semesta berbasis bukti empiris dan eksperimen.'
      ]
    },
    {
      category: 'umum_matematika',
      keywords: ['matematika', 'math', 'aljabar', 'kalkulus', 'aritmatika'],
      responses: [
        '**Matematika** adalah studi tentang pola, struktur, ruang, dan kuantitas. Matematika menjadi bahasa universal logika formal yang mendasari perkembangan teknologi, fisika, dan kecerdasan buatan.'
      ]
    },
    {
      category: 'umum_sejarah',
      keywords: ['sejarah', 'history', 'masa lalu', 'peradaban'],
      responses: [
        '**Sejarah** adalah kajian tentang masa lalu peradaban manusia melalui peninggalan tulisan, artefak, dan rekaman peristiwa untuk memahami konteks dunia hari ini.'
      ]
    },
    {
      category: 'umum_bumi',
      keywords: ['bumi', 'earth', 'planet', 'atmosfer', 'geologi'],
      responses: [
        '**Bumi** adalah planet ketiga dari Matahari dengan atmosfer kaya nitrogen (78%) dan oksigen (21%), serta perairan yang menutupi sekitar 71% permukaannya.'
      ]
    },
    {
      category: 'umum_komputer',
      keywords: ['komputer', 'computer', 'cpu', 'hardware', 'software', 'ram'],
      responses: [
        '**Komputer** adalah mesin pemroses data elektronik berbasis arsitektur input, pengolahan (CPU & RAM), penyimpanan, dan output.'
      ]
    },
    {
      category: 'umum_internet',
      keywords: ['internet', 'web', 'jaringan', 'network', 'protokol'],
      responses: [
        '**Internet** adalah jaringan global yang menghubungkan miliaran komputer di seluruh dunia menggunakan protokol komunikasi TCP/IP. Aplikasi ini dirancang agar tetap berfungsi maksimal tanpa koneksi internet!'
      ]
    },
    {
      category: 'umum_ai',
      keywords: ['ai', 'artificial intelligence', 'kecerdasan buatan', 'machine learning', 'llm'],
      responses: [
        '**Artificial Intelligence (AI)** adalah kecerdasan buatan yang memodelkan komputasi cerdas manusia untuk memecahkan masalah, mencari pola informasi, dan merespons percakapan.'
      ]
    },
    {
      category: 'umum_pencipta',
      keywords: ['pencipta', 'pembuat', 'siapa kamu', 'siapa dirimu', 'kamu siapa', 'developer'],
      responses: [
        'Saya adalah **Asisten Belajar Offline & Lokal**, dibuat untuk menemani belajarmu, membaca dokumen, membuat flashcard, dan kuis secara 100% lokal di browser tanpa server!'
      ]
    }
  ];

  function matchLocalKnowledgeBase(userText) {
    if (!userText) return null;
    const lower = userText.toLowerCase().trim();

    for (const entry of LOCAL_KNOWLEDGE_BASE) {
      for (const kw of entry.keywords) {
        const pattern = new RegExp(`(^|\\b|\\s)${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|\\s|[!?.,]|$)`, 'i');
        if (pattern.test(lower)) {
          const randomIndex = Math.floor(Math.random() * entry.responses.length);
          return entry.responses[randomIndex];
        }
      }
    }
    return null;
  }

  const STOP_WORDS = new Set([
    'apa', 'apakah', 'siapa', 'dimana', 'kapan', 'mengapa', 'kenapa', 'bagaimana',
    'yang', 'dan', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan',
    'adalah', 'yaitu', 'merupakan', 'sebagai', 'ini', 'itu', 'bisa', 'tolong',
    'jelaskan', 'berikan', 'ringkas', 'tentang', 'ada', 'atau', 'pada', 'oleh', 'ke'
  ]);

  function extractSearchKeywords(query) {
    return query
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  }

  function findBestMatchingContext(query, content) {
    if (!content) return null;

    const keywords = extractSearchKeywords(query);
    if (keywords.length === 0) {
      return {
        matchedText: content.slice(0, 320) + '...',
        score: 1,
        keywords: []
      };
    }

    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 20);
    const sentences = content
      .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
      .split("|")
      .map(s => s.trim())
      .filter(s => s.length > 20);

    let bestSegment = null;
    let highestScore = 0;

    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      let score = 0;
      keywords.forEach(kw => {
        if (lower.includes(kw)) {
          score += 2;
          if (new RegExp(`\\b${kw}\\b`, 'i').test(sentence)) score += 1;
        }
      });

      if (score > highestScore) {
        highestScore = score;
        bestSegment = sentence;
      }
    });

    if (highestScore < 3) {
      paragraphs.forEach(para => {
        const lower = para.toLowerCase();
        let pScore = 0;
        keywords.forEach(kw => {
          if (lower.includes(kw)) pScore += 1;
        });

        if (pScore > highestScore) {
          highestScore = pScore;
          bestSegment = para.slice(0, 360) + (para.length > 360 ? '...' : '');
        }
      });
    }

    if (highestScore > 0 && bestSegment) {
      return {
        matchedText: bestSegment,
        score: highestScore,
        keywords: keywords
      };
    }

    return null;
  }

  function generateOfflineAIResponse(userPrompt) {
    const promptClean = userPrompt.trim();
    const lowerPrompt = promptClean.toLowerCase();

    // a. Cek Database Pengetahuan Lokal Dulu
    const localAnswer = matchLocalKnowledgeBase(promptClean);
    if (localAnswer) {
      return {
        text: localAnswer,
        reference: null
      };
    }

    // b. Cek Dokumen (window.uploadedMaterial)
    const materialText = window.uploadedMaterial || (getActiveDocument() ? getActiveDocument().content : null);
    const activeDoc = getActiveDocument();

    if (materialText && materialText.trim().length > 0) {
      const docTitle = activeDoc ? activeDoc.name : 'Dokumen Aktif';

      if (lowerPrompt.includes('ringkas') || lowerPrompt.includes('rangkum') || lowerPrompt.includes('summary')) {
        const snippet = materialText.slice(0, 350).replace(/\n+/g, ' ');
        return {
          text: `Berikut intisari dari dokumen **${docTitle}**:\n\nMateri ini mencakup pembahasan mendasar mengenai topik yang dimuat dalam teks. Poin penting dapat dipelajari lebih lanjut di tab Viewer Teks maupun Flashcards.`,
          reference: snippet + '...'
        };
      }

      if (lowerPrompt.includes('istilah') || lowerPrompt.includes('kosakata') || lowerPrompt.includes('poin penting')) {
        const points = extractKeyPointsFromText(materialText);
        if (points.length > 0) {
          const listText = points.slice(0, 4).map((p, idx) => `${idx + 1}. **${p.backTitle}**: ${p.backDetail.slice(0, 100)}...`).join('\n');
          return {
            text: `Berikut beberapa istilah penting yang berhasil diekstraksi dari dokumen **${docTitle}**:\n\n${listText}`,
            reference: points[0].backDetail
          };
        }
      }

      const match = findBestMatchingContext(promptClean, materialText);
      if (match) {
        return {
          text: `Berdasarkan penelusuran pada materi dokumen **${docTitle}**, poin berikut relevan dengan apa yang Anda tanyakan:\n\n"${match.matchedText}"`,
          reference: match.matchedText
        };
      }
    }

    // c. Fallback jika tidak ditemukan
    return {
      text: 'Wah, saya belum menemukan pembahasan spesifik tentang itu di materi belajar yang kamu unggah, dan itu di luar pengetahuan dasar saya. Coba unggah materi yang relevan atau tanyakan dengan kata kunci lain ya! Tetap semangat!',
      reference: null
    };
  }

  function addChatMessage({ sender, text, reference = null }) {
    const container = DOM.chatMessages;
    if (!container) return;

    const msgWrapper = document.createElement('div');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (sender === 'user') {
      msgWrapper.className = 'flex gap-3 justify-end';
      msgWrapper.innerHTML = `
        <div class="flex-1 space-y-1 text-right">
          <div class="inline-block text-left p-3 rounded-2xl rounded-tr-sm bg-brand-600 text-white leading-relaxed text-xs">
            ${escapeHtml(text)}
          </div>
          <div class="text-[10px] text-slate-500 font-mono">${timeStr}</div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-surface-700 text-slate-200 flex items-center justify-center font-semibold text-[10px] shrink-0">
          Saya
        </div>
      `;
      container.appendChild(msgWrapper);
      container.scrollTop = container.scrollHeight;
    } else {
      // AI Message with typing stream
      msgWrapper.className = 'flex gap-3';
      msgWrapper.innerHTML = `
        <div class="w-7 h-7 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold text-[10px] shrink-0">
          AI
        </div>
        <div class="flex-1 space-y-1">
          <div class="ai-bubble p-3 rounded-2xl rounded-tl-sm bg-surface-800/80 border border-surface-700/60 text-slate-200 leading-relaxed text-xs">
            <span class="ai-stream-text"></span><span class="typing-cursor"></span>
          </div>
          <div class="reference-wrapper hidden mt-2">
            <div class="p-2.5 rounded-lg bg-surface-900/90 border border-brand-500/30 text-[11px] text-slate-300">
              <span class="text-brand-400 font-mono font-semibold flex items-center gap-1 mb-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Referensi Sumber Materi:
              </span>
              <p class="italic text-slate-400 font-serif border-l-2 border-brand-500/50 pl-2 mt-1 leading-normal">
                "${escapeHtml(reference || '')}"
              </p>
            </div>
          </div>
          <span class="text-[10px] text-slate-500 font-mono">${timeStr}</span>
        </div>
      `;
      container.appendChild(msgWrapper);
      container.scrollTop = container.scrollHeight;

      // Stream text effect word by word
      streamTextToElement(msgWrapper, text, reference);
    }
  }

  function streamTextToElement(msgWrapper, fullText, reference) {
    const textTarget = msgWrapper.querySelector('.ai-stream-text');
    const cursor = msgWrapper.querySelector('.typing-cursor');
    const refWrapper = msgWrapper.querySelector('.reference-wrapper');
    const container = DOM.chatMessages;

    AppState.isStreamingResponse = true;
    if (DOM.chatSendBtn) DOM.chatSendBtn.disabled = true;

    // Convert newlines to break elements or spaces
    const words = fullText.split(' ');
    let currentIndex = 0;
    let accumulated = '';

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        accumulated += (currentIndex > 0 ? ' ' : '') + words[currentIndex];
        
        // Simple inline markdown parsing for bold text
        let formatted = escapeHtml(accumulated)
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');

        textTarget.innerHTML = formatted;
        currentIndex++;
        if (container) container.scrollTop = container.scrollHeight;
      } else {
        clearInterval(interval);
        cursor?.remove();
        if (reference && refWrapper) {
          refWrapper.classList.remove('hidden');
        }
        if (container) container.scrollTop = container.scrollHeight;
        AppState.isStreamingResponse = false;
        if (DOM.chatSendBtn) DOM.chatSendBtn.disabled = false;
      }
    }, 28); // 28ms typing cadence feels natural and snappy
  }

  function initChatbotListeners() {
    DOM.chatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (AppState.isStreamingResponse) return;

      const input = DOM.chatInput;
      const text = input.value.trim();
      if (!text) return;

      // 1. Post user message
      addChatMessage({ sender: 'user', text: text });
      input.value = '';

      // 2. Generate local offline response
      setTimeout(() => {
        const response = generateOfflineAIResponse(text);
        addChatMessage({
          sender: 'ai',
          text: response.text,
          reference: response.reference
        });
      }, 350);
    });

    // Auto expand chat textarea on type
    DOM.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        DOM.chatForm.dispatchEvent(new Event('submit'));
      }
    });

    // Quick chips
    DOM.quickChips?.forEach(chip => {
      chip.addEventListener('click', () => {
        if (DOM.chatInput) {
          DOM.chatInput.value = chip.textContent.trim();
          DOM.chatForm.dispatchEvent(new Event('submit'));
        }
      });
    });

    // Clear chat
    DOM.btnClearChat?.addEventListener('click', () => {
      if (DOM.chatMessages) {
        DOM.chatMessages.innerHTML = '';
        const doc = getActiveDocument();
        addChatMessage({
          sender: 'ai',
          text: doc 
            ? `Riwayat chat dibersihkan. Materi aktif: **${doc.name}**. Tanyakan apa saja mengenai materi ini!`
            : `Riwayat chat dibersihkan. Silakan unggah materi di tab **Upload File** untuk memulai.`,
          reference: null
        });
      }
    });
  }

  // =========================================================================
  // UTILITY HELPERS
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // =========================================================================
  // BOOTSTRAP APPLICATION
  // =========================================================================
  function initApp() {
    initStorage();
    initTabListeners();
    initUploadHandlers();
    initFlashcardListeners();
    initQuizListeners();
    initChatbotListeners();

    // Initial Render
    renderDocumentList();
    renderViewer();
    generateFlashcardsFromActiveDoc();
    generateQuizFromActiveDoc();

    const activeDoc = getActiveDocument();
    if (DOM.headerActiveDoc) {
      DOM.headerActiveDoc.textContent = activeDoc ? activeDoc.name : 'Belum Ada Dokumen';
    }

    // Initial greeting in chat
    if (DOM.chatMessages && DOM.chatMessages.children.length === 0) {
      addChatMessage({
        sender: 'ai',
        text: activeDoc 
          ? `Halo! Saya asisten belajar offline Anda. Dokumen **${activeDoc.name}** aktif di memori lokal. Silakan tanyakan materi, minta ringkasan, atau gunakan flashcards dan kuis di sebelah kiri!`
          : `Halo! Saya asisten belajar offline Anda. Belum ada dokumen yang dimuat. Silakan unggah materi (.txt/.md) di tab **Upload File** untuk memulai belajar.`,
        reference: null
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
