// Ultra Video Downloader - Frontend Controller

let currentLang = "ar";
let currentVideoData = null;
let currentEventSource = null;

// Translations
const i18n = {
  ar: {
    tagline: "تحميل يوتيوب ومنصات السوشيال ميديا بأعلى جودة",
    badge_text: "محرك تحميل ذكي وفائق السرعة",
    hero_title_1: "حمّل فيديوهاتك المفضلة",
    hero_title_2: "بأي جودة تختارها حتى 4K و HD",
    hero_desc: "استخراج دقيق لكافة جودات اليوتيوب (360p, 480p, 720p, 1080p, 2K, 4K) مع دعم مباشر لمنصات Facebook, Instagram Reels, TikTok بدون علامة مائية.",
    plat_all: "الكل",
    placeholder: "ضع رابط الفيديو هنا (YouTube, TikTok, Instagram, Facebook...)",
    paste: "لصق",
    fetch_btn: "تحليل واستخراج الجودات",
    error_title: "تعذر إكمال العملية",
    loading_title: "جاري فحص الرابط واستخراج الجودات المتاحة...",
    loading_desc: "يتم التحقق من المنصة وتحليل مسارات الفيديو والصوت بأحدث التقنيات.",
    quality_summary: "تم استخراج الجودات المتاحة لهذا الفيديو بنجاح. اختر الجودة المطلوبة للتحميل.",
    tab_video: "جودات الفيديو (Video)",
    tab_audio: "الصوت فقط (Audio MP3)",
    click_to_download_hint: "اضغط على زر التحميل بجوار الجودة المناسبة:",
    download_btn: "تحميل",
    recommended_tag: "موصى به",
    highest_tag: "أعلى جودة",
    fps_tag: "60 إطار/ث",
    audio_tag: "صوت نقي",
    processing_title: "جاري معالجة وتحميل الفيديو...",
    processing_sub: "يرجى الانتظار بينما نقوم بدمج المسارات بأعلى جودة",
    status_connecting: "جاري الاتصال بالسيرفر...",
    status_downloading: "جاري التحميل من المصدر...",
    status_merging: "جاري دمج الفيديو والصوت عبر FFmpeg بأعلى دقة...",
    status_finished: "اكتمل التجهيز! جاري بدء التنزيل الآن...",
    metric_speed: "السرعة",
    metric_eta: "الوقت المتبقي",
    metric_size: "الحجم الإجمالي",
    final_download_btn: "اضغط هنا لبدء التنزيل المباشر",
    auto_download_note: "إذا لم يبدأ التنزيل تلقائياً، اضغط على الزر الأخضر أعلاه.",
    feat_1_title: "كشف ديناميكي للجودات",
    feat_1_desc: "استعراض دقيق لكل الجودات المتوفرة للفيديو من 360p حتى 4K و 2K مع الحجم التقريبي.",
    feat_2_title: "دعم شامل للسوشيال ميديا",
    feat_2_desc: "تحميل مباشر من Instagram Reels و TikTok (بدون علامة مائية) وفيديوهات Facebook بجودة HD.",
    feat_3_title: "استخراج الصوت MP3",
    feat_3_desc: "تحويل أي مقطع فيديو إلى ملف صوتي MP3 نقي وعالي الجودة بمعدل يصل إلى 320kbps.",
    history_title: "التحميلات الأخيرة",
    clear_history: "مسح السجل",
    install_app: "تثبيت التطبيق",
    switch_lang_btn: "English"
  },
  en: {
    tagline: "Download YouTube & Social Media Videos in Best Quality",
    badge_text: "Smart & Ultra-fast Download Engine",
    hero_title_1: "Download Your Favorite Videos",
    hero_title_2: "In Any Quality Up to 4K & HD",
    hero_desc: "Dynamic quality extractor for YouTube (360p, 480p, 720p, 1080p, 2K, 4K) & direct support for Facebook, Instagram Reels, TikTok without watermark.",
    plat_all: "All",
    placeholder: "Paste video link here (YouTube, TikTok, Instagram, Facebook...)",
    paste: "Paste",
    fetch_btn: "Analyze & Extract Qualities",
    error_title: "Operation Failed",
    loading_title: "Analyzing link & extracting available qualities...",
    loading_desc: "Validating platform and probing media streams with high accuracy.",
    quality_summary: "Available video qualities extracted successfully. Pick your preferred quality.",
    tab_video: "Video Qualities",
    tab_audio: "Audio Only (MP3)",
    click_to_download_hint: "Click download button next to your desired quality:",
    download_btn: "Download",
    recommended_tag: "Recommended",
    highest_tag: "Best Quality",
    fps_tag: "60 FPS",
    audio_tag: "Audio",
    processing_title: "Processing & Downloading Video...",
    processing_sub: "Please wait while we merge video and audio streams in HD",
    status_connecting: "Connecting to server...",
    status_downloading: "Downloading media stream...",
    status_merging: "Merging audio and video via FFmpeg...",
    status_finished: "Ready! Starting download now...",
    metric_speed: "Speed",
    metric_eta: "ETA",
    metric_size: "Total Size",
    final_download_btn: "Click Here for Direct Download",
    auto_download_note: "If download didn't trigger automatically, click the green button above.",
    feat_1_title: "Dynamic Quality Detection",
    feat_1_desc: "Accurate detection of all available resolutions from 360p up to 4K & 2K with estimated size.",
    feat_2_title: "Multi-Platform Support",
    feat_2_desc: "Direct download from Instagram Reels, TikTok (no watermark), and Facebook videos in HD.",
    feat_3_title: "Extract MP3 Audio",
    feat_3_desc: "Convert any video to crystal-clear MP3 audio up to 320kbps high bitrate.",
    history_title: "Recent Downloads",
    clear_history: "Clear History",
    switch_lang_btn: "العربية"
  }
};

// Brand SVG Icons
const BRAND_ICONS = {
  youtube: `
    <svg class="w-4 h-4 shrink-0 drop-shadow-sm" viewBox="0 0 24 24">
      <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
      <path fill="#FFFFFF" d="m9.545 15.568 6.273-3.568-6.273-3.568z"/>
    </svg>
  `,
  instagram: `
    <svg class="w-4 h-4 shrink-0 drop-shadow-sm" viewBox="0 0 24 24">
      <defs>
        <radialGradient id="ig_grad_app" r="150%" cx="30%" cy="107%">
          <stop stop-color="#fdf497" offset="0%" />
          <stop stop-color="#fd5949" offset="45%" />
          <stop stop-color="#d6249f" offset="65%" />
          <stop stop-color="#285AEB" offset="90%" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" ry="6" fill="url(#ig_grad_app)"/>
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#ffffff" stroke-width="1.8"/>
      <circle cx="17.2" cy="6.8" r="1.1" fill="#ffffff"/>
    </svg>
  `,
  tiktok: `
    <svg class="w-4 h-4 shrink-0 drop-shadow-sm" viewBox="0 0 24 24">
      <path fill="#25F4EE" d="M12.4 15.2a2.6 2.6 0 0 1-2.6 2.5 2.5 2.5 0 0 1-2.5-2.6 2.5 2.5 0 0 1 1.2-2.2v-3.2a5.8 5.8 0 0 0-4.3 5.4 5.7 5.7 0 0 0 5.6 5.7 5.8 5.8 0 0 0 5.8-5.7V8.5a7.3 7.3 0 0 0 4.3 1.4V6.8a4.3 4.3 0 0 1-3.3-.9 4.3 4.3 0 0 1-1.1-2.9h-3.1v12.2z"/>
      <path fill="#FE2C55" d="M19.9 6.8a7.3 7.3 0 0 1-4.3-1.4v-.1a7.4 7.4 0 0 0 4.3 1.5zM12.4 15.4V3h3.1a4.3 4.3 0 0 0 1.1 2.8 4.3 4.3 0 0 0 3.3.9v3.1a7.3 7.3 0 0 1-4.3-1.4v5.9a5.8 5.8 0 0 1-5.8 5.7 5.7 5.7 0 0 1-5.6-5.7 5.8 5.8 0 0 1 4.3-5.4v3.2a2.5 2.5 0 0 0-1.2 2.2 2.5 2.5 0 0 0 2.5 2.6 2.6 2.6 0 0 0 2.6-2.5z"/>
      <path fill="#FFFFFF" d="M12.4 15.2a2.6 2.6 0 0 1-2.6 2.5 2.5 2.5 0 0 1-2.5-2.6 2.5 2.5 0 0 1 1.2-2.2v-3.2a5.8 5.8 0 0 0-4.3 5.4 5.7 5.7 0 0 0 5.6 5.7 5.8 5.8 0 0 0 5.8-5.7V8.5a7.3 7.3 0 0 0 4.3 1.4V6.8a4.3 4.3 0 0 1-3.3-.9 4.3 4.3 0 0 1-1.1-2.8h-3.1v12.2z"/>
    </svg>
  `,
  facebook: `
    <svg class="w-4 h-4 shrink-0 drop-shadow-sm" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#1877F2"/>
      <path fill="#ffffff" d="M15.14 12.6l.46-3h-2.88V7.65c0-.82.4-1.62 1.69-1.62h1.31V3.48c-.73-.1-1.46-.15-2.2-.15-2.24 0-3.7 1.36-3.7 3.82V9.6H7.17v3h2.65v7.26c.53.08 1.07.13 1.62.13s1.09-.05 1.62-.13V12.6h2.08z"/>
    </svg>
  `,
  pinterest: `
    <svg class="w-4 h-4 shrink-0 drop-shadow-sm" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#E60023"/>
      <path fill="#ffffff" d="M12.017 3.5C7.322 3.5 3.5 7.322 3.5 12.017c0 3.602 2.24 6.678 5.402 7.915-.074-.673-.141-1.705.029-2.439.155-.664.997-4.225.997-4.225s-.255-.51-.255-1.263c0-1.179.686-2.065 1.537-2.065.726 0 1.077.545 1.077 1.199 0 .73-.463 1.821-.703 2.831-.202.846.425 1.535 1.259 1.535 1.509 0 2.672-1.592 2.672-3.891 0-2.029-1.463-3.453-3.551-3.453-2.418 0-3.836 1.817-3.836 3.687 0 .733.28 1.52.63 1.944.07.085.08.16.06.245-.064.266-.208.851-.237.967-.038.16-.122.192-.284.117-1.06-.49-1.726-2.041-1.726-3.295 0-2.678 1.949-5.143 5.617-5.143 2.949 0 5.242 2.104 5.242 4.91 0 2.932-1.849 5.292-4.42 5.292-.861 0-1.67-.446-1.956-.978l-.531 2.02c-.191.741-.712 1.668-1.062 2.231.796.245 1.635.38 2.518.38 4.695 0 8.517-3.822 8.517-8.517C20.534 7.322 16.712 3.5 12.017 3.5z"/>
    </svg>
  `,
  twitter: `
    <svg class="w-4 h-4 shrink-0 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
      <path fill="#FFFFFF" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  `,
  other: `
    <i data-lucide="video" class="w-4 h-4 text-indigo-400"></i>
  `
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  setupEventListeners();
  loadHistory();
  initCustomCursor();
  initPWA();
});

