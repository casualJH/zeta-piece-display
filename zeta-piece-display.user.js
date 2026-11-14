// ==UserScript==
// @name         제타 피스 표시
// @namespace    zeta-piece-display
// @version      0.1.8
// @description  채팅 상단 피스 잔액 표시, 30초마다 자동 갱신 (정렬/가독성 보정).
// @homepageURL  https://github.com/casualJH/zeta-piece-display
// @updateURL    https://raw.githubusercontent.com/casualJH/zeta-piece-display/main/zeta-piece-display.user.js
// @downloadURL  https://raw.githubusercontent.com/casualJH/zeta-piece-display/main/zeta-piece-display.user.js
// @match        https://zeta-ai.io/*
// @match        https://*.zeta-ai.io/*
// @run-at       document-start
// @noframes
// @sandbox      raw
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const GUARD = '__zetaPieceDisplay_0_1_8';
  if (window[GUARD]) return;
  window[GUARD] = true;

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

  const auth = Object.create(null);
  let currentBalance = null;
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
  let viewportHeight = window.innerHeight;
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
      widget.title = `내 피스: ${currentBalance === null ? '미확인' : currentBalance.toLocaleString('ko-KR')}\n${message}\n조회 간격: 30초`;
      widget.setAttribute('aria-label', `내 피스 ${currentBalance === null ? '확인 중' : currentBalance.toLocaleString('ko-KR')}`);
    }
  }

  function acceptBalance(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const amount = data.balance;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return false;
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
      const result = originalFetch.apply(this, arguments);
      if (path === BALANCE_PATH) {
        Promise.resolve(result).then(response => {
          if (response && response.ok) response.clone().json().then(acceptBalance).catch(() => {});
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
        this.addEventListener('load', function () {
          if (this.status < 200 || this.status >= 300) return;
          try {
            const json = this.responseType === 'json' ? this.response :
              (!this.responseType || this.responseType === 'text') ? JSON.parse(this.responseText) : null;
            if (json) acceptBalance(json);
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
    lastAttempt = Date.now();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const abortTimer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : 0;
    try {
      const response = await originalFetch.call(window, BALANCE_URL, {
        method: 'GET', headers: {...auth}, credentials: 'include', cache: 'no-store',
        ...(controller ? {signal: controller.signal} : {})
      });
      if (response.ok && acceptBalance(await response.json())) return;
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
          z-index:1100!important;display:flex;align-items:center;justify-content:flex-end;gap:5px;
          box-sizing:border-box;width:max-content;max-width:136px;height:36px;
          padding:0;margin:0;border:0;background:transparent!important;
          pointer-events:none!important;white-space:nowrap;overflow:visible;
          color:#fff;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
          font-variant-numeric:tabular-nums;line-height:1;
        }
        #zeta-piece-display img {width:23px;height:23px;object-fit:contain;flex:none;display:block;}
        #zeta-piece-display .zpd-copy {display:flex;min-width:0;align-items:center;line-height:1;height:23px;}
        #zeta-piece-display .zpd-value {display:block;font-size:15px;font-weight:700;color:#fff;letter-spacing:-.15px;line-height:1;}
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
    fitBalanceText();
    setStatus(lastStatus);
  }

  function fitBalanceText() {
    if (!valueNode || !widget) return;
    const chars = (valueNode.textContent || '').length;
    // 4-digit balances (e.g. 1,000 or 9,999) keep the same 15px font.
    const base = chars > 9 ? 11 : chars > 7 ? 12 : chars > 5 ? 13 : 15;
    valueNode.style.fontSize = base + 'px';
    if (chars <= 5) return;
    const available = Math.max(20, (widget.clientWidth || 94) - 35);
    if (valueNode.scrollWidth > available) {
      valueNode.style.fontSize = Math.max(9, Math.floor(base * available / valueNode.scrollWidth)) + 'px';
    }
  }

  // The model selector is an image button; textContent is empty.
  // Use Zeta's stable test id, and verify that it belongs to this chat header.
  function findModelButton() {
    const header = document.querySelector('header[data-sentry-component="Header"]')
      || document.querySelector('header:has([data-testid="chat-header-model"])');
    const button = header?.querySelector('button[data-testid="chat-header-model"]')
      || document.querySelector('button[data-testid="chat-header-model"]');
    if (!header || !button || !header.contains(button)) return null;
    const hr = header.getBoundingClientRect();
    const br = button.getBoundingClientRect();
    if (hr.width < 120 || hr.height < 25 || br.width < 30 || br.height < 20
      || br.left < hr.left || br.right > hr.right + 2
      || br.top < hr.top - 2 || br.bottom > hr.bottom + 2) return null;
    modelButton = button;
    return button;
  }

  // Measure the genuine button once. Right anchoring preserves a 12px gap
  // even when the balance grows from three digits to four or more.
  function positionWidget(force = false) {
    if (!document.body) return;
    if (!isRoom()) {
      if (widget) widget.style.display = 'none';
      return;
    }
    ensureWidget();
    if (!widget) return;
    if (placementReady && !force) {
      widget.style.display = 'flex';
      return;
    }
    const button = findModelButton();
    if (!button) {
      widget.style.display = 'none';
      return;
    }
    const r = button.getBoundingClientRect();
    const gap = 12;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    widget.style.right = `${Math.round(viewportWidth - r.left + gap)}px`;
    widget.style.top = `${Math.round(r.top + r.height / 2)}px`;
    widget.style.display = 'flex';
    placementReady = true;
    attachAttempts = 0;
    fitBalanceText();
  }

  function watchUi() {
    const route = location.pathname;
    if (route !== previousRoute) {
      previousRoute = route;
      if (isRoom() && isVisible()) schedulePoll(200);
    }
    if (!isRoom()) {
      if (widget) widget.style.display = 'none';
    } else if (isVisible() && (!placementReady || !widget?.isConnected)) {
      positionWidget();
    } else if (isVisible() && widget && widget.style.display === 'none') {
      widget.style.display = 'flex';
    }
    if (uiTimer) clearTimeout(uiTimer);
    if (!placementReady && isRoom()) attachAttempts++;
    uiTimer = setTimeout(watchUi, !placementReady && isRoom() ?
      (attachAttempts < 15 ? 600 : 3000) : 5000);
  }

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (Math.abs(w - viewportWidth) < 3 && Math.abs(h - viewportHeight) < 60) return;
    viewportWidth = w;
    viewportHeight = h;
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
    schedulePoll(lastAttempt && Date.now() - lastAttempt < 3000 ? 3000 : 200);
  }

  function init() {
    if (!document.body) return;
    positionWidget();
    watchUi();
    document.addEventListener('visibilitychange', onVisibility, {passive: true});
    window.addEventListener('pageshow', onVisibility, {passive: true});
    window.addEventListener('resize', onResize, {passive: true});
    schedulePoll(500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();