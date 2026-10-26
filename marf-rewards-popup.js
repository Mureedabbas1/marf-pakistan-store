(() => {
  if (window.__marfRewardsPopupLoaded) return;
  window.__marfRewardsPopupLoaded = true;

  try {
    if (sessionStorage.getItem("marfRewardsPopupSeen") === "1") return;
    sessionStorage.setItem("marfRewardsPopupSeen", "1");
  } catch (e) {}

  const styles = `
    #marf-rewards-overlay{position:fixed;inset:0;z-index:1000000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);animation:marfRewardFade .22s ease}
    #marf-rewards-modal{position:relative;width:min(760px,100%);max-height:min(90vh,850px);overflow:auto;border:1px solid rgba(201,169,106,.55);border-radius:22px;background:radial-gradient(ellipse at 50% 0%,rgba(201,169,106,.15),transparent 48%),linear-gradient(145deg,#171614,#090909 68%);color:#f5f0e7;box-shadow:0 30px 100px rgba(0,0,0,.7);font-family:Manrope,Arial,sans-serif}
    #marf-rewards-modal *{box-sizing:border-box}
    .marf-rp-close{position:sticky;top:12px;float:right;margin:12px 12px -42px 0;z-index:2;width:36px;height:36px;border:1px solid rgba(201,169,106,.4);border-radius:50%;background:#171614;color:#f5f0e7;font-size:23px;line-height:1;cursor:pointer}
    .marf-rp-inner{padding:34px clamp(18px,4vw,38px) 30px}
    .marf-rp-eyebrow{text-align:center;color:#c9a96a;font-size:10px;letter-spacing:.24em;text-transform:uppercase}
    .marf-rp-title{text-align:center;font:500 clamp(36px,6vw,55px)/.98 'Cormorant Garamond',Georgia,serif;margin:12px 0 10px}
    .marf-rp-title em{color:#c9a96a;font-weight:400}
    .marf-rp-sub{text-align:center;color:#c9c2b6;font-size:13px;line-height:1.75;max-width:560px;margin:0 auto 22px}
    .marf-rp-welcome{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 auto 22px;padding:14px;border:1px solid rgba(201,169,106,.4);border-radius:15px;background:rgba(201,169,106,.09);text-align:left;max-width:470px}
    .marf-rp-star{font-size:27px;color:#c9a96a}
    .marf-rp-welcome strong{display:block;color:#f7dfae;font-size:14px}
    .marf-rp-welcome span{display:block;color:#c9c2b6;font-size:11px;line-height:1.6;margin-top:3px}
    .marf-rp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0}
    .marf-rp-tier{border:1px solid rgba(201,169,106,.28);border-radius:14px;padding:15px 13px;background:rgba(255,255,255,.025)}
    .marf-rp-tier h3{font:500 25px/1.1 'Cormorant Garamond',Georgia,serif;color:#e7c98d;margin:0 0 7px}
    .marf-rp-tier .marf-rp-rate{font-size:13px;font-weight:700;color:#fff;margin-bottom:5px}
    .marf-rp-tier p{font-size:10px;line-height:1.6;color:#bcb5aa;margin:0}
    .marf-rp-section{border-top:1px solid rgba(201,169,106,.2);padding-top:16px;margin-top:16px}
    .marf-rp-section h4{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#d9bd84;margin:0 0 9px}
    .marf-rp-list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 18px}
    .marf-rp-list li{position:relative;padding-left:17px;color:#d0c9bd;font-size:11px;line-height:1.7}
    .marf-rp-list li:before{content:'✦';position:absolute;left:0;top:0;color:#c9a96a}
    .marf-rp-note{color:#aaa397;font-size:10px;line-height:1.7;margin:14px 0 0}
    .marf-rp-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:23px}
    .marf-rp-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:11px;letter-spacing:.08em;cursor:pointer}
    .marf-rp-primary{background:#c9a96a;color:#111;border:1px solid #c9a96a;font-weight:700}
    .marf-rp-secondary{background:transparent;color:#f5f0e7;border:1px solid rgba(201,169,106,.45)}
    @keyframes marfRewardFade{from{opacity:0}to{opacity:1}}
    @media(max-width:560px){#marf-rewards-overlay{padding:10px}#marf-rewards-modal{max-height:92vh;border-radius:17px}.marf-rp-inner{padding:29px 16px 22px}.marf-rp-grid{grid-template-columns:1fr;gap:8px}.marf-rp-tier{padding:12px}.marf-rp-tier h3{font-size:22px}.marf-rp-list{grid-template-columns:1fr;gap:7px}.marf-rp-sub{font-size:12px}.marf-rp-welcome{padding:12px}}
  `;
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.appendChild(style);

  function openPopup() {
    if (!document.body || document.getElementById("marf-rewards-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "marf-rewards-overlay";
    overlay.innerHTML = `
      <section id="marf-rewards-modal" role="dialog" aria-modal="true" aria-labelledby="marf-rp-heading">
        <button class="marf-rp-close" type="button" aria-label="Close rewards details">×</button>
        <div class="marf-rp-inner">
          <div class="marf-rp-eyebrow">A little extra, with every MARF order</div>
          <h2 class="marf-rp-title" id="marf-rp-heading">Introducing <em>MARF Rewards</em></h2>
          <p class="marf-rp-sub">Join the MARF Rewards Club and turn eligible purchases into points, exclusive membership value and savings on future orders.</p>
          <div class="marf-rp-welcome"><div class="marf-rp-star">✦</div><div><strong>30 Welcome Points — on us</strong><span>New Silver members receive 30 one-time welcome points when they create an account. Welcome points count toward tier progress.</span></div></div>
          <div class="marf-rp-grid">
            <article class="marf-rp-tier"><h3>Silver</h3><div class="marf-rp-rate">1 point = PKR 1</div><p>Starting membership<br>0–1,199 points</p></article>
            <article class="marf-rp-tier"><h3>Gold</h3><div class="marf-rp-rate">1 point = PKR 1.50</div><p>Unlock at 1,200 points<br>Higher value per point</p></article>
            <article class="marf-rp-tier"><h3>Privé</h3><div class="marf-rp-rate">1 point = PKR 2</div><p>Unlock at 2,500 points<br>Our highest points value</p></article>
          </div>
          <div class="marf-rp-section"><h4>How you earn points</h4><ul class="marf-rp-list">
            <li>Earn 30 points for every complete PKR 1,000 of eligible merchandise in an order.</li>
            <li>Points are added after the order is marked <strong>Delivered</strong>.</li>
            <li>Tier upgrades happen automatically at 1,200 points for Gold and 2,500 for Privé.</li>
            <li>Your membership tier does not automatically downgrade.</li>
          </ul></div>
          <div class="marf-rp-section"><h4>Use points at checkout</h4><ul class="marf-rp-list">
            <li>Sign in and select “Use my MARF points” at checkout.</li>
            <li>At least 100 points are required to redeem.</li>
            <li>Eligible points can be used for a discount on merchandise only, not shipping or packaging.</li>
            <li>If you leave the option unchecked, your points stay in your account for later.</li>
          </ul></div>
          <p class="marf-rp-note">Welcome points are awarded once to new Silver members; tier upgrades do not grant extra welcome points. Points used on a cancelled order are restored. Actual redemption is limited by the merchandise subtotal and your available balance.</p>
          <div class="marf-rp-actions"><a class="marf-rp-btn marf-rp-primary" href="account.html">Join / Sign in to My MARF</a><button class="marf-rp-btn marf-rp-secondary marf-rp-dismiss" type="button">Continue shopping</button></div>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector(".marf-rp-close").addEventListener("click", close);
    overlay.querySelector(".marf-rp-dismiss").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape" && document.getElementById("marf-rewards-overlay")) {
        close();
        document.removeEventListener("keydown", esc);
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", openPopup, {once:true});
  else openPopup();
})();