// Injected by WKUserScript at document start into every frame, in the
// page's own JS world and before any page script. The app's
// customUserAgent already makes navigator.userAgent desktop Safari; this
// hides the remaining iPhone tells.
//
// Snapchat for Web gates on ua-parser-js, which classes a Mac UA with
// navigator.standalone set and maxTouchPoints > 2 as an iPad ("Browser not
// supported"), and its homepage hides the login form on touch devices.
(() => {
  // Width (CSS px) the page is laid out at. 980 matches Safari's own
  // "Request Desktop Website" mode; lower it for bigger text, raise it if
  // parts of the UI get cut off. Landscape works best.
  const VIEWPORT_WIDTH = 980;

  const spoofed = { platform: "MacIntel", maxTouchPoints: 0, standalone: undefined };
  for (const [key, value] of Object.entries(spoofed)) {
    try {
      Object.defineProperty(navigator, key, { get: () => value, configurable: true });
    } catch (e) {
      console.warn("[snapweb] could not override navigator." + key, e);
    }
  }

  // Pages ship width=device-width, which squeezes the desktop layout into
  // ~400px. Rewrite it as soon as it is parsed.
  const fixViewport = () => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) meta.setAttribute("content", `width=${VIEWPORT_WIDTH}`);
    return !!meta;
  };
  if (!fixViewport()) {
    new MutationObserver((mutations, observer) => {
      if (fixViewport()) observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  }
})();
