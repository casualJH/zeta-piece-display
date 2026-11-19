// ==UserScript==
// @name         제타 피스 표시
// @namespace    zeta-piece-display
// @version      1.1.2-beta.1
// @description  채팅 상단 피스 표시 및 클릭 커스터마이징 (30초 자동 갱신).
// @homepageURL  https://github.com/casualJH/zeta-piece-display
// @updateURL    https://raw.githubusercontent.com/casualJH/zeta-piece-display/dev/zeta-piece-display.user.js
// @downloadURL  https://raw.githubusercontent.com/casualJH/zeta-piece-display/dev/zeta-piece-display.user.js
// @match        https://zeta-ai.io/*
// @match        https://*.zeta-ai.io/*
// @run-at       document-start
// @match        https://frame.pingpong.ai/*
// @sandbox      raw
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const siteOrigin = 'https://zeta-ai.io';
  const sceneOrigin = 'https://frame.pingpong.ai';
  const sceneChannel = 'zeta-piece-display:model-position';
  if (location.origin === sceneOrigin) {
    if (window.parent === window || !/^\/v\d+\/index\.html$/.test(location.pathname)) return;
    window.addEventListener('message', event => {
      if (event.origin !== siteOrigin || event.source !== window.parent || event.data !== sceneChannel) return;
      const button = document.querySelector('button[aria-label="Select AI model"], button[data-testid="chat-header-model"]');
      const rect = button?.getBoundingClientRect();
      const position = rect?.width && rect.height ? {left: rect.left, centerY: rect.top + rect.height / 2} : null;
      window.parent.postMessage({channel: sceneChannel, position}, siteOrigin);
    });
    return;
  }
  if (window.top !== window) return;
  // Stable guard across releases; cooperate with previously installed versions.
  const GUARD = '__zetaPieceDisplayActive';
  const LEGACY_RE = /^__zetaPieceDisplay_0_[12]_\d+$/;
  if (window[GUARD] || Object.keys(window).some(k => LEGACY_RE.test(k) && window[k])) return;
  window[GUARD] = true;
  for (let v=0; v<=12; v++) window['__zetaPieceDisplay_0_1_' + v] = true;
  for (let v=0; v<=4; v++) window['__zetaPieceDisplay_0_2_' + v] = true;

  const API_ORIGIN = 'https://api.zeta-ai.io';
  const BALANCE_PATH = '/v1/coin/balance';
  const BALANCE_URL = API_ORIGIN + BALANCE_PATH;
  const POLL_MS = 30000;
  const REQUEST_TIMEOUT_MS = 12000;
  const ROOM_RE = /\/rooms\/[0-9a-f-]{36}(?:[/?#]|$)/i;
  const HEADER_NAMES = new Set([
    'authorization', 'x-client-native-version', 'x-client-type',
    'x-client-version', 'x-device-type', 'x-user-language'
  ]);
  // 사용자 제공 제타 피스 아이콘. 외부 이미지 다운로드 없음.
  const COIN_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAMAAABiM0N1AAAAYFBMVEVHcEwxGHo/N06NZ9Slhea5nO6Aa6FnUZNoR6bmwf6xkN/Ane52VdVCJKxML7sTCD+BWddsXcVYO8ZsU9NiRc4iDl5qStJEJ5JYParLqfvX0fb29P5cTLrp4/t7R71jMLkAH8mOAAAADHRSTlMA/gf++/0vesr0dqvpoDpLAAAED0lEQVR42u3X3XKsKhAFYBHUmQmiIAj+4fu/5elm2jGzK2ol52ZX7Swrt1+tbiyHZL/5i5KX1e0WQuC3qvyxkWXlzbvGOccgfuWPPMt/wlShAQUZ7wMGqOz7KXVitj5hnmettSi/VQpGEMjAH/O1Wte19mAh1Vbfch5YBxRle4yUsm2j91CJa72XunQ+GDANMxaDUJJ49BYlVZF06RQNhCljQKJCAGH8DNLsbyhdOwIdbzDk7NKM0wVG0rXjalCoEO2IogNWciB9w3mbbKPCjJVcdbnn5ChFzg5ReIDhomcsP6/0YMlJ0HZkeyO+rQkq3S5f5wadvZGx1IjCE+SYy68WxBDazszIUUhjEdqsCFJ0rqnOBiNng6wSE2YQfU99AAxac+bcSaU8wIKY2hpZY8dpgaAl9nMjqCkPoY9UqCbIKjmCgBBQxBCk/dlspYdCO6SGQZm2AAw79QjJDZojcw07L0SQMuPU2t4a0wloNOK+iQIoxOgBOtlQcjDtNC54/F3Xc4B4R+/SBoHk8rMj26RlHEcoBpAppkn25FAjz7DTAcTThsixCC1D0QG0DKaTGLIQcs6H8DVUslSIJI7QOAnb2U4o+4mRCOHpO5+fTEZQXUxQaLSmM3JZxkLK1ClBPUFNkx9OVhME4cUoVHq1U7MuMQmzQc8OIZcfnRnbIaMUOt0IDkCSKrXwzLMO4MDz9YrcG1R3U4KgGMbKjZK0a1zEl1CF3w8KOGJaOmMhxk7jNNgXQytqINXRrt0LqotlHFWCLMfXugOGLJhsdifQ7Q0aIaJTYJliEqZD6H0yoPIDyLEXNC8owbFzq0YJDgQbwWNnrZ+FXPY15Jyvt/CRskAdiwo+KeB4muwIYmGtFT4KoIWgVnV9RwGKCqXJygOIebGu245qw4txWUZj+j5BMj3dp0IsO4LCna/U6ZmWK0tfkq2S1a9C1SG03gesRBD9HpFEnXooxAA6WjWm8vG+SJB2Z4coOFgg6OSDvYoJZwMpUUaRhE6/OZox5jDZUfI18EFgoz8rvS3IM8j5r+PNxyjWem+EocleTvA+QezkVlP6EOLnU9uh3Yn+KZXZSYL3IUIjkxqZHXo5M48BO11cjirmveao1O/3EXR0cmSMa/AXF788iz54DpL5E5K9xgjOgQp+zcE5S1nHGiRQ3iBidCFQimEts6s8pA5eR6q03WotIFzzASABEDrXF/Vi9ox5jxAykHlOjhiGogBKSrr3X0mi9gwpTK1CmKnOfRiQ4pycS+nRekoABRiECmQwoticaym/kYPQkyEFG+W7c01VSXkWagUylPvjgDkulZa0Ri6GT8z9oM5pqeAj59SGmPKH/89yhIriqSwfiPwwZfUh7piPR5n93+R5nv3mN/9y/gMoVJOohrkBegAAAABJRU5ErkJggg==';

  const PREF_KEY = 'zeta-piece-display-preferences';
  const DEFAULTS = Object.freeze({showIcon: true, font: 'system', fontSize: 15,
    spacing: -0.5, color: '#FFFFFF', iconSize: 20, iconGap: 2, modelGap: 12, offsetY: 0});
  // Font choices based on zeta-color-customizer's Google Fonts presets.
  // Only load the font the user selects; keep the original system font as default.
  const FONT_STACKS = {
    system: '-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
    gothic: 'Arial,Helvetica,sans-serif',
    mono: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    noto: '"Noto Sans KR",-apple-system,system-ui,sans-serif',
    nanumgo: '"Nanum Gothic",-apple-system,system-ui,sans-serif',
    dodum: '"Gowun Dodum",-apple-system,system-ui,sans-serif',
    dohyeon: '"Do Hyeon",-apple-system,system-ui,sans-serif',
    serif: '"Noto Serif KR",Georgia,serif',
    gowunb: '"Gowun Batang",Georgia,serif'
  };
  const GOOGLE_FONT_CSS = {
    noto:'Noto+Sans+KR:wght@400;500;600;700',
    nanumgo:'Nanum+Gothic:wght@400;700',
    dodum:'Gowun+Dodum',
    dohyeon:'Do+Hyeon',
    serif:'Noto+Serif+KR:wght@400;500;600;700',
    gowunb:'Gowun+Batang:wght@400;700'
  };
  let fontRequestGeneration = 0;
  function loadSelectedFont(font) {
    const family = GOOGLE_FONT_CSS[font];
    if (!family) return;
    const id = 'zpd-font-css-' + font;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=' + family + '&display=swap';
      (document.head || document.documentElement).appendChild(link);
    }
    const generation = ++fontRequestGeneration;
    // As font data arrives, normalize the visible height once; no DOM polling.
    const familyName = FONT_STACKS[font].split(',')[0];
    if (document.fonts && document.fonts.load) {
      document.fonts.load('700 ' + prefs.fontSize + 'px ' + familyName, '0123456789')
        .then(() => {if (generation === fontRequestGeneration) fitBalanceText();})
        .catch(() => {});
    }
  }
  // Normalization factors applied only after the selected font is ready.
  // Canvas glyph-height measurement avoids arbitrary per-font pixel sizes.
  let fontMetricsCanvas = null;
  function visualFontSize() {
    const requested = prefs.fontSize;
    if (prefs.font === 'system' || !document.fonts || !document.fonts.check) return requested;
    const family = FONT_STACKS[prefs.font]?.split(',')[0];
    if (!family || !document.fonts.check('700 ' + requested + 'px ' + family, '0123456789')) return requested;
    try {
      fontMetricsCanvas ||= document.createElement('canvas');
      const ctx = fontMetricsCanvas.getContext('2d');
      if (!ctx) return requested;
      const reference = '-apple-system,system-ui,sans-serif';
      ctx.font = '700 50px ' + reference;
      const baseline = ctx.measureText('0123456789');
      ctx.font = '700 50px ' + family;
      const current = ctx.measureText('0123456789');
      const measure = v => (v.actualBoundingBoxAscent || 0) + (v.actualBoundingBoxDescent || 0);
      const bh = measure(baseline), ch = measure(current);
      if (!(bh > 0 && ch > 0)) return requested;
      // Constrain the factor to prevent any extreme font or browser metrics.
      const factor = Math.min(1.12, Math.max(0.88, bh/ch));
      return Math.round(requested * factor * 10)/10;
    } catch (_) {return requested;}
  }
  const PREF_RANGES = {fontSize:[10,24],spacing:[-2,3],iconSize:[16,32],
    iconGap:[0,12],modelGap:[0,24],offsetY:[-10,10]};
  function readPrefs() {
    const out = {...DEFAULTS};
    try {
      const raw = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
      if (typeof raw.showIcon === 'boolean') out.showIcon = raw.showIcon;
      if (Object.prototype.hasOwnProperty.call(FONT_STACKS, raw.font)) out.font = raw.font;
      if (typeof raw.color === 'string' && /^#[\da-f]{6}$/i.test(raw.color)) out.color = raw.color.toUpperCase();
      for (const [key, range] of Object.entries(PREF_RANGES)) {
        if (typeof raw[key] === 'number' && Number.isFinite(raw[key]))
          out[key] = Math.max(range[0], Math.min(range[1], raw[key]));
      }
    } catch (_) {}
    return out;
  }
  const prefs = readPrefs();
  let settingsPanel = null;

  const auth = Object.create(null);
  let currentBalance = null;
  // A successful newer-started request must not be overwritten by a late old response.
  let requestTicket = 0;
  let acceptedTicket = 0;
  let lastSuccess = 0;
  let lastAttempt = 0;
  let lastAuthAttempt = false;
  let failureCount = 0;
  let retryAfter = 0;
  let inFlight = false;
  let widget = null;
  let valueNode = null;
  let modelButton = null;
  let attachAttempts = 0;
  let placementReady = false;
  let viewportWidth = window.innerWidth;
  let pollTimer = 0;
  let uiTimer = 0;
  let previousRoute = location.pathname;
  let lastStatus = '잔액 확인 중';

  const isRoom = () => ROOM_RE.test(location.pathname);
  const isVisible = () => document.visibilityState !== 'hidden';

  function apiPath(raw) {
    try {
      const value = typeof raw === 'string' ? raw : raw instanceof URL ? raw.href : raw && raw.url;
      if (typeof value !== 'string' || !value.includes('zeta-ai.io')) return null;
      const url = new URL(value, location.href);
      return url.origin === API_ORIGIN ? url.pathname : null;
    } catch (_) { return null; }
  }

  function toEntries(value) {
    try {
      if (!value) return [];
      if (typeof Headers !== 'undefined' && value instanceof Headers) return Array.from(value.entries());
      if (Array.isArray(value)) return value;
      return Object.entries(value);
    } catch (_) { return []; }
  }

  function takeHeaders(entries) {
    let changed = false;
    for (const pair of entries) {
      if (!pair || pair.length < 2) continue;
      const key = String(pair[0]).toLowerCase();
      if (!HEADER_NAMES.has(key)) continue;
      const val = String(pair[1] ?? '');
      if (!val || auth[key] === val) continue;
      auth[key] = val;
      changed = true;
    }
    // 인증값이 바뀐 경우 401/403 재시도 제한을 해제합니다.
    if (changed) {
      if (auth.authorization) { retryAfter = 0; failureCount = 0; }
      if (isVisible() && isRoom()) schedulePoll(500);
    }
  }

  function setStatus(message) {
    lastStatus = message;
    if (widget) {
      // Stable accessible name: balance changes must not make Dock treat this as a new launcher.
      widget.title = '제타 피스 표시';
      widget.setAttribute('aria-label', '제타 피스 표시');
    }
  }

  function acceptBalance(data, ticket = ++requestTicket) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const amount = data.balance;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return false;
    if (ticket < acceptedTicket) return true; // Valid stale response, not a failure.
    acceptedTicket = ticket;
    const changed = amount !== currentBalance;
    currentBalance = amount;
    lastSuccess = Date.now();
    retryAfter = 0;
    failureCount = 0;
    lastAuthAttempt = false;
    if (valueNode && changed) {
      valueNode.textContent = amount.toLocaleString('ko-KR');
      fitBalanceText();
    }
    setStatus(`최근 서버 확인: ${new Date(lastSuccess).toLocaleTimeString('ko-KR')}`);
    return true;
  }

  // 제타 자체가 받아온 응답도 읽습니다. 서버에 추가 요청하지 않습니다.
  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function (input, init) {
      const path = apiPath(input);
      if (path) {
        takeHeaders(toEntries(input && input.headers));
        takeHeaders(toEntries(init && init.headers));
      }
      const ticket = path === BALANCE_PATH ? ++requestTicket : 0;
      const result = originalFetch.apply(this, arguments);
      if (path === BALANCE_PATH) {
        Promise.resolve(result).then(response => {
          if (response && response.ok) {
            response.clone().json().then(data => acceptBalance(data, ticket)).catch(() => {});
          }
        }).catch(() => {});
      }
      return result;
    };
  }

  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSetHeader = proto.setRequestHeader;
  const originalSend = proto.send;
  const tracked = new WeakMap();
  proto.open = function (method, url) {
    const path = apiPath(url);
    if (path) tracked.set(this, {path, headers: []});
    return originalOpen.apply(this, arguments);
  };
  proto.setRequestHeader = function (key, value) {
    const record = tracked.get(this);
    if (record && HEADER_NAMES.has(String(key).toLowerCase())) record.headers.push([key, value]);
    return originalSetHeader.apply(this, arguments);
  };
  proto.send = function () {
    const record = tracked.get(this);
    if (record) {
      takeHeaders(record.headers);
      if (record.path === BALANCE_PATH) {
        const ticket = ++requestTicket;
        this.addEventListener('load', function () {
          if (this.status < 200 || this.status >= 300) return;
          try {
            const json = this.responseType === 'json' ? this.response :
              (!this.responseType || this.responseType === 'text') ? JSON.parse(this.responseText) : null;
            if (json) acceptBalance(json, ticket);
          } catch (_) {}
        }, {once: true});
      }
    }
    return originalSend.apply(this, arguments);
  };

  async function queryBalance() {
    if (inFlight || !isVisible() || !isRoom() || Date.now() < retryAfter) return;
    if (typeof originalFetch !== 'function') return;
    inFlight = true;
    const ticket = ++requestTicket;
    lastAttempt = Date.now();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const abortTimer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : 0;
    try {
      const response = await originalFetch.call(window, BALANCE_URL, {
        method: 'GET', headers: {...auth}, credentials: 'include', cache: 'no-store',
        ...(controller ? {signal: controller.signal} : {})
      });
      if (response.ok && acceptBalance(await response.json(), ticket)) return;
      failureCount += 1;
      if (response.status === 401 || response.status === 403) {
        lastAuthAttempt = true;
        retryAfter = Date.now() + 120000;
        setStatus('인증 대기 · 채팅방 새로고침 후 재확인');
      } else {
        retryAfter = Date.now() + (response.status === 429 ? 180000 :
          Math.min(300000, POLL_MS * (2 ** Math.min(failureCount, 3))));
        setStatus(`조회 실패 · HTTP ${response.status}`);
      }
    } catch (_) {
      failureCount += 1;
      retryAfter = Date.now() + Math.min(300000, POLL_MS * (2 ** Math.min(failureCount, 3)));
      setStatus('연결 오류 · 다음 주기에 재시도');
    } finally {
      if (abortTimer) clearTimeout(abortTimer);
      inFlight = false;
    }
  }

  function schedulePoll(delay = POLL_MS) {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = 0;
    if (!isVisible()) return;
    pollTimer = setTimeout(async () => {
      pollTimer = 0;
      if (isVisible() && isRoom()) await queryBalance();
      schedulePoll(POLL_MS);
    }, delay);
  }

  function ensureWidget() {
    if (widget && widget.isConnected) return;
    if (!document.body) return;
    if (!document.getElementById('zeta-piece-display-css')) {
      const style = document.createElement('style');
      style.id = 'zeta-piece-display-css';
      style.textContent = `
        #zeta-piece-display {
          position:fixed!important;left:auto!important;bottom:auto!important;
          transform:translateY(-50%)!important;
          z-index:1100!important;display:flex;align-items:center;justify-content:flex-end;gap:2px;
          box-sizing:border-box;width:max-content;max-width:136px;height:36px;
          padding:0;margin:0;border:0;background:transparent!important;
          pointer-events:auto!important;cursor:pointer;user-select:none;-webkit-user-select:none;white-space:nowrap;overflow:visible;
          color:#fff;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
          font-variant-numeric:tabular-nums;line-height:1;
        }
        #zeta-piece-display img {width:20px;height:20px;object-fit:contain;flex:none;display:block;}
        #zeta-piece-display .zpd-copy {display:flex;min-width:0;align-items:center;line-height:1;height:23px;}
        #zeta-piece-display .zpd-value {display:block;font-size:15px;font-weight:700;color:#fff;letter-spacing:-.5px;line-height:1;}
        #zeta-piece-display:focus-visible {outline:2px solid #ad91fa;outline-offset:2px;}
        /* Phone Peek is a portal dialog layered above the chat room.
           Hide only our widget and its popup while this panel exists;
           CSS restores them immediately when the panel is unmounted. */
        body:has([data-testid="phone-peek-panel"]) #zeta-piece-display,
        body:has([data-testid="phone-peek-panel"]) #zeta-piece-display-settings,
        body:has([data-testid="anonymous-board-safe-area"]) #zeta-piece-display,
        body:has([data-testid="anonymous-board-safe-area"]) #zeta-piece-display-settings {
          display:none!important;
        }
        #zeta-piece-display-settings {position:fixed;z-index:2147483600;width:min(300px,calc(100vw - 20px));
          max-height:min(70vh,520px);overflow-y:auto;overscroll-behavior:contain;border:1px solid #50505b;
          border-radius:14px;padding:14px;box-sizing:border-box;background:#24242d;color:#fff;
          box-shadow:0 8px 30px rgba(0,0,0,.55);font:13px/1.5 system-ui,sans-serif;}
        #zeta-piece-display-settings * {box-sizing:border-box;}
        #zeta-piece-display-settings .zp-row {display:flex;justify-content:space-between;align-items:center;gap:10px;margin:9px 0;}
        #zeta-piece-display-settings .zp-row label {flex:1;min-width:90px;}
        #zeta-piece-display-settings .zp-row input[type=range] {width:95px;min-width:75px;accent-color:#ab91ff;}
        #zeta-piece-display-settings .zp-row input[type=checkbox] {width:18px;height:18px;accent-color:#ab91ff;}
        #zeta-piece-display-settings .zp-value {width:40px;text-align:right;color:#ccc;font-variant-numeric:tabular-nums;}
        #zeta-piece-display-settings input[type=text],#zeta-piece-display-settings select {
          color:#fff;background:#363640;border:1px solid #62626d;border-radius:7px;padding:6px;}
        #zeta-piece-display-settings input[type=text] {width:108px;font:13px ui-monospace,monospace;}
        #zeta-piece-display-settings select {width:150px;}
        #zeta-piece-display-settings button {color:white;background:#3d3d49;border:1px solid #5b5b66;border-radius:7px;
          padding:5px 10px;font:inherit;cursor:pointer;}
        #zeta-piece-display-settings .zp-error {border-color:#ff6565!important;}
        #zeta-piece-display-settings .zp-heading {font-size:15px;font-weight:700;margin-bottom:12px;}
        #zeta-piece-display-settings .zp-hint {color:#bbb;font-size:11px;}
      `;
      (document.head || document.documentElement).appendChild(style);
    }
    widget = document.createElement('div');
    widget.id = 'zeta-piece-display';
    widget.innerHTML = `<img alt="" src="${COIN_IMAGE}"><span class="zpd-copy"><span class="zpd-value">—</span></span>`;
    valueNode = widget.querySelector('.zpd-value');
    if (currentBalance !== null) valueNode.textContent = currentBalance.toLocaleString('ko-KR');
    // Fixed coordinates must be relative to the viewport, not an app flex row.
    // Keep the widget hidden until its anchor is measured.
    widget.style.display = 'none';
    document.body.appendChild(widget);
    widget.tabIndex = 0;
    widget.setAttribute('role','button');
    widget.addEventListener('click', e => { e.stopPropagation(); toggleSettings(); });
    widget.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {e.preventDefault();toggleSettings();}
    });
    applyAppearance();
    fitBalanceText();
    setStatus(lastStatus);
  }

  function savePrefs() {
    try {localStorage.setItem(PREF_KEY, JSON.stringify(prefs));} catch (_) {}
  }

  function fitBalanceText() {
    if (valueNode) valueNode.style.fontSize = visualFontSize() + 'px';
  }

  function applyAppearance() {
    if (!widget || !valueNode) return;
    const icon = widget.querySelector('img');
    if (icon) {
      icon.style.display = prefs.showIcon ? 'block' : 'none';
      icon.style.width = prefs.iconSize + 'px';
      icon.style.height = prefs.iconSize + 'px';
    }
    widget.style.gap = prefs.showIcon ? prefs.iconGap + 'px' : '0px';
    valueNode.style.fontFamily = FONT_STACKS[prefs.font];
    valueNode.style.fontVariantNumeric = 'tabular-nums';
    valueNode.style.fontFeatureSettings = '"tnum" 1, "lnum" 1';
    loadSelectedFont(prefs.font);
    valueNode.style.letterSpacing = prefs.spacing + 'px';
    valueNode.style.color = prefs.color;
    fitBalanceText();
  }

  function closeSettings() {
    if (settingsPanel) {settingsPanel.remove(); settingsPanel = null;}
    const view = window.visualViewport;
    if (view) {
      view.removeEventListener('resize', positionSettingsPanel);
      view.removeEventListener('scroll', positionSettingsPanel);
    }
  }

  // Only the popup moves with Safari's visual viewport; the piece stays fixed.
  function positionSettingsPanel() {
    if (!settingsPanel || !widget || !settingsPanel.isConnected) return;
    const view = window.visualViewport;
    const vx = view ? view.offsetLeft : 0;
    const vy = view ? view.offsetTop : 0;
    const vw = view ? view.width : window.innerWidth;
    const vh = view ? view.height : window.innerHeight;
    settingsPanel.style.maxHeight = Math.max(100, Math.min(520, Math.floor(vh * .7), vh - 20)) + 'px';
    const pw = settingsPanel.offsetWidth, ph = settingsPanel.offsetHeight;
    const rect = widget.getBoundingClientRect();
    const minX = vx + 10, maxX = Math.max(minX, vx + vw - pw - 10);
    const left = Math.max(minX, Math.min(maxX, rect.right - pw));
    const below = rect.bottom + 8, above = rect.top - ph - 8;
    const proposed = below + ph + 10 <= vy + vh ? below : above;
    const top = Math.max(vy + 10, Math.min(vy + vh - ph - 10, proposed));
    settingsPanel.style.left = Math.round(left) + 'px';
    settingsPanel.style.top = Math.round(top) + 'px';
  }

  function updatePref(key, value) {
    prefs[key] = value;
    savePrefs();
    applyAppearance();
    if (key === 'modelGap' || key === 'offsetY') {
      placementReady = false;
      positionWidget(true);
    }
    if (settingsPanel) {
      const output = settingsPanel.querySelector('[data-output="' + key + '"]');
      if (output) output.textContent = String(value) + 'px';
    }
  }

  function syncSettings() {
    if (!settingsPanel) return;
    for (const field of settingsPanel.querySelectorAll('[data-pref]')) {
      const key = field.dataset.pref;
      if (field.type === 'checkbox') field.checked = prefs[key];
      else field.value = prefs[key];
      field.classList.remove('zp-error');
      const output = settingsPanel.querySelector('[data-output="' + key + '"]');
      if (output) output.textContent = String(prefs[key]) + 'px';
    }
  }

  function toggleSettings() {
    if (settingsPanel) {closeSettings(); return;}
    if (!widget || widget.style.display === 'none') return;
    const panel = document.createElement('section');
    panel.id = 'zeta-piece-display-settings';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '피스 표시 설정');
    panel.innerHTML = `
      <div class="zp-row zp-heading"><span>피스 표시 설정</span><button type="button" data-action="close">✕</button></div>
      <div class="zp-row"><label for="zp-icon">아이콘 표시</label><input id="zp-icon" data-pref="showIcon" type="checkbox"></div>
      <div class="zp-row"><label for="zp-font">글씨체</label><select id="zp-font" data-pref="font">
        <option value="system">기본 고딕</option>
        <option value="gothic">일반 고딕</option>
        <option value="mono">고정폭</option>
        <option value="noto">노토 산스 KR</option>
        <option value="nanumgo">나눔고딕</option>
        <option value="dodum">고운돋움</option>
        <option value="dohyeon">도현</option>
        <option value="serif">노토 세리프 KR</option>
        <option value="gowunb">고운바탕</option></select></div>
      <div class="zp-row"><label for="zp-size">글씨 크기</label><input id="zp-size" type="range" data-pref="fontSize" min="10" max="24" step="1"><span class="zp-value" data-output="fontSize"></span></div>
      <div class="zp-row"><label for="zp-spacing">자간</label><input id="zp-spacing" type="range" data-pref="spacing" min="-2" max="3" step="0.1"><span class="zp-value" data-output="spacing"></span></div>
      <div class="zp-row"><label for="zp-color">글씨 색상</label><input id="zp-color" type="text" maxlength="7" placeholder="#FFFFFF" data-pref="color" autocapitalize="characters" spellcheck="false"></div>
      <div class="zp-hint">색상은 #FFFFFF 형식으로 입력</div>
      <div class="zp-row"><label for="zp-icon-size">아이콘 크기</label><input id="zp-icon-size" type="range" data-pref="iconSize" min="16" max="32" step="1"><span class="zp-value" data-output="iconSize"></span></div>
      <div class="zp-row"><label for="zp-icon-gap">아이콘·숫자 간격</label><input id="zp-icon-gap" type="range" data-pref="iconGap" min="0" max="12" step="1"><span class="zp-value" data-output="iconGap"></span></div>
      <div class="zp-row"><label for="zp-model-gap">모델 버튼 간격</label><input id="zp-model-gap" type="range" data-pref="modelGap" min="0" max="24" step="1"><span class="zp-value" data-output="modelGap"></span></div>
      <div class="zp-row"><label for="zp-offset">세로 위치</label><input id="zp-offset" type="range" data-pref="offsetY" min="-10" max="10" step="1"><span class="zp-value" data-output="offsetY"></span></div>
      <div class="zp-row" style="justify-content:flex-end;margin-top:14px"><button type="button" data-action="reset">기본값 복원</button></div>`;
    panel.addEventListener('click', e => e.stopPropagation());
    panel.querySelector('[data-action="close"]').addEventListener('click', closeSettings);
    panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
      Object.assign(prefs, DEFAULTS);
      savePrefs(); applyAppearance();
      placementReady = false; positionWidget(true);
      syncSettings();
    });
    for (const field of panel.querySelectorAll('[data-pref]')) {
      const key = field.dataset.pref;
      field.addEventListener('input', () => {
        if (key === 'color') {
          const value = field.value.trim();
          const valid = /^#[0-9a-f]{6}$/i.test(value);
          field.classList.toggle('zp-error', !valid);
          if (valid) updatePref(key, value.toUpperCase());
        } else if (field.type === 'checkbox') updatePref(key, field.checked);
        else if (key === 'font') updatePref(key, field.value);
        else updatePref(key, Number(field.value));
      });
    }
    document.body.appendChild(panel);
    settingsPanel = panel;
    syncSettings();
    positionSettingsPanel();
    const view = window.visualViewport;
    if (view) {
      view.addEventListener('resize', positionSettingsPanel, {passive:true});
      view.addEventListener('scroll', positionSettingsPanel, {passive:true});
    }
  }

  // The model selector contains a logo image, not text. Locate its stable test id.
  function findModelButton() {
    const header = document.querySelector('header[data-sentry-component="Header"]')
      || document.querySelector('header:has([data-testid="chat-header-model"])');
    const button = header?.querySelector('button[data-testid="chat-header-model"]')
      || document.querySelector('button[data-testid="chat-header-model"]');
    if (!header || !button || !header.contains(button)) return null;
    const hr = header.getBoundingClientRect(), br = button.getBoundingClientRect();
    if (hr.width < 120 || hr.height < 25 || br.width < 30 || br.height < 20
      || br.left < hr.left || br.right > hr.right + 2
      || br.top < hr.top - 2 || br.bottom > hr.bottom + 2) return null;
    modelButton = button;
    return button;
  }

  function findScene() {
    return Array.from(document.querySelectorAll('iframe[title="scene"][src]')).find(frame => {
      const url = new URL(frame.src);
      return url.origin === sceneOrigin && /^\/v\d+\/index\.html$/.test(url.pathname);
    });
  }

  let activeScene = null;
  let scenePosition = null;
  function syncScene() {
    const frame = isRoom() ? findScene() : null;
    if (activeScene !== frame) {
      activeScene = frame;
      scenePosition = null;
      placementReady = false;
    }
    frame?.contentWindow?.postMessage(sceneChannel, sceneOrigin);
  }

  window.addEventListener('message', event => {
    if (!activeScene || activeScene !== findScene() || !isRoom()
      || event.origin !== sceneOrigin || event.source !== activeScene.contentWindow
      || event.data?.channel !== sceneChannel) return;
    const position = event.data.position;
    const next = Number.isFinite(position?.left) && Number.isFinite(position?.centerY) ? position : null;
    if (next?.left === scenePosition?.left && next?.centerY === scenePosition?.centerY) return;
    scenePosition = next;
    placementReady = false;
    positionWidget();
  });

  // Measure ONCE, then keep fixed right/top coordinates. A changing number,
  // periodic balance request, scroll or input focus never repositions this.
  function positionWidget(force = false) {
    if (!document.body) return;
    if (!isRoom()) {
      if (widget) widget.style.display = 'none';
      return;
    }
    ensureWidget();
    if (!widget) return;
    if (placementReady && !force) {
      if (widget.style.display !== 'flex') widget.style.display = 'flex';
      return;
    }
    const model = activeScene ? null : findModelButton();
    const frameRect = activeScene?.getBoundingClientRect();
    if (!model && !(frameRect?.width && scenePosition)) {
      // No guessed position: wait until the actual model button exists.
      widget.style.display = 'none';
      return;
    }
    const r = model ? model.getBoundingClientRect() : {
      left: frameRect.left + activeScene.clientLeft + scenePosition.left,
      top: frameRect.top + activeScene.clientTop + scenePosition.centerY,
      height: 0
    };
    const gap = prefs.modelGap;
    // Fixed right edge means longer balances expand LEFT, keeping the gap.
    widget.style.right = `${Math.round((document.documentElement.clientWidth || innerWidth) - r.left + gap)}px`;
    widget.style.top = `${Math.round(r.top + r.height / 2 + prefs.offsetY)}px`;
    widget.style.display = 'flex';
    placementReady = true;
    attachAttempts = 0;
    fitBalanceText();
  }

  function watchUi() {
    const route = location.pathname;
    if (route !== previousRoute) {
      const wasRoom = ROOM_RE.test(previousRoute);
      previousRoute = route;
      if (isRoom()) {
        // Room-to-room keeps its coordinates; re-entry and replaced headers remeasure.
        if (!wasRoom || !modelButton?.isConnected) {
          placementReady = false;
          modelButton = null;
        }
        if (isVisible()) schedulePoll(200);
      }
    }
    syncScene();
    if (!isRoom()) {
      if (widget) widget.style.display = 'none';
      closeSettings();
    } else if (isVisible() && (!placementReady || !widget?.isConnected)) {
      positionWidget();
    } else if (isVisible() && widget && widget.style.display === 'none') {
      widget.style.display = 'flex';
    }
    if (uiTimer) clearTimeout(uiTimer);
    // No DOM observer and no repeated position calculation after placement.
    if (!placementReady && isRoom()) attachAttempts++;
    uiTimer = setTimeout(watchUi, !placementReady && isRoom() ?
      (attachAttempts < 12 ? 1000 : 4000) : 5000);
  }

  function onResize() {
    if (settingsPanel) positionSettingsPanel();
    const width = window.innerWidth;
    // Soft keyboard and browser toolbar height changes cannot reposition the piece.
    if (Math.abs(width - viewportWidth) < 3) return;
    viewportWidth = width;
    syncScene();
    modelButton = null;
    placementReady = false;
    positionWidget(true);
  }

  function onVisibility() {
    if (!isVisible()) {
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = 0;
      return;
    }
    positionWidget();
    if (settingsPanel) positionSettingsPanel();
    schedulePoll(lastAttempt && Date.now() - lastAttempt < 3000 ? 3000 : 200);
  }

  function init() {
    if (!document.body) return;
    positionWidget();
    watchUi();
    document.addEventListener('click', e => {
      if (settingsPanel && !settingsPanel.contains(e.target) && !widget?.contains(e.target)) closeSettings();
    }, {passive:true});
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSettings(); });
    document.addEventListener('visibilitychange', onVisibility, {passive: true});
    window.addEventListener('pageshow', onVisibility, {passive: true});
    window.addEventListener('resize', onResize, {passive: true});
    schedulePoll(500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();