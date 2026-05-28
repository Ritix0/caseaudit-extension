window.CaseAuditAdapters = window.CaseAuditAdapters || {};

window.CaseAuditAdapters["mycs2"] = {
  domains: ["mycs2.in", "mycs2"],
  
  
  isUpgradePage: () => {
    return !!document.querySelector(".upgrade-wheel__wheel") || window.location.pathname.includes("/upgrade");
  },

  
  isCasePage: () => {
    return window.location.pathname.includes("/case/");
  },
  
  
  upgradeButtonText: "Апгрейд",
  
  
  getUpgradeSpentPrice: () => {
    const priceEl = document.querySelector(".upgrade-wheel__balance-in-upgrade-price .price-RUB");
    if (priceEl) {
      return parseFloat(priceEl.textContent.trim().replace(",", "."));
    }
    return 0;
  },
  
  
  getCaseName: () => {
    const el = document.querySelector(".title__title");
    if (el) {
      return el.textContent.trim();
    }
    
    const match = window.location.pathname.match(/\/case\/([^/]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return "unknown";
  },
  
  getUpgradeTargetPrice: () => {
    const priceEl = document.querySelector(".upgrade-to-bar__price, .js-upgrade-skin-to .price-RUB");
    if (priceEl) {
      const text = priceEl.textContent.trim().replace(",", ".");
      const match = text.match(/(\d+(?:[.,]\d+)?)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return 0;
  },
  
  
  parseCaseOpenClick: (btn, text) => {
    const isNormalOpen = btn.getAttribute("action") === "openCase" || btn.classList.contains("btn-open-case") || text.includes("Открыть за");
    if (isNormalOpen) {
      const priceEl = btn.querySelector(".price-RUB");
      if (priceEl) {
        return parseFloat(priceEl.textContent.trim().replace(",", "."));
      }
      const match = text.match(/(\d+(?:[.,]\d+)?)/);
      if (match) {
        return parseFloat(match[1].replace(",", "."));
      }
    }
    return null;
  },
  
  
  parseCaseResult: (node) => {
    const elements = Array.from(node.querySelectorAll ? node.querySelectorAll("button, [action], .btn, .action") : []);
    
    const sellBtn = elements.find(el => {
      const actionAttr = el.getAttribute("action");
      const text = el.textContent || "";
      return (actionAttr === "sell-items" || actionAttr === "sellDrop" || text.includes("Продать за"));
    });
    
    if (sellBtn) {
      const priceEl = sellBtn.querySelector("[class*='price']");
      if (priceEl) {
        const text = priceEl.textContent.trim().replace(",", ".");
        const match = text.match(/(\d+(?:[.,]\d+)?)/);
        if (match) {
          return parseFloat(match[1]);
        }
      }
      
      const btnText = sellBtn.textContent.trim().replace(",", ".");
      const match = btnText.match(/Продать за\s*(\d+(?:[.,]\d+)?)/i);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  },
  
  
  detectUpgradeResult: () => {
    const successBtn = document.querySelector("[action='sellDrop'], .upgrade-to-bar__sell-btn");
    if (successBtn) {
      return {
        isLoss: false,
        isSuccess: true
      };
    }

    const failEl = document.querySelector(".upgrade-wheel__title_fail");
    if (failEl && failEl.textContent.includes("Неудача")) {
      return {
        isLoss: true,
        isSuccess: false
      };
    }
    return null;
  }
};