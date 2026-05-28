window.CaseAuditAdapters = window.CaseAuditAdapters || {};

window.CaseAuditAdapters["case-battle"] = {
  domains: ["case-battle", "casebattle"],
  
  
  isUpgradePage: () => {
    return !!document.querySelector(".upgrade-button-wrapper") || window.location.pathname.includes("/upgrade");
  },

  
  isCasePage: () => {
    return window.location.pathname.includes("/case/") || window.location.pathname.includes("/case");
  },
  
  
  upgradeButtonText: "ПРОКАЧАТЬ",
  
  
  getUpgradeSpentPrice: () => {
    
    const multiFooter = document.querySelector(".m-footer");
    if (multiFooter && (multiFooter.textContent.includes("Общая") || multiFooter.textContent.includes("сумма"))) {
      const currencyEl = multiFooter.querySelector(".__currency");
      if (currencyEl) return parseFloat(currencyEl.textContent.trim().replace(",", "."));
    }

    
    const leftContainer = document.querySelector(".selected-drops-wrapper");
    if (leftContainer) {
      const currencyEl = leftContainer.querySelector(".__currency");
      if (currencyEl) return parseFloat(currencyEl.textContent.trim().replace(",", "."));
      
      const text = leftContainer.textContent || "";
      const match = text.match(/(\d+(?:[.,]\d+)?)\s*₽/);
      if (match) return parseFloat(match[1].replace(",", "."));
    }
    return 0;
  },
  
  
  getUpgradeTargetPrice: () => {
    const targetContainer = document.querySelector(".selected-holder.target-bg");
    if (targetContainer) {
      const currencyEl = targetContainer.querySelector(".__currency");
      if (currencyEl) return parseFloat(currencyEl.textContent.trim().replace(",", "."));
      
      const text = targetContainer.textContent || "";
      const match = text.match(/(\d+(?:[.,]\d+)?)\s*₽/);
      if (match) return parseFloat(match[1].replace(",", "."));
    }
    return 0;
  },
  
  
  parseCaseOpenClick: (btn, text) => {
    const isNormalOpen = btn.getAttribute("data-action") === "open" || text.includes("Открыть за");
    const isQuickOpen = text.includes("быстро за") || btn.querySelector(".icon-flash-gradient");

    if (isNormalOpen || isQuickOpen) {
      const match = text.match(/(\d+(?:[.,]\d+)?)\s*₽/);
      if (match) {
        return parseFloat(match[1].replace(",", "."));
      }
    }
    return null;
  },
  
  
  parseCaseResult: (node) => {
    const controls = node.querySelector(".bottom-controls") || (node.classList?.contains("bottom-controls") ? node : null);
    if (controls) {
      const currencyEl = controls.querySelector(".__currency");
      if (currencyEl) {
        return parseFloat(currencyEl.textContent.trim().replace(",", "."));
      }
    }
    return null;
  },
  
  getCaseName: () => {
    const el = document.querySelector(".page-title, h1.page-title");
    if (el) {
      return el.textContent.trim().replace(/[«»"']/g, "");
    }
    return "unknown";
  },
  
  
  detectUpgradeResult: () => {
    const resultH1 = document.querySelector(".chance-preview h1");
    if (resultH1) {
      const previewEl = resultH1.closest(".chance-preview");
      if (previewEl) {
        const isLoss = previewEl.classList.contains("loss");
        return {
          isLoss: isLoss,
          isSuccess: !isLoss
        };
      }
    }
    return null;
  }
};