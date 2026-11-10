// ==UserScript==
// @name         Snapchat Web on iPhone
// @namespace    https://github.com/ChristianRelf/snapchat
// @version      1.1.0
// @description  Lets Snapchat for Web run in iPhone Safari by presenting it as desktop Safari.
// @match        https://www.snapchat.com/*
// @match        https://accounts.snapchat.com/*
// @match        https://web.snapchat.com/*
// @run-at       document-start
// @inject-into  content
// @grant        none
// @updateURL    https://raw.githubusercontent.com/ChristianRelf/snapchat/main/snapchat-web-iphone.user.js
// @downloadURL  https://raw.githubusercontent.com/ChristianRelf/snapchat/main/snapchat-web-iphone.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Width (CSS px) the page is laid out at. 980 matches Safari's own
  // "Request Desktop Website" mode; lower it for bigger text, raise it if
  // parts of the UI get cut off. Landscape works best.
  const VIEWPORT_WIDTH = 980;

  // Runs in the page's own JS world (content scripts can't change the
  // navigator the page sees).
  //
  // Snapchat for Web gates on ua-parser-js: phones are redirected to
  // mobile-landing.html, and a Mac UA with touch support is classed as an
  // iPad ("Browser not supported"). Present as touchless desktop Safari.
  // Safari rather than Chrome so the UA matches the real WebKit engine.
  function spoofDesktopSafari() {
    const version = (navigator.userAgent.match(/Version\/(\d+(?:\.\d+)?)/) || [])[1] || "26.0";
    const mac = `(Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`;
    const spoofed = {
      userAgent: `Mozilla/5.0 ${mac}`,
      appVersion: `5.0 ${mac}`,
      platform: "MacIntel",
      maxTouchPoints: 0,
      standalone: undefined,
    };
    for (const [key, value] of Object.entries(spoofed)) {
      try {
        Object.defineProperty(navigator, key, { get: () => value, configurable: true });
      } catch (e) {
        console.warn("[snapweb-iphone] could not override navigator." + key, e);
      }
    }
  }

  // If the spoof lost the race against Snapchat's own scripts we land on
  // the mobile page; go back to /web, at most twice a minute.
  if (location.hostname === "www.snapchat.com" && location.pathname.startsWith("/web/mobile-landing")) {
    const key = "snapweb-iphone-retry";
    const last = JSON.parse(sessionStorage.getItem(key) || '{"n":0,"t":0}');
    const n = Date.now() - last.t > 60000 ? 0 : last.n;
    if (n < 2) {
      sessionStorage.setItem(key, JSON.stringify({ n: n + 1, t: Date.now() }));
      location.replace("/web");
      return;
    }
  }

  // Snapchat's pages have different CSPs: the homepage allows inline
  // scripts, while /web blocks them (which is how userscript managers inject
  // into the page) but allows blob: scripts. Try inline first since it runs
  // synchronously, then fall back to blob:. Snapchat's /web scripts are
  // deferred, so the blob: script still runs well before them.
  function injectSpoof() {
    const code = `(${spoofDesktopSafari})();document.documentElement.dataset.snapwebSpoofed="";`;
    const inline = document.createElement("script");
    inline.textContent = code;
    (document.head || document.documentElement).appendChild(inline);
    inline.remove();
    if ("snapwebSpoofed" in document.documentElement.dataset) {
      delete document.documentElement.dataset.snapwebSpoofed;
      return;
    }

    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const script = document.createElement("script");
    script.src = url;
    script.onload = script.onerror = () => {
      URL.revokeObjectURL(url);
      script.remove();
      delete document.documentElement.dataset.snapwebSpoofed;
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // The page ships width=device-width, which squeezes the desktop layout
  // into ~400px. Rewrite it as soon as it is parsed.
  function fixViewport() {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) meta.setAttribute("content", `width=${VIEWPORT_WIDTH}`);
    return !!meta;
  }

  // At document-start <html> may not exist yet.
  let injected = false;
  const tick = () => {
    if (!injected && document.documentElement) {
      injectSpoof();
      injected = true;
    }
    return injected && fixViewport();
  };
  if (!tick()) {
    new MutationObserver((mutations, observer) => {
      if (tick()) observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  }
})();
