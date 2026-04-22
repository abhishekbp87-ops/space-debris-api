"use strict";

(() => {
  const CONFIG = {
    API_BASE: "http://127.0.0.1:8000",
    CORS_PROXY: "https://corsproxy.io/?",
    JINA_PROXY: "https://r.jina.ai/http://",
    TLE_FEEDS: {
      stations: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
      active: "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
      stations2: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
      debris: "https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle",
      fengyun: "https://celestrak.org/NORAD/elements/gp.php?GROUP=fengyun-1c-debris&FORMAT=tle",
      cosmos: "https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle",
      visual: "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle"
    },
    REFRESH: {
      position: 1000,
      alerts: 20000,
      tle: 300000,
      analytics: 30000,
      countdown: 1000
    },
    CESIUM_TOKEN:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc4YzMiLCJpZCI6NTc3MzMsImlhdCI6MTYyMjY0NjQ5M30.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZx",
    MAX_LOG_ENTRIES: 100,
    MAX_TLE_LOG_ENTRIES: 20,
    ORBIT_MINUTES: 120,
    MAX_RENDER_OBJECTS: 420,
    MAX_ORBIT_PATHS: 120,
    MAX_LABELS: 80,
    MAX_SELECT_OPTIONS: 2500,
    DIRECT_FETCH_TIMEOUT_MS: 5000,
    RELAY_FETCH_TIMEOUT_MS: 15000,
    API_FETCH_TIMEOUT_MS: 10000,
    EARTH_RADIUS_KM: 6378.137
  };

  const RISK_ORDER = {
    GREEN: 0,
    YELLOW: 1,
    ORANGE: 2,
    RED: 3
  };

  const HEADER_THREAT = {
    GREEN: "NOMINAL",
    YELLOW: "ELEVATED",
    ORANGE: "ELEVATED",
    RED: "CRITICAL"
  };

  const FALLBACK_TLE = {
    stations: `ISS (ZARYA)
1 25544U 98067A   26109.25000000  .00010910  00000-0  19476-3 0  9990
2 25544  51.6384 132.5600 0004200 116.2321 336.5578 15.49511039434304
CSS (TIANHE)
1 48274U 21035A   26109.37500000  .00021745  00000-0  24958-3 0  9995
2 48274  41.4737 287.3347 0006463 241.7786 193.9201 15.60311156279924
HST
1 20580U 90037B   26109.20420969  .00001194  00000-0  69835-4 0  9994
2 20580  28.4684 291.9723 0001772 128.0019 339.9693 15.26702498987669`,
    active: `STARLINK-30044
1 58934U 24017Y   26108.89640046  .00012880  00000-0  80479-3 0  9996
2 58934  43.0039 201.5857 0001114  87.1219 272.9911 15.19033011 63609
NOAA 19
1 33591U 09005A   26109.38005787  .00000195  00000-0  11877-3 0  9997
2 33591  99.0544 160.5615 0013815 102.4939 257.7812 14.12721927901947`,
    stations2: `ISS (ZARYA)
1 25544U 98067A   26109.25000000  .00010910  00000-0  19476-3 0  9990
2 25544  51.6384 132.5600 0004200 116.2321 336.5578 15.49511039434304
CSS (TIANHE)
1 48274U 21035A   26109.37500000  .00021745  00000-0  24958-3 0  9995
2 48274  41.4737 287.3347 0006463 241.7786 193.9201 15.60311156279924`,
    debris: `IRIDIUM 33 DEB
1 34430U 97051CE  26109.18291194  .00004132  00000-0  26735-3 0  9992
2 34430  86.3946 194.1304 0034652  71.0600 289.4303 14.37077266883386
IRIDIUM 33 DEB 2
1 34602U 97051CZ  26108.70492627  .00001261  00000-0  12046-3 0  9992
2 34602  86.4033 347.4698 0062050 164.5263 195.7641 14.86602459897137`,
    fengyun: `FENGYUN 1C DEB
1 36828U 99025AJD 26109.16288674  .00000376  00000-0  55327-4 0  9997
2 36828  98.7332 151.0269 0043646  79.7844 280.8342 14.47322722790466
FENGYUN 1C DEB 2
1 30671U 99025DBT 26109.22005626  .00000869  00000-0  11755-3 0  9995
2 30671  99.0872 297.8446 0033822 329.8304  29.9840 14.63416572888609`,
    cosmos: `COSMOS 2251 DEB
1 33442U 09004ANA 26109.34708979  .00001723  00000-0  14289-3 0  9999
2 33442  74.0286 192.0097 0064574  64.9023 295.8509 14.53709943892339
COSMOS 2251 DEB 2
1 33610U 09004BZZ 26108.81274219  .00002193  00000-0  18379-3 0  9997
2 33610  74.0372 327.0988 0028332  31.6909 328.5977 14.59396904898602`,
    visual: `ISS (ZARYA)
1 25544U 98067A   26109.25000000  .00010910  00000-0  19476-3 0  9990
2 25544  51.6384 132.5600 0004200 116.2321 336.5578 15.49511039434304
HST
1 20580U 90037B   26109.20420969  .00001194  00000-0  69835-4 0  9994
2 20580  28.4684 291.9723 0001772 128.0019 339.9693 15.26702498987669`
  };

  const State = {
    tleSatellites: [],
    tleDebris: [],
    apiSatellites: [],
    apiDebris: [],
    alerts: [],
    conjunctions: [],
    selectedObject: null,
    selectedEntity: null,
    cesiumViewer: null,
    cesiumEntities: new Map(),
    orbitEntities: new Map(),
    conjunctionEntities: [],
    objectPositions: new Map(),
    showOrbits: true,
    isTracking: false,
    followEntityKey: null,
    intervals: {},
    logs: [],
    tleLogs: [],
    feedStatus: {},
    fpsHistory: [],
    objectCountHistory: [],
    charts: {},
    alertFilter: "ALL",
    alertRefreshCountdown: 20,
    lastTLEResyncAt: null,
    lastTLESyncStartAt: null,
    syncPromise: null,
    latestPrediction: null,
    apiHealthy: false,
    rawThreatRisk: "GREEN",
    renderedCount: 0,
    propagationCursor: 0,
    health: {
      cpu: 67,
      mem: 54
    },
    audio: {
      context: null,
      unlocked: false,
      redAlarmTimer: null,
      lastRisk: "GREEN"
    }
  };

  const DOM = {};

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  };

  const API = {
    async request(method, path, body = null) {
      const requestOptions = {
        method,
        headers: {
          Accept: "application/json"
        }
      };

      if (body !== null) {
        requestOptions.headers["Content-Type"] = "application/json";
        requestOptions.body = JSON.stringify(body);
      }

      try {
        const response = await fetchWithTimeout(`${CONFIG.API_BASE}${path}`, requestOptions, CONFIG.API_FETCH_TIMEOUT_MS);
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }

        State.apiHealthy = true;
        UI.setAPIConnected(true);

        if (response.status === 204) {
          return null;
        }

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return await response.json();
        }

        return await response.text();
      } catch (error) {
        State.apiHealthy = false;
        UI.setAPIConnected(false);
        Log.add("ERROR", `API ${method} ${path} failed`);
        throw error;
      }
    },

    get(path) {
      return this.request("GET", path);
    },

    post(path, body = {}) {
      return this.request("POST", path, body);
    },

    async seedData() {
      await this.post("/satellites/seed", {});
      await this.post("/debris/seed", {});
    }
  };

  const Log = {
    add(level, message) {
      const entry = {
        time: new Date(),
        level: String(level || "INFO").toUpperCase(),
        message
      };
      State.logs.unshift(entry);
      if (State.logs.length > CONFIG.MAX_LOG_ENTRIES) {
        State.logs.length = CONFIG.MAX_LOG_ENTRIES;
      }
      this.render();
    },

    addTLE(message) {
      const entry = {
        time: new Date(),
        message
      };
      State.tleLogs.unshift(entry);
      if (State.tleLogs.length > CONFIG.MAX_TLE_LOG_ENTRIES) {
        State.tleLogs.length = CONFIG.MAX_TLE_LOG_ENTRIES;
      }
      this.renderTLE();
    },

    render() {
      if (!DOM.systemLog) {
        return;
      }

      DOM.systemLog.innerHTML = State.logs
        .slice(0, 15)
        .map((entry) => {
          const levelClass = `log-level-${entry.level.toLowerCase()}`;
          return [
            '<div class="log-line">',
            `<span class="log-time">${formatTime(entry.time)}</span>`,
            `<span class="${levelClass}">[${escapeHtml(entry.level)}]</span>`,
            `<span>${escapeHtml(entry.message)}</span>`,
            "</div>"
          ].join("");
        })
        .join("");
    },

    renderTLE() {
      if (!DOM.tleFeedLog) {
        return;
      }

      DOM.tleFeedLog.innerHTML = State.tleLogs
        .map((entry) => {
          return [
            '<div class="log-line">',
            `<span class="log-time">${formatTime(entry.time)}</span>`,
            `<span>${escapeHtml(entry.message)}</span>`,
            "</div>"
          ].join("");
        })
        .join("");
    }
  };

  const UI = {
    initRefs() {
      DOM.utcClock = document.getElementById("utc-clock");
      DOM.doyClock = document.getElementById("doy-clock");
      DOM.apiPill = document.getElementById("api-pill");
      DOM.tlePill = document.getElementById("tle-pill");
      DOM.objectsPill = document.getElementById("objects-pill");
      DOM.threatPill = document.getElementById("threat-pill");
      DOM.sidebarCelestrakStatus = document.getElementById("sidebar-celestrak-status");
      DOM.sidebarFeedCount = document.getElementById("sidebar-feed-count");
      DOM.sidebarLastSync = document.getElementById("sidebar-last-sync");
      DOM.sidebarSyncMode = document.getElementById("sidebar-sync-mode");
      DOM.badgeSat = document.getElementById("badge-sat");
      DOM.badgeDeb = document.getElementById("badge-deb");
      DOM.badgeAlert = document.getElementById("badge-alert");
      DOM.cpuLabel = document.getElementById("cpu-label");
      DOM.memLabel = document.getElementById("mem-label");
      DOM.cpuMeter = document.getElementById("cpu-meter");
      DOM.memMeter = document.getElementById("mem-meter");
      DOM.healthAPI = document.getElementById("health-api");
      DOM.overlay = document.getElementById("hero-overlay");
      DOM.overlayTitle = document.getElementById("overlay-title");
      DOM.overlayContent = document.getElementById("overlay-content");
      DOM.overlayClose = document.getElementById("overlay-close");
      DOM.trackModeText = document.getElementById("track-mode-text");
      DOM.overlayRenderedCount = document.getElementById("overlay-rendered-count");
      DOM.overlayLastPrediction = document.getElementById("overlay-last-prediction");
      DOM.telemetryEmpty = document.getElementById("telemetry-empty");
      DOM.telemetryContent = document.getElementById("telemetry-content");
      DOM.selectedName = document.getElementById("selected-name");
      DOM.selectedNorad = document.getElementById("selected-norad");
      DOM.selectedTypeBadge = document.getElementById("selected-type-badge");
      DOM.selectedFeedLabel = document.getElementById("selected-feed-label");
      DOM.telemetryAlt = document.getElementById("telemetry-alt");
      DOM.telemetryAltProgress = document.getElementById("telemetry-alt-progress");
      DOM.telemetryOrbitBand = document.getElementById("telemetry-orbit-band");
      DOM.telemetryLat = document.getElementById("telemetry-lat");
      DOM.telemetryLon = document.getElementById("telemetry-lon");
      DOM.telemetryVel = document.getElementById("telemetry-vel");
      DOM.telemetryPeriod = document.getElementById("telemetry-period");
      DOM.telemetryInc = document.getElementById("telemetry-inc");
      DOM.telemetryTLE = document.getElementById("telemetry-tle");
      DOM.telemetryElements = document.getElementById("telemetry-elements");
      DOM.tleFeedLog = document.getElementById("tle-feed-log");
      DOM.riskNeedle = document.getElementById("risk-needle");
      DOM.riskMeterText = document.getElementById("risk-meter-text");
      DOM.predictPrimary = document.getElementById("predict-primary");
      DOM.predictThreat = document.getElementById("predict-threat");
      DOM.windowSlider = document.getElementById("window-slider");
      DOM.windowLabel = document.getElementById("window-label");
      DOM.stepSelect = document.getElementById("step-select");
      DOM.runPredictionButton = document.getElementById("btn-run-prediction");
      DOM.fakeProgressBar = document.getElementById("fake-progress-bar");
      DOM.predictionResult = document.getElementById("prediction-result");
      DOM.resultRiskBadge = document.getElementById("result-risk-badge");
      DOM.resultPc = document.getElementById("result-pc");
      DOM.resultProbBar = document.getElementById("result-prob-bar");
      DOM.resultMiss = document.getElementById("result-miss");
      DOM.resultVel = document.getElementById("result-vel");
      DOM.resultTca = document.getElementById("result-tca");
      DOM.maneuverBox = document.getElementById("maneuver-box");
      DOM.showOnGlobeButton = document.getElementById("btn-show-on-globe");
      DOM.riskDonutChart = document.getElementById("risk-donut-chart");
      DOM.altitudeBarChart = document.getElementById("altitude-bar-chart");
      DOM.sparklineChart = document.getElementById("objects-sparkline");
      DOM.chartTotalConjunctions = document.getElementById("chart-total-conjunctions");
      DOM.sparklineLatest = document.getElementById("sparkline-latest");
      DOM.sumGreen = document.getElementById("sum-green");
      DOM.sumYellow = document.getElementById("sum-yellow");
      DOM.sumOrange = document.getElementById("sum-orange");
      DOM.sumRed = document.getElementById("sum-red");
      DOM.alertFilterButtons = Array.from(document.querySelectorAll(".filter-button"));
      DOM.alertsCards = document.getElementById("alerts-cards");
      DOM.alertsEmpty = document.getElementById("alerts-empty");
      DOM.alertRefreshCountdown = document.getElementById("alerts-refresh-countdown");
      DOM.feedStatusBody = document.getElementById("feed-status-body");
      DOM.feedTotalCount = document.getElementById("feed-total-count");
      DOM.systemLog = document.getElementById("system-log");
      DOM.perfRendered = document.getElementById("perf-rendered");
      DOM.perfLastSync = document.getElementById("perf-last-sync");
      DOM.fpsCounter = document.getElementById("fps-counter");
      DOM.toastStack = document.getElementById("toast-stack");
      DOM.sideNavButtons = Array.from(document.querySelectorAll("#side-nav .nav-item"));
      DOM.btnSyncFeeds = document.getElementById("btn-sync-feeds");
      DOM.btnSidebarSync = document.getElementById("sidebar-sync-now");
      DOM.btnResetView = document.getElementById("btn-reset-view");
      DOM.btnDayNight = document.getElementById("btn-day-night");
      DOM.btnFollowSelected = document.getElementById("btn-follow-selected");
      DOM.btnToggleOrbits = document.getElementById("btn-toggle-orbits");
      DOM.btnPredictSelected = document.getElementById("btn-predict-selected");
    },

    toast(message, type = "info") {
      if (!DOM.toastStack) {
        return;
      }

      const normalizedType = ["info", "ok", "warn", "error"].includes(type) ? type : "info";
      const node = document.createElement("div");
      node.className = `toast ${normalizedType}`;
      node.textContent = message;
      DOM.toastStack.prepend(node);

      window.setTimeout(() => {
        node.style.opacity = "0";
        window.setTimeout(() => node.remove(), 200);
      }, 3600);
    },

    setAPIConnected(isConnected) {
      if (!DOM.apiPill || !DOM.healthAPI) {
        return;
      }

      if (isConnected) {
        DOM.apiPill.innerHTML = '<span class="status-dot dot-green"></span><span>API CONNECTED</span>';
        DOM.healthAPI.textContent = "NOMINAL";
        DOM.healthAPI.style.color = "var(--green)";
      } else {
        DOM.apiPill.innerHTML = '<span class="status-dot dot-red"></span><span>API OFFLINE</span>';
        DOM.healthAPI.textContent = "OFFLINE";
        DOM.healthAPI.style.color = "var(--red)";
      }
    },

    setTLEStatus(mode, secondsSinceSync = null) {
      if (!DOM.tlePill || !DOM.sidebarCelestrakStatus) {
        return;
      }

      if (mode === "LIVE") {
        const suffix = Number.isFinite(secondsSinceSync) ? ` (${secondsSinceSync}s)` : "";
        DOM.tlePill.innerHTML = `<span class="status-dot dot-green"></span><span>TLE FEED: LIVE${suffix}</span>`;
        DOM.sidebarCelestrakStatus.textContent = "ACTIVE";
        DOM.sidebarCelestrakStatus.style.color = "var(--green)";
      } else if (mode === "FALLBACK") {
        DOM.tlePill.innerHTML = '<span class="status-dot dot-orange"></span><span>TLE FEED: FALLBACK</span>';
        DOM.sidebarCelestrakStatus.textContent = "FALLBACK";
        DOM.sidebarCelestrakStatus.style.color = "var(--orange)";
      } else {
        DOM.tlePill.innerHTML = '<span class="status-dot dot-yellow"></span><span>TLE FEED: STALE</span>';
        DOM.sidebarCelestrakStatus.textContent = "STALE";
        DOM.sidebarCelestrakStatus.style.color = "var(--yellow)";
      }
    },

    setThreat(rawRisk) {
      const normalizedRisk = String(rawRisk || "GREEN").toUpperCase();
      const level = HEADER_THREAT[normalizedRisk] || "NOMINAL";
      const dotClass =
        normalizedRisk === "RED"
          ? "dot-red"
          : normalizedRisk === "ORANGE" || normalizedRisk === "YELLOW"
            ? "dot-yellow"
            : "dot-green";

      DOM.threatPill.innerHTML = `<span class="status-dot ${dotClass}"></span><span>THREAT LEVEL: ${level}</span>`;
      State.rawThreatRisk = normalizedRisk;
      updateRiskNeedle(normalizedRisk);
      AudioAlerts.update(normalizedRisk);
    },

    updateClock() {
      const now = new Date();
      DOM.utcClock.textContent = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${String.fromCharCode(9679)} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.${Math.floor(now.getUTCMilliseconds() / 100)} UTC`;
      DOM.doyClock.textContent = `DOY ${getDOY(now)}`;
    },

    updateCounts() {
      const combinedCount = getCombinedObjects().length;
      const satelliteCount = getCombinedObjects("satellite").length;
      const debrisCount = getCombinedObjects("debris").length;

      DOM.objectsPill.innerHTML = `<span class="status-dot dot-cyan"></span><span>OBJECTS: ${combinedCount.toLocaleString()} TRACKED</span>`;
      DOM.sidebarFeedCount.textContent = TLEEngine.getAllObjects().length.toLocaleString();
      DOM.badgeSat.textContent = satelliteCount.toLocaleString();
      DOM.badgeDeb.textContent = debrisCount.toLocaleString();
      DOM.feedTotalCount.textContent = combinedCount.toLocaleString();
    },

    updateHealthMeters() {
      const fps = FPS.current || 60;
      const renderFactor = clamp(State.renderedCount / CONFIG.MAX_RENDER_OBJECTS, 0.1, 1);
      const syncAge = State.lastTLEResyncAt ? (Date.now() - State.lastTLEResyncAt.getTime()) / 1000 : 300;

      State.health.cpu = clamp(28 + renderFactor * 48 + (60 - Math.min(fps, 60)) * 0.55 + randomRange(-3, 3), 18, 96);
      State.health.mem = clamp(22 + renderFactor * 40 + Math.min(syncAge / 60, 18) + randomRange(-2, 2), 16, 92);

      DOM.cpuLabel.textContent = `${Math.round(State.health.cpu)}%`;
      DOM.memLabel.textContent = `${Math.round(State.health.mem)}%`;
      DOM.cpuMeter.style.width = `${State.health.cpu}%`;
      DOM.memMeter.style.width = `${State.health.mem}%`;
    },

    showOverlay(title, html) {
      DOM.overlayTitle.textContent = title;
      DOM.overlayContent.innerHTML = html;
      DOM.overlay.classList.remove("hidden");
    },

    hideOverlay() {
      DOM.overlay.classList.add("hidden");
    }
  };

  const AudioAlerts = {
    ensureContext() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        return null;
      }

      if (!State.audio.context) {
        State.audio.context = new AudioCtx();
      }

      if (State.audio.context.state === "suspended") {
        State.audio.context.resume().catch(() => {});
      }

      State.audio.unlocked = true;
      return State.audio.context;
    },

    beep(frequency, duration, volume = 0.06, wave = "sine", delay = 0) {
      const context = this.ensureContext();
      if (!context) {
        return;
      }

      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      gainNode.gain.setValueAtTime(0.0001, start);
      gainNode.gain.linearRampToValueAtTime(volume, start + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    },

    yellowTransition() {
      this.beep(440, 0.1, 0.04, "sine", 0);
    },

    orangeTransition() {
      this.beep(880, 0.1, 0.06, "triangle", 0);
      this.beep(880, 0.1, 0.06, "triangle", 0.18);
    },

    startRedAlarm() {
      if (State.audio.redAlarmTimer) {
        return;
      }

      let flip = false;
      State.audio.redAlarmTimer = window.setInterval(() => {
        this.beep(flip ? 220 : 260, 0.14, 0.08, "square", 0);
        flip = !flip;
      }, 320);
    },

    stopRedAlarm() {
      if (State.audio.redAlarmTimer) {
        window.clearInterval(State.audio.redAlarmTimer);
        State.audio.redAlarmTimer = null;
      }
    },

    update(rawRisk) {
      const normalizedRisk = String(rawRisk || "GREEN").toUpperCase();
      const previousRisk = State.audio.lastRisk;
      State.audio.lastRisk = normalizedRisk;

      if (normalizedRisk === "RED") {
        if (previousRisk !== "RED") {
          this.startRedAlarm();
        }
        return;
      }

      this.stopRedAlarm();

      if (normalizedRisk === "YELLOW" && riskRank(previousRisk) < riskRank("YELLOW")) {
        this.yellowTransition();
      }

      if (normalizedRisk === "ORANGE" && previousRisk !== "ORANGE" && previousRisk !== "RED") {
        this.orangeTransition();
      }
    }
  };

  const TLEEngine = {
    parseTLEText(text) {
      const lines = String(text || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const objects = [];
      for (let index = 0; index < lines.length - 1; index += 1) {
        if (lines[index].startsWith("1 ") && lines[index + 1] && lines[index + 1].startsWith("2 ")) {
          const noradId = Number.parseInt(lines[index].substring(2, 7), 10);
          const previousLine = index > 0 ? lines[index - 1] : "";
          const hasName = previousLine && !previousLine.startsWith("1 ") && !previousLine.startsWith("2 ");
          objects.push({
            name: hasName ? previousLine : `OBJECT ${Number.isFinite(noradId) ? noradId : index}`,
            tle1: lines[index],
            tle2: lines[index + 1],
            noradId
          });
          index += 1;
        }
      }

      return objects;
    },

    inferType(feedName, name) {
      const upperName = String(name || "").toUpperCase();
      if (["debris", "fengyun", "cosmos"].includes(feedName)) {
        return "debris";
      }
      if (upperName.includes("DEB") || upperName.includes("R/B") || upperName.includes("ROCKET BODY")) {
        return "debris";
      }
      return "satellite";
    },

    buildObject(base, feedName, mode) {
      let satrec = null;
      try {
        satrec = satellite.twoline2satrec(base.tle1, base.tle2);
      } catch (error) {
        return null;
      }

      const inclinationDeg = parseTleFloat(base.tle2, 8, 16);
      const eccentricity = parseTleEccentricity(base.tle2);
      const meanMotion = parseTleFloat(base.tle2, 52, 63);
      const periodMin = Number.isFinite(meanMotion) && meanMotion > 0 ? 1440 / meanMotion : 0;
      const approxAltitudeKm = estimateAltitude(periodMin);
      const type = this.inferType(feedName, base.name);

      return {
        key: `${type}_${base.noradId}`,
        type,
        name: base.name,
        noradId: base.noradId,
        tle1: base.tle1,
        tle2: base.tle2,
        satrec,
        source: "tle",
        sourceLabel: "LIVE TLE",
        inDatabase: false,
        feedNames: [feedName],
        fetchMode: mode,
        periodMin,
        inclinationDeg,
        eccentricity,
        meanMotion,
        approxAltitudeKm,
        orbitType: classifyOrbit(approxAltitudeKm),
        sizeM: type === "debris" ? 1.0 : 10.0,
        sourceCountry: null,
        lastPosition: null
      };
    },

    async fetchFeed(name, url) {
      State.feedStatus[name] = {
        status: "SYNCING",
        count: 0,
        lastSync: null,
        mode: "SYNCING"
      };
      this.renderFeedStatusTable();

      const direct = await this.tryFetch(url, "direct");
      if (direct.ok) {
        return this.handleFeedText(name, direct.text, "DIRECT");
      }

      const proxied = await this.tryFetch(url, "corsproxy");
      if (proxied.ok) {
        return this.handleFeedText(name, proxied.text, "PROXY");
      }

      const relayed = await this.tryFetch(url, "jina");
      if (relayed.ok) {
        return this.handleFeedText(name, relayed.text, "RELAY");
      }

      return this.handleFeedText(name, this.getFallbackTLE(name, url), "FALLBACK");
    },

    async tryFetch(url, mode = "direct") {
      const isDirect = mode === "direct";
      const target = isDirect ? url : this.getRelayUrl(url, mode);
      const timeoutMs = isDirect ? CONFIG.DIRECT_FETCH_TIMEOUT_MS : CONFIG.RELAY_FETCH_TIMEOUT_MS;

      try {
        const response = await fetchWithTimeout(target, { method: "GET" }, timeoutMs);
        if (!response.ok) {
          return { ok: false, text: "" };
        }

        const text = await response.text();
        if (!text.trim()) {
          return { ok: false, text: "" };
        }

        return { ok: true, text };
      } catch (error) {
        return { ok: false, text: "" };
      }
    },

    getRelayUrl(url, mode) {
      if (mode === "corsproxy") {
        return `${CONFIG.CORS_PROXY}${encodeURIComponent(url)}`;
      }

      if (mode === "jina") {
        return `${CONFIG.JINA_PROXY}${String(url).replace(/^https?:\/\//, "")}`;
      }

      return url;
    },

    handleFeedText(name, text, mode) {
      const objects = this.parseTLEText(text)
        .map((entry) => this.buildObject(entry, name, mode))
        .filter(Boolean);

      State.feedStatus[name] = {
        status: mode === "FALLBACK" ? "FALLBACK" : "LIVE",
        count: objects.length,
        lastSync: new Date(),
        mode
      };
      this.renderFeedStatusTable();

      if (objects.length) {
        Log.addTLE(`${humanFeedName(name)} synced - ${objects.length.toLocaleString()} objects`);
      }

      return objects;
    },

    getFallbackTLE(name, url) {
      if (FALLBACK_TLE[name]) {
        return FALLBACK_TLE[name];
      }

      const matchingEntry = Object.entries(CONFIG.TLE_FEEDS).find(([, value]) => value === url);
      if (matchingEntry && FALLBACK_TLE[matchingEntry[0]]) {
        return FALLBACK_TLE[matchingEntry[0]];
      }

      return FALLBACK_TLE.stations;
    },

    async syncAllFeeds(reason = "manual") {
      if (State.syncPromise) {
        return State.syncPromise;
      }

      State.syncPromise = (async () => {
        State.lastTLESyncStartAt = new Date();
        Log.add("INFO", `Fetching live TLE feeds from CelesTrak (${reason})`);

        const merged = new Map();
        const entries = Object.entries(CONFIG.TLE_FEEDS);
        const results = await Promise.all(entries.map(([name, url]) => this.fetchFeed(name, url).catch(() => [])));

        results.flat().forEach((obj) => {
          if (!merged.has(obj.key)) {
            merged.set(obj.key, obj);
          } else {
            merged.set(obj.key, mergeCatalogObjects(merged.get(obj.key), obj));
          }
        });

        const allObjects = Array.from(merged.values()).sort(sortCatalogObjects);
        State.tleSatellites = allObjects.filter((item) => item.type === "satellite");
        State.tleDebris = allObjects.filter((item) => item.type === "debris");
        State.lastTLEResyncAt = new Date();

        const usedFallback = Object.values(State.feedStatus).every((entry) => entry.mode === "FALLBACK");
        UI.setTLEStatus(usedFallback ? "FALLBACK" : "LIVE", 0);
        UI.updateCounts();
        this.renderFeedStatusTable();
        updateSyncStatusTick();

        Log.add("OK", `TLE sync complete - ${allObjects.length.toLocaleString()} objects`);
        return allObjects;
      })().finally(() => {
        State.syncPromise = null;
      });

      return State.syncPromise;
    },

    getPosition(tle1, tle2, satrecInput = null, when = new Date()) {
      try {
        const satrec = satrecInput || satellite.twoline2satrec(tle1, tle2);
        const propagated = satellite.propagate(satrec, when);
        if (!propagated.position) {
          return null;
        }

        const gmst = satellite.gstime(when);
        const geodetic = satellite.eciToGeodetic(propagated.position, gmst);
        const velocity = propagated.velocity || { x: 0, y: 0, z: 0 };
        const speed = Math.sqrt(
          velocity.x * velocity.x +
            velocity.y * velocity.y +
            velocity.z * velocity.z
        );

        return {
          lat: satellite.degreesLat(geodetic.latitude),
          lon: satellite.degreesLong(geodetic.longitude),
          alt: geodetic.height,
          velocity: speed,
          gmst,
          time: when
        };
      } catch (error) {
        return null;
      }
    },

    getObjectPositionAtTime(obj, when) {
      const pos = this.getPosition(obj.tle1, obj.tle2, obj.satrec, when);
      if (!pos) {
        return null;
      }

      return {
        ...pos,
        cartesian: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000)
      };
    },

    computeOrbitPath(tle1, tle2, satrecInput = null, minutesAhead = CONFIG.ORBIT_MINUTES) {
      if (typeof Cesium === "undefined") {
        return [];
      }

      let satrec = satrecInput;
      try {
        satrec = satrec || satellite.twoline2satrec(tle1, tle2);
      } catch (error) {
        return [];
      }

      const points = [];
      const now = new Date();

      for (let minute = 0; minute <= minutesAhead; minute += 1) {
        const sampleTime = new Date(now.getTime() + minute * 60000);
        const propagated = satellite.propagate(satrec, sampleTime);
        if (!propagated.position) {
          continue;
        }

        const gmst = satellite.gstime(sampleTime);
        const geodetic = satellite.eciToGeodetic(propagated.position, gmst);
        points.push(
          Cesium.Cartesian3.fromDegrees(
            satellite.degreesLong(geodetic.longitude),
            satellite.degreesLat(geodetic.latitude),
            geodetic.height * 1000
          )
        );
      }

      return points;
    },

    getAllObjects() {
      return [...State.tleSatellites, ...State.tleDebris];
    },

    renderFeedStatusTable() {
      if (!DOM.feedStatusBody) {
        return;
      }

      const rows = Object.keys(CONFIG.TLE_FEEDS).map((name) => {
        const entry = State.feedStatus[name] || {
          status: "IDLE",
          count: 0,
          mode: "IDLE"
        };
        const modeClass =
          entry.mode === "FALLBACK"
            ? "dot-orange"
            : entry.mode === "DIRECT" || entry.mode === "PROXY"
              ? "dot-green"
              : entry.mode === "SYNCING"
                ? "dot-yellow"
                : "dot-red";

        return [
          "<tr>",
          `<td>${escapeHtml(humanFeedName(name))}</td>`,
          `<td><span class="status-dot ${modeClass}"></span> ${escapeHtml(entry.mode || entry.status)}</td>`,
          `<td>${Number(entry.count || 0).toLocaleString()}</td>`,
          "</tr>"
        ].join("");
      });

      const apiCount = State.apiSatellites.length + State.apiDebris.length;
      rows.push([
        "<tr>",
        "<td>Local API</td>",
        `<td><span class="status-dot ${State.apiHealthy ? "dot-green" : "dot-red"}"></span> ${State.apiHealthy ? "LIVE" : "OFFLINE"}</td>`,
        `<td>${apiCount.toLocaleString()}</td>`,
        "</tr>"
      ].join(""));

      DOM.feedStatusBody.innerHTML = rows.join("");
    },

    recordPropagationPulse() {
      const objects = getRenderableObjects();
      if (!objects.length) {
        return;
      }

      State.propagationCursor = (State.propagationCursor + 1) % objects.length;
      const sample = objects[State.propagationCursor];
      const messages = sample.type === "debris"
        ? ["position updated", "TLE propagated", "vector solved"]
        : ["position updated", "orbit propagated", "telemetry refreshed"];
      const verb = messages[State.propagationCursor % messages.length];
      Log.addTLE(`${sample.name.slice(0, 28)} ${verb}`);
    }
  };

  const Globe = {
    init() {
      if (typeof Cesium === "undefined") {
        throw new Error("Cesium was not loaded");
      }

      Cesium.Ion.defaultAccessToken = CONFIG.CESIUM_TOKEN;
      if (Cesium.FeatureDetection && typeof Cesium.FeatureDetection.supportsWebWorkers === "function") {
        Cesium.FeatureDetection.supportsWebWorkers = () => false;
      }

      State.cesiumViewer = new Cesium.Viewer("cesium-container", {
        imageryProvider: new Cesium.TileMapServiceImageryProvider({
          url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
        }),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: true,
        vrButton: false,
        infoBox: false,
        selectionIndicator: false,
        shadows: false,
        terrainShadows: Cesium.ShadowMode.DISABLED
      });

      const viewer = State.cesiumViewer;
      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.nightFadeOutDistance = 5000000;
      viewer.scene.globe.nightFadeInDistance = 50000000;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#010409");
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#010409");
      viewer.scene.skyBox = new Cesium.SkyBox({
        sources: {
          positiveX: "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_px.jpg",
          negativeX: "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg",
          positiveY: "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_py.jpg",
          negativeY: "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_my.jpg",
          positiveZ: "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg",
          negativeZ: "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg"
        }
      });
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0002;
      viewer.scene.moon = new Cesium.Moon();
      viewer.scene.sun = new Cesium.Sun();
      viewer.scene.skyAtmosphere = new Cesium.SkyAtmosphere();
      viewer.clock.shouldAnimate = true;

      this.resetView(true);

      viewer.screenSpaceEventHandler.setInputAction((click) => {
        const picked = viewer.scene.pick(click.position);
        if (!Cesium.defined(picked) || !picked.id || !picked.id.catalogKey) {
          return;
        }

        const object = findCatalogObject(picked.id.catalogKey);
        if (!object) {
          return;
        }

        Telemetry.select(object);
        this.flyToObject(object.key);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    },

    resetView(initial = false) {
      if (!State.cesiumViewer) {
        return;
      }

      State.cesiumViewer.trackedEntity = null;
      if (!initial) {
        State.isTracking = false;
        updateTrackMode();
      }

      State.cesiumViewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
        orientation: {
          heading: 0,
          pitch: -Cesium.Math.PI_OVER_TWO,
          roll: 0
        },
        duration: 3
      });
    },

    addObject(obj, index) {
      if (!State.cesiumViewer || !obj || !obj.satrec || State.cesiumEntities.has(obj.key)) {
        return;
      }

      const pointColor = obj.type === "debris"
        ? Cesium.Color.fromCssColorString("#FF6D00")
        : Cesium.Color.fromCssColorString("#00E5FF");
      const pointSize = obj.type === "debris" ? 5 : 8;
      const outlineWidth = obj.type === "debris" ? 8 : 12;

      const initialPosition = TLEEngine.getPosition(obj.tle1, obj.tle2, obj.satrec, new Date()) || {
        lat: 0,
        lon: 0,
        alt: obj.approxAltitudeKm || 400,
        velocity: 0
      };

      const holder = {
        cartesian: Cesium.Cartesian3.fromDegrees(initialPosition.lon, initialPosition.lat, initialPosition.alt * 1000)
      };

      State.objectPositions.set(obj.key, initialPosition);

      const labelEnabled = shouldRenderLabel(obj, index);
      const entity = State.cesiumViewer.entities.add({
        id: `entity_${obj.key}`,
        position: new Cesium.CallbackProperty(() => holder.cartesian, false),
        point: {
          pixelSize: pointSize,
          color: pointColor,
          outlineColor: pointColor.withAlpha(0.3),
          outlineWidth,
          scaleByDistance: new Cesium.NearFarScalar(1000000, 2.0, 50000000, 0.45),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: labelEnabled
          ? {
              text: obj.name.slice(0, 20),
              font: "11px Orbitron",
              fillColor: pointColor,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -14),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000000),
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          : undefined
      });

      entity.catalogKey = obj.key;
      entity.catalogType = obj.type;

      State.cesiumEntities.set(obj.key, {
        entity,
        obj,
        holder
      });

      if (shouldRenderOrbit(obj, index)) {
        this.ensureOrbit(obj);
      }
    },

    ensureOrbit(obj) {
      if (!State.cesiumViewer || State.orbitEntities.has(obj.key)) {
        return;
      }

      const path = TLEEngine.computeOrbitPath(obj.tle1, obj.tle2, obj.satrec, CONFIG.ORBIT_MINUTES);
      if (path.length < 2) {
        return;
      }

      const color = obj.type === "debris"
        ? Cesium.Color.fromCssColorString("#FF6D00").withAlpha(0.25)
        : Cesium.Color.fromCssColorString("#00E5FF").withAlpha(0.3);

      const orbitEntity = State.cesiumViewer.entities.add({
        id: `orbit_${obj.key}`,
        polyline: {
          positions: path,
          width: obj.type === "debris" ? 0.9 : 1.1,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.15,
            color
          }),
          arcType: Cesium.ArcType.NONE,
          clampToGround: false,
          show: State.showOrbits
        }
      });

      State.orbitEntities.set(obj.key, orbitEntity);
    },

    rebuildEntities() {
      if (!State.cesiumViewer) {
        return;
      }

      State.cesiumViewer.entities.removeAll();
      State.cesiumEntities.clear();
      State.orbitEntities.clear();
      State.objectPositions.clear();
      State.conjunctionEntities = [];
      State.selectedEntity = null;

      const renderable = getRenderableObjects();
      renderable.forEach((obj, index) => this.addObject(obj, index));
      State.renderedCount = renderable.length;

      DOM.perfRendered.textContent = renderable.length.toLocaleString();
      DOM.overlayRenderedCount.textContent = `${renderable.length.toLocaleString()} ENTITIES`;
      updateTrackMode();

      if (State.selectedObject) {
        const refreshed = findCatalogObject(State.selectedObject.key);
        if (refreshed) {
          State.selectedObject = refreshed;
          const entityRecord = State.cesiumEntities.get(refreshed.key);
          State.selectedEntity = entityRecord ? entityRecord.entity : null;
        }
      }

      if (State.latestPrediction) {
        this.drawConjunctionLine(
          State.latestPrediction.primary,
          State.latestPrediction.threat,
          State.latestPrediction.result
        );
      }
    },

    updatePositions() {
      if (!State.cesiumViewer) {
        return;
      }

      const now = new Date();
      let updated = 0;

      State.cesiumEntities.forEach((record, key) => {
        const pos = TLEEngine.getPosition(record.obj.tle1, record.obj.tle2, record.obj.satrec, now);
        if (!pos) {
          return;
        }

        record.obj.lastPosition = pos;
        record.holder.cartesian = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000);
        State.objectPositions.set(key, pos);
        updated += 1;
      });

      if (updated > 0) {
        TLEEngine.recordPropagationPulse();
      }

      if (State.selectedObject) {
        Telemetry.renderFromState();
      }

      if (State.isTracking && State.followEntityKey) {
        const record = State.cesiumEntities.get(State.followEntityKey);
        if (record) {
          State.cesiumViewer.trackedEntity = record.entity;
        }
      }
    },

    clearConjunctionLine() {
      if (!State.cesiumViewer || !State.conjunctionEntities.length) {
        return;
      }

      State.conjunctionEntities.forEach((entity) => State.cesiumViewer.entities.remove(entity));
      State.conjunctionEntities = [];
    },

    drawConjunctionLine(primary, threat, result) {
      if (!State.cesiumViewer || typeof Cesium === "undefined") {
        return;
      }

      this.clearConjunctionLine();

      const tcaDate = new Date(result.tcaUtc);
      const primaryPosition = TLEEngine.getObjectPositionAtTime(primary, tcaDate);
      const threatPosition = TLEEngine.getObjectPositionAtTime(threat, tcaDate);

      let satPosition = primaryPosition?.cartesian || null;
      let debrisPosition = threatPosition?.cartesian || null;

      if (!satPosition || !debrisPosition) {
        const center = Cesium.Cartesian3.fromDegrees(result.tcaLongitudeDeg, result.tcaLatitudeDeg, result.tcaAltitudeKm * 1000);
        satPosition = satPosition || center;
        debrisPosition = debrisPosition || center;
      }

      const midpoint = Cesium.Cartesian3.midpoint(satPosition, debrisPosition, new Cesium.Cartesian3());

      const lineEntity = State.cesiumViewer.entities.add({
        id: "conjunction_line",
        polyline: {
          positions: [satPosition, debrisPosition],
          width: 2,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString("#FF1744").withAlpha(0.8),
            dashLength: 16
          })
        }
      });

      const markerEntity = State.cesiumViewer.entities.add({
        id: "tca_marker",
        position: midpoint,
        ellipsoid: {
          radii: new Cesium.Cartesian3(50000, 50000, 50000),
          material: Cesium.Color.fromCssColorString("#FF1744").withAlpha(0.3),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#FF1744")
        }
      });

      State.conjunctionEntities = [lineEntity, markerEntity];
    },

    flyToObject(objectKey) {
      if (!State.cesiumViewer || !State.cesiumEntities.has(objectKey)) {
        return;
      }

      const record = State.cesiumEntities.get(objectKey);
      State.selectedEntity = record.entity;
      State.cesiumViewer.flyTo(record.entity, {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(0, -0.5, 2000000)
      });
    },

    flyToConjunction(lat, lon, alt) {
      if (!State.cesiumViewer) {
        return;
      }

      State.cesiumViewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, (alt || 600) * 1000 + 2000000),
        orientation: {
          heading: 0,
          pitch: -0.9,
          roll: 0
        },
        duration: 1.6
      });
    },

    toggleOrbits() {
      State.showOrbits = !State.showOrbits;
      DOM.btnToggleOrbits.textContent = State.showOrbits ? "ORBITS ON" : "ORBITS OFF";

      if (State.showOrbits) {
        getRenderableObjects().forEach((obj, index) => {
          if (shouldRenderOrbit(obj, index)) {
            this.ensureOrbit(obj);
          }
        });
      }

      State.orbitEntities.forEach((entity) => {
        if (entity.polyline) {
          entity.polyline.show = State.showOrbits;
        }
      });

      Log.add("INFO", `Orbit path display ${State.showOrbits ? "enabled" : "disabled"}`);
    },

    toggleDayNight() {
      if (!State.cesiumViewer) {
        return;
      }

      const scene = State.cesiumViewer.scene;
      scene.globe.enableLighting = !scene.globe.enableLighting;
      scene.sun.show = scene.globe.enableLighting;
      scene.moon.show = scene.globe.enableLighting;
      scene.skyAtmosphere.show = scene.globe.enableLighting;
      DOM.btnDayNight.textContent = scene.globe.enableLighting ? "DAY/NIGHT" : "NO SUNLIGHT";
      Log.add("INFO", `Earth lighting ${scene.globe.enableLighting ? "enabled" : "disabled"}`);
    },

    toggleFollowSelected() {
      if (!State.selectedObject) {
        UI.toast("Select an object before enabling follow mode", "warn");
        return;
      }

      State.isTracking = !State.isTracking;
      State.followEntityKey = State.selectedObject.key;

      if (!State.isTracking) {
        State.cesiumViewer.trackedEntity = null;
      }

      updateTrackMode();
      Log.add("INFO", `Follow mode ${State.isTracking ? "enabled" : "disabled"}`);
    }
  };

  const Telemetry = {
    select(obj) {
      this.stopLiveUpdate();

      const current = findCatalogObject(obj.key) || obj;
      State.selectedObject = current;
      State.followEntityKey = current.key;
      State.selectedEntity = State.cesiumEntities.get(current.key)?.entity || null;

      DOM.telemetryEmpty.classList.add("hidden");
      DOM.telemetryContent.classList.remove("hidden");
      DOM.selectedName.textContent = current.name;
      DOM.selectedNorad.textContent = `NORAD ${current.noradId}`;
      DOM.selectedTypeBadge.textContent = current.type === "debris" ? "DEBRIS" : "SATELLITE";
      DOM.selectedTypeBadge.style.color = current.type === "debris" ? "var(--orange)" : "var(--cyan)";
      DOM.selectedTypeBadge.style.borderColor = current.type === "debris" ? "rgba(255,109,0,0.5)" : "var(--border-hot)";
      DOM.selectedTypeBadge.style.background = current.type === "debris" ? "rgba(255,109,0,0.12)" : "rgba(0,229,255,0.08)";
      DOM.selectedFeedLabel.textContent = current.inDatabase ? "LOCAL API" : `LIVE ${formatFeedList(current.feedNames)}`;
      DOM.telemetryTLE.textContent = `${current.tle1}\n${current.tle2}`;

      this.renderElements(buildDerivedElements(current));
      this.loadOrbitalElements(current);
      this.renderFromState();
      this.startLiveUpdate();

      if (State.showOrbits) {
        Globe.ensureOrbit(current);
      }

      updateTrackMode();
      Log.add("INFO", `Selected ${current.name} (${current.noradId})`);
      Log.addTLE(`${current.name} telemetry locked`);
    },

    renderFromState() {
      if (!State.selectedObject) {
        return;
      }

      const cachedPosition = State.objectPositions.get(State.selectedObject.key);
      const livePosition = cachedPosition || TLEEngine.getPosition(
        State.selectedObject.tle1,
        State.selectedObject.tle2,
        State.selectedObject.satrec,
        new Date()
      );

      if (livePosition) {
        this.render(livePosition);
      }
    },

    render(position) {
      if (!State.selectedObject || !position) {
        return;
      }

      DOM.telemetryAlt.textContent = `${formatNumber(position.alt, 2)} km`;
      DOM.telemetryLat.innerHTML = `${formatSigned(position.lat, 2)}&deg;`;
      DOM.telemetryLon.innerHTML = `${formatSigned(position.lon, 2)}&deg;`;
      DOM.telemetryVel.textContent = `${formatNumber(position.velocity, 3)} km/s`;
      DOM.telemetryPeriod.textContent = `${formatNumber(State.selectedObject.periodMin || 0, 1)} min`;
      DOM.telemetryInc.innerHTML = `${formatNumber(State.selectedObject.inclinationDeg || 0, 2)}&deg;`;
      DOM.telemetryOrbitBand.textContent = classifyOrbit(position.alt);
      DOM.telemetryAltProgress.style.width = `${clamp((position.alt / 36000) * 100, 1, 100)}%`;
    },

    renderElements(elements) {
      DOM.telemetryElements.innerHTML = [
        renderElementTile("Semi-major Axis", `${formatNumber(elements.semiMajorAxisKm, 1)} km`),
        renderElementTile("Eccentricity", formatNumber(elements.eccentricity, 6)),
        renderElementTile("RAAN", `${formatNumber(elements.raan, 2)} deg`),
        renderElementTile("Arg. Perigee", `${formatNumber(elements.argPerigee, 2)} deg`)
      ].join("");
    },

    async loadOrbitalElements(obj) {
      if (!obj || !obj.inDatabase || obj.type !== "satellite") {
        this.renderElements(buildDerivedElements(obj));
        return;
      }

      try {
        const response = await API.get(`/satellites/${obj.noradId}/orbital-elements`);
        this.renderElements({
          semiMajorAxisKm: response.semi_major_axis_km,
          eccentricity: response.eccentricity,
          raan: response.raan,
          argPerigee: response.arg_perigee
        });
      } catch (error) {
        this.renderElements(buildDerivedElements(obj));
      }
    },

    startLiveUpdate() {
      this.stopLiveUpdate();
      State.intervals.telemetry = window.setInterval(() => this.renderFromState(), CONFIG.REFRESH.position);
    },

    stopLiveUpdate() {
      clearIntervalSafe("telemetry");
    }
  };

  const Prediction = {
    populateDropdowns() {
      const satelliteOptions = getCombinedObjects("satellite").slice(0, CONFIG.MAX_SELECT_OPTIONS);
      const debrisOptions = getCombinedObjects("debris").slice(0, CONFIG.MAX_SELECT_OPTIONS);

      const currentPrimary = DOM.predictPrimary.value;
      const currentThreat = DOM.predictThreat.value;

      DOM.predictPrimary.innerHTML = satelliteOptions.length
        ? satelliteOptions.map((item) => renderOption(item)).join("")
        : '<option value="">No satellite catalog available</option>';

      DOM.predictThreat.innerHTML = debrisOptions.length
        ? debrisOptions.map((item) => renderOption(item)).join("")
        : '<option value="">No debris catalog available</option>';

      if (satelliteOptions.some((item) => item.key === currentPrimary)) {
        DOM.predictPrimary.value = currentPrimary;
      }

      if (debrisOptions.some((item) => item.key === currentThreat)) {
        DOM.predictThreat.value = currentThreat;
      }
    },

    async runAnalysis() {
      const primary = findCatalogObject(DOM.predictPrimary.value);
      const threat = findCatalogObject(DOM.predictThreat.value);

      if (!primary || !threat) {
        UI.toast("Select both a satellite and a debris object", "warn");
        return;
      }

      const durationHours = Number.parseInt(DOM.windowSlider.value, 10) || 72;
      const stepSeconds = Number.parseInt(DOM.stepSelect.value, 10) || 60;

      const releaseButton = setButtonBusy(DOM.runPredictionButton, "COMPUTING...");
      DOM.predictionResult.classList.add("hidden");

      try {
        const useDatabaseRoute = primary.inDatabase && threat.inDatabase;
        const predictionPromise = useDatabaseRoute
          ? API.post("/predict/satellite-vs-debris", {
              satellite_norad: primary.noradId,
              debris_norad: threat.noradId,
              duration_hours: durationHours,
              step_seconds: stepSeconds
            })
          : API.post("/predict/collision", {
              object1: {
                name: primary.name,
                tle_line1: primary.tle1,
                tle_line2: primary.tle2,
                size_m: primary.sizeM || 10
              },
              object2: {
                name: threat.name,
                tle_line1: threat.tle1,
                tle_line2: threat.tle2,
                size_m: threat.sizeM || 1
              },
              duration_hours: durationHours,
              step_seconds: stepSeconds,
              position_uncertainty_km: 0.5
            });

        const [rawResult] = await Promise.all([predictionPromise, animateFakeProgress(3000)]);
        const normalized = normalizePredictionResult(rawResult, primary, threat);

        State.latestPrediction = {
          result: normalized,
          primary,
          threat
        };

        this.renderResult(normalized);
        Globe.drawConjunctionLine(primary, threat, normalized);
        DOM.overlayLastPrediction.textContent = `${normalized.riskLevel} / ${formatNumber(normalized.missDistanceKm, 2)} km`;

        Log.add("OK", `Trajectory analysis complete - ${primary.name} vs ${threat.name}`);
        Log.addTLE(`${primary.name} / ${threat.name} conjunction solved`);
        UI.toast("Trajectory analysis complete", "ok");

        await refreshDataAfterPrediction();
      } catch (error) {
        Log.add("ERROR", "Prediction analysis failed");
        UI.toast("Prediction failed", "error");
      } finally {
        releaseButton();
        DOM.fakeProgressBar.style.width = "0%";
      }
    },

    renderResult(result) {
      DOM.predictionResult.classList.remove("hidden");
      DOM.resultRiskBadge.className = "result-risk-badge";
      DOM.resultRiskBadge.classList.add(`risk-${result.riskLevel.toLowerCase()}`);
      DOM.resultRiskBadge.textContent = result.riskLevel;
      DOM.resultPc.innerHTML = `Pc = ${toScientificHtml(result.collisionProbability)}`;
      DOM.resultMiss.textContent = `${formatNumber(result.missDistanceKm, 2)} km`;
      DOM.resultVel.textContent = `${formatNumber(result.relativeVelocityKmS, 3)} km/s`;
      DOM.resultTca.textContent = formatDateTime(result.tcaUtc);

      const targetWidth = `${probabilityToWidth(result.collisionProbability)}%`;
      DOM.resultProbBar.style.removeProperty("animation");
      void DOM.resultProbBar.offsetWidth;
      DOM.resultProbBar.style.setProperty("--target-width", targetWidth);
      DOM.resultProbBar.style.width = targetWidth;
      DOM.resultProbBar.style.animation = "bar-fill 0.6s ease both";

      if (result.maneuverRecommended || result.riskLevel === "ORANGE" || result.riskLevel === "RED") {
        DOM.maneuverBox.classList.remove("hidden");
        DOM.maneuverBox.textContent = result.riskDescription || "High concern conjunction. Pre-plan collision avoidance options.";
      } else {
        DOM.maneuverBox.classList.remove("hidden");
        DOM.maneuverBox.textContent = result.riskDescription || "Continue routine tracking. Monitor geometry changes as fresh TLE arrives.";
      }
    },

    showOnGlobe() {
      if (!State.latestPrediction) {
        UI.toast("Run an analysis before requesting a globe focus", "warn");
        return;
      }

      const { result, primary, threat } = State.latestPrediction;
      Globe.drawConjunctionLine(primary, threat, result);
      Globe.flyToConjunction(result.tcaLatitudeDeg, result.tcaLongitudeDeg, result.tcaAltitudeKm);
      Log.add("INFO", "Camera slewed to conjunction location");
    }
  };

  const Analytics = {
    initCharts() {
      if (typeof Chart === "undefined") {
        return;
      }

      Chart.defaults.color = "#DCF0FF";
      Chart.defaults.font.family = '"Exo 2", sans-serif';

      const centerTextPlugin = {
        id: "centerTextPlugin",
        afterDraw(chart) {
          if (!chart.chartArea || chart.config.type !== "doughnut") {
            return;
          }

          const total = chart.data.datasets[0].data.reduce((sum, value) => sum + value, 0);
          const { ctx, chartArea } = chart;
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;

          ctx.save();
          ctx.fillStyle = "#DCF0FF";
          ctx.font = "700 22px Orbitron";
          ctx.textAlign = "center";
          ctx.fillText(String(total), centerX, centerY - 4);
          ctx.fillStyle = "#5B8DB8";
          ctx.font = "11px Orbitron";
          ctx.fillText("TOTAL", centerX, centerY + 16);
          ctx.restore();
        }
      };

      const kesslerPlugin = {
        id: "kesslerZonePlugin",
        afterDraw(chart) {
          if (!chart.chartArea || chart.config.type !== "bar") {
            return;
          }

          const labels = chart.data.labels || [];
          const bandIndex = labels.findIndex((label) => String(label).startsWith("800-900"));
          if (bandIndex < 0 || !chart.scales.y) {
            return;
          }

          const { ctx, chartArea, scales } = chart;
          const y = scales.y.getPixelForValue(bandIndex);
          ctx.save();
          ctx.strokeStyle = "rgba(255, 23, 68, 0.65)";
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#FF1744";
          ctx.font = "10px Orbitron";
          ctx.fillText("KESSLER ZONE", chartArea.left + 6, y - 6);
          ctx.restore();
        }
      };

      State.charts.riskDonut = new Chart(DOM.riskDonutChart, {
        type: "doughnut",
        data: {
          labels: ["GREEN", "YELLOW", "ORANGE", "RED"],
          datasets: [
            {
              data: [1, 0, 0, 0],
              backgroundColor: ["#00E676", "#FFEA00", "#FF6D00", "#FF1744"],
              borderWidth: 0,
              hoverOffset: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#DCF0FF",
                boxWidth: 10,
                usePointStyle: true,
                pointStyle: "circle"
              }
            }
          },
          animation: {
            duration: 700
          }
        },
        plugins: [centerTextPlugin]
      });

      State.charts.altitudeBar = new Chart(DOM.altitudeBarChart, {
        type: "bar",
        data: {
          labels: [],
          datasets: [
            {
              data: [],
              borderRadius: 6,
              borderSkipped: false,
              backgroundColor: []
            }
          ]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: {
                color: "rgba(220, 240, 255, 0.08)"
              },
              ticks: {
                color: "#DCF0FF",
                font: {
                  family: "Share Tech Mono"
                }
              }
            },
            y: {
              grid: {
                color: "rgba(220, 240, 255, 0.05)"
              },
              ticks: {
                color: "#DCF0FF",
                font: {
                  family: "Share Tech Mono",
                  size: 10
                }
              }
            }
          },
          animation: {
            duration: 700
          }
        },
        plugins: [kesslerPlugin]
      });

      State.charts.sparkline = new Chart(DOM.sparklineChart, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              data: [],
              borderColor: "#00E5FF",
              borderWidth: 2,
              tension: 0.32,
              pointRadius: 0,
              fill: true,
              backgroundColor: "rgba(0, 229, 255, 0.1)"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: false
            }
          },
          scales: {
            x: {
              display: false
            },
            y: {
              display: false
            }
          },
          elements: {
            line: {
              capBezierPoints: true
            }
          },
          animation: {
            duration: 500
          }
        }
      });
    },

    async refreshAll() {
      this.updateRiskDonut();
      await this.updateAltitudeBar();
      this.updateSparkline(getCombinedObjects().length);
    },

    updateRiskDonut() {
      const counts = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 };
      State.conjunctions.forEach((entry) => {
        const risk = String(entry.risk_level || "GREEN").toUpperCase();
        counts[risk] = (counts[risk] || 0) + 1;
      });

      const values = [counts.GREEN, counts.YELLOW, counts.ORANGE, counts.RED];
      const total = values.reduce((sum, value) => sum + value, 0);
      const safeValues = total === 0 ? [1, 0, 0, 0] : values;

      if (State.charts.riskDonut) {
        State.charts.riskDonut.data.datasets[0].data = safeValues;
        State.charts.riskDonut.update();
      }

      DOM.chartTotalConjunctions.textContent = `${total.toLocaleString()} conjunctions`;
    },

    async updateAltitudeBar() {
      if (!State.charts.altitudeBar) {
        return;
      }

      try {
        const response = await API.get("/debris/heatmap");
        const bands = response.bands || [];
        const labels = bands.map((band) => `${band.band_start_km}-${band.band_end_km}`);
        const counts = bands.map((band) => band.count);
        const max = Math.max(...counts, 1);
        const colors = counts.map((count) => heatColor(count / max));

        State.charts.altitudeBar.data.labels = labels;
        State.charts.altitudeBar.data.datasets[0].data = counts;
        State.charts.altitudeBar.data.datasets[0].backgroundColor = colors;
        State.charts.altitudeBar.update();
      } catch (error) {
        Log.add("WARN", "Debris heatmap unavailable");
      }
    },

    updateSparkline(value) {
      State.objectCountHistory.push(value);
      if (State.objectCountHistory.length > 10) {
        State.objectCountHistory.shift();
      }

      if (State.charts.sparkline) {
        State.charts.sparkline.data.labels = State.objectCountHistory.map((_, index) => index + 1);
        State.charts.sparkline.data.datasets[0].data = [...State.objectCountHistory];
        State.charts.sparkline.update();
      }

      DOM.sparklineLatest.textContent = `${value.toLocaleString()} tracked`;
    }
  };

  const Alerts = {
    async load() {
      try {
        const response = await API.get("/alerts/");
        State.alerts = response.alerts || [];
        this.render(State.alerts);
      } catch (error) {
        State.alerts = [];
        this.render([]);
        Log.add("WARN", "Alerts feed unavailable");
      }
    },

    render(alerts) {
      const counts = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 };
      alerts.forEach((alert) => {
        const risk = String(alert.risk_level || "GREEN").toUpperCase();
        counts[risk] = (counts[risk] || 0) + 1;
      });

      DOM.sumGreen.textContent = String(counts.GREEN);
      DOM.sumYellow.textContent = String(counts.YELLOW);
      DOM.sumOrange.textContent = String(counts.ORANGE);
      DOM.sumRed.textContent = String(counts.RED);

      const filtered = this.filter(alerts);
      DOM.badgeAlert.textContent = String(alerts.filter((alert) => !alert.is_acknowledged).length);
      DOM.alertsCards.innerHTML = "";

      filtered.forEach((alert) => {
        const card = this.buildCard(alert);
        DOM.alertsCards.appendChild(card);
      });

      DOM.alertsEmpty.classList.toggle("hidden", filtered.length > 0);

      const highestRisk = highestAlertRisk(alerts);
      UI.setThreat(highestRisk);
    },

    buildCard(alert) {
      const risk = String(alert.risk_level || "GREEN").toUpperCase();
      const card = document.createElement("div");
      card.className = `alert-card ${risk.toLowerCase()}${alert.is_acknowledged ? " acknowledged" : ""}`;

      const countdown = Number.isFinite(alert.time_to_conjunction_hours)
        ? `T-${formatNumber(alert.time_to_conjunction_hours, 1)}h`
        : "T-?";

      card.innerHTML = [
        '<div class="alert-card-header">',
        `<span>${riskEmoji(risk)} ${escapeHtml(risk)}${alert.is_acknowledged ? " / ACK" : ""}</span>`,
        `<span>${escapeHtml(countdown)}</span>`,
        "</div>",
        '<div class="alert-card-body">',
        `<strong>${escapeHtml(alert.satellite_name)}</strong>`,
        `<div>vs ${escapeHtml(alert.threat_name)}</div>`,
        `<div>Pc: ${toScientificHtml(alert.collision_probability || 0)} Dist: ${formatNumber(alert.miss_distance_km || 0, 2)} km</div>`,
        "</div>",
        '<div class="alert-card-actions">',
        alert.is_acknowledged
          ? '<button class="control-button small secondary" type="button" disabled>ACKNOWLEDGED</button>'
          : '<button class="control-button small secondary" data-action="ack" type="button">ACKNOWLEDGE</button>',
        '<button class="control-button small secondary" data-action="show" type="button">SHOW ON GLOBE</button>',
        "</div>"
      ].join("");

      const ackButton = card.querySelector('[data-action="ack"]');
      const showButton = card.querySelector('[data-action="show"]');

      if (ackButton) {
        ackButton.addEventListener("click", () => this.acknowledge(alert.id, card));
      }

      if (showButton) {
        showButton.addEventListener("click", () => this.showOnGlobe(alert));
      }

      return card;
    },

    filter(alerts) {
      if (State.alertFilter === "ALL") {
        return alerts;
      }
      if (State.alertFilter === "UNACKED") {
        return alerts.filter((alert) => !alert.is_acknowledged);
      }
      return alerts.filter((alert) => String(alert.risk_level || "").toUpperCase() === State.alertFilter);
    },

    async acknowledge(id, cardNode) {
      try {
        await API.post(`/alerts/${id}/acknowledge`, {});
        cardNode.classList.add("fading");
        window.setTimeout(() => cardNode.remove(), 200);
        Log.add("OK", `Alert ${id} acknowledged`);
        UI.toast(`Alert ${id} acknowledged`, "ok");
        await this.load();
      } catch (error) {
        Log.add("ERROR", `Failed to acknowledge alert ${id}`);
        UI.toast("Acknowledge failed", "error");
      }
    },

    async showOnGlobe(alert) {
      try {
        const conjunction = await API.get(`/conjunctions/${alert.conjunction_id}`);
        const primary = findByNorad(alert.satellite_norad, "satellite");
        const threat = findByNorad(alert.threat_norad, "debris") || findByNorad(alert.threat_norad);
        if (primary && threat) {
          Globe.drawConjunctionLine(primary, threat, normalizePredictionResult(conjunction, primary, threat));
        }
        Globe.flyToConjunction(conjunction.tca_latitude, conjunction.tca_longitude, conjunction.tca_altitude_km);
        Log.add("INFO", `Viewing alert ${alert.id} on globe`);
      } catch (error) {
        UI.toast("Unable to focus alert on globe", "warn");
      }
    },

    startAutoRefresh() {
      clearIntervalSafe("alerts");
      clearIntervalSafe("alertCountdown");

      State.alertRefreshCountdown = CONFIG.REFRESH.alerts / 1000;
      DOM.alertRefreshCountdown.textContent = `Refreshing in ${State.alertRefreshCountdown}s`;

      State.intervals.alerts = window.setInterval(async () => {
        await this.load();
        State.alertRefreshCountdown = CONFIG.REFRESH.alerts / 1000;
      }, CONFIG.REFRESH.alerts);

      State.intervals.alertCountdown = window.setInterval(() => {
        State.alertRefreshCountdown -= 1;
        if (State.alertRefreshCountdown < 0) {
          State.alertRefreshCountdown = CONFIG.REFRESH.alerts / 1000;
        }
        DOM.alertRefreshCountdown.textContent = `Refreshing in ${State.alertRefreshCountdown}s`;
      }, CONFIG.REFRESH.countdown);
    }
  };

  const FPS = {
    frames: 0,
    lastTime: 0,
    current: 0,

    start() {
      const loop = (now) => {
        this.frames += 1;
        if (!this.lastTime) {
          this.lastTime = now;
        }

        if (now - this.lastTime >= 1000) {
          this.current = this.frames;
          this.frames = 0;
          this.lastTime = now;
          DOM.fpsCounter.textContent = String(this.current);
          State.fpsHistory.push(this.current);
          if (State.fpsHistory.length > 30) {
            State.fpsHistory.shift();
          }
        }

        window.requestAnimationFrame(loop);
      };

      window.requestAnimationFrame(loop);
    }
  };

  function buildStars() {
    const layer = document.getElementById("star-layer");
    layer.innerHTML = "";

    for (let index = 0; index < 300; index += 1) {
      const star = document.createElement("div");
      const size = randomRange(1, 3);
      star.className = "star";
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.opacity = `${randomRange(0.1, 0.8)}`;
      star.style.setProperty("--twinkle-duration", `${randomRange(1.8, 6.2)}s`);
      layer.appendChild(star);
    }
  }

  function bindEvents() {
    DOM.overlayClose.addEventListener("click", () => UI.hideOverlay());

    DOM.btnSyncFeeds.addEventListener("click", async () => {
      const release = setButtonBusy(DOM.btnSyncFeeds, "SYNCING...");
      try {
        await TLEEngine.syncAllFeeds("manual");
        Globe.rebuildEntities();
        Prediction.populateDropdowns();
        Analytics.updateSparkline(getCombinedObjects().length);
      } finally {
        release();
      }
    });

    DOM.btnSidebarSync.addEventListener("click", async () => {
      const release = setButtonBusy(DOM.btnSidebarSync, "SYNCING...");
      try {
        await TLEEngine.syncAllFeeds("sidebar");
        Globe.rebuildEntities();
        Prediction.populateDropdowns();
        Analytics.updateSparkline(getCombinedObjects().length);
      } finally {
        release();
      }
    });

    DOM.btnResetView.addEventListener("click", () => Globe.resetView(false));
    DOM.btnDayNight.addEventListener("click", () => Globe.toggleDayNight());
    DOM.btnFollowSelected.addEventListener("click", () => Globe.toggleFollowSelected());
    DOM.btnToggleOrbits.addEventListener("click", () => Globe.toggleOrbits());

    DOM.btnPredictSelected.addEventListener("click", () => {
      if (!State.selectedObject) {
        return;
      }

      if (State.selectedObject.type === "satellite") {
        DOM.predictPrimary.value = State.selectedObject.key;
      } else {
        DOM.predictThreat.value = State.selectedObject.key;
      }

      scrollPanelIntoView(document.getElementById("panel-prediction"));
    });

    DOM.runPredictionButton.addEventListener("click", async () => {
      await Prediction.runAnalysis();
    });

    DOM.showOnGlobeButton.addEventListener("click", () => Prediction.showOnGlobe());

    DOM.windowSlider.addEventListener("input", () => {
      DOM.windowLabel.textContent = `${DOM.windowSlider.value}h`;
    });

    DOM.alertFilterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        State.alertFilter = button.dataset.filter;
        DOM.alertFilterButtons.forEach((item) => item.classList.toggle("active", item === button));
        Alerts.render(State.alerts);
      });
    });

    DOM.sideNavButtons.forEach((button) => {
      button.addEventListener("click", () => {
        DOM.sideNavButtons.forEach((item) => item.classList.toggle("active", item === button));
        handleNavView(button.dataset.view);
      });
    });

    const unlockAudio = () => {
      AudioAlerts.ensureContext();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
  }

  function handleNavView(view) {
    UI.hideOverlay();

    if (view === "overview") {
      Globe.resetView(false);
      return;
    }

    if (view === "predict") {
      scrollPanelIntoView(document.getElementById("panel-prediction"));
      return;
    }

    if (view === "alerts") {
      scrollPanelIntoView(document.getElementById("panel-alerts"));
      return;
    }

    if (view === "feeds") {
      scrollPanelIntoView(document.getElementById("panel-feeds"));
      return;
    }

    if (view === "analytics") {
      scrollPanelIntoView(document.getElementById("panel-analytics"));
      return;
    }

    if (view === "satellites") {
      renderCatalogOverlay("satellite");
      return;
    }

    if (view === "debris") {
      renderCatalogOverlay("debris");
      return;
    }

    if (view === "settings") {
      renderSettingsOverlay();
    }
  }

  function renderCatalogOverlay(type) {
    const items = getCombinedObjects(type).slice(0, 180);
    const heading = type === "satellite" ? "SATELLITE CATALOG" : "DEBRIS CATALOG";

    const rows = items
      .map((item) => {
        const live = State.objectPositions.get(item.key) || item.lastPosition || null;
        return [
          "<tr>",
          `<td>${item.noradId}</td>`,
          `<td>${escapeHtml(item.name)}</td>`,
          `<td>${escapeHtml(item.inDatabase ? "API" : formatFeedList(item.feedNames))}</td>`,
          `<td>${live ? formatNumber(live.alt, 1) : formatNumber(item.approxAltitudeKm || 0, 1)}</td>`,
          `<td>${formatNumber(item.inclinationDeg || 0, 2)}</td>`,
          "</tr>"
        ].join("");
      })
      .join("");

    UI.showOverlay(
      heading,
      [
        "<table>",
        "<thead><tr><th>NORAD</th><th>NAME</th><th>SOURCE</th><th>ALT (KM)</th><th>INC</th></tr></thead>",
        `<tbody>${rows}</tbody>`,
        "</table>"
      ].join("")
    );
  }

  function renderSettingsOverlay() {
    UI.showOverlay(
      "SYSTEM SETTINGS",
      [
        "<table>",
        "<tbody>",
        `<tr><th>API Base</th><td>${escapeHtml(CONFIG.API_BASE)}</td></tr>`,
        `<tr><th>TLE Re-sync</th><td>${CONFIG.REFRESH.tle / 60000} minutes</td></tr>`,
        `<tr><th>Alert Refresh</th><td>${CONFIG.REFRESH.alerts / 1000} seconds</td></tr>`,
        `<tr><th>Render Budget</th><td>${CONFIG.MAX_RENDER_OBJECTS.toLocaleString()} entities</td></tr>`,
        `<tr><th>Orbit Horizon</th><td>${CONFIG.ORBIT_MINUTES} minutes</td></tr>`,
        `<tr><th>CORS Proxy</th><td>${escapeHtml(CONFIG.CORS_PROXY)}</td></tr>`,
        `<tr><th>Audio</th><td>${State.audio.unlocked ? "ARMED" : "WAITING FOR USER INPUT"}</td></tr>`,
        "</tbody>",
        "</table>"
      ].join("")
    );
  }

  async function loadAPIData() {
    try {
      const [satellites, debris, conjunctions] = await Promise.all([
        API.get("/satellites/").catch(() => []),
        API.get("/debris/").catch(() => []),
        API.get("/conjunctions/").catch(() => ({ conjunctions: [] }))
      ]);

      State.apiSatellites = satellites || [];
      State.apiDebris = debris || [];
      State.conjunctions = conjunctions.conjunctions || [];
      UI.updateCounts();
      TLEEngine.renderFeedStatusTable();

      Log.add("INFO", `API catalog loaded - ${State.apiSatellites.length} satellites, ${State.apiDebris.length} debris`);
    } catch (error) {
      State.apiSatellites = [];
      State.apiDebris = [];
      State.conjunctions = [];
      Log.add("WARN", "API catalog unavailable");
    }
  }

  async function checkAPIHealth() {
    try {
      await API.get("/health");
      UI.setAPIConnected(true);
      return true;
    } catch (error) {
      UI.setAPIConnected(false);
      return false;
    }
  }

  async function ensureSeedData() {
    if (State.apiSatellites.length || State.apiDebris.length || !State.apiHealthy) {
      return;
    }

    try {
      await API.seedData();
      await loadAPIData();
      Log.add("OK", "Seed catalogs injected through API");
    } catch (error) {
      Log.add("WARN", "Unable to seed API catalogs");
    }
  }

  async function refreshDataAfterPrediction() {
    try {
      const conjunctions = await API.get("/conjunctions/");
      State.conjunctions = conjunctions.conjunctions || [];
      await Alerts.load();
      Analytics.updateRiskDonut();
    } catch (error) {
      Log.add("WARN", "Unable to refresh risk products after prediction");
    }
  }

  function startClock() {
    clearIntervalSafe("clock");
    UI.updateClock();
    State.intervals.clock = window.setInterval(() => UI.updateClock(), 100);
  }

  function startPositionLoop() {
    clearIntervalSafe("position");
    State.intervals.position = window.setInterval(() => {
      Globe.updatePositions();
      UI.updateHealthMeters();
      updateSyncStatusTick();
    }, CONFIG.REFRESH.position);
  }

  function startTLEResyncLoop() {
    clearIntervalSafe("tle");
    State.intervals.tle = window.setInterval(async () => {
      await TLEEngine.syncAllFeeds("scheduled");
      Globe.rebuildEntities();
      Prediction.populateDropdowns();
      Analytics.updateSparkline(getCombinedObjects().length);
      Log.add("INFO", "Scheduled TLE re-sync complete");
    }, CONFIG.REFRESH.tle);
  }

  function startAnalyticsLoop() {
    clearIntervalSafe("analytics");
    State.intervals.analytics = window.setInterval(async () => {
      await loadAPIData();
      await Analytics.refreshAll();
    }, CONFIG.REFRESH.analytics);
  }

  function updateSyncStatusTick() {
    if (!State.lastTLEResyncAt) {
      UI.setTLEStatus("STALE");
      DOM.sidebarLastSync.textContent = "never";
      DOM.sidebarSyncMode.textContent = "standby";
      DOM.perfLastSync.textContent = "never";
      return;
    }

    const seconds = Math.max(0, Math.floor((Date.now() - State.lastTLEResyncAt.getTime()) / 1000));
    const feedEntries = Object.values(State.feedStatus);
    const allFallback = feedEntries.length > 0 && feedEntries.every((entry) => entry.mode === "FALLBACK");
    const primaryMode = allFallback ? "FALLBACK" : "LIVE";
    UI.setTLEStatus(primaryMode, seconds);
    DOM.sidebarLastSync.textContent = `${seconds}s ago`;
    DOM.sidebarSyncMode.textContent = allFallback ? "fallback" : "live-mixed";
    DOM.perfLastSync.textContent = `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
  }

  async function animateFakeProgress(durationMs) {
    return new Promise((resolve) => {
      const start = performance.now();
      DOM.fakeProgressBar.style.width = "0%";

      const frame = (now) => {
        const progress = clamp((now - start) / durationMs, 0, 1);
        DOM.fakeProgressBar.style.width = `${progress * 100}%`;
        if (progress < 1) {
          window.requestAnimationFrame(frame);
        } else {
          resolve();
        }
      };

      window.requestAnimationFrame(frame);
    });
  }

  async function init() {
    UI.initRefs();
    buildStars();
    bindEvents();
    startClock();
    FPS.start();
    Analytics.initCharts();
    UI.setThreat("GREEN");
    UI.updateHealthMeters();
    DOM.windowLabel.textContent = `${DOM.windowSlider.value}h`;

    Log.add("INFO", "ORBITAL DEFENSE SYSTEM INITIALIZING...");

    try {
      Globe.init();
      Log.add("INFO", "Cesium globe initialized");
    } catch (error) {
      Log.add("ERROR", "Cesium initialization failed");
      UI.toast("Cesium failed to initialize", "error");
      throw error;
    }

    const apiOnline = await checkAPIHealth();
    Log.add(apiOnline ? "OK" : "ERROR", `API ${apiOnline ? "connected" : "offline"}`);

    await loadAPIData();
    await ensureSeedData();
    await TLEEngine.syncAllFeeds("startup");
    await Analytics.refreshAll();
    await Alerts.load();

    Prediction.populateDropdowns();
    Globe.rebuildEntities();
    Alerts.startAutoRefresh();
    startPositionLoop();
    startTLEResyncLoop();
    startAnalyticsLoop();
    updateSyncStatusTick();
    updateTrackMode();

    Log.add("OK", "SYSTEM READY - ALL SUBSYSTEMS NOMINAL");
    UI.toast("Mission control online", "ok");
  }

  function getCombinedObjects(filterType = null) {
    const merged = new Map();

    const addObject = (obj) => {
      if (!obj || !obj.key) {
        return;
      }

      if (!merged.has(obj.key)) {
        merged.set(obj.key, obj);
      } else {
        merged.set(obj.key, mergeCatalogObjects(merged.get(obj.key), obj));
      }
    };

    State.apiSatellites.map(buildApiSatelliteObject).forEach(addObject);
    State.apiDebris.map(buildApiDebrisObject).forEach(addObject);
    State.tleSatellites.forEach(addObject);
    State.tleDebris.forEach(addObject);

    const values = Array.from(merged.values()).sort(sortCatalogObjects);
    return filterType ? values.filter((item) => item.type === filterType) : values;
  }

  function getRenderableObjects() {
    const alertKeys = new Set();
    State.alerts.forEach((alert) => {
      alertKeys.add(`satellite_${alert.satellite_norad}`);
      alertKeys.add(`debris_${alert.threat_norad}`);
    });

    return getCombinedObjects()
      .map((obj) => ({
        ...obj,
        renderScore: renderPriority(obj, alertKeys)
      }))
      .sort((left, right) => right.renderScore - left.renderScore || left.noradId - right.noradId)
      .slice(0, CONFIG.MAX_RENDER_OBJECTS);
  }

  function findCatalogObject(key) {
    if (!key) {
      return null;
    }
    return getCombinedObjects().find((item) => item.key === key) || null;
  }

  function findByNorad(noradId, preferredType = null) {
    return getCombinedObjects().find((item) => item.noradId === noradId && (!preferredType || item.type === preferredType)) || null;
  }

  function buildApiSatelliteObject(item) {
    const satrec = tryBuildSatrec(item.tle_line1, item.tle_line2);
    return {
      key: `satellite_${item.norad_id}`,
      type: "satellite",
      name: item.name,
      noradId: item.norad_id,
      tle1: item.tle_line1,
      tle2: item.tle_line2,
      satrec,
      source: "api",
      sourceLabel: "LOCAL API",
      inDatabase: true,
      feedNames: ["api"],
      fetchMode: "API",
      periodMin: item.period_min || 0,
      inclinationDeg: item.inclination_deg || parseTleFloat(item.tle_line2, 8, 16),
      eccentricity: parseTleEccentricity(item.tle_line2),
      meanMotion: parseTleFloat(item.tle_line2, 52, 63),
      approxAltitudeKm: item.altitude_km || estimateAltitude(item.period_min || 0),
      orbitType: item.orbit_type || classifyOrbit(item.altitude_km || estimateAltitude(item.period_min || 0)),
      sizeM: 10,
      sourceCountry: item.country || null,
      lastPosition: null
    };
  }

  function buildApiDebrisObject(item) {
    const satrec = tryBuildSatrec(item.tle_line1, item.tle_line2);
    return {
      key: `debris_${item.norad_id}`,
      type: "debris",
      name: item.name,
      noradId: item.norad_id,
      tle1: item.tle_line1,
      tle2: item.tle_line2,
      satrec,
      source: "api",
      sourceLabel: "LOCAL API",
      inDatabase: true,
      feedNames: ["api"],
      fetchMode: "API",
      periodMin: item.period_min || 0,
      inclinationDeg: item.inclination_deg || parseTleFloat(item.tle_line2, 8, 16),
      eccentricity: item.eccentricity || parseTleEccentricity(item.tle_line2),
      meanMotion: parseTleFloat(item.tle_line2, 52, 63),
      approxAltitudeKm: item.altitude_km || estimateAltitude(item.period_min || 0),
      orbitType: classifyOrbit(item.altitude_km || estimateAltitude(item.period_min || 0)),
      sizeM: item.size_m || 1,
      sourceCountry: item.source_country || null,
      lastPosition: null
    };
  }

  function mergeCatalogObjects(existing, incoming) {
    return {
      ...incoming,
      ...existing,
      key: existing.key,
      type: existing.type,
      noradId: existing.noradId,
      inDatabase: existing.inDatabase || incoming.inDatabase,
      source: existing.inDatabase ? existing.source : incoming.source,
      sourceLabel: existing.inDatabase ? existing.sourceLabel : incoming.sourceLabel,
      name: existing.inDatabase ? existing.name : incoming.name,
      tle1: incoming.tle1 || existing.tle1,
      tle2: incoming.tle2 || existing.tle2,
      satrec: incoming.satrec || existing.satrec,
      periodMin: incoming.periodMin || existing.periodMin,
      inclinationDeg: incoming.inclinationDeg || existing.inclinationDeg,
      eccentricity: incoming.eccentricity || existing.eccentricity,
      meanMotion: incoming.meanMotion || existing.meanMotion,
      approxAltitudeKm: incoming.approxAltitudeKm || existing.approxAltitudeKm,
      orbitType: existing.orbitType || incoming.orbitType,
      sizeM: existing.sizeM || incoming.sizeM,
      sourceCountry: existing.sourceCountry || incoming.sourceCountry,
      feedNames: uniqueStrings([...(existing.feedNames || []), ...(incoming.feedNames || [])]),
      fetchMode: incoming.fetchMode || existing.fetchMode,
      lastPosition: existing.lastPosition || incoming.lastPosition || null
    };
  }

  function renderPriority(obj, alertKeys) {
    let score = 0;
    if (State.selectedObject && obj.key === State.selectedObject.key) {
      score += 10000;
    }
    if (alertKeys.has(obj.key)) {
      score += 5000;
    }
    if (obj.inDatabase) {
      score += 2500;
    }
    if (obj.feedNames.includes("stations") || obj.feedNames.includes("stations2")) {
      score += 1500;
    }
    if (obj.feedNames.includes("visual")) {
      score += 1000;
    }
    if (obj.type === "satellite") {
      score += 400;
    }
    score += Math.max(0, 100 - Math.min(obj.noradId / 500, 100));
    return score;
  }

  function shouldRenderOrbit(obj, index) {
    if (!State.showOrbits) {
      return false;
    }
    if (State.selectedObject && obj.key === State.selectedObject.key) {
      return true;
    }
    return index < CONFIG.MAX_ORBIT_PATHS && obj.type === "satellite";
  }

  function shouldRenderLabel(obj, index) {
    if (State.selectedObject && obj.key === State.selectedObject.key) {
      return true;
    }
    return index < CONFIG.MAX_LABELS && obj.type === "satellite";
  }

  function normalizePredictionResult(payload, primary, threat) {
    if (Object.prototype.hasOwnProperty.call(payload, "object1")) {
      return {
        primaryName: payload.object1,
        threatName: payload.object2,
        riskLevel: String(payload.risk_level || "GREEN").toUpperCase(),
        collisionProbability: payload.collision_probability || 0,
        missDistanceKm: payload.miss_distance_km || 0,
        relativeVelocityKmS: payload.relative_velocity_km_s || 0,
        tcaUtc: payload.tca_utc,
        tcaAltitudeKm: payload.tca_altitude_km || 0,
        tcaLatitudeDeg: payload.tca_latitude_deg || 0,
        tcaLongitudeDeg: payload.tca_longitude_deg || 0,
        maneuverRecommended: Boolean(payload.maneuver_recommended),
        riskDescription: payload.risk_description || defaultRiskDescription(payload.risk_level)
      };
    }

    return {
      primaryName: payload.object1_name || primary.name,
      threatName: payload.object2_name || threat.name,
      riskLevel: String(payload.risk_level || "GREEN").toUpperCase(),
      collisionProbability: payload.collision_probability || 0,
      missDistanceKm: payload.miss_distance_km || 0,
      relativeVelocityKmS: payload.relative_velocity_km_s || 0,
      tcaUtc: payload.tca,
      tcaAltitudeKm: payload.tca_altitude_km || 0,
      tcaLatitudeDeg: payload.tca_latitude || 0,
      tcaLongitudeDeg: payload.tca_longitude || 0,
      maneuverRecommended: ["ORANGE", "RED"].includes(String(payload.risk_level || "").toUpperCase()),
      riskDescription: defaultRiskDescription(payload.risk_level)
    };
  }

  function defaultRiskDescription(riskLevel) {
    const risk = String(riskLevel || "GREEN").toUpperCase();
    if (risk === "RED") {
      return "Critical collision risk detected. Immediate maneuver analysis is recommended.";
    }
    if (risk === "ORANGE") {
      return "High concern conjunction. Pre-plan collision avoidance options.";
    }
    if (risk === "YELLOW") {
      return "Elevated risk detected. Increase tracking cadence and assess covariance quality.";
    }
    return "Low collision probability. Continue routine monitoring.";
  }

  function buildDerivedElements(obj) {
    return {
      semiMajorAxisKm: estimateSemiMajorAxis(obj.periodMin || 0),
      eccentricity: obj.eccentricity || parseTleEccentricity(obj.tle2),
      raan: parseTleFloat(obj.tle2, 17, 25),
      argPerigee: parseTleFloat(obj.tle2, 34, 42)
    };
  }

  function renderElementTile(label, value) {
    return [
      '<div class="element-item">',
      `<span>${escapeHtml(label)}</span>`,
      `<strong>${escapeHtml(value)}</strong>`,
      "</div>"
    ].join("");
  }

  function renderOption(item) {
    const source = item.inDatabase ? "API" : formatFeedList(item.feedNames);
    return `<option value="${escapeHtml(item.key)}">${escapeHtml(item.name)} - NORAD ${item.noradId} - ${escapeHtml(source)}</option>`;
  }

  function updateRiskNeedle(rawRisk) {
    if (!DOM.riskNeedle || !DOM.riskMeterText) {
      return;
    }

    const angleMap = {
      GREEN: -60,
      YELLOW: -20,
      ORANGE: 20,
      RED: 60
    };

    const textMap = {
      GREEN: "NOMINAL",
      YELLOW: "YELLOW WATCH",
      ORANGE: "ORANGE WATCH",
      RED: "RED ALERT"
    };

    const angle = angleMap[String(rawRisk || "GREEN").toUpperCase()] ?? -60;
    DOM.riskNeedle.style.setProperty("--start-angle", DOM.riskNeedle.dataset.angle || "-60deg");
    DOM.riskNeedle.style.setProperty("--end-angle", `${angle}deg`);
    DOM.riskNeedle.style.animation = "none";
    void DOM.riskNeedle.offsetWidth;
    DOM.riskNeedle.style.animation = "needle-swing 0.45s ease both";
    DOM.riskNeedle.style.transform = `rotate(${angle}deg)`;
    DOM.riskNeedle.dataset.angle = `${angle}deg`;
    DOM.riskMeterText.textContent = textMap[String(rawRisk || "GREEN").toUpperCase()] || "NOMINAL";
  }

  function updateTrackMode() {
    if (!DOM.trackModeText || !DOM.btnFollowSelected) {
      return;
    }

    if (State.isTracking && State.selectedObject) {
      DOM.trackModeText.textContent = `FOLLOW ${State.selectedObject.noradId}`;
      DOM.btnFollowSelected.textContent = "FOLLOWING";
    } else if (State.selectedObject) {
      DOM.trackModeText.textContent = `LOCK ${State.selectedObject.noradId}`;
      DOM.btnFollowSelected.textContent = "FOLLOW SAT";
    } else {
      DOM.trackModeText.textContent = "GLOBAL";
      DOM.btnFollowSelected.textContent = "FOLLOW SAT";
    }
  }

  function setButtonBusy(button, text) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = text;
    return () => {
      button.disabled = false;
      button.textContent = originalText;
    };
  }

  function scrollPanelIntoView(node) {
    if (!node) {
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearIntervalSafe(key) {
    if (State.intervals[key]) {
      window.clearInterval(State.intervals[key]);
      delete State.intervals[key];
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function formatNumber(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return Number(0).toFixed(digits);
    }
    return number.toFixed(digits);
  }

  function formatSigned(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return `+${Number(0).toFixed(digits)}`;
    }
    return `${number >= 0 ? "+" : ""}${number.toFixed(digits)}`;
  }

  function formatTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "00:00:00";
    }
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${formatTime(date)} UTC`;
  }

  function getDOY(date) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return String(Math.floor((current - start) / 86400000)).padStart(3, "0");
  }

  function toScientificHtml(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number === 0) {
      return "0.00 x 10<sup>0</sup>";
    }
    const [mantissa, exponent] = number.toExponential(2).split("e");
    return `${mantissa} x 10<sup>${Number(exponent)}</sup>`;
  }

  function probabilityToWidth(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      return 2;
    }

    const min = Math.log10(1e-8);
    const max = Math.log10(1e-1);
    const scaled = (Math.log10(number) - min) / (max - min);
    return clamp(scaled * 100, 2, 100);
  }

  function riskEmoji(level) {
    const risk = String(level || "GREEN").toUpperCase();
    if (risk === "RED") {
      return "RED";
    }
    if (risk === "ORANGE") {
      return "ORANGE";
    }
    if (risk === "YELLOW") {
      return "YELLOW";
    }
    return "GREEN";
  }

  function highestAlertRisk(alerts) {
    const active = alerts.filter((alert) => !alert.is_acknowledged);
    if (!active.length) {
      return "GREEN";
    }
    return active.reduce((highest, alert) => {
      const risk = String(alert.risk_level || "GREEN").toUpperCase();
      return riskRank(risk) > riskRank(highest) ? risk : highest;
    }, "GREEN");
  }

  function riskRank(level) {
    return RISK_ORDER[String(level || "GREEN").toUpperCase()] ?? 0;
  }

  function heatColor(ratio) {
    if (ratio > 0.78) {
      return "rgba(255, 23, 68, 0.85)";
    }
    if (ratio > 0.52) {
      return "rgba(255, 109, 0, 0.85)";
    }
    if (ratio > 0.26) {
      return "rgba(255, 234, 0, 0.85)";
    }
    return "rgba(0, 230, 118, 0.85)";
  }

  function parseTleFloat(line, start, end) {
    const value = Number.parseFloat(String(line || "").substring(start, end).trim());
    return Number.isFinite(value) ? value : 0;
  }

  function parseTleEccentricity(line) {
    const raw = String(line || "").substring(26, 33).trim();
    if (!raw) {
      return 0;
    }
    const value = Number.parseFloat(`0.${raw}`);
    return Number.isFinite(value) ? value : 0;
  }

  function estimateSemiMajorAxis(periodMin) {
    const periodSeconds = Number(periodMin || 0) * 60;
    if (!Number.isFinite(periodSeconds) || periodSeconds <= 0) {
      return 0;
    }
    const mu = 398600.4418;
    return Math.cbrt((mu * periodSeconds * periodSeconds) / (4 * Math.PI * Math.PI));
  }

  function estimateAltitude(periodMin) {
    const semiMajorAxis = estimateSemiMajorAxis(periodMin);
    return semiMajorAxis > 0 ? semiMajorAxis - CONFIG.EARTH_RADIUS_KM : 0;
  }

  function classifyOrbit(altitudeKm) {
    const altitude = Number(altitudeKm || 0);
    if (altitude < 2000) {
      return "LEO";
    }
    if (altitude < 35786) {
      return "MEO";
    }
    return "GEO";
  }

  function tryBuildSatrec(tle1, tle2) {
    try {
      return satellite.twoline2satrec(tle1, tle2);
    } catch (error) {
      return null;
    }
  }

  function sortCatalogObjects(left, right) {
    if (left.type !== right.type) {
      return left.type === "satellite" ? -1 : 1;
    }
    if (left.inDatabase !== right.inDatabase) {
      return left.inDatabase ? -1 : 1;
    }
    return left.noradId - right.noradId;
  }

  function uniqueStrings(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function formatFeedList(feedNames) {
    return feedNames
      .map((name) => humanFeedName(name))
      .slice(0, 2)
      .join(" / ");
  }

  function humanFeedName(name) {
    const labels = {
      stations: "ISS/Stations",
      active: "Active Catalog",
      stations2: "Stations",
      debris: "Iridium Debris",
      fengyun: "FengYun Debris",
      cosmos: "Cosmos Debris",
      visual: "Visual Objects",
      api: "Local API"
    };
    return labels[name] || name;
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      console.error(error);
      UI.toast("Initialization failed", "error");
    });
  });

  window.addEventListener("beforeunload", () => {
    Object.keys(State.intervals).forEach((key) => clearIntervalSafe(key));
    AudioAlerts.stopRedAlarm();
    Telemetry.stopLiveUpdate();
  });
})();