let deferredPrompt = null;
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration error:', err);
    });
  }

  const pwaInstallBtn = document.getElementById('pwaInstallBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBtn) {
      pwaInstallBtn.classList.remove('hidden');
      pwaInstallBtn.classList.add('flex');
    }
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          pwaInstallBtn.classList.add('hidden');
        }
        deferredPrompt = null;
      }
    });
  }
}

function setupEventListeners() {
  const urlForm = document.getElementById("urlForm");
  const videoUrlInput = document.getElementById("videoUrlInput");
  const pasteBtn = document.getElementById("pasteBtn");
  const clearBtn = document.getElementById("clearBtn");
  const langToggleBtn = document.getElementById("langToggleBtn");
  const tabVideo = document.getElementById("tabVideo");
  const tabAudio = document.getElementById("tabAudio");
  const closeProgressBtn = document.getElementById("closeProgressBtn");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  // URL Input Events with Real-time Platform Detection & Glow change
  videoUrlInput.addEventListener("input", () => {
    const val = videoUrlInput.value.trim();
    if (val.length > 0) {
      clearBtn.classList.remove("hidden");
      const detected = detectPlatformFromUrl(val);
      if (detected) {
        setPlatformGlowTheme(detected);
        syncPlatformChip(detected);
      }
    } else {
      clearBtn.classList.add("hidden");
      setPlatformGlowTheme("all");
      syncPlatformChip("all");
    }
  });

  clearBtn.addEventListener("click", () => {
    videoUrlInput.value = "";
    clearBtn.classList.add("hidden");
    setPlatformGlowTheme("all");
    syncPlatformChip("all");
    videoUrlInput.focus();
  });

  // Paste Button
  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        videoUrlInput.value = text.trim();
        clearBtn.classList.remove("hidden");
        const detected = detectPlatformFromUrl(text.trim());
        if (detected) {
          setPlatformGlowTheme(detected);
          syncPlatformChip(detected);
        }
        fetchVideoInfo(text.trim());
      }
    } catch (err) {
      console.warn("Clipboard access denied or unavailable", err);
      videoUrlInput.focus();
    }
  });

  // Form Submit
  urlForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = videoUrlInput.value.trim();
    if (url) {
      fetchVideoInfo(url);
    }
  });

  // Platform Filter Chips with Dynamic Glow
  document.querySelectorAll(".platform-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".platform-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const platform = chip.getAttribute("data-platform") || "all";
      setPlatformGlowTheme(platform);
      if (platform !== "all") {
        videoUrlInput.placeholder = `ضع رابط فيديو من ${chip.querySelector("span").textContent}...`;
      } else {
        videoUrlInput.placeholder = i18n[currentLang].placeholder;
      }
      videoUrlInput.focus();
    });
  });

  // Language Toggle
  langToggleBtn.addEventListener("click", () => {
    toggleLanguage();
  });

  // Quality Tabs
  tabVideo.addEventListener("click", () => switchQualityTab("video"));
  tabAudio.addEventListener("click", () => switchQualityTab("audio"));

  // Progress Modal Close
  closeProgressBtn.addEventListener("click", () => {
    closeProgressModal();
  });

  // Clear History
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
  }
}

