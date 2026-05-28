window.CaseAuditAdapters = window.CaseAuditAdapters || {};

window.CaseAuditAdapters["easydrop"] = {
  domains: ["easydrop"],
  
  
  isUpgradePage: () => {
    return !!document.querySelector(".js-run-upgrade") || window.location.pathname.includes("/upgrade");
  },

  
  isCasePage: () => {
    return window.location.pathname.includes("/case/") || window.location.pathname.includes("/case");
  },
  
  
  upgradeButtonText: "Апгрейд",
  
  
  getUpgradeSpentPrice: () => {
    
    const activeItems = Array.from(document.querySelectorAll(".upgrade-drop-preview__info"))
      .filter(el => el.querySelector(".upgrade-drop-preview__item-price"));
      
    if (activeItems.length > 0) {
      
      const priceEl = activeItems[0].querySelector(".upgrade-drop-preview__item-price, .price-RUB");
      if (priceEl) {
        const text = priceEl.textContent.trim().replace(",", ".");
        const match = text.match(/(\d+(?:[.,]\d+)?)/);
        if (match) return parseFloat(match[1]);
      }
    }
    return 0;
  },
  
  
  getUpgradeTargetPrice: () => {
    const activeItems = Array.from(document.querySelectorAll(".upgrade-drop-preview__info"))
      .filter(el => el.querySelector(".upgrade-drop-preview__item-price"));
      
    
    if (activeItems.length > 1) {
      
      const priceEl = activeItems[1].querySelector(".upgrade-drop-preview__item-price, .price-RUB");
      if (priceEl) {
        const text = priceEl.textContent.trim().replace(",", ".");
        const match = text.match(/(\d+(?:[.,]\d+)?)/);
        if (match) return parseFloat(match[1]);
      }
    }
    return 0;
  },
  
  parseCaseOpenClick: (btn, text) => {
    const isNormalOpen = btn.classList.contains("js-btn-open-case") || btn.classList.contains("js-btn-open-case-fast") || btn.closest(".js-btn-open-case") || btn.closest(".js-btn-open-case-fast");
    
    if (isNormalOpen) {
      
      const activeMultiplier = document.querySelector(".farmcase-picker__btn.farmcase-amount.active");
      if (activeMultiplier) {
        const priceEl = activeMultiplier.querySelector(".price-RUB, .price, [class*='price']");
        if (priceEl) {
          const pText = priceEl.textContent.trim().replace(",", ".");
          const match = pText.match(/(\d+(?:[.,]\d+)?)/);
          if (match) return parseFloat(match[1]);
        }
      }

      
      const actionsBlock = btn.closest(".case-actions") || document;
      const priceEl = actionsBlock.querySelector(".case-actions__price, .price-RUB, [class*='price']");
      if (priceEl) {
        const pText = priceEl.textContent.trim().replace(",", ".");
        const match = pText.match(/(\d+(?:[.,]\d+)?)/);
        if (match) {
          return parseFloat(match[1]);
        }
      }
    }
    return null;
  },
  
  
  parseCaseResult: (node) => {
    const sellBtn = node.querySelector ? node.querySelector(".btn-sell-item, .btn-sell-items, [class*='btn-sell-item']") : null;
    if (sellBtn) {
      const priceEl = sellBtn.querySelector(".price-RUB, [class*='price']");
      if (priceEl) {
        const text = priceEl.textContent.trim().replace(",", ".");
        const match = text.match(/(\d+(?:[.,]\d+)?)/);
        if (match) return parseFloat(match[1]);
      }
      
      const btnText = sellBtn.textContent.trim().replace(",", ".");
      const match = btnText.match(/(?:Продать|Продать всё)\s*за\s*(\d+(?:[.,]\d+)?)/i);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  },

  
  getCaseName: () => {
    const el = document.querySelector(".main-title__inner");
    if (el) {
      return el.textContent.trim();
    }
    return "unknown";
  },
  
  
  detectUpgradeResult: () => {
    const successBadge = document.querySelector(".upgrade-status-badge_success");
    if (successBadge) {
      return {
        isLoss: false,
        isSuccess: true
      };
    }
    
    const failedBadge = document.querySelector(".upgrade-status-badge_failed");
    if (failedBadge) {
      return {
        isLoss: true,
        isSuccess: false
      };
    }
    return null;
  }
};