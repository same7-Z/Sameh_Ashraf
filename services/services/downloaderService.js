const { spawn, execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const EventEmitter = require("events");
const socialDownloader = require("./socialDownloader");

function getYtDlpPath() {
  const localExe = path.join(__dirname, "..", "bin", "yt-dlp.exe");
  if (fs.existsSync(localExe)) return localExe;
  const localLinux = path.join(__dirname, "..", "bin", "yt-dlp");
  if (fs.existsSync(localLinux)) return localLinux;
  return "yt-dlp";
}

const YT_DLP_PATH = getYtDlpPath();
const DOWNLOADS_DIR = process.env.VERCEL ? path.join("/tmp", "downloads") : path.join(__dirname, "..", "downloads");

// Ensure downloads directory exists
try {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }
} catch (e) {}

// Active jobs tracker
const jobs = new Map();
const progressEmitter = new EventEmitter();

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function detectPlatform(url) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) return "youtube";
  if (lowerUrl.includes("tiktok.com")) return "tiktok";
  if (lowerUrl.includes("instagram.com")) return "instagram";
  if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch") || lowerUrl.includes("fb.com")) return "facebook";
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) return "twitter";
  if (lowerUrl.includes("pinterest.com") || lowerUrl.includes("pin.it")) return "pinterest";
  if (lowerUrl.includes("reddit.com")) return "reddit";
  if (lowerUrl.includes("vimeo.com")) return "vimeo";
  return "other";
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "N/A";
  const sec = Math.floor(seconds);
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remainingSecs = sec % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

/**
 * Fetch video metadata and extract available qualities dynamically
 */
async function getVideoInfo(rawUrl) {
  const expandedUrl = await socialDownloader.expandUrl(rawUrl);
  const platform = detectPlatform(expandedUrl);

  // Dedicated TikTok Handler
  if (platform === "tiktok") {
    try {
      const ttInfo = await socialDownloader.getTikTokInfo(expandedUrl);
      if (ttInfo && ttInfo.qualities && ttInfo.qualities.length > 0) {
        return ttInfo;
      }
    } catch (err) {
      console.warn("[Dedicated TikTok Handler Error]:", err.message);
    }
  }

  // Dedicated Pinterest Handler (Videos & HD Photos)
  if (platform === "pinterest") {
    try {
      const pinInfo = await socialDownloader.getPinterestInfo(expandedUrl);
      if (pinInfo && pinInfo.qualities && pinInfo.qualities.length > 0) {
        return pinInfo;
      }
    } catch (err) {
      console.warn("[Dedicated Pinterest Handler Error]:", err.message);
    }
  }

  // Dedicated Instagram Handler
  if (platform === "instagram") {
    try {
      const igInfo = await socialDownloader.getInstagramInfo(expandedUrl);
      if (igInfo && igInfo.qualities && igInfo.qualities.length > 0) {
        return igInfo;
      }
    } catch (err) {
      console.warn("[Dedicated Instagram Handler Error]:", err.message);
    }
  }

  // General Engine via yt-dlp
  return new Promise((resolve, reject) => {
    const args = [
      expandedUrl,
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      "--ignore-errors",
      "--user-agent", DEFAULT_USER_AGENT,
      "--socket-timeout", "20"
    ];

    execFile(YT_DLP_PATH, args, { maxBuffer: 15 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error("yt-dlp error:", stderr || error.message);
        return reject(new Error(cleanErrorMessage(stderr || error.message, platform)));
      }

      try {
        const rawJson = stdout.trim().split("\n")[0];
        if (!rawJson) {
          return reject(new Error("لم نتمكن من جلب بيانات الفيديو، تأكد من صحة الرابط أو أن الفيديو متاح للعامة."));
        }
        const data = JSON.parse(rawJson);

        const result = {
          id: data.id,
          title: data.title || "فيديو بدون عنوان",
          description: data.description ? data.description.slice(0, 150) + "..." : "",
          thumbnail: data.thumbnail || (data.thumbnails && data.thumbnails.length ? data.thumbnails[data.thumbnails.length - 1].url : ""),
          duration: data.duration || 0,
          durationFormatted: formatDuration(data.duration),
          uploader: data.uploader || data.channel || data.creator || "غير معروف",
          viewCount: data.view_count ? data.view_count.toLocaleString() : null,
          platform: platform,
          extractor: data.extractor || platform,
          webpageUrl: data.webpage_url || expandedUrl,
          qualities: []
        };

        // Extract formats dynamically
        result.qualities = extractQualities(data, platform);

        resolve(result);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
        reject(new Error("حدث خطأ أثناء معالجة بيانات الفيديو."));
      }
    });
  });
}

function cleanErrorMessage(msg, platform) {
  if (msg.includes("IP address is blocked") || msg.includes("Access denied")) {
    return `تم حظر الطلب من خوادم ${platform || "المنصة"}. يرجى المحاولة لاحقاً أو تجربة رابط آخر.`;
  }
  if (msg.includes("Video unavailable") || msg.includes("Private video") || msg.includes("This video is private")) {
    return "هذا الفيديو غير متاح، محذوف، أو خاص (Private).";
  }
  if (msg.includes("Sign in to confirm your age") || msg.includes("login")) {
    return "الفيديو يتطلب تسجيل الدخول أو تأكيد السن على المنصة.";
  }
  if (msg.includes("Unsupported URL") || msg.includes("is not a valid URL")) {
    return "رابط الفيديو غير مدعوم أو غير مكتمل.";
  }
  return "تعذر جلب معلومات الفيديو، يرجى التأكد من أن الرابط متاح للعامة وصحيح.";
}

/**
 * Filter and categorize qualities dynamically
 */
function extractQualities(data, platform) {
  const formats = data.formats || [];
  const qualities = [];

  if (platform === "youtube") {
    const standardResolutions = [
      { height: 4320, label: "4320p (8K Ultra HD)", shortLabel: "8K Ultra HD", tag: "8K" },
      { height: 2160, label: "2160p (4K Ultra HD)", shortLabel: "4K Ultra HD", tag: "4K" },
      { height: 1440, label: "1440p (2K Quad HD)", shortLabel: "2K Quad HD", tag: "2K" },
      { height: 1080, label: "1080p (Full HD)", shortLabel: "1080p FHD", tag: "FHD" },
      { height: 720, label: "720p (High Definition)", shortLabel: "720p HD", tag: "HD" },
      { height: 480, label: "480p (Standard Definition)", shortLabel: "480p SD", tag: "SD" },
      { height: 360, label: "360p (Medium)", shortLabel: "360p", tag: "SD" },
      { height: 240, label: "240p (Low)", shortLabel: "240p", tag: "Low" },
      { height: 144, label: "144p (Very Low)", shortLabel: "144p", tag: "Low" }
    ];

    const videoFormats = formats.filter(f => f.vcodec && f.vcodec !== "none" && (f.height || f.resolution));
    const audioFormats = formats.filter(f => f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none"));
    const bestAudioSize = audioFormats.reduce((max, f) => Math.max(max, f.filesize || f.filesize_approx || 0), 0);
    const availableHeights = new Set(videoFormats.map(f => f.height).filter(Boolean));

    let isHighestMarked = false;

    standardResolutions.forEach(res => {
      const matchingFormats = videoFormats.filter(f => f.height === res.height);
      
      if (matchingFormats.length > 0) {
        const bestMatch = matchingFormats.sort((a, b) => (b.tbr || b.vbr || 0) - (a.tbr || a.vbr || 0))[0];
        const is60fps = bestMatch.fps && bestMatch.fps >= 50;
        
        let estimatedSize = null;
        if (bestMatch.filesize || bestMatch.filesize_approx) {
          const vSize = bestMatch.filesize || bestMatch.filesize_approx;
          estimatedSize = formatFileSize(vSize + bestAudioSize);
        } else if (data.duration && (bestMatch.tbr || bestMatch.vbr)) {
          const totalBitrate = (bestMatch.tbr || ((bestMatch.vbr || 1000) + 128)) * 1024;
          const estimatedBytes = (totalBitrate * data.duration) / 8;
          estimatedSize = formatFileSize(estimatedBytes);
        }

        const isHighest = !isHighestMarked;
        if (isHighest) isHighestMarked = true;

        qualities.push({
          id: `video_${res.height}`,
          type: "video",
          resolution: `${res.height}p`,
          label: is60fps ? `${res.label} 60fps` : res.label,
          shortLabel: is60fps ? `${res.shortLabel} 60fps` : res.shortLabel,
          height: res.height,
          fps: bestMatch.fps || null,
          ext: "mp4",
          tag: res.tag,
          isRecommended: res.height === 1080 || (res.height === 720 && !availableHeights.has(1080)),
          isHighest: isHighest,
          size: estimatedSize,
          formatSelector: `bestvideo[height<=${res.height}]+bestaudio/best[height<=${res.height}]/best`
        });
      }
    });

    if (qualities.length === 0 && videoFormats.length > 0) {
      qualities.push({
        id: "video_best",
        type: "video",
        resolution: "Best",
        label: "أعلى جودة متوفرة (Best Quality)",
        shortLabel: "Best HD",
        ext: "mp4",
        tag: "HD",
        isRecommended: true,
        isHighest: true,
        size: null,
        formatSelector: "bestvideo+bestaudio/best"
      });
    }

    // Audio formats
    let audioSizeEst = null;
    if (bestAudioSize > 0) {
      audioSizeEst = formatFileSize(bestAudioSize);
    } else if (data.duration) {
      audioSizeEst = formatFileSize((320 * 1024 * data.duration) / 8);
    }

    qualities.push({
      id: "audio_mp3_320",
      type: "audio",
      resolution: "MP3 320kbps",
      label: "صوت عالي النقاء MP3 (320 kbps)",
      shortLabel: "MP3 (HQ)",
      ext: "mp3",
      tag: "Audio",
      isAudio: true,
      size: audioSizeEst,
      formatSelector: "bestaudio/best",
      postProcess: "mp3"
    });

    qualities.push({
      id: "audio_m4a",
      type: "audio",
      resolution: "M4A Original",
      label: "صوت أصلي M4A / AAC",
      shortLabel: "M4A Audio",
      ext: "m4a",
      tag: "Audio",
      isAudio: true,
      size: audioSizeEst,
      formatSelector: "bestaudio[ext=m4a]/bestaudio/best"
    });

  } else {
    // Facebook, Twitter, and other Social Media Platforms
    let bestSize = null;
    if (data.filesize || data.filesize_approx) {
      bestSize = formatFileSize(data.filesize || data.filesize_approx);
    }

    const hasHd = formats.some(f => (f.format_note && f.format_note.toLowerCase().includes("hd")) || (f.height && f.height >= 720) || f.format_id === "hd");
    const hasSd = formats.some(f => (f.format_note && f.format_note.toLowerCase().includes("sd")) || (f.height && f.height < 720 && f.height > 0) || f.format_id === "sd");

    qualities.push({
      id: "social_best_hd",
      type: "video",
      resolution: hasHd ? "HD 1080p/720p" : "Original Quality",
      label: "أعلى جودة متوفرة (HD Best Quality)",
      shortLabel: "HD Original",
      ext: "mp4",
      tag: "HD",
      isRecommended: true,
      isHighest: true,
      size: bestSize,
      formatSelector: "bestvideo+bestaudio/best"
    });

    if (hasSd) {
      qualities.push({
        id: "social_sd",
        type: "video",
        resolution: "SD Standard",
        label: "جودة عادية / حجم أصغر (SD Quality)",
        shortLabel: "SD Quality",
        ext: "mp4",
        tag: "SD",
        isRecommended: false,
        isHighest: false,
        size: null,
        formatSelector: "worstvideo[height>=360]+bestaudio/worst/best"
      });
    }

    qualities.push({
      id: "social_audio_mp3",
      type: "audio",
      resolution: "MP3 Audio",
      label: "استخراج الصوت فقط MP3",
      shortLabel: "MP3 Audio",
      ext: "mp3",
      tag: "Audio",
      isAudio: true,
      size: null,
      formatSelector: "bestaudio/best",
      postProcess: "mp3"
    });
  }

  return qualities;
}

/**
 * Start download task with real-time SSE progress
 */
function startDownload(jobId, url, qualityOption) {
  const isImage = qualityOption.type === "image" || qualityOption.isImage || qualityOption.ext === "jpg" || qualityOption.ext === "png" || qualityOption.ext === "webp";
  const isAudioMp3 = qualityOption.postProcess === "mp3" || qualityOption.ext === "mp3";
  let outputExt = "mp4";
  if (isImage) {
    outputExt = qualityOption.ext || "jpg";
  } else if (isAudioMp3) {
    outputExt = "mp3";
  }
  
  const outputFilename = `${jobId}.${outputExt}`;
  const outputPath = path.join(DOWNLOADS_DIR, outputFilename);

  const job = {
    id: jobId,
    url: url,
    quality: qualityOption,
    outputPath: outputPath,
    outputFilename: outputFilename,
    status: "starting",
    progress: 0,
    speed: "",
    eta: "",
    totalSize: "",
    downloadedFile: null,
    error: null,
    createdAt: Date.now()
  };

  jobs.set(jobId, job);

  // Check if this is a direct stream download (TikTok, Pinterest, Instagram, etc.)
  const isDirect = Boolean(
    qualityOption.directUrl ||
    qualityOption.isDirectStream ||
    qualityOption.type === "direct_url" ||
    qualityOption.type === "image" ||
    qualityOption.isImage ||
    (qualityOption.id && (qualityOption.id.startsWith("tt_") || qualityOption.id.startsWith("ig_") || qualityOption.id.startsWith("pin_"))) ||
    url.includes("tiktok.com") ||
    url.includes("instagram.com") ||
    url.includes("pinterest.com") ||
    url.includes("pin.it")
  );

  if (isDirect) {
    job.status = "downloading";
    progressEmitter.emit(`progress:${jobId}`, job);

    (async () => {
      try {
        let streamUrl = qualityOption.directUrl;
        
        // If directUrl is missing from qualityOption, re-fetch it dynamically
        if (!streamUrl) {
          if (url.includes("tiktok.com")) {
            const freshInfo = await socialDownloader.getTikTokInfo(url);
            const matchingQ = (freshInfo.qualities || []).find(q => q.id === qualityOption.id) || freshInfo.qualities[0];
            streamUrl = matchingQ ? (matchingQ.directUrl || matchingQ.url) : null;
          } else if (url.includes("pinterest.com") || url.includes("pin.it")) {
            const freshInfo = await socialDownloader.getPinterestInfo(url);
            const matchingQ = (freshInfo.qualities || []).find(q => q.id === qualityOption.id) || freshInfo.qualities[0];
            streamUrl = matchingQ ? (matchingQ.directUrl || matchingQ.url) : null;
          } else if (url.includes("instagram.com")) {
            const freshInfo = await socialDownloader.getInstagramInfo(url);
            const matchingQ = (freshInfo.qualities || []).find(q => q.id === qualityOption.id) || freshInfo.qualities[0];
            streamUrl = matchingQ ? (matchingQ.directUrl || matchingQ.url) : null;
          }
        }

        if (!streamUrl) {
          throw new Error("تعذر العثور على رابط البث المباشر للفيديو");
        }

        console.log(`[Job ${jobId}] Starting Direct Stream Download from: ${streamUrl.slice(0, 80)}...`);

        const filePath = await socialDownloader.downloadDirectStream(jobId, streamUrl, outputExt, (prog) => {
          job.progress = prog.progress;
          job.speed = prog.speed;
          job.eta = prog.eta;
          job.totalSize = prog.totalSize;
          progressEmitter.emit(`progress:${jobId}`, job);
        });

        job.status = "finished";
        job.progress = 100;
        job.downloadedFile = filePath;
        console.log(`[Job ${jobId}] Direct Download Complete: ${filePath}`);
        progressEmitter.emit(`progress:${jobId}`, job);

        setTimeout(() => {
          cleanupJob(jobId);
        }, 30 * 60 * 1000);
      } catch (err) {
        console.error(`[Job ${jobId}] Direct Download Error:`, err.message);
        job.status = "error";
        job.error = "حدث خطأ أثناء تحميل الفيديو من المصدر.";
        progressEmitter.emit(`progress:${jobId}`, job);
      }
    })();

    return job;
  }

  // yt-dlp Download Pipeline
  const args = [
    url,
    "--no-playlist",
    "--newline",
    "--user-agent", DEFAULT_USER_AGENT,
    "--progress-template", "download:[PROGRESS] %(progress._percent_str)s | %(progress._speed_str)s | %(progress._eta_str)s | %(progress._total_bytes_estimate_str)s",
    "-o", path.join(DOWNLOADS_DIR, `${jobId}.%(ext)s`)
  ];

  if (isAudioMp3) {
    args.push(
      "-x",
      "--audio-format", "mp3",
      "--audio-quality", "0",
      "-f", "bestaudio/best"
    );
  } else {
    const selector = qualityOption.formatSelector || "bestvideo+bestaudio/best";
    args.push(
      "-f", selector,
      "--merge-output-format", "mp4"
    );
  }

  console.log(`[Job ${jobId}] Spawning yt-dlp with args:`, args.join(" "));

  const child = spawn(YT_DLP_PATH, args);

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    parseProgressOutput(job, text);
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    console.log(`[Job ${jobId} stderr]:`, text.trim());
    if (text.includes("ffmpeg") || text.includes("Merging") || text.includes("ExtractAudio")) {
      job.status = "merging";
      progressEmitter.emit(`progress:${jobId}`, job);
    }
  });

  child.on("close", (code) => {
    if (code === 0) {
      const foundFile = findOutputFile(jobId, outputExt);
      if (foundFile) {
        job.status = "finished";
        job.progress = 100;
        job.downloadedFile = foundFile;
        console.log(`[Job ${jobId}] Finished successfully: ${foundFile}`);
      } else {
        job.status = "error";
        job.error = "الملف تم تحميله ولكن تعذر العثور عليه على السيرفر.";
      }
    } else {
      job.status = "error";
      job.error = "حدث خطأ أثناء تحميل الفيديو من المصدر.";
    }
    progressEmitter.emit(`progress:${jobId}`, job);

    setTimeout(() => {
      cleanupJob(jobId);
    }, 30 * 60 * 1000);
  });

  child.on("error", (err) => {
    console.error(`[Job ${jobId}] Process error:`, err);
    job.status = "error";
    job.error = err.message;
    progressEmitter.emit(`progress:${jobId}`, job);
  });

  return job;
}