function toggleLanguage() {
  currentLang = currentLang === "ar" ? "en" : "ar";
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";

  // Update all elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (i18n[currentLang][key]) {
      el.textContent = i18n[currentLang][key];
    }
  });

  // Update input placeholder
  document.getElementById("videoUrlInput").placeholder = i18n[currentLang].placeholder;
  document.getElementById("currentLangLabel").textContent = i18n[currentLang].switch_lang_btn;

  // Re-render qualities if video is loaded
  if (currentVideoData) {
    renderVideoResult(currentVideoData);
  }
  
  if (window.lucide) {
    lucide.createIcons();
  }
}

function switchQualityTab(tab) {
  const tabVideo = document.getElementById("tabVideo");
  const tabAudio = document.getElementById("tabAudio");
  const videoGrid = document.getElementById("videoQualitiesGrid");
  const audioGrid = document.getElementById("audioQualitiesGrid");

  if (tab === "video") {
    tabVideo.classList.add("active");
    tabVideo.classList.remove("text-slate-400");
    tabAudio.classList.remove("active");
    tabAudio.classList.add("text-slate-400");
    videoGrid.classList.remove("hidden");
    audioGrid.classList.add("hidden");
  } else {
    tabAudio.classList.add("active");
    tabAudio.classList.remove("text-slate-400");
    tabVideo.classList.remove("active");
    tabVideo.classList.add("text-slate-400");
    audioGrid.classList.remove("hidden");
    videoGrid.classList.add("hidden");
  }
}

/**
 * Fetch video information from API
 */
async function fetchVideoInfo(url) {
  hideError();
  showLoading();
  hideResult();

  try {
    const response = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "تعذر جلب معلومات الفيديو");
    }

    currentVideoData = data;
    hideLoading();
    renderVideoResult(data);
    addToHistory(data, url);

  } catch (err) {
    hideLoading();
    showError(err.message);
  }
}

/**
 * Render Video Card & Quality Selection Grid
 */
