(() => {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 1140;
  const FRAME_DIR = 'Real_state_video_JPG_60fps_720p';
  const FRAME_PREFIX = 'frame_';
  const FRAME_EXT = '.jpg';
  const DIGITS = 5;

  // Smoothing damping factor (0.07 - 0.10 for cinematic glide)
  const LERP_FACTOR = 0.085;

  // Scaffold stride for rapid initial keyframes
  const KEYFRAME_STRIDE = 10;

  // --- Canvas & Context ---
  const canvas = document.getElementById('sequence-canvas');
  const wordmark = document.getElementById('luxeliving-wordmark');
  const heroOverlay = document.getElementById('hero-overlay');
  const heroCtaBtn = document.getElementById('hero-cta-btn');
  const entranceOverlay = document.getElementById('entrance-overlay');
  const diningOverlay = document.getElementById('dining-overlay');
  const bedroomOverlay = document.getElementById('bedroom-overlay');
  const poolOverlay = document.getElementById('pool-overlay');
  const entertainmentOverlay = document.getElementById('entertainment-overlay');
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  });

  // --- State ---
  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = 1;

  let currentFrame = 1;
  let targetFrame = 1;
  let currentProgress = 0;
  let targetProgress = 0;
  let lastDrawnImage = null;

  // Image storage: 1-indexed (index 1 to 1140)
  const images = new Array(TOTAL_FRAMES + 1);
  const loaded = new Uint8Array(TOTAL_FRAMES + 1);

  // --- Path Helper ---
  function getFrameUrl(index) {
    const padded = String(index).padStart(DIGITS, '0');
    return `${FRAME_DIR}/${FRAME_PREFIX}${padded}${FRAME_EXT}`;
  }

  // --- Frame Loading ---
  function loadFrame(index, callback) {
    if (index < 1 || index > TOTAL_FRAMES) return;

    if (images[index]) {
      if (loaded[index] && callback) {
        callback(images[index]);
      }
      return;
    }

    const img = new Image();
    images[index] = img;

    img.onload = () => {
      loaded[index] = 1;
      if (callback) {
        callback(img);
      }
      // If the user is currently looking at this frame, repaint immediately
      const activeFrame = Math.round(currentFrame);
      if (activeFrame === index || (lastDrawnImage !== img && Math.abs(activeFrame - index) <= 1)) {
        drawFrame(currentFrame);
      }
    };

    img.onerror = () => {
      loaded[index] = 0;
    };

    img.src = getFrameUrl(index);
  }

  // Preload a window of frames around a center index
  function preloadWindow(centerIndex, radius = 25) {
    const start = Math.max(1, centerIndex - radius);
    const end = Math.min(TOTAL_FRAMES, centerIndex + radius);

    loadFrame(centerIndex);
    for (let offset = 1; offset <= radius; offset++) {
      if (centerIndex - offset >= 1) loadFrame(centerIndex - offset);
      if (centerIndex + offset <= TOTAL_FRAMES) loadFrame(centerIndex + offset);
    }
  }

  // Find closest loaded frame for zero-black-frame fallback
  function getClosestLoadedFrame(targetIdx) {
    const idx = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(targetIdx)));
    if (loaded[idx] && images[idx]) {
      return images[idx];
    }

    let dist = 1;
    while (idx - dist >= 1 || idx + dist <= TOTAL_FRAMES) {
      const left = idx - dist;
      if (left >= 1 && loaded[left] && images[left]) {
        return images[left];
      }
      const right = idx + dist;
      if (right <= TOTAL_FRAMES && loaded[right] && images[right]) {
        return images[right];
      }
      dist++;
    }

    return images[1] || null;
  }

  // --- Canvas Rendering with Cover Sizing ---
  function drawFrame(frameIdx) {
    const img = getClosestLoadedFrame(frameIdx);
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    const cW = canvas.width;
    const cH = canvas.height;
    const iW = img.naturalWidth;
    const iH = img.naturalHeight;

    // Full-bleed cover calculation
    const scale = Math.max(cW / iW, cH / iH);
    const drawW = iW * scale;
    const drawH = iH * scale;
    const drawX = (cW - drawW) / 2;
    const drawY = (cH - drawH) / 2;

    ctx.drawImage(img, 0, 0, iW, iH, drawX, drawY, drawW, drawH);
    lastDrawnImage = img;
  }

  // --- Canvas Resizing ---
  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    drawFrame(currentFrame);
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  // --- Wordmark Scroll-Linked Animation (First Frame Only) ---
  // Requirements:
  // - Display text on the very first frame and keep fully visible for first 40 animation frames.
  // - After frame 40, smoothly slide upward and out of view, synchronized with existing scroll progress.
  // - Reverse smoothly when scrolling upward.
  const WORDMARK_HOLD_FRAME = 40;
  const WORDMARK_SLIDE_FRAMES = 25; // Smooth upward glide across frames 40 to 65
  const WORDMARK_END_FRAME = WORDMARK_HOLD_FRAME + WORDMARK_SLIDE_FRAMES; // 65
  const WORDMARK_MAX_TRANSLATE_Y = -220; // px upward

  function updateWordmark(frame) {
    if (!wordmark) return;

    if (frame <= WORDMARK_HOLD_FRAME) {
      // 1. Fully visible on first frame and first 40 frames
      wordmark.style.visibility = 'visible';
      wordmark.style.opacity = '1';
      wordmark.style.transform = 'translateY(0px)';
    } else if (frame <= WORDMARK_END_FRAME) {
      // 2. Smoothly slide upward and fade out after frame 40
      const t = (frame - WORDMARK_HOLD_FRAME) / WORDMARK_SLIDE_FRAMES;
      const clampedT = Math.max(0, Math.min(1, t));
      wordmark.style.visibility = 'visible';
      wordmark.style.opacity = (1 - clampedT).toFixed(3);
      wordmark.style.transform = `translateY(${(WORDMARK_MAX_TRANSLATE_Y * clampedT).toFixed(1)}px)`;
    } else {
      // 3. Out of view past frame 65
      wordmark.style.opacity = '0';
      wordmark.style.transform = `translateY(${WORDMARK_MAX_TRANSLATE_Y}px)`;
      wordmark.style.visibility = 'hidden';
    }
  }

  // --- Completed House Hero Text Overlay (Scroll-Synchronized) ---
  // Frame N = 215 (completed house)
  // 1. N = 215: house transformation complete.
  // 2. Start fading in at N - 20 (frame 195).
  // 3. Fully visible by frame N (215).
  // 4. Keep fully visible until frame N + 15 (frame 230).
  // 5. After N + 15, smoothly fade out while moving slightly upward over next 8–10 frames (frames 230 to 239).
  // 6. Reverse smoothly when scrolling upward.
  const HERO_N = 215;
  const HERO_FADE_IN_START = HERO_N - 20; // 195
  const HERO_FULL_START = HERO_N; // 215
  const HERO_FULL_END = HERO_N + 15; // 230
  const HERO_FADE_OUT_FRAMES = 9; // 8–10 frames
  const HERO_FADE_OUT_END = HERO_FULL_END + HERO_FADE_OUT_FRAMES; // 239

  function updateHeroOverlay(frame) {
    if (!heroOverlay) return;

    let opacity = 0;
    let translateY = 0;

    if (frame < HERO_FADE_IN_START) {
      opacity = 0;
      translateY = 0;
    } else if (frame < HERO_FULL_START) {
      // 2 & 3. Start fading in at frame N - 20 (195), reaching fully visible by frame N (215)
      const progressIn = (frame - HERO_FADE_IN_START) / (HERO_FULL_START - HERO_FADE_IN_START);
      opacity = Math.max(0, Math.min(1, progressIn));
      translateY = 0;
    } else if (frame <= HERO_FULL_END) {
      // 3 & 4. Keep text fully visible until frame N + 15 (230)
      opacity = 1.0;
      translateY = 0;
    } else if (frame <= HERO_FADE_OUT_END) {
      // 5. After frame N + 15, smoothly fade out while moving slightly upward over next 8-10 frames
      const progressOut = (frame - HERO_FULL_END) / HERO_FADE_OUT_FRAMES;
      const clampedOut = Math.max(0, Math.min(1, progressOut));
      opacity = 1.0 - clampedOut;
      translateY = -28 * clampedOut; // Moving slightly upward
    } else {
      opacity = 0;
      translateY = -28;
    }

    if (opacity <= 0.001) {
      heroOverlay.style.opacity = '0';
      heroOverlay.style.visibility = 'hidden';
      heroOverlay.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
      heroOverlay.setAttribute('aria-hidden', 'true');
      if (heroCtaBtn) heroCtaBtn.style.pointerEvents = 'none';
    } else {
      heroOverlay.style.visibility = 'visible';
      heroOverlay.style.opacity = opacity.toFixed(3);
      heroOverlay.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
      heroOverlay.setAttribute('aria-hidden', 'false');
      if (heroCtaBtn) heroCtaBtn.style.pointerEvents = opacity > 0.6 ? 'auto' : 'none';
    }
  }

  // --- Interior Grand Entrance Text Overlay (Scroll-Synchronized) ---
  // Frame N = 361 (interior grand entrance scene)
  // 1. Identify frame N (361) where this interior scene appears.
  // 2. Begin fading in the text at frame N − 20 (frame 341).
  // 3. Make the text fully visible by frame N (frame 361).
  // 4. Keep it visible through frame N (frames 361 to 363).
  // 5. Fade it out smoothly as user scrolls past, completely invisible by frame N + 15 (frame 376).
  // 6. Reverse the animation smoothly when scrolling upward.
  const ENTRANCE_N = 361;
  const ENTRANCE_FADE_IN_START = ENTRANCE_N - 20; // 341
  const ENTRANCE_FULL_START = ENTRANCE_N; // 361
  const ENTRANCE_FULL_END = ENTRANCE_N + 2; // 363 (identical rest frames in 60fps sequence)
  const ENTRANCE_FADE_OUT_END = ENTRANCE_N + 15; // 376

  function updateEntranceOverlay(frame) {
    if (!entranceOverlay) return;

    let opacity = 0;

    if (frame < ENTRANCE_FADE_IN_START) {
      opacity = 0;
    } else if (frame < ENTRANCE_FULL_START) {
      // 2 & 3. Begin fading in at frame N - 20 (341), fully visible by frame N (361)
      const progressIn = (frame - ENTRANCE_FADE_IN_START) / (ENTRANCE_FULL_START - ENTRANCE_FADE_IN_START);
      opacity = Math.max(0, Math.min(1, progressIn));
    } else if (frame <= ENTRANCE_FULL_END) {
      // 4. Keep visible through frame N (361 - 363)
      opacity = 1.0;
    } else if (frame <= ENTRANCE_FADE_OUT_END) {
      // 5. Fade out smoothly as user scrolls past, completely invisible by frame N + 15 (376)
      const progressOut = (frame - ENTRANCE_FULL_END) / (ENTRANCE_FADE_OUT_END - ENTRANCE_FULL_END);
      opacity = Math.max(0, Math.min(1, 1.0 - progressOut));
    } else {
      opacity = 0;
    }

    if (opacity <= 0.001) {
      entranceOverlay.style.opacity = '0';
      entranceOverlay.style.visibility = 'hidden';
      entranceOverlay.setAttribute('aria-hidden', 'true');
    } else {
      entranceOverlay.style.visibility = 'visible';
      entranceOverlay.style.opacity = opacity.toFixed(3);
      entranceOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  // --- Dining Room Text Overlay (Scroll-Synchronized) ---
  // Frame N = 570 (dining room scene)
  // 1. Start fading in the text at frame N − 25 (frame 545).
  // 2. Make the text fully visible by frame N (frame 570).
  // 3. Keep it fully visible for 5 additional frames, through frame N + 5 (frame 575).
  // 4. Fade it out smoothly over next 10 frames, until completely invisible at frame N + 15 (frame 585).
  // 5. Reverse the animation smoothly when scrolling upward.
  const DINING_N = 570;
  const DINING_FADE_IN_START = DINING_N - 25; // 545
  const DINING_FULL_START = DINING_N; // 570
  const DINING_FULL_END = DINING_N + 5; // 575
  const DINING_FADE_OUT_END = DINING_N + 15; // 585

  function updateDiningOverlay(frame) {
    if (!diningOverlay) return;

    let opacity = 0;

    if (frame < DINING_FADE_IN_START) {
      opacity = 0;
    } else if (frame < DINING_FULL_START) {
      // 1 & 2. Start fading in at frame N - 25 (545), fully visible by frame N (570)
      const progressIn = (frame - DINING_FADE_IN_START) / (DINING_FULL_START - DINING_FADE_IN_START);
      opacity = Math.max(0, Math.min(1, progressIn));
    } else if (frame <= DINING_FULL_END) {
      // 3. Keep fully visible through frame N + 5 (575)
      opacity = 1.0;
    } else if (frame <= DINING_FADE_OUT_END) {
      // 4. Fade out smoothly over next 10 frames, completely invisible at frame N + 15 (585)
      const progressOut = (frame - DINING_FULL_END) / (DINING_FADE_OUT_END - DINING_FULL_END);
      opacity = Math.max(0, Math.min(1, 1.0 - progressOut));
    } else {
      opacity = 0;
    }

    if (opacity <= 0.001) {
      diningOverlay.style.opacity = '0';
      diningOverlay.style.visibility = 'hidden';
      diningOverlay.setAttribute('aria-hidden', 'true');
    } else {
      diningOverlay.style.visibility = 'visible';
      diningOverlay.style.opacity = opacity.toFixed(3);
      diningOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  // --- Bedroom Sanctuary Text Overlay (Scroll-Synchronized) ---
  // Frame N = 710 (bedroom scene)
  // 1. Identify frame N (710) where this bedroom scene appears.
  // 2. Start fading in the text at frame N − 25 (frame 685).
  // 3. Make the text fully visible by frame N (frame 710).
  // 4. Keep it visible through the bedroom scene (frames 710 to 715).
  // 5. After frame N, fade text out smoothly, completely invisible by frame N + 25 (frame 735).
  // 6. Reverse the animation naturally when scrolling upward.
  const BEDROOM_N = 710;
  const BEDROOM_FADE_IN_START = BEDROOM_N - 25; // 685
  const BEDROOM_FULL_START = BEDROOM_N; // 710
  const BEDROOM_FULL_END = BEDROOM_N + 5; // 715
  const BEDROOM_FADE_OUT_END = BEDROOM_N + 25; // 735

  function updateBedroomOverlay(frame) {
    if (!bedroomOverlay) return;

    let opacity = 0;

    if (frame < BEDROOM_FADE_IN_START) {
      opacity = 0;
    } else if (frame < BEDROOM_FULL_START) {
      // 2 & 3. Start fading in at frame N - 25 (685), fully visible by frame N (710)
      const progressIn = (frame - BEDROOM_FADE_IN_START) / (BEDROOM_FULL_START - BEDROOM_FADE_IN_START);
      opacity = Math.max(0, Math.min(1, progressIn));
    } else if (frame <= BEDROOM_FULL_END) {
      // 4. Keep visible through the bedroom scene (710 - 715)
      opacity = 1.0;
    } else if (frame <= BEDROOM_FADE_OUT_END) {
      // 5. Fade out smoothly, completely invisible by frame N + 25 (735)
      const progressOut = (frame - BEDROOM_FULL_END) / (BEDROOM_FADE_OUT_END - BEDROOM_FULL_END);
      opacity = Math.max(0, Math.min(1, 1.0 - progressOut));
    } else {
      opacity = 0;
    }

    if (opacity <= 0.001) {
      bedroomOverlay.style.opacity = '0';
      bedroomOverlay.style.visibility = 'hidden';
      bedroomOverlay.setAttribute('aria-hidden', 'true');
    } else {
      bedroomOverlay.style.visibility = 'visible';
      bedroomOverlay.style.opacity = opacity.toFixed(3);
      bedroomOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  // --- Swimming Pool Oasis Text Overlay (Scroll-Synchronized) ---
  // Frame N = 820 (swimming-pool scene)
  // 1. Identify frame N (820), where this swimming-pool scene appears.
  // 2. Start fading in the text at frame N − 30 (frame 790).
  // 3. Make the text fully visible by frame N (frame 820).
  // 4. Keep it visible at frame N (frames 820 to 822).
  // 5. Fade it out smoothly over the following 30 frames, becoming completely invisible by frame N + 30 (frame 852).
  // 6. Reverse the animation smoothly when scrolling upward.
  const POOL_N = 820;
  const POOL_FADE_IN_START = POOL_N - 30; // 790
  const POOL_FULL_START = POOL_N; // 820
  const POOL_FULL_END = POOL_N + 2; // 822 (keep visible at frame N)
  const POOL_FADE_OUT_END = POOL_FULL_END + 30; // 852

  function updatePoolOverlay(frame) {
    if (!poolOverlay) return;

    let opacity = 0;

    if (frame < POOL_FADE_IN_START) {
      opacity = 0;
    } else if (frame < POOL_FULL_START) {
      // 2 & 3. Start fading in at frame N - 30 (790), fully visible by frame N (820)
      const progressIn = (frame - POOL_FADE_IN_START) / (POOL_FULL_START - POOL_FADE_IN_START);
      opacity = Math.max(0, Math.min(1, progressIn));
    } else if (frame <= POOL_FULL_END) {
      // 3 & 4. Keep visible at frame N
      opacity = 1.0;
    } else if (frame <= POOL_FADE_OUT_END) {
      // 5. Fade out smoothly over following 30 frames, completely invisible by frame N + 30
      const progressOut = (frame - POOL_FULL_END) / (POOL_FADE_OUT_END - POOL_FULL_END);
      opacity = Math.max(0, Math.min(1, 1.0 - progressOut));
    } else {
      opacity = 0;
    }

    if (opacity <= 0.001) {
      poolOverlay.style.opacity = '0';
      poolOverlay.style.visibility = 'hidden';
      poolOverlay.setAttribute('aria-hidden', 'true');
    } else {
      poolOverlay.style.visibility = 'visible';
      poolOverlay.style.opacity = opacity.toFixed(3);
      poolOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  // --- Entertainment Zone Text Overlay (Scroll-Synchronized) ---
  // Frame N = 994 (entertainment scene appears)
  // 1. Start fading in exactly 10 animation frames before (frame 984).
  // 2. Make fully visible when scene appears (frame 994).
  // 3. Keep visible continuously through final frame of animation (1140).
  //    Do not fade out, hide, or remove at any point afterward.
  // 4. Reverse fade-in naturally when scrolling backward before this scene.
  const ENTERTAINMENT_N = 994;
  const ENTERTAINMENT_FADE_IN_START = ENTERTAINMENT_N - 10; // 984

  function updateEntertainmentOverlay(frame) {
    if (!entertainmentOverlay) return;

    let opacity = 0;

    if (frame < ENTERTAINMENT_FADE_IN_START) {
      opacity = 0;
    } else if (frame < ENTERTAINMENT_N) {
      const progressIn = (frame - ENTERTAINMENT_FADE_IN_START) / (ENTERTAINMENT_N - ENTERTAINMENT_FADE_IN_START);
      opacity = Math.max(0, Math.min(1, progressIn));
    } else {
      // Fully visible from frame 994 through the final frame (1140)
      opacity = 1.0;
    }

    if (opacity <= 0.001) {
      entertainmentOverlay.style.opacity = '0';
      entertainmentOverlay.style.visibility = 'hidden';
      entertainmentOverlay.setAttribute('aria-hidden', 'true');
    } else {
      entertainmentOverlay.style.visibility = 'visible';
      entertainmentOverlay.style.opacity = opacity.toFixed(3);
      entertainmentOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  // --- Scroll Progress Calculation ---
  const scrollContainer = document.getElementById('scroll-container');
  function getMaxScroll() {
    const trackHeight = scrollContainer ? scrollContainer.offsetHeight : 7500;
    return Math.max(1, trackHeight - window.innerHeight);
  }

  function getScrollTop() {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function handleScroll() {
    const maxScroll = getMaxScroll();
    const scrollTop = getScrollTop();
    targetProgress = Math.max(0, Math.min(1, scrollTop / maxScroll));

    targetFrame = 1 + targetProgress * (TOTAL_FRAMES - 1);

    // Dynamically prioritize preloading frames near current scroll position
    preloadWindow(Math.round(targetFrame), 20);
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });

  // Initial scroll calculation
  handleScroll();
  currentProgress = targetProgress;
  currentFrame = targetFrame;
  updateWordmark(currentFrame);
  updateHeroOverlay(currentFrame);
  updateEntranceOverlay(currentFrame);
  updateDiningOverlay(currentFrame);
  updateBedroomOverlay(currentFrame);
  updatePoolOverlay(currentFrame);
  updateEntertainmentOverlay(currentFrame);

  // --- Progressive Preloader Strategy ---
  // Step 1: Immediately load and render Frame 1, plus pre-cache key transition windows
  loadFrame(1, (img) => {
    drawFrame(1);
    preloadWindow(215, 25);
    preloadWindow(361, 25);
    preloadWindow(570, 25);
    preloadWindow(710, 25);
    preloadWindow(820, 25);
    preloadWindow(994, 25);

    // Step 2: Rapid keyframe scaffold across entire timeline (every 10th frame)
    let keyframeIndex = 1;
    function loadNextKeyframeBatch() {
      const batchEnd = Math.min(TOTAL_FRAMES, keyframeIndex + KEYFRAME_STRIDE * 6);
      for (; keyframeIndex <= batchEnd; keyframeIndex += KEYFRAME_STRIDE) {
        loadFrame(keyframeIndex);
      }
      loadFrame(TOTAL_FRAMES);

      if (keyframeIndex < TOTAL_FRAMES) {
        setTimeout(loadNextKeyframeBatch, 100);
      } else {
        // Step 3: Progressive fill of intermediate frames in idle chunks
        startIdleFiller();
      }
    }
    loadNextKeyframeBatch();
  });

  // Background filler that streams the remaining frames without blocking main thread
  function startIdleFiller() {
    let currentFillIndex = 1;
    const CHUNK_SIZE = 4;

    function fillNext() {
      let count = 0;
      while (currentFillIndex <= TOTAL_FRAMES && count < CHUNK_SIZE) {
        if (!images[currentFillIndex]) {
          loadFrame(currentFillIndex);
          count++;
        }
        currentFillIndex++;
      }

      if (currentFillIndex <= TOTAL_FRAMES) {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(fillNext, { timeout: 250 });
        } else {
          setTimeout(fillNext, 60);
        }
      }
    }

    fillNext();
  }

  // --- Smooth Animation Tick Loop (LERP) ---
  function tick() {
    const delta = targetFrame - currentFrame;
    const progressDelta = targetProgress - currentProgress;

    if (Math.abs(delta) > 0.001) {
      currentFrame += delta * LERP_FACTOR;
      drawFrame(currentFrame);
      updateWordmark(currentFrame);
      updateHeroOverlay(currentFrame);
      updateEntranceOverlay(currentFrame);
      updateDiningOverlay(currentFrame);
      updateBedroomOverlay(currentFrame);
      updatePoolOverlay(currentFrame);
      updateEntertainmentOverlay(currentFrame);
    } else if (currentFrame !== targetFrame) {
      currentFrame = targetFrame;
      drawFrame(currentFrame);
      updateWordmark(currentFrame);
      updateHeroOverlay(currentFrame);
      updateEntranceOverlay(currentFrame);
      updateDiningOverlay(currentFrame);
      updateBedroomOverlay(currentFrame);
      updatePoolOverlay(currentFrame);
      updateEntertainmentOverlay(currentFrame);
    }

    if (Math.abs(progressDelta) > 0.00005) {
      currentProgress += progressDelta * LERP_FACTOR;
    } else if (currentProgress !== targetProgress) {
      currentProgress = targetProgress;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // --- Section Entrance Animation Observer ---
  const sectionsToObserve = [
    document.getElementById('experience-excellence'),
    document.getElementById('expert-team'),
    document.getElementById('choose-style'),
    document.getElementById('property-inquiry')
  ].filter(Boolean);

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          sectionObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    sectionsToObserve.forEach(sec => sectionObserver.observe(sec));
  } else {
    sectionsToObserve.forEach(sec => sec.classList.add('is-visible'));
  }

  // --- Choose Style Carousel Navigation & Drag Controls ---
  const stylesTrack = document.getElementById('styles-track');
  const prevBtn = document.getElementById('styles-prev-btn');
  const nextBtn = document.getElementById('styles-next-btn');

  if (stylesTrack) {
    function getScrollStep() {
      const firstCard = stylesTrack.querySelector('.style-card');
      if (firstCard) {
        const trackStyle = window.getComputedStyle(stylesTrack);
        const gap = parseFloat(trackStyle.gap) || 32;
        return firstCard.offsetWidth + gap;
      }
      return 380;
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        stylesTrack.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        stylesTrack.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
      });
    }

    // Drag-to-scroll for mouse users
    let isDown = false;
    let startX = 0;
    let initialScrollLeft = 0;

    stylesTrack.addEventListener('mousedown', (e) => {
      isDown = true;
      stylesTrack.classList.add('is-dragging');
      startX = e.pageX - stylesTrack.offsetLeft;
      initialScrollLeft = stylesTrack.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        stylesTrack.classList.remove('is-dragging');
      }
    });

    stylesTrack.addEventListener('mouseleave', () => {
      if (isDown) {
        isDown = false;
        stylesTrack.classList.remove('is-dragging');
      }
    });

    stylesTrack.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - stylesTrack.offsetLeft;
      const walk = (x - startX) * 1.5;
      stylesTrack.scrollLeft = initialScrollLeft - walk;
    });
  }

  // --- Property Inquiry Form Interaction & Validation ---
  const inquiryForm = document.getElementById('inquiry-form');
  const inquirySuccessView = document.getElementById('inquiry-success-view');
  const resetInquiryBtn = document.getElementById('btn-reset-inquiry');
  const feedbackBanner = document.getElementById('form-feedback-banner');
  const submitInquiryBtn = document.getElementById('btn-submit-inquiry');

  if (inquiryForm) {
    const pillLabels = inquiryForm.querySelectorAll('.type-pill');
    const pillRadios = inquiryForm.querySelectorAll('input[name="project_type"]');
    const errorProjectType = document.getElementById('error-project-type');

    function updatePillState() {
      pillLabels.forEach(label => {
        const radio = label.querySelector('.pill-radio');
        if (radio && radio.checked) {
          label.classList.add('is-selected');
        } else {
          label.classList.remove('is-selected');
        }
      });
      if (errorProjectType) errorProjectType.textContent = '';
    }

    pillRadios.forEach(radio => {
      radio.addEventListener('change', updatePillState);
    });

    // Clear field errors as user types
    const inputs = inquiryForm.querySelectorAll('.minimal-input');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        input.classList.remove('has-error');
        const errorEl = document.getElementById(`error-${input.name.replace('_', '-')}`);
        if (errorEl) errorEl.textContent = '';
        if (feedbackBanner) feedbackBanner.style.display = 'none';
      });
    });

    // Form Submission
    inquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Reset errors
      inquiryForm.querySelectorAll('.field-error-msg').forEach(el => el.textContent = '');
      inputs.forEach(input => input.classList.remove('has-error'));
      if (feedbackBanner) feedbackBanner.style.display = 'none';

      let hasError = false;
      let firstInvalid = null;

      // 1. Validate Project Type
      const selectedRadio = inquiryForm.querySelector('input[name="project_type"]:checked');
      if (!selectedRadio) {
        if (errorProjectType) errorProjectType.textContent = 'Please select a project type.';
        hasError = true;
      }

      // 2. Validate Full Name
      const nameInput = document.getElementById('field-name');
      const errName = document.getElementById('error-name');
      if (!nameInput || !nameInput.value.trim() || nameInput.value.trim().length < 2) {
        if (errName) errName.textContent = 'Please enter your full name.';
        if (nameInput) nameInput.classList.add('has-error');
        hasError = true;
        if (!firstInvalid) firstInvalid = nameInput;
      }

      // 3. Validate Phone Number
      const phoneInput = document.getElementById('field-phone');
      const errPhone = document.getElementById('error-phone');
      const phoneVal = phoneInput ? phoneInput.value.trim() : '';
      const phoneRegex = /^[0-9+\s().-]{7,25}$/;
      if (!phoneVal || !phoneRegex.test(phoneVal)) {
        if (errPhone) errPhone.textContent = 'Please enter a valid phone number (min 7 digits).';
        if (phoneInput) phoneInput.classList.add('has-error');
        hasError = true;
        if (!firstInvalid) firstInvalid = phoneInput;
      }

      // 4. Validate Property Type
      const propTypeInput = document.getElementById('field-property-type');
      const errPropType = document.getElementById('error-property-type');
      if (!propTypeInput || !propTypeInput.value.trim()) {
        if (errPropType) errPropType.textContent = 'Please specify property type.';
        if (propTypeInput) propTypeInput.classList.add('has-error');
        hasError = true;
        if (!firstInvalid) firstInvalid = propTypeInput;
      }

      // 5. Validate Location
      const locationInput = document.getElementById('field-location');
      const errLocation = document.getElementById('error-location');
      if (!locationInput || !locationInput.value.trim()) {
        if (errLocation) errLocation.textContent = 'Please specify preferred location.';
        if (locationInput) locationInput.classList.add('has-error');
        hasError = true;
        if (!firstInvalid) firstInvalid = locationInput;
      }

      if (hasError) {
        if (firstInvalid) {
          firstInvalid.focus();
        } else if (!selectedRadio && pillLabels[0]) {
          pillLabels[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const payload = {
        projectType: selectedRadio.value,
        propertyType: propTypeInput.value.trim(),
        propertyArea: document.getElementById('field-property-area')?.value.trim() || 'Flexible',
        constructionDate: document.getElementById('field-construction-date')?.value.trim() || 'Immediate',
        location: locationInput.value.trim(),
        phoneNumber: phoneVal,
        fullName: nameInput.value.trim()
      };

      submitInquiryBtn.classList.add('is-loading');
      submitInquiryBtn.disabled = true;

      try {
        const response = await fetch('/api/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          inquiryForm.style.display = 'none';
          if (inquirySuccessView) {
            inquirySuccessView.style.display = 'flex';
            const summaryBox = document.getElementById('inquiry-summary-box');
            if (summaryBox) {
              summaryBox.innerHTML = `
                <div><strong>Inquiry Reference:</strong> ${result.inquiryId}</div>
                <div><strong>Client Name:</strong> ${payload.fullName}</div>
                <div><strong>Contact Phone:</strong> ${payload.phoneNumber}</div>
                <div><strong>Project Category:</strong> ${payload.projectType} &bull; ${payload.propertyType}</div>
                <div><strong>Target Location:</strong> ${payload.location} (${payload.propertyArea})</div>
              `;
            }
          }
        } else {
          throw new Error(result.error || (result.errors ? Object.values(result.errors).join(', ') : 'Submission could not be completed.'));
        }
      } catch (err) {
        console.error('Inquiry submission error:', err);
        if (feedbackBanner) {
          feedbackBanner.className = 'form-feedback-banner is-error';
          feedbackBanner.style.display = 'block';
          feedbackBanner.textContent = `Submission Error: ${err.message || 'Unable to connect to service. Your inputs have been preserved.'}`;
        }
      } finally {
        submitInquiryBtn.classList.remove('is-loading');
        submitInquiryBtn.disabled = false;
      }
    });

    // Reset button
    if (resetInquiryBtn) {
      resetInquiryBtn.addEventListener('click', () => {
        inquiryForm.reset();
        updatePillState();
        if (inquirySuccessView) inquirySuccessView.style.display = 'none';
        inquiryForm.style.display = 'flex';
        if (feedbackBanner) feedbackBanner.style.display = 'none';
      });
    }
  }

  // ==========================================================================
  // Floating Luxury Navigation Bar Interactions
  // Smooth scroll, mobile drawer toggle, active link tracking, brand top-scroll
  // ==========================================================================
  const floatingNavbar = document.getElementById('floating-navbar');
  const navMobileToggle = document.getElementById('nav-mobile-toggle');
  const navMobileMenu = document.getElementById('nav-mobile-menu');

  if (floatingNavbar) {
    // 1. Mobile Menu Toggle
    if (navMobileToggle) {
      navMobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = floatingNavbar.classList.toggle('nav-open');
        navMobileToggle.setAttribute('aria-expanded', String(isOpen));
        if (navMobileMenu) {
          navMobileMenu.setAttribute('aria-hidden', String(!isOpen));
        }
      });
    }

    // 2. Click Outside to Close Mobile Menu
    document.addEventListener('click', (e) => {
      if (floatingNavbar.classList.contains('nav-open') && !floatingNavbar.contains(e.target)) {
        floatingNavbar.classList.remove('nav-open');
        if (navMobileToggle) navMobileToggle.setAttribute('aria-expanded', 'false');
        if (navMobileMenu) navMobileMenu.setAttribute('aria-hidden', 'true');
      }
    });

    // 3. Escape Key to Close Mobile Menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && floatingNavbar.classList.contains('nav-open')) {
        floatingNavbar.classList.remove('nav-open');
        if (navMobileToggle) {
          navMobileToggle.setAttribute('aria-expanded', 'false');
          navMobileToggle.focus();
        }
        if (navMobileMenu) navMobileMenu.setAttribute('aria-hidden', 'true');
      }
    });

    // 4. Smooth Scrolling for all navbar links & logo
    const allNavLinks = floatingNavbar.querySelectorAll('a[href^="#"]');
    allNavLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');

        // Close mobile drawer if open
        if (floatingNavbar.classList.contains('nav-open')) {
          floatingNavbar.classList.remove('nav-open');
          if (navMobileToggle) navMobileToggle.setAttribute('aria-expanded', 'false');
          if (navMobileMenu) navMobileMenu.setAttribute('aria-hidden', 'true');
        }

        // Return to first frame if logo or Home clicked
        if (href === '#' || href === '#scroll-container') {
          e.preventDefault();
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
          return;
        }

        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });

    // 5. Scroll State and Active Link Highlighting
    const desktopNavLinks = floatingNavbar.querySelectorAll('.nav-link');
    const sectionsToTrack = [
      { id: 'experience-excellence', target: 'about' },
      { id: 'expert-team', target: 'team' },
      { id: 'choose-style', target: 'properties' },
      { id: 'property-inquiry', target: 'contact' }
    ];

    const onNavbarScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

      // Add soft dark solidifying effect when scrolled
      if (scrollY > 35) {
        floatingNavbar.classList.add('nav-scrolled');
      } else {
        floatingNavbar.classList.remove('nav-scrolled');
      }

      // Determine active section
      let activeTarget = 'home';
      const scrollPos = scrollY + 160;

      for (let i = sectionsToTrack.length - 1; i >= 0; i--) {
        const item = sectionsToTrack[i];
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            activeTarget = item.target;
            break;
          }
        }
      }

      // Update active class on desktop nav links
      desktopNavLinks.forEach((link) => {
        const target = link.getAttribute('data-target');
        if (target === activeTarget) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    };

    window.addEventListener('scroll', onNavbarScroll, { passive: true });
    onNavbarScroll();
  }

})();
