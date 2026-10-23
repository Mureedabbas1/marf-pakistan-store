/* MARF Pakistan cookie preferences. Analytics stays off until explicit consent. */
(() => {
  const KEY = "marf_cookie_consent_v1";
  const GA_ID = "G-SD5NWVLLL5";
  let analyticsLoaded = false;
  function loadAnalytics() {
    if (analyticsLoaded || !window.__marfCookieConsent || window.__marfCookieConsent.analytics !== true) return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(script);
  }
  function readChoice() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (_) { return null; }
  }
  function saveChoice(analytics) {
    const choice = { necessary: true, analytics, savedAt: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (_) {}
    window.__marfCookieConsent = choice;
    loadAnalytics();
    render(false);
  }
  function render(showBanner) {
    let banner = document.getElementById("marf-cookie-banner");
    let settings = document.getElementById("marf-cookie-settings");
    if (!settings) {
      settings = document.createElement("button");
      settings.id = "marf-cookie-settings";
      settings.type = "button";
      settings.className = "marf-cookie-settings";
      settings.textContent = "Cookie settings";
      settings.setAttribute("aria-label", "Open cookie preferences");
      settings.addEventListener("click", () => render(true));
      document.body.appendChild(settings);
    }
    if (!showBanner) {
      if (banner) banner.remove();
      settings.hidden = false;
      return;
    }
    if (banner) banner.remove();
    banner = document.createElement("section");
    banner.id = "marf-cookie-banner";
    banner.className = "marf-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "marf-cookie-title");
    banner.innerHTML = '<div class="marf-cookie-copy"><p class="marf-cookie-eyebrow">YOUR PRIVACY, YOUR CHOICE</p><h2 id="marf-cookie-title">Cookie preferences</h2><p>MARF Pakistan uses necessary browser storage to remember your choice. With your permission, Google Analytics helps us understand site visits. Analytics stays off unless you accept. <a href="privacy-policy.html">Privacy policy</a>.</p></div><div class="marf-cookie-actions"><button type="button" class="marf-cookie-accept">Accept analytics</button><button type="button" class="marf-cookie-reject">Reject optional cookies</button></div>';
    banner.querySelector(".marf-cookie-accept").addEventListener("click", () => saveChoice(true));
    banner.querySelector(".marf-cookie-reject").addEventListener("click", () => saveChoice(false));
    document.body.appendChild(banner);
    settings.hidden = true;
    banner.querySelector(".marf-cookie-accept").focus({ preventScroll: true });
  }
  const choice = readChoice();
  window.__marfCookieConsent = choice;
  if (choice && choice.analytics === true) loadAnalytics();
  if (!choice) render(true);
  else render(false);
})();