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
    const copy = document.createElement("div");
    copy.className = "marf-cookie-copy";
    const eyebrow = document.createElement("p");
    eyebrow.className = "marf-cookie-eyebrow";
    eyebrow.textContent = "YOUR PRIVACY, YOUR CHOICE";
    const title = document.createElement("h2");
    title.id = "marf-cookie-title";
    title.textContent = "Cookie preferences";
    const description = document.createElement("p");
    description.append(document.createTextNode("MARF Pakistan uses necessary browser storage to remember your choice. With your permission, Google Analytics helps us understand site visits. Analytics stays off unless you accept. "));
    const policyLink = document.createElement("a");
    policyLink.href = "privacy-policy.html";
    policyLink.textContent = "Privacy policy";
    description.append(policyLink, document.createTextNode("."));
    copy.append(eyebrow, title, description);
    const actions = document.createElement("div");
    actions.className = "marf-cookie-actions";
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "marf-cookie-accept";
    accept.textContent = "Accept analytics";
    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "marf-cookie-reject";
    reject.textContent = "Reject optional cookies";
    actions.append(accept, reject);
    banner.append(copy, actions);
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