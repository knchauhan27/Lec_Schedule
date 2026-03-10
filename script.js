/* ============================================================
   MEDRX — Medical Lecture Timeline  |  script.js
   ============================================================ */

// ── CONFIGURATION ───────────────────────────────────────────
// Pixels per minute determines how wide the entire 24-hour track is.
// 1440 minutes × pixelsPerMinute = total track width.
const PIXELS_PER_MINUTE = 4; // 1 minute = 4 px  →  1 hr = 240 px
const TOTAL_MINUTES = 24 * 60; // 1440 minutes in a day
const TOTAL_WIDTH = PIXELS_PER_MINUTE * TOTAL_MINUTES; // 5760 px

// ── DOM REFERENCES ──────────────────────────────────────────
const clockEl = document.getElementById("clock");
const dateEl = document.getElementById("dateDisplay");
const timeMarkerEl = document.getElementById("timeMarker");
const hourMarkersEl = document.getElementById("hourMarkers");
const lectureBlocksEl = document.getElementById("lectureBlocks");
const containerEl = document.getElementById("timelineContainer");
const trackEl = document.getElementById("timelineTrack");

const nextTopicEl = document.getElementById("nextTopic");
const nextTimeEl = document.getElementById("nextTime");
const nextFacultyEl = document.getElementById("nextFaculty");

// ── STATE ───────────────────────────────────────────────────
let allLectures = []; // full JSON data
let todayLectures = []; // filtered for today

// ── UTILITIES ───────────────────────────────────────────────

/**
 * Convert "HH:MM" string to total minutes from midnight.
 * @param {string} timeStr  e.g. "14:30"
 * @returns {number} minutes
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Format a Date object as "HH:MM" (padded).
 * @param {Date} date
 * @returns {string}
 */
function formatHHMM(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Format a Date as "YYYY-MM-DD" (local time) to match JSON date fields.
 * @param {Date} date
 * @returns {string}
 */
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Long-form date string for the header, e.g. "Monday, 10 March 2026".
 * @param {Date} date
 * @returns {string}
 */
function formatLongDate(date) {
  return date
    .toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

/**
 * Convert minutes-from-midnight to pixel left offset.
 * @param {number} minutes
 * @returns {number} px
 */
function minutesToPx(minutes) {
  return minutes * PIXELS_PER_MINUTE;
}

// ── INIT: SET TRACK WIDTH ────────────────────────────────────
// Apply total computed width to the scrollable track.
trackEl.style.width = TOTAL_WIDTH + "px";

// ── RENDER: HOUR MARKERS ─────────────────────────────────────
/**
 * Draws 25 tick marks (0:00 – 23:00) with labels above the axis.
 */
function renderHourMarkers() {
  hourMarkersEl.innerHTML = "";

  for (let hour = 0; hour <= 23; hour++) {
    const minutes = hour * 60;
    const leftPx = minutesToPx(minutes);

    const wrap = document.createElement("div");
    wrap.className = "hour-mark";
    wrap.style.left = leftPx + "px";

    const tick = document.createElement("div");
    tick.className = "hour-tick";

    const label = document.createElement("div");
    label.className = "hour-label";
    label.textContent = `${hour}:00`;

    wrap.appendChild(tick);
    wrap.appendChild(label);
    hourMarkersEl.appendChild(wrap);
  }
}

// ── RENDER: LECTURE BLOCKS ───────────────────────────────────
/**
 * Creates a positioned block for each lecture that falls today.
 * Blocks are classified as: past | active | upcoming
 * based on current time at render time.
 */
function renderLectureBlocks() {
  lectureBlocksEl.innerHTML = "";

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (todayLectures.length === 0) {
    const msg = document.createElement("div");
    msg.className = "no-lectures";
    msg.textContent = "No lectures scheduled for today";
    lectureBlocksEl.appendChild(msg);
    return;
  }

  todayLectures.forEach((lec) => {
    const startMin = timeToMinutes(lec.start);
    const endMin = timeToMinutes(lec.end);
    const durationMin = endMin - startMin;

    // Width and left position
    const leftPx = minutesToPx(startMin);
    const widthPx = Math.max(minutesToPx(durationMin), 90); // minimum 90px

    // Determine state
    let stateClass = "";
    if (endMin <= nowMinutes) stateClass = "past";
    else if (startMin <= nowMinutes) stateClass = "active";
    // else: upcoming → no extra class

    // Build block element
    const block = document.createElement("div");
    block.className = `lecture-block ${stateClass}`;
    block.style.left = leftPx + "px";
    block.style.width = widthPx + "px";

    block.innerHTML = `
      <div class="block-topic">${lec["topic "]}</div>
      <div class="block-subject">${lec.subject}</div>
      <div class="block-time">${lec.start} – ${lec.end}</div>
      <div class="block-faculty">${lec.faculty}</div>
    `;

    lectureBlocksEl.appendChild(block);
  });
}

// ── RENDER: NEXT LECTURE BOX ─────────────────────────────────
/**
 * Finds the next lecture that hasn't ended yet and updates the footer.
 */
function renderNextLecture() {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Sort by start time, then find first lecture that hasn't ended
  const upcoming = todayLectures
    .filter((lec) => timeToMinutes(lec.end) > nowMinutes)
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  if (upcoming.length === 0) {
    nextTopicEl.textContent = "No upcoming lecture today";
    nextTimeEl.textContent = "";
    nextFacultyEl.textContent = "";
  } else {
    const next = upcoming[0];
    nextTopicEl.textContent = next["topic "];
    nextTimeEl.textContent = `${next.start} – ${next.end}`;
    nextFacultyEl.textContent = next.faculty;
  }
}

// ── CURRENT TIME MARKER ──────────────────────────────────────
/**
 * Positions the red vertical marker at the current time.
 */
function updateTimeMarker() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const leftPx = minutesToPx(minutes);
  timeMarkerEl.style.left = leftPx + "px";
}

/**
 * Scrolls the container so the current time marker is exactly centred.
 * Called once on load, then every minute update also keeps it centred.
 */
function scrollToCurrentTime(smooth = false) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const markerLeft = minutesToPx(minutes);
  const halfWidth = containerEl.clientWidth / 2;

  // Desired scroll position: marker at centre of viewport
  const targetScroll = markerLeft - halfWidth;

  containerEl.scrollTo({
    left: Math.max(0, targetScroll),
    behavior: smooth ? "smooth" : "auto",
  });
}

