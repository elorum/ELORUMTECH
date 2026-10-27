(function () {
  "use strict";

  var measurementId = "G-NBJBV3XERH";
  var consentKey = "elorumtech-analytics-consent";
  var loaded = false;

  function getConsent() {
    try { return localStorage.getItem(consentKey); } catch (error) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(consentKey, value); } catch (error) {}
  }

  function loadAnalytics() {
    if (loaded) return;
    loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { anonymize_ip: true });

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  // CLEANUP-01 (QA-01 #36 F4 / #38 R3, WCAG 2.4.11): while the fixed consent banner is shown, reserve room
  // under the page (body padding + html scroll-padding) and scroll a focused element out from under the banner.
  var reserved = null;

  function bannerReserve(banner) {
    var rect = banner.getBoundingClientRect();
    var bottomGap = Math.max(0, window.innerHeight - rect.bottom);
    return Math.ceil(rect.height + bottomGap + 16);
  }

  function reserveSpace(banner) {
    var root = document.documentElement;
    var body = document.body;
    if (!reserved) reserved = { padding: body.style.paddingBottom, scrollPadding: root.style.scrollPaddingBottom };
    var px = bannerReserve(banner) + "px";
    body.style.paddingBottom = px;
    root.style.scrollPaddingBottom = px;
  }

  function releaseSpace() {
    if (!reserved) return;
    document.body.style.paddingBottom = reserved.padding;
    document.documentElement.style.scrollPaddingBottom = reserved.scrollPadding;
    reserved = null;
  }

  function onResize() {
    var banner = document.getElementById("elorumtech-analytics-consent");
    if (banner) reserveSpace(banner);
  }

  function onFocusIn(event) {
    var banner = document.getElementById("elorumtech-analytics-consent");
    var target = event.target;
    if (!banner || !target || !target.getBoundingClientRect || banner.contains(target)) return;
    var top = banner.getBoundingClientRect().top;
    var rect = target.getBoundingClientRect();
    if (rect.bottom > top - 8 && rect.top < window.innerHeight) window.scrollBy(0, Math.ceil(rect.bottom - top + 16));
  }

  function removeBanner() {
    var banner = document.getElementById("elorumtech-analytics-consent");
    if (banner) banner.remove();
    releaseSpace();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("focusin", onFocusIn);
  }

  function showBanner() {
    if (document.getElementById("elorumtech-analytics-consent")) return;

    var banner = document.createElement("section");
    banner.id = "elorumtech-analytics-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Analytics choice");
    banner.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:720px;margin:auto;padding:18px;border:1px solid #2b3544;border-radius:16px;background:#0e131c;color:#f6f8fb;box-shadow:0 16px 48px rgba(0,0,0,.45);font:15px/1.5 system-ui,-apple-system,sans-serif";

    var copy = document.createElement("p");
    copy.style.cssText = "margin:0 0 14px";
    copy.textContent = "ELORUMTECH uses optional Google Analytics to understand which guides and compatibility tools are useful. Analytics only starts if you allow it.";

    var actions = document.createElement("div");
    actions.style.cssText = "display:flex;flex-wrap:wrap;gap:10px";

    var accept = document.createElement("button");
    accept.type = "button";
    accept.textContent = "Allow analytics";
    accept.style.cssText = "border:0;border-radius:10px;padding:11px 15px;background:#79f2c0;color:#06100c;font-weight:800;cursor:pointer";
    accept.addEventListener("click", function () {
      setConsent("granted");
      window["ga-disable-" + measurementId] = false;
      loadAnalytics();
      removeBanner();
    });

    var reject = document.createElement("button");
    reject.type = "button";
    reject.textContent = "Necessary only";
    reject.style.cssText = "border:1px solid #445064;border-radius:10px;padding:11px 15px;background:transparent;color:#f6f8fb;font-weight:700;cursor:pointer";
    reject.addEventListener("click", function () {
      setConsent("denied");
      // Withdrawal after "Privacy choices": stop this page's already-loaded tag from sending more hits
      // (Google's documented ga-disable-<ID> flag). It does not delete existing GA cookies; next load skips GA.
      if (loaded) window["ga-disable-" + measurementId] = true;
      removeBanner();
    });

    actions.appendChild(accept);
    actions.appendChild(reject);
    banner.appendChild(copy);
    banner.appendChild(actions);
    document.body.appendChild(banner);
    reserveSpace(banner);
    window.addEventListener("resize", onResize);
    document.addEventListener("focusin", onFocusIn);
  }

  function trackToolInteractions() {
    document.addEventListener("click", function (event) {
      if (getConsent() !== "granted" || typeof window.gtag !== "function") return;
      var button = event.target.closest && event.target.closest("button");
      if (!button) return;

      var interaction = button.id || button.getAttribute("data-intent") || button.textContent.trim().slice(0, 80);
      window.gtag("event", "tool_interaction", {
        interaction_name: interaction,
        page_path: location.pathname
      });
    });
  }

  // "Privacy choices" footer link: reopen the same banner so the stored choice can be changed.
  function bindPrivacyChoices() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest("[data-analytics-choices]");
      if (!link) return;
      event.preventDefault();
      showBanner();
    });
  }

  function start() {
    bindPrivacyChoices();
    trackToolInteractions();
    var consent = getConsent();
    if (consent === "granted") loadAnalytics();
    else if (consent !== "denied") showBanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
