const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const downloaderService = require("./services/downloaderService");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Root route for Vercel / serverless
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Cache for video info to speed up subsequent clicks
const infoCache = new Map();

/**
 * Route: Fetch video details & dynamic qualities
 */
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string" || !url.trim().startsWith("http")) {
    return res.status(400).json({ error: "يرجى إدخال رابط فيديو صحيح يبدأ بـ http:// أو https://" });
  }

  const cleanUrl = url.trim();

  // Check cache (valid for 5 mins)
  const cached = infoCache.get(cleanUrl);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return res.json(cached.data);
  }

  try {
    const info = await downloaderService.getVideoInfo(cleanUrl);
    infoCache.set(cleanUrl, { data: info, timestamp: Date.now() });
    res.json(info);
  } catch (err) {
    console.error("Fetch info error:", err.message);
    res.status(500).json({ error: err.message || "تعذر جلب معلومات الفيديو" });
  }
});

/**
 * Route: Start download task
 */
app.post("/api/download", async (req, res) => {
  const { url, qualityId } = req.body;
  if (!url) {
    return res.status(400).json({ error: "رابط الفيديو مطلوب" });
  }

  try {
    // Get info to find quality option
    let info = null;
    const cached = infoCache.get(url.trim());
    if (cached) {
      info = cached.data;
    } else {
      info = await downloaderService.getVideoInfo(url.trim());
    }

    const qualityOption = (info.qualities || []).find(q => q.id === qualityId) || info.qualities[0] || {
      id: "default",
      type: "video",
      formatSelector: "bestvideo+bestaudio/best",
      ext: "mp4"
    };

    const jobId = crypto.randomBytes(8).toString("hex");
    const job = downloaderService.startDownload(jobId, url.trim(), qualityOption);

    res.json({
      jobId: job.id,
      title: info.title,
      quality: qualityOption,
      status: job.status
    });
  } catch (err) {
    console.error("Start download error:", err.message);
    res.status(500).json({ error: err.message || "تعذر بدء عملية التحميل" });
  }
});

/**
 * Route: SSE Real-time progress stream
 */
app.get("/api/progress/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = downloaderService.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: "المهمة غير موجودة أو انتهت صلاحيتها" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send immediate current state
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  const onProgress = (updatedJob) => {
    res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);
    if (updatedJob.status === "finished" || updatedJob.status === "error") {
      downloaderService.progressEmitter.removeListener(`progress:${jobId}`, onProgress);
      res.end();
    }
  };

  downloaderService.progressEmitter.on(`progress:${jobId}`, onProgress);

  req.on("close", () => {
    downloaderService.progressEmitter.removeListener(`progress:${jobId}`, onProgress);
  });
});

/**
 * Route: Deliver downloaded file
 */
app.get("/api/file/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = downloaderService.getJob(jobId);

  if (!job || !job.downloadedFile || !fs.existsSync(job.downloadedFile)) {
    return res.status(404).send("الملف غير موجود أو انتهت صلاحيته.");
  }

  const ext = path.extname(job.downloadedFile).replace(".", "") || (job.quality.ext || "mp4");
  const rawTitle = req.query.title || (job.quality && job.quality.label) || "download";
  const cleanTitle = rawTitle.replace(/[\/\\?%*:|"<>]/g, "_").trim() || `download_${jobId}`;
  const filename = `${cleanTitle}.${ext}`;

  res.download(job.downloadedFile, filename, (err) => {
    if (err) {
      if (!res.headersSent) {
        console.error(`[File Delivery Error for Job ${jobId}]:`, err.message);
        res.status(500).send("حدث خطأ أثناء إرسال الملف.");
      }
    } else {
      // Schedule cleanup 5 minutes after delivery
      setTimeout(() => {
        downloaderService.cleanupJob(jobId);
      }, 5 * 60 * 1000);
    }
  });
});

// Start Server
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`  🚀 Ultra Video Downloader is running!`);
    console.log(`  🌐 Local URL: http://localhost:${PORT}`);
    console.log(`=================================================`);
  });
}

module.exports = app;
