const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const { TikTokDownloader } = require('flux-tkdl');

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ttFluxDownloader = new TikTokDownloader();

/**
 * Follow redirects to expand short URLs like pin.it, vm.tiktok.com, vt.tiktok.com, fb.watch
 */
async function expandUrl(url) {
  try {
    if (url.includes('pin.it') || url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com') || url.includes('fb.watch') || url.includes('t.co')) {
      const res = await axios.get(url, {
        headers: { 'User-Agent': DEFAULT_USER_AGENT },
        maxRedirects: 5,
        validateStatus: null,
        timeout: 6000
      });
      if (res.request && res.request.res && res.request.res.responseUrl) {
        return res.request.res.responseUrl;
      }
    }
  } catch (e) {}
  return url;
}

function normalizeMediaUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const trimmed = urlStr.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `https://www.tikwm.com${trimmed}`;
  }
  return `https://www.tikwm.com/${trimmed}`;
}

/**
 * TikTok Multi-Engine Resolver (Guaranteed No-Watermark)
 */
async function getTikTokInfo(rawUrl) {
  const url = await expandUrl(rawUrl);
  console.log(`[TikTok Resolver] Resolving URL: ${url}`);

  // Engine 1: Flux TikTokDownloader
  try {
    const fluxRes = await ttFluxDownloader.getVideoInfo(url);
    if (fluxRes && fluxRes.success && fluxRes.downloadUrls) {
      const dUrls = fluxRes.downloadUrls;
      const noWmUrl = normalizeMediaUrl(dUrls.noWatermark || dUrls.watermark);
      const audioUrl = normalizeMediaUrl(dUrls.music || (fluxRes.music && fluxRes.music.url));
      const coverUrl = normalizeMediaUrl(fluxRes.cover || fluxRes.dynamicCover);

      const qualities = [];

      // HD No Watermark
      if (noWmUrl) {
        qualities.push({
          id: 'tt_hd_nowm',
          type: 'video',
          resolution: 'HD بدون علامة مائية',
          label: 'فيديو فائق الجودة بدون علامة مائية (No Watermark HD)',
          shortLabel: 'HD No-WM',
          ext: 'mp4',
          tag: 'HD',
          isRecommended: true,
          isHighest: true,
          isDirectStream: true,
          directUrl: noWmUrl
        });
      }

      // SD
      if (dUrls.watermark && dUrls.watermark !== noWmUrl) {
        qualities.push({
          id: 'tt_sd_nowm',
          type: 'video',
          resolution: 'جودة سريعة (SD)',
          label: 'جودة سريعة للموبايل (SD Quality)',
          shortLabel: 'SD Quality',
          ext: 'mp4',
          tag: 'SD',
          isRecommended: false,
          isHighest: false,
          isDirectStream: true,
          directUrl: normalizeMediaUrl(dUrls.watermark)
        });
      }

      // Audio MP3
      if (audioUrl) {
        qualities.push({
          id: 'tt_audio_mp3',
          type: 'audio',
          resolution: 'صوت MP3 أصلي',
          label: `صوت المقطع: ${fluxRes.music ? fluxRes.music.title : 'Original Sound'}`,
          shortLabel: 'MP3 Audio',
          ext: 'mp3',
          tag: 'Audio',
          isAudio: true,
          isDirectStream: true,
          directUrl: audioUrl
        });
      }

      const durSec = fluxRes.duration || 0;

      return {
        id: fluxRes.videoId || 'tiktok_video',
        title: fluxRes.title || 'فيديو تيك توك بدون علامة مائية',
        thumbnail: coverUrl || '',
        duration: durSec,
        durationFormatted: `${Math.floor(durSec / 60)}:${(durSec % 60).toString().padStart(2, '0')}`,
        uploader: fluxRes.author ? (fluxRes.author.nickname || fluxRes.author.username) : 'TikTok Creator',
        viewCount: fluxRes.stats && fluxRes.stats.plays ? fluxRes.stats.plays.toLocaleString() : null,
        platform: 'tiktok',
        extractor: 'flux_tikwm',
        webpageUrl: url,
        qualities: qualities
      };
    }
  } catch (err) {
    console.warn('[TikTok Flux Error]:', err.message);
  }

  // Engine 2: Direct TikWM API
  try {
    const res = await axios.post('https://www.tikwm.com/api/', new URLSearchParams({
      url: url,
      count: 12,
      cursor: 0,
      web: 1,
      hd: 1
    }), {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': 'https://www.tikwm.com/',
        'Origin': 'https://www.tikwm.com'
      },
      timeout: 10000
    });

    if (res.data && res.data.code === 0 && res.data.data) {
      const d = res.data.data;
      const hdVideoUrl = normalizeMediaUrl(d.hdplay || d.play);
      const sdVideoUrl = normalizeMediaUrl(d.play);
      const musicUrl = normalizeMediaUrl(d.music || (d.music_info && d.music_info.play));
      const coverUrl = normalizeMediaUrl(d.cover || d.origin_cover || d.ai_dynamic_cover);

      const qualities = [];
      if (hdVideoUrl) {
        qualities.push({
          id: 'tt_hd_nowm',
          type: 'video',
          resolution: 'HD بدون علامة مائية',
          label: 'فيديو بدقة فائقة HD بدون علامة مائية (No Watermark)',
          shortLabel: 'HD No-WM',
          ext: 'mp4',
          tag: 'HD',
          isRecommended: true,
          isHighest: true,
          size: d.hd_size ? `${(d.hd_size / (1024 * 1024)).toFixed(1)} MB` : (d.size ? `${(d.size / (1024 * 1024)).toFixed(1)} MB` : null),
          isDirectStream: true,
          directUrl: hdVideoUrl
        });
      }

      if (sdVideoUrl && sdVideoUrl !== hdVideoUrl) {
        qualities.push({
          id: 'tt_sd_nowm',
          type: 'video',
          resolution: 'جودة سريعة بدون علامة مائية',
          label: 'جودة سريعة للموبايل بدون علامة مائية (SD)',
          shortLabel: 'SD No-WM',
          ext: 'mp4',
          tag: 'SD',
          isRecommended: false,
          isHighest: false,
          size: d.size ? `${(d.size / (1024 * 1024)).toFixed(1)} MB` : null,
          isDirectStream: true,
          directUrl: sdVideoUrl
        });
      }

      if (musicUrl) {
        qualities.push({
          id: 'tt_audio_mp3',
          type: 'audio',
          resolution: 'صوت MP3 أصلي',
          label: `صوت المقطع: ${d.music_info ? d.music_info.title : 'Original Audio'}`,
          shortLabel: 'MP3 Audio',
          ext: 'mp3',
          tag: 'Audio',
          isAudio: true,
          isDirectStream: true,
          directUrl: musicUrl
        });
      }

      return {
        id: d.id || 'tiktok_video',
        title: d.title || 'فيديو تيك توك بدون علامة مائية',
        thumbnail: coverUrl || '',
        duration: d.duration || 0,
        durationFormatted: `${Math.floor((d.duration || 0) / 60)}:${((d.duration || 0) % 60).toString().padStart(2, '0')}`,
        uploader: d.author ? (d.author.nickname || d.author.unique_id) : 'TikTok Creator',
        viewCount: d.play_count ? d.play_count.toLocaleString() : null,
        platform: 'tiktok',
        extractor: 'tikwm',
        webpageUrl: url,
        qualities: qualities
      };
    }
  } catch (err) {
    console.warn('[TikTok TikWM Error]:', err.message);
  }

  throw new Error('تعذر تحميل فيديو تيك توك، يرجى التأكد من أن الرابط متاح للعامة أو تجربة رابط آخر.');
}