// ── CLOCK & DATE HEADER ──────────────────────────────────────
/**
 * Updates the large clock and the date string in the header.
 */
function updateClock() {
  const now = new Date();
  clockEl.textContent = formatHHMM(now);
  dateEl.textContent = formatLongDate(now);
}

// ── MINUTE TICK ──────────────────────────────────────────────
/**
 * Called every minute to:
 *  1. Refresh the clock display
 *  2. Move the time marker
 *  3. Re-classify lecture blocks (past / active)
 *  4. Update next-lecture box
 *  5. Gently re-centre the scroll on the marker
 */
function onMinuteTick() {
  updateClock();
  updateTimeMarker();
  renderLectureBlocks(); // re-render to update past/active classes
  renderNextLecture();
  scrollToCurrentTime(true); // smooth scroll each minute
}

/**
 * Schedules the first tick to fire at the top of the next minute,
 * then sets a precise 60-second interval from that moment.
 */
function scheduleTicks() {
  const now = new Date();
  const msToNextMin = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

  // Fire at the exact minute boundary, then every 60 s
  setTimeout(() => {
    onMinuteTick();
    setInterval(onMinuteTick, 60_000);
  }, msToNextMin);
}

// ── DATA LOADING ─────────────────────────────────────────────
/**
 * Fetches lec.json, filters lectures for today, then bootstraps the UI.
 */
async function loadData() {
  try {
    const response = await fetch("lec.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: could not load lec.json`);
    }

    allLectures = await response.json();

    // Filter to only today's lectures
    const todayISO = formatDateISO(new Date());
    todayLectures = allLectures.filter((lec) => lec.date === todayISO);

    // Sort by start time for consistent rendering order
    todayLectures.sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start),
    );

    // ── First render pass ──
    renderHourMarkers();
    renderLectureBlocks();
    renderNextLecture();
    updateClock();
    updateTimeMarker();

    // Scroll AFTER a brief layout paint so clientWidth is settled
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToCurrentTime(false); // instant snap on load
      });
    });

    // Start the per-minute refresh
    scheduleTicks();
  } catch (err) {
    console.error("MedRx error loading data:", err);
    lectureBlocksEl.innerHTML = `<div class="no-lectures">⚠ Failed to load lec.json — ${err.message}</div>`;
  }
}

// ── DRAG-TO-SCROLL (optional UX) ────────────────────────────
// Allows the user to click-drag the timeline like a horizontal scroll.
(function enableDragScroll() {
  let isDown = false;
  let startX = 0;
  let scrollL = 0;

  containerEl.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX - containerEl.offsetLeft;
    scrollL = containerEl.scrollLeft;
    containerEl.style.userSelect = "none";
  });

  containerEl.addEventListener("mouseleave", () => {
    isDown = false;
  });
  containerEl.addEventListener("mouseup", () => {
    isDown = false;
    containerEl.style.userSelect = "";
  });

  containerEl.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - containerEl.offsetLeft;
    const walk = (x - startX) * 1.2; // slight acceleration
    containerEl.scrollLeft = scrollL - walk;
  });
})();

// ── BOOTSTRAP ───────────────────────────────────────────────
loadData();