function renderVideoResult(data) {
  const resultBox = document.getElementById("resultBox");
  const videoThumb = document.getElementById("videoThumb");
  const videoTitle = document.getElementById("videoTitle");
  const videoUploader = document.getElementById("videoUploader");
  const videoDuration = document.getElementById("videoDuration");
  const videoViews = document.getElementById("videoViews");
  const videoViewsContainer = document.getElementById("videoViewsContainer");
  const platformName = document.getElementById("videoPlatformName");
  const platformIcon = document.getElementById("platformIconContainer");
  const videoGrid = document.getElementById("videoQualitiesGrid");
  const audioGrid = document.getElementById("audioQualitiesGrid");

  // Metadata
  videoThumb.src = data.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60";
  videoTitle.textContent = data.title;
  videoUploader.textContent = data.uploader;
  videoDuration.textContent = data.durationFormatted || "00:00";

  if (data.viewCount) {
    videoViews.textContent = data.viewCount;
    videoViewsContainer.classList.remove("hidden");
  } else {
    videoViewsContainer.classList.add("hidden");
  }

  // Platform styling with official brand icon & dynamic glow sync
  const platformMeta = getPlatformMetadata(data.platform);
  platformName.textContent = platformMeta.name;
  platformIcon.innerHTML = platformMeta.iconHtml;

  if (data.platform) {
    setPlatformGlowTheme(data.platform);
    syncPlatformChip(data.platform);
  }

  // Render Qualities
  videoGrid.innerHTML = "";
  audioGrid.innerHTML = "";

  const qualities = data.qualities || [];
  const videoQualities = qualities.filter(q => q.type !== "audio" && !q.isAudio);
  const audioQualities = qualities.filter(q => q.type === "audio" || q.isAudio);

  // Build Video & Image Cards
  videoQualities.forEach(q => {
    const isImageCard = q.type === "image" || q.isImage || q.ext === "jpg" || q.ext === "png";
    const card = document.createElement("div");
    let cardClass = "quality-card p-4 rounded-2xl flex flex-col justify-between";
    if (isImageCard) cardClass += " image-card";
    if (q.isHighest) cardClass += " highest";
    else if (q.isRecommended) cardClass += " recommended";
    card.className = cardClass;

    let badgeHtml = "";
    if (isImageCard) {
      badgeHtml = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">صورة HD</span>`;
    } else if (q.isHighest) {
      badgeHtml = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">${i18n[currentLang].highest_tag}</span>`;
    } else if (q.isRecommended) {
      badgeHtml = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${i18n[currentLang].recommended_tag}</span>`;
    }

    const fpsBadge = q.fps && q.fps >= 50 ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-teal-400 border border-teal-500/30">${i18n[currentLang].fps_tag}</span>` : "";
    const sizeBadge = q.size ? `<span class="text-[11px] text-slate-400 font-mono flex items-center gap-1"><i data-lucide="hard-drive" class="w-3 h-3 text-slate-500"></i> ${q.size}</span>` : "";
    const typeIcon = isImageCard ? `<i data-lucide="image" class="w-4 h-4 text-amber-400"></i>` : `<i data-lucide="video" class="w-4 h-4 text-indigo-400"></i>`;

    const btnText = isImageCard ? (currentLang === 'ar' ? 'تحميل الصورة' : 'Download Image') : i18n[currentLang].download_btn;

    card.innerHTML = `
      <div class="mb-3">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <div class="flex items-center gap-1.5">
            ${typeIcon}
            <span class="text-base font-extrabold text-white">${q.shortLabel || q.resolution}</span>
            ${fpsBadge}
          </div>
          ${badgeHtml}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400 font-semibold">${(q.ext || (isImageCard ? 'jpg' : 'mp4')).toUpperCase()}</span>
          ${sizeBadge ? `<span class="text-slate-600">•</span> ${sizeBadge}` : ""}
        </div>
      </div>

      <button 
        onclick="initiateDownload('${q.id}')"
        class="w-full py-2.5 px-3 rounded-xl text-xs font-bold ${isImageCard ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-400 hover:to-pink-400' : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500'} text-white shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer group btn-shimmer"
      >
        <i data-lucide="${isImageCard ? 'image-down' : 'download'}" class="w-3.5 h-3.5 text-white transition"></i>
        <span>${btnText}</span>
      </button>
    `;

    videoGrid.appendChild(card);
  });

  // Build Audio Cards
  audioQualities.forEach(q => {
    const card = document.createElement("div");
    card.className = "quality-card p-4 rounded-2xl flex flex-col justify-between";

    const sizeBadge = q.size ? `<span class="text-[11px] text-slate-400 font-mono flex items-center gap-1"><i data-lucide="hard-drive" class="w-3 h-3 text-slate-500"></i> ${q.size}</span>` : "";

    card.innerHTML = `
      <div class="mb-3">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-0.5">
              <span class="equalizer-bar"></span>
              <span class="equalizer-bar"></span>
              <span class="equalizer-bar"></span>
              <span class="equalizer-bar"></span>
            </div>
            <span class="text-base font-extrabold text-white">${q.shortLabel || q.resolution}</span>
          </div>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">${i18n[currentLang].audio_tag}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">${q.label}</span>
          ${sizeBadge ? `<span class="text-slate-600">•</span> ${sizeBadge}` : ""}
        </div>
      </div>

      <button 
        onclick="initiateDownload('${q.id}')"
        class="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer group btn-shimmer"
      >
        <i data-lucide="music-2" class="w-3.5 h-3.5 text-white transition"></i>
        <span>${i18n[currentLang].download_btn} (MP3)</span>
      </button>
    `;

    audioGrid.appendChild(card);
  });

  resultBox.classList.remove("hidden");
  switchQualityTab("video");

  if (window.lucide) {
    lucide.createIcons();
  }

  initCardTilt();

  // Scroll smoothly to results
  resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initCardTilt() {
  document.querySelectorAll(".quality-card").forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)";
    });
  });
}

function getPlatformMetadata(platform) {
  const p = (platform || "").toLowerCase();
  if (p.includes("youtube") || p === "youtube") {
    return { name: "YouTube", iconHtml: BRAND_ICONS.youtube };
  }
  if (p.includes("pinterest") || p.includes("pin.it") || p === "pinterest") {
    return { name: "Pinterest", iconHtml: BRAND_ICONS.pinterest };
  }
  if (p.includes("tiktok") || p === "tiktok") {
    return { name: "TikTok", iconHtml: BRAND_ICONS.tiktok };
  }
  if (p.includes("instagram") || p === "instagram") {
    return { name: "Instagram", iconHtml: BRAND_ICONS.instagram };
  }
  if (p.includes("facebook") || p === "facebook") {
    return { name: "Facebook", iconHtml: BRAND_ICONS.facebook };
  }
  if (p.includes("twitter") || p.includes("x.com") || p === "twitter") {
    return { name: "Twitter / X", iconHtml: BRAND_ICONS.twitter };
  }
  return { name: "Media Video & Photo", iconHtml: BRAND_ICONS.other };
}

/**
 * Dynamic Platform Glow & Chip Theme Controller
 */
function setPlatformGlowTheme(platform) {
  const aura = document.getElementById("searchGlowAura");
  if (!aura) return;
  const p = (platform || "all").toLowerCase();
  
  // Remove existing glow theme classes
  aura.classList.remove(
    "glow-theme-all",
    "glow-theme-youtube",
    "glow-theme-pinterest",
    "glow-theme-tiktok",
    "glow-theme-instagram",
    "glow-theme-facebook",
    "glow-theme-twitter"
  );
  
  if (p.includes("youtube")) {
    aura.classList.add("glow-theme-youtube");
  } else if (p.includes("pinterest") || p.includes("pin.it")) {
    aura.classList.add("glow-theme-pinterest");
  } else if (p.includes("tiktok")) {
    aura.classList.add("glow-theme-tiktok");
  } else if (p.includes("instagram")) {
    aura.classList.add("glow-theme-instagram");
  } else if (p.includes("facebook")) {
    aura.classList.add("glow-theme-facebook");
  } else if (p.includes("twitter") || p.includes("x.com")) {
    aura.classList.add("glow-theme-twitter");
  } else {
    aura.classList.add("glow-theme-all");
  }

  updateInputPlatformIcon(platform);
}

function updateInputPlatformIcon(platform) {
  const iconContainer = document.getElementById("inputPlatformIcon");
  if (!iconContainer) return;
  const p = (platform || "all").toLowerCase();
  if (p !== "all" && p !== "") {
    const meta = getPlatformMetadata(p);
    iconContainer.innerHTML = meta.iconHtml;
    iconContainer.className = "w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0 transition-all scale-110 shadow-sm";
  } else {
    iconContainer.innerHTML = `<i data-lucide="link-2" class="w-4 h-4 text-indigo-400"></i>`;
    iconContainer.className = "w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 transition-all";
  }
  if (window.lucide) lucide.createIcons();
}

function detectPlatformFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("pinterest.com") || u.includes("pin.it")) return "pinterest";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "facebook";
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  return null;
}

function syncPlatformChip(platform) {
  const p = (platform || "all").toLowerCase();
  document.querySelectorAll(".platform-chip").forEach(chip => {
    const chipPlat = chip.getAttribute("data-platform");
    if (
      chipPlat === p ||
      (p.includes("youtube") && chipPlat === "youtube") ||
      (p.includes("pinterest") && chipPlat === "pinterest") ||
      (p.includes("tiktok") && chipPlat === "tiktok") ||
      (p.includes("instagram") && chipPlat === "instagram") ||
      (p.includes("facebook") && chipPlat === "facebook") ||
      (p.includes("twitter") && chipPlat === "twitter")
    ) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

/**
 * Start Download Job & listen to progress via SSE
 */
async function initiateDownload(qualityId) {
  if (!currentVideoData) return;

  openProgressModal();

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: currentVideoData.webpageUrl || document.getElementById("videoUrlInput").value.trim(),
        qualityId: qualityId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "تعذر بدء التحميل");
    }

    // Connect to Server-Sent Events (SSE)
    listenToProgress(data.jobId, currentVideoData.title);

  } catch (err) {
    updateProgressError(err.message);
  }
}

function listenToProgress(jobId, videoTitle) {
  if (currentEventSource) {
    currentEventSource.close();
  }

  const evtSource = new EventSource(`/api/progress/${jobId}`);
  currentEventSource = evtSource;

  const percentEl = document.getElementById("progressPercent");
  const barFill = document.getElementById("progressBarFill");
  const statusText = document.getElementById("progressStatusText");
  const metricSpeed = document.getElementById("metricSpeed");
  const metricEta = document.getElementById("metricEta");
  const metricSize = document.getElementById("metricSize");
  const completedArea = document.getElementById("completedActionArea");
  const finalDownloadLink = document.getElementById("finalDownloadLink");
  const progressIcon = document.getElementById("progressIcon");

  evtSource.onmessage = (event) => {
    try {
      const job = JSON.parse(event.data);

      if (job.status === "downloading") {
        const p = job.progress || 0;
        percentEl.textContent = `${p}%`;
        barFill.style.width = `${p}%`;
        statusText.textContent = i18n[currentLang].status_downloading;
        metricSpeed.textContent = job.speed || "--";
        metricEta.textContent = job.eta || "--";
        metricSize.textContent = job.totalSize || "--";
      } else if (job.status === "merging") {
        percentEl.textContent = "95%";
        barFill.style.width = "95%";
        statusText.textContent = i18n[currentLang].status_merging;
      } else if (job.status === "finished") {
        percentEl.textContent = "100%";
        barFill.style.width = "100%";
        statusText.textContent = i18n[currentLang].status_finished;
        
        progressIcon.setAttribute("data-lucide", "check-circle-2");
        progressIcon.classList.remove("animate-spin", "text-indigo-400");
        progressIcon.classList.add("text-emerald-400");
        if (window.lucide) lucide.createIcons();

        const fileDownloadUrl = `/api/file/${jobId}?title=${encodeURIComponent(videoTitle)}`;
        finalDownloadLink.href = fileDownloadUrl;
        completedArea.classList.remove("hidden");

        triggerBrowserDownload(fileDownloadUrl, `${videoTitle || "video"}.mp4`);

        evtSource.close();
      } else if (job.status === "error") {
        updateProgressError(job.error || "فشل التحميل من المصدر");
        evtSource.close();
      }
    } catch (e) {
      console.error("SSE parse error:", e);
    }
  };

  evtSource.onerror = () => {
    evtSource.close();
  };
}

function triggerBrowserDownload(url, filename) {
  const absoluteUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  const link = document.createElement("a");
  link.href = absoluteUrl;
  link.setAttribute("download", filename || "download");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 2000);
}

function openProgressModal() {
  const modal = document.getElementById("progressModal");
  const percentEl = document.getElementById("progressPercent");
  const barFill = document.getElementById("progressBarFill");
  const statusText = document.getElementById("progressStatusText");
  const metricSpeed = document.getElementById("metricSpeed");
  const metricEta = document.getElementById("metricEta");
  const metricSize = document.getElementById("metricSize");
  const completedArea = document.getElementById("completedActionArea");
  const progressIcon = document.getElementById("progressIcon");

  percentEl.textContent = "0%";
  barFill.style.width = "0%";
  statusText.textContent = i18n[currentLang].status_connecting;
  metricSpeed.textContent = "--";
  metricEta.textContent = "--";
  metricSize.textContent = "--";
  completedArea.classList.add("hidden");

  progressIcon.setAttribute("data-lucide", "loader-2");
  progressIcon.classList.add("animate-spin", "text-indigo-400");
  progressIcon.classList.remove("text-emerald-400", "text-rose-400");
  if (window.lucide) lucide.createIcons();

  modal.classList.remove("hidden");
}

function closeProgressModal() {
  const modal = document.getElementById("progressModal");
  modal.classList.add("hidden");
  if (currentEventSource) {
    currentEventSource.close();
    currentEventSource = null;
  }
}

function updateProgressError(msg) {
  const statusText = document.getElementById("progressStatusText");
  const progressIcon = document.getElementById("progressIcon");

  statusText.textContent = msg;
  statusText.classList.add("text-rose-400");

  progressIcon.setAttribute("data-lucide", "alert-triangle");
  progressIcon.classList.remove("animate-spin", "text-indigo-400");
  progressIcon.classList.add("text-rose-400");
  if (window.lucide) lucide.createIcons();
}

/**
 * UI Utilities
 */
function showLoading() {
  document.getElementById("loadingBox").classList.remove("hidden");
  const fetchBtn = document.getElementById("fetchBtn");
  fetchBtn.disabled = true;
}

function hideLoading() {
  document.getElementById("loadingBox").classList.add("hidden");
  const fetchBtn = document.getElementById("fetchBtn");
  fetchBtn.disabled = false;
}

