// ==UserScript==
// @name         Snapchat Web on iPhone
// @namespace    https://github.com/christianrelf/snapchat-web-iphone
// @version      1.0.0
// @description  Lets Snapchat for Web run in iPhone Safari by presenting it as desktop Safari.
// @match        https://www.snapchat.com/*
// @match        https://accounts.snapchat.com/*
// @match        https://web.snapchat.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Width (CSS px) the page is laid out at. 980 matches Safari's own
  // "Request Desktop Website" mode; lower it for bigger text, raise it if
  // parts of the UI get cut off. Landscape works best.
  const VIEWPORT_WIDTH = 980;

  // Snapchat for Web gates on ua-parser-js: phones are redirected to
  // mobile-landing.html, and a Mac UA with touch support is classed as an
  // iPad ("Browser not supported"). Present as touchless desktop Safari.
  // Safari rather than Chrome so the UA matches the real WebKit engine.
  const realUA = navigator.userAgent;
  const version = (realUA.match(/Version\/(\d+(?:\.\d+)?)/) || [])[1] || "26.0";
  const spoofed = {
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`,
    appVersion: `5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`,
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

  function fixViewport(meta) {
    meta.setAttribute("content", `width=${VIEWPORT_WIDTH}`);
  }

  // The page ships width=device-width, which squeezes the desktop layout
  // into ~400px. Rewrite it as soon as it is parsed.
  new MutationObserver((mutations, observer) => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      fixViewport(meta);
      observer.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
})();