function parseProgressOutput(job, text) {
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.includes("[PROGRESS]")) {
      const parts = line.split("[PROGRESS]")[1].split("|").map(s => s.trim());
      if (parts.length >= 3) {
        const rawPercent = parts[0].replace("%", "").trim();
        const percent = parseFloat(rawPercent);
        if (!isNaN(percent)) {
          job.progress = Math.min(Math.round(percent), 99);
          job.status = "downloading";
        }
        job.speed = parts[1] || "";
        job.eta = parts[2] || "";
        job.totalSize = parts[3] || "";
        progressEmitter.emit(`progress:${job.id}`, job);
      }
    } else if (line.includes("[Merger]") || line.includes("[ExtractAudio]") || line.includes("Destination:")) {
      if (job.status !== "finished") {
        job.status = "merging";
        progressEmitter.emit(`progress:${job.id}`, job);
      }
    }
  }
}

function findOutputFile(jobId, defaultExt) {
  const files = fs.readdirSync(DOWNLOADS_DIR);
  const match = files.find(f => f.startsWith(jobId) && !f.endsWith(".part") && !f.endsWith(".ytdl"));
  if (match) {
    return path.join(DOWNLOADS_DIR, match);
  }
  return null;
}

function getJob(jobId) {
  return jobs.get(jobId);
}

function cleanupJob(jobId) {
  const job = jobs.get(jobId);
  if (job && job.downloadedFile && fs.existsSync(job.downloadedFile)) {
    try {
      fs.unlinkSync(job.downloadedFile);
      console.log(`[Cleanup] Deleted file for job ${jobId}`);
    } catch (e) {
      console.error(`[Cleanup error] for job ${jobId}:`, e);
    }
  }
  jobs.delete(jobId);
}

module.exports = {
  detectPlatform,
  getVideoInfo,
  startDownload,
  getJob,
  cleanupJob,
  progressEmitter
};