function hideResult() {
  document.getElementById("resultBox").classList.add("hidden");
}

function showError(message) {
  const errorBox = document.getElementById("errorBox");
  const errorMsg = document.getElementById("errorMessage");
  errorMsg.textContent = message;
  errorBox.classList.remove("hidden");
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  document.getElementById("errorBox").classList.add("hidden");
}

function resetApp() {
  document.getElementById("videoUrlInput").value = "";
  document.getElementById("clearBtn").classList.add("hidden");
  hideError();
  hideLoading();
  hideResult();
  closeProgressModal();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Download History (LocalStorage)
 */
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("ultra_dl_history") || "[]");
  } catch {
    return [];
  }
}

function addToHistory(videoData, url) {
  let history = getHistory();
  history = history.filter(item => item.url !== url);
  history.unshift({
    title: videoData.title,
    uploader: videoData.uploader,
    thumbnail: videoData.thumbnail,
    duration: videoData.durationFormatted,
    platform: videoData.platform,
    url: url,
    date: new Date().toLocaleDateString("ar-EG")
  });

  if (history.length > 6) {
    history = history.slice(0, 6);
  }

  localStorage.setItem("ultra_dl_history", JSON.stringify(history));
  loadHistory();
}

function loadHistory() {
  const history = getHistory();
  const section = document.getElementById("historySection");
  const list = document.getElementById("historyList");

  if (!section || !list) return;

  if (history.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  list.innerHTML = "";

  history.forEach(item => {
    const card = document.createElement("div");
    card.className = "p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-center gap-3 transition cursor-pointer";
    card.onclick = () => {
      document.getElementById("videoUrlInput").value = item.url;
      document.getElementById("clearBtn").classList.remove("hidden");
      fetchVideoInfo(item.url);
    };

    const platformMeta = getPlatformMetadata(item.platform);

    card.innerHTML = `
      <div class="relative w-16 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-slate-800">
        <img src="${item.thumbnail || ''}" class="w-full h-full object-cover" alt="Thumb">
        <div class="absolute top-1 right-1 p-0.5 rounded bg-slate-900/90 shadow">
          ${platformMeta.iconHtml}
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-bold text-white truncate">${item.title}</h4>
        <p class="text-[11px] text-slate-400 truncate mt-0.5">${item.uploader} • ${item.duration || ''}</p>
      </div>
      <i data-lucide="arrow-left" class="w-4 h-4 text-slate-500 shrink-0"></i>
    `;

    list.appendChild(card);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function clearHistory() {
  localStorage.removeItem("ultra_dl_history");
  loadHistory();
}

// Global functions for inline HTML calls
window.resetApp = resetApp;
window.hideError = hideError;
window.initiateDownload = initiateDownload;
window.fetchVideoInfo = fetchVideoInfo;

/* ========================================================
   PREMIUM CUSTOM CURSOR SYSTEM
   ======================================================== */
function initCustomCursor() {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  let cursorDot = document.querySelector(".custom-cursor-dot");
  let cursorRing = document.querySelector(".custom-cursor-ring");

  if (!cursorDot) {
    cursorDot = document.createElement("div");
    cursorDot.className = "custom-cursor-dot";
    document.body.appendChild(cursorDot);
  }

  if (!cursorRing) {
    cursorRing = document.createElement("div");
    cursorRing.className = "custom-cursor-ring";
    document.body.appendChild(cursorRing);
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = mouseX + "px";
    cursorDot.style.top = mouseY + "px";
  });

  function renderCursor() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    cursorRing.style.left = ringX + "px";
    cursorRing.style.top = ringY + "px";
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  window.addEventListener("click", (e) => {
    const ripple = document.createElement("div");
    ripple.className = "click-ripple";
    ripple.style.left = e.clientX + "px";
    ripple.style.top = e.clientY + "px";
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  window.addEventListener("mousedown", () => document.body.classList.add("cursor-clicking"));
  window.addEventListener("mouseup", () => document.body.classList.remove("cursor-clicking"));

  attachCursorHoverListeners();
}

function attachCursorHoverListeners() {
  document.querySelectorAll("button, a, .platform-chip, .quality-tab").forEach(el => {
    el.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover-link"));
    el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover-link"));
  });

  document.querySelectorAll("input, textarea").forEach(el => {
    el.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover-input"));
    el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover-input"));
  });

  document.querySelectorAll(".quality-card, #finalDownloadLink").forEach(el => {
    el.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover-download"));
    el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover-download"));
  });
}