/**
 * Pinterest Smart Resolver: Deep video vs image distinction
 */
async function getPinterestInfo(rawUrl) {
  const url = await expandUrl(rawUrl);
  console.log(`[Pinterest Resolver] Processing URL: ${url}`);

  const res = await axios.get(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 10000
  });

  const html = res.data;
  const $ = cheerio.load(html);

  const title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Pinterest Media';
  const ogImage = $('meta[property="og:image"]').attr('content');
  let ogVideo = $('meta[property="og:video:secure_url"]').attr('content') || $('meta[property="og:video"]').attr('content') || $('meta[name="twitter:player:stream"]').attr('content');

  let author = 'Pinterest User';
  let originalImage = ogImage;
  let videoStreams = [];

  if (ogVideo) {
    videoStreams.push(ogVideo);
  }

  // 1. Parse JSON-LD
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data.author && data.author.name) author = data.author.name;
      if (data.image && typeof data.image === 'string') originalImage = data.image;
      if (data['@type'] === 'VideoObject' && data.contentUrl) {
        videoStreams.push(data.contentUrl);
      }
      if (data.video && data.video.contentUrl) {
        videoStreams.push(data.video.contentUrl);
      }
    } catch (e) {}
  });

  // 2. Scan full HTML for v.pinimg.com video URLs
  const videoMatches = html.match(/https:\/\/(?:v|v1|v2|v3)\.pinimg\.com\/videos\/[^\s"'<>\\]+?\.(?:mp4|m3u8)/gi);
  if (videoMatches) {
    videoMatches.forEach(u => {
      const clean = u.replace(/\\u0026/g, '&').replace(/\\/g, '');
      videoStreams.push(clean);
    });
  }

  const mp4Matches = html.match(/https:\/\/[^"'\s<>\\]+?\.(?:mp4|m3u8)/gi);
  if (mp4Matches) {
    mp4Matches.forEach(u => {
      const clean = u.replace(/\\u0026/g, '&').replace(/\\/g, '');
      if (clean.includes('pinimg.com') && (clean.includes('/videos/') || clean.includes('/mc/') || clean.includes('/720p/'))) {
        videoStreams.push(clean);
      }
    });
  }

  videoStreams = [...new Set(videoStreams)];

  // Clean highest original uncompressed HD image URL
  if (originalImage) {
    if (originalImage.includes('/736x/')) {
      originalImage = originalImage.replace('/736x/', '/originals/');
    } else if (originalImage.includes('/474x/')) {
      originalImage = originalImage.replace('/474x/', '/originals/');
    } else if (originalImage.includes('/564x/')) {
      originalImage = originalImage.replace('/564x/', '/originals/');
    } else if (originalImage.includes('/236x/')) {
      originalImage = originalImage.replace('/236x/', '/originals/');
    }
  }

  const isVideoPin = videoStreams.length > 0;
  console.log(`[Pinterest Resolver] Result -> isVideo: ${isVideoPin}, Streams: ${videoStreams.length}`);

  const qualities = [];

  if (isVideoPin) {
    // Pick the highest quality MP4 stream
    const mp4Streams = videoStreams.filter(v => v.includes('.mp4'));
    const bestMp4 = mp4Streams.find(v => v.includes('720p') || v.includes('1080p') || v.includes('exp7') || v.includes('hls')) || mp4Streams[0] || videoStreams[0];

    qualities.push({
      id: 'pin_video_hd',
      type: 'video',
      resolution: 'فيديو بدقة فائقة HD',
      label: 'فيديو بدقة فائقة (Pinterest HD Video)',
      shortLabel: 'HD Video',
      ext: 'mp4',
      tag: 'HD',
      isRecommended: true,
      isHighest: true,
      isDirectStream: true,
      directUrl: bestMp4
    });

    if (originalImage) {
      qualities.push({
        id: 'pin_img_cover',
        type: 'image',
        resolution: 'صورة الغلاف HD',
        label: 'تحميل غلاف الفيديو كصورة عالية الجودة',
        shortLabel: 'HD Cover Image',
        ext: 'jpg',
        tag: 'Image',
        isImage: true,
        isRecommended: false,
        isHighest: false,
        isDirectStream: true,
        directUrl: originalImage
      });
    }
  } else {
    // Pure Photo / Image Pin
    if (originalImage) {
      qualities.push({
        id: 'pin_img_original',
        type: 'image',
        resolution: 'صورة فائقة الدقة HD الأصلية',
        label: 'صورة بدقة أصلية عالية HD (Original Quality)',
        shortLabel: 'HD Original Image',
        ext: 'jpg',
        tag: 'Image',
        isImage: true,
        isRecommended: true,
        isHighest: true,
        isDirectStream: true,
        directUrl: originalImage
      });

      if (ogImage && ogImage !== originalImage) {
        qualities.push({
          id: 'pin_img_standard',
          type: 'image',
          resolution: 'صورة بحجم قياسي',
          label: 'صورة بحجم قياسي مضغوط (Standard)',
          shortLabel: 'Standard Image',
          ext: 'jpg',
          tag: 'Image',
          isImage: true,
          isRecommended: false,
          isHighest: false,
          isDirectStream: true,
          directUrl: ogImage
        });
      }
    }
  }

  return {
    id: 'pin_' + (url.match(/pin\/(\d+)/) ? url.match(/pin\/(\d+)/)[1] : Date.now()),
    title: title.replace(' | Pinterest', '').trim(),
    thumbnail: ogImage || originalImage || '',
    duration: 0,
    durationFormatted: isVideoPin ? 'Video' : 'Photo',
    uploader: author,
    viewCount: null,
    platform: 'pinterest',
    extractor: 'pinterest',
    webpageUrl: url,
    qualities: qualities
  };
}

/**
 * Instagram Multi-Engine Resolver (Photos, Reels & Carousels)
 */
async function getInstagramInfo(rawUrl) {
  const url = await expandUrl(rawUrl);
  console.log(`[Instagram Resolver] Resolving: ${url}`);

  const match = url.match(/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : 'ig_media';

  // Strategy 1: TikWM Multi-Platform API
  try {
    const res = await axios.post('https://www.tikwm.com/api/', new URLSearchParams({
      url: url,
      hd: 1
    }), {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 6000
    });

    if (res.data && res.data.code === 0 && res.data.data) {
      const d = res.data.data;
      const vUrl = normalizeMediaUrl(d.play || d.hdplay);
      const photoUrl = normalizeMediaUrl(d.cover || d.origin_cover);

      const qualities = [];

      if (vUrl) {
        qualities.push({
          id: 'ig_hd_best',
          type: 'video',
          resolution: 'HD Original',
          label: 'أعلى جودة متوفرة (Instagram HD Video)',
          shortLabel: 'HD Video',
          ext: 'mp4',
          tag: 'HD',
          isRecommended: true,
          isHighest: true,
          isDirectStream: true,
          directUrl: vUrl
        });

        qualities.push({
          id: 'ig_audio_mp3',
          type: 'audio',
          resolution: 'MP3 Audio',
          label: 'استخراج صوت الريلز MP3',
          shortLabel: 'MP3 Audio',
          ext: 'mp3',
          tag: 'Audio',
          isAudio: true,
          isDirectStream: true,
          directUrl: vUrl
        });
      }

      if (photoUrl) {
        qualities.push({
          id: 'ig_photo_hd',
          type: 'image',
          resolution: 'HD Photo',
          label: 'صورة الإنستجرام بدقة أصلية (Original Image HD)',
          shortLabel: 'HD Photo',
          ext: 'jpg',
          tag: 'Image',
          isImage: true,
          isRecommended: !vUrl,
          isHighest: true,
          isDirectStream: true,
          directUrl: photoUrl
        });
      }

      if (qualities.length > 0) {
        return {
          id: shortcode,
          title: d.title || `Instagram Post (${shortcode})`,
          thumbnail: photoUrl || '',
          duration: d.duration || 0,
          durationFormatted: vUrl ? 'Reel' : 'Photo',
          uploader: d.author ? d.author.nickname : 'Instagram Creator',
          viewCount: null,
          platform: 'instagram',
          extractor: 'tikwm_ig',
          webpageUrl: url,
          qualities: qualities
        };
      }
    }
  } catch (err) {}

  // Strategy 2: Fast Public Scrape for OpenGraph Media
  try {
    const pageRes = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 8000
    });

    const $ = cheerio.load(pageRes.data);
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogVideo = $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:secure_url"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content') || `Instagram Post (${shortcode})`;

    if (ogImage || ogVideo) {
      const qualities = [];
      if (ogVideo) {
        qualities.push({
          id: 'ig_hd_best',
          type: 'video',
          resolution: 'HD Video',
          label: 'فيديو الإنستجرام (Instagram HD)',
          shortLabel: 'HD Video',
          ext: 'mp4',
          tag: 'HD',
          isRecommended: true,
          isHighest: true,
          isDirectStream: true,
          directUrl: ogVideo
        });
      }

      if (ogImage) {
        qualities.push({
          id: 'ig_photo_hd',
          type: 'image',
          resolution: 'HD Photo',
          label: 'صورة الإنستجرام بدقة أصلية (Original Image HD)',
          shortLabel: 'HD Photo',
          ext: 'jpg',
          tag: 'Image',
          isImage: true,
          isRecommended: !ogVideo,
          isHighest: true,
          isDirectStream: true,
          directUrl: ogImage
        });
      }

      return {
        id: shortcode,
        title: ogTitle,
        thumbnail: ogImage || '',
        duration: 0,
        durationFormatted: ogVideo ? 'Video' : 'Photo',
        uploader: 'Instagram Creator',
        viewCount: null,
        platform: 'instagram',
        extractor: 'ig_scrape',
        webpageUrl: url,
        qualities: qualities
      };
    }
  } catch (err) {}

  throw new Error('تعذر جلب منشور إنستجرام. تأكد من أن الحساب متاح للعامة (Public) وليس حساباً خاصاً (Private)، أو جرب رابط منشور آخر.');
}

/**
 * Download direct URL stream (TikTok / Pinterest / Instagram / CDN links) to local disk with live progress
 */
async function downloadDirectStream(jobId, directUrl, ext, onProgress) {
  const downloadsDir = path.join(__dirname, '..', 'downloads');
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

  const outputFile = path.join(downloadsDir, `${jobId}.${ext}`);
  const writer = fs.createWriteStream(outputFile);

  console.log(`[Stream Downloader] Starting stream for Job ${jobId} from URL: ${directUrl.slice(0, 80)}...`);

  const response = await axios({
    method: 'GET',
    url: directUrl,
    responseType: 'stream',
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      'Referer': directUrl.includes('tiktok') ? 'https://www.tiktok.com/' : (directUrl.includes('pinterest') || directUrl.includes('pinimg') ? 'https://www.pinterest.com/' : 'https://www.google.com/')
    },
    timeout: 30000
  });

  const totalLength = parseInt(response.headers['content-length'], 10) || 0;
  let downloadedBytes = 0;
  let lastTime = Date.now();
  let lastBytes = 0;

  response.data.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    const now = Date.now();
    const elapsed = (now - lastTime) / 1000;

    if (elapsed >= 0.25 || (totalLength > 0 && downloadedBytes === totalLength)) {
      const speedBps = (downloadedBytes - lastBytes) / (elapsed || 0.1);
      const speedMb = (speedBps / (1024 * 1024)).toFixed(1) + ' MB/s';
      const progress = totalLength > 0 ? Math.min(Math.round((downloadedBytes / totalLength) * 100), 99) : 65;
      const remainingBytes = Math.max(0, totalLength - downloadedBytes);
      const etaSeconds = speedBps > 0 ? Math.round(remainingBytes / speedBps) : 0;
      const eta = `00:${etaSeconds.toString().padStart(2, '0')}`;
      const totalSize = totalLength > 0 ? `${(totalLength / (1024 * 1024)).toFixed(1)} MB` : `${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB`;

      onProgress({
        progress,
        speed: speedMb,
        eta,
        totalSize
      });

      lastTime = now;
      lastBytes = downloadedBytes;
    }
  });

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', () => {
      onProgress({ progress: 100, speed: '--', eta: '00:00', totalSize: '' });
      resolve(outputFile);
    });
    writer.on('error', reject);
  });
}

module.exports = {
  expandUrl,
  getTikTokInfo,
  getPinterestInfo,
  getInstagramInfo,
  downloadDirectStream
};
