(function() {
  const ADAPTERS = window.CaseAuditAdapters || {};
  const hostname = window.location.hostname;
  let activeAdapter = null;

  for (const key in ADAPTERS) {
    const adapter = ADAPTERS[key];
    if (adapter.domains.some(domain => hostname.includes(domain))) {
      activeAdapter = adapter;
      console.log(`[CaseAudit Engine] Успешно подключен внешний модуль парсинга: [${key}]`);
      break;
    }
  }

  if (!activeAdapter) {
    console.warn("[CaseAudit Engine] Для данного домена не найден совместимый модуль аудита:", hostname);
    return;
  }

  
  const isCaseBattle = activeAdapter.domains.includes("case-battle") || activeAdapter.domains.includes("casebattle");

  
  let activeUserId = "---";
  let idStorageKey = "";
  if (isCaseBattle) idStorageKey = "id_casebattle";
  else if (hostname.includes("mycs2")) idStorageKey = "id_mycs2";
  else if (hostname.includes("easydrop")) idStorageKey = "id_easydrop";

  function loadUserId() {
    if (idStorageKey) {
      chrome.storage.local.get([idStorageKey], (res) => {
        activeUserId = res[idStorageKey] || "---";
      });
    }
  }
  loadUserId();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && idStorageKey && changes[idStorageKey]) {
      activeUserId = changes[idStorageKey].newValue || "---";
    }
  });

  
  let casesCount = 0;
  let casesSpent = 0;
  let casesWon = 0;

  let upgradesCount = 0;
  let upgradesSpent = 0;
  let upgradesWon = 0;

  let lastSpentPrice = null;
  let lastActionType = null;
  let lastLoggedTimestamp = 0;

  let lastUpgradeSpentCached = 0;
  let lastUpgradeTargetCached = 0;

  
  let lastCaseSpentCached = 0;
  let lastCaseNameCached = "unknown"; 
  window.isCaseLocked = false;
  window.isCaseSpinning = false;
  let caseSpinningTimestamp = 0;

  window.isUpgradeLocked = false;
  window.isUpgradeSpinning = false;

  const widget = document.createElement("div");
  widget.className = "ca-audit-widget";
  widget.innerHTML = `
    <div class="ca-header">
      <span class="ca-title">CASEAUDIT.IO v1.2</span>
      <div class="ca-status">
        <div id="ca-status-pulse" class="ca-pulse"></div>
        <span id="ca-status-text">AUDITING ACTIVE</span>
      </div>
    </div>
    <div class="ca-stats" style="display: flex; flex-direction: column; gap: 6px;">
      
      <!-- СТРОКА ОТОБРАЖЕНИЯ ID АУДИТОРА -->
      <div class="ca-stat-row" style="border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 2px;">
        <span>Аудитор ID:</span>
        <span id="ca-stat-user-id" class="ca-stat-val" style="color: #fbbf24;">---</span>
      </div>

      <!-- БЛОК СТАТИСТИКИ КЕЙСОВ -->
      <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
        <div class="ca-stat-row" style="color: #60a5fa; font-weight: bold; font-size: 9px; margin-bottom: 2px;">КЕЙСЫ:</div>
        <div class="ca-stat-row">
          <span>Кол-во открытий:</span>
          <span id="ca-stat-cases-count" class="ca-stat-val">0</span>
        </div>
        <div class="ca-stat-row">
          <span>Потрачено всего:</span>
          <span id="ca-stat-cases-spent" class="ca-stat-val">0.00 ₽</span>
        </div>
        <div class="ca-stat-row">
          <span>Выпало дропа:</span>
          <span id="ca-stat-cases-won" class="ca-stat-val">0.00 ₽</span>
        </div>
        <div class="ca-stat-row">
          <span>RTP кейсов:</span>
          <span id="ca-stat-cases-rtp" class="ca-stat-val" style="color: #f43f5e;">0%</span>
        </div>
      </div>

      <!-- БЛОК СТАТИСТИКИ АПГРЕЙДОВ -->
      <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
        <div class="ca-stat-row" style="color: #fbbf24; font-weight: bold; font-size: 9px; margin-bottom: 2px;">АПГРЕЙДЫ:</div>
        <div class="ca-stat-row">
          <span>Кол-во попыток:</span>
          <span id="ca-stat-upgrades-count" class="ca-stat-val">0</span>
        </div>
        <div class="ca-stat-row">
          <span>Потрачено всего:</span>
          <span id="ca-stat-upgrades-spent" class="ca-stat-val">0.00 ₽</span>
        </div>
        <div class="ca-stat-row">
          <span>Выпало дропа:</span>
          <span id="ca-stat-upgrades-won" class="ca-stat-val">0.00 ₽</span>
        </div>
        <div class="ca-stat-row">
          <span>RTP апгрейдов:</span>
          <span id="ca-stat-upgrades-rtp" class="ca-stat-val" style="color: #f43f5e;">0%</span>
        </div>
      </div>
      
      <!-- ДИНАМИЧЕСКИЕ ИНТЕРАКТИВНЫЕ СТРОКИ -->
      <div id="ca-stat-case-row" class="ca-stat-row" style="display: none; border-top: 1px dashed rgba(244,63,94,0.2); padding-top: 4px; margin-top: 2px; flex-direction: column; gap: 2px;">
        <div class="ca-stat-row" style="justify-content: space-between; width: 100%;">
          <span id="ca-stat-case-label" style="color: #fbbf24;">Цена кейса:</span>
          <span id="ca-stat-current-case" class="ca-stat-val" style="color: #ffffff;">0 ₽</span>
        </div>
      </div>

      <div id="ca-stat-upgrade-row" class="ca-stat-row" style="display: none; border-top: 1px dashed rgba(244,63,94,0.2); padding-top: 4px; margin-top: 2px; flex-direction: column; gap: 2px;">
        <div class="ca-stat-row" style="justify-content: space-between; width: 100%;">
          <span id="ca-stat-upgrade-label" style="color: #fbbf24;">На апгрейд:</span>
          <span id="ca-stat-current-upgrade" class="ca-stat-val" style="color: #fbbf24;">0 ₽</span>
        </div>
        <div id="ca-stat-target-subrow" class="ca-stat-row" style="justify-content: space-between; width: 100%;">
          <span id="ca-stat-target-label" style="color: #60a5fa;">Можно выиграть:</span>
          <span id="ca-stat-current-target" class="ca-stat-val" style="color: #60a5fa;">0 ₽</span>
        </div>
      </div>
      
      <!-- ОБЩИЙ СУММАРНЫЙ ИТОГ СЕССИИ -->
      <div class="ca-stat-row" style="border-top: 1px solid rgba(255,255,255,0.15); padding-top: 4px; margin-top: 2px;">
        <span style="font-weight: bold; color: #ffffff;">ОБЩИЙ RTP СЕССИИ:</span>
        <span id="ca-stat-rtp" class="ca-stat-val" style="color: #f43f5e; font-weight: bold;">0%</span>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  chrome.storage.local.get(["widget_top", "widget_left"], (result) => {
    if (result.widget_top && result.widget_left) {
      widget.style.top = result.widget_top;
      widget.style.left = result.widget_left;
      widget.style.bottom = "auto";
      widget.style.right = "auto";
    } else {
      widget.style.bottom = "90px";
      widget.style.right = "20px";
    }
  });

  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  const header = widget.querySelector(".ca-header");

  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = widget.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    startX = e.clientX;
    startY = e.clientY;

    widget.style.top = `${initialTop}px`;
    widget.style.left = `${initialLeft}px`;
    widget.style.bottom = "auto";
    widget.style.right = "auto";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    widget.style.left = `${initialLeft + dx}px`;
    widget.style.top = `${initialTop + dy}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    chrome.storage.local.set({
      widget_top: widget.style.top,
      widget_left: widget.style.left
    });
  });

  function updateWidget() {
    
    const idEl = document.getElementById("ca-stat-user-id");
    if (idEl) {
      idEl.innerText = activeUserId;
      idEl.style.color = activeUserId !== "---" ? "#10b981" : "#fbbf24";
    }

    
    document.getElementById("ca-stat-cases-count").innerText = casesCount;
    document.getElementById("ca-stat-cases-spent").innerText = `${casesSpent.toFixed(2)} ₽`;
    document.getElementById("ca-stat-cases-won").innerText = `${casesWon.toFixed(2)} ₽`;
    const casesRtp = casesSpent > 0 ? Math.round((casesWon / casesSpent) * 100) : 0;
    const casesRtpEl = document.getElementById("ca-stat-cases-rtp");
    casesRtpEl.innerText = `${casesRtp}%`;
    casesRtpEl.style.color = casesRtp > 45 ? "#10b981" : "#f43f5e";

    
    document.getElementById("ca-stat-upgrades-count").innerText = upgradesCount;
    document.getElementById("ca-stat-upgrades-spent").innerText = `${upgradesSpent.toFixed(2)} ₽`;
    document.getElementById("ca-stat-upgrades-won").innerText = `${upgradesWon.toFixed(2)} ₽`;
    const upgradesRtp = upgradesSpent > 0 ? Math.round((upgradesWon / upgradesSpent) * 100) : 0;
    const upgradesRtpEl = document.getElementById("ca-stat-upgrades-rtp");
    upgradesRtpEl.innerText = `${upgradesRtp}%`;
    upgradesRtpEl.style.color = upgradesRtp > 45 ? "#10b981" : "#f43f5e";

    
    const totalSpent = casesSpent + upgradesSpent;
    const totalWon = casesWon + upgradesWon;
    const totalRtp = totalSpent > 0 ? Math.round((totalWon / totalSpent) * 100) : 0;
    const totalRtpEl = document.getElementById("ca-stat-rtp");
    totalRtpEl.innerText = `${totalRtp}%`;
    totalRtpEl.style.color = totalRtp > 45 ? "#10b981" : "#f43f5e";

    const statusText = document.getElementById("ca-status-text");
    const statusPulse = document.getElementById("ca-status-pulse");

    if (window.isUpgradeSpinning) {
      statusText.innerText = "КРУТКА КРУТИТСЯ...";
      statusText.style.color = "#fbbf24";
      statusPulse.style.backgroundColor = "#fbbf24";
    } else if (window.isCaseSpinning) {
      statusText.innerText = "ОТКРЫВАЕМ КЕЙС...";
      statusText.style.color = "#fbbf24";
      statusPulse.style.backgroundColor = "#fbbf24";
    } else {
      statusText.innerText = "AUDITING ACTIVE";
      statusText.style.color = "#10b981";
      statusPulse.style.backgroundColor = "#10b981";
    }

    const isCasePage = activeAdapter.isCasePage ? activeAdapter.isCasePage() : false;
    const caseRow = document.getElementById("ca-stat-case-row");
    const caseLabel = document.getElementById("ca-stat-case-label");
    const caseVal = document.getElementById("ca-stat-current-case");

    if (isCasePage) {
      caseRow.style.display = "flex";
      if (window.isCaseLocked && lastCaseSpentCached > 0) {
        caseLabel.innerText = window.isCaseSpinning ? "КРУТКА КЕЙСА:" : "ФИКС ЦЕНА КЕЙСА:";
        caseLabel.style.color = window.isCaseSpinning ? "#fbbf24" : "#10b981";
        caseVal.innerText = `${lastCaseSpentCached} ₽`;
        caseVal.style.color = window.isCaseSpinning ? "#fbbf24" : "#10b981";
      } else {
        caseLabel.innerText = "Цена кейса:";
        caseLabel.style.color = "#a1a1aa";
        const openBtn = document.querySelector("[action='openCase'], .btn-open-case, [data-action='open'], .js-btn-open-case, .js-btn-open-case-fast");
        let currentPrice = 0;
        if (openBtn) {
          currentPrice = activeAdapter.parseCaseOpenClick(openBtn, openBtn.innerText || openBtn.textContent || "") || 0;
        }
        caseVal.innerText = currentPrice > 0 ? `${currentPrice} ₽` : "---";
        caseVal.style.color = "#ffffff";
      }
    } else {
      caseRow.style.display = "none";
    }

    const isUpgradePage = activeAdapter.isUpgradePage();
    const upgradeRow = document.getElementById("ca-stat-upgrade-row");
    const upgradeLabel = document.getElementById("ca-stat-upgrade-label");
    const upgradeVal = document.getElementById("ca-stat-current-upgrade");
    const targetLabel = document.getElementById("ca-stat-target-label");
    const targetVal = document.getElementById("ca-stat-current-target");

    if (isUpgradePage) {
      upgradeRow.style.display = "flex";
      if (window.isUpgradeLocked && lastUpgradeSpentCached > 0) {
        upgradeLabel.innerText = "ЗАФИКСИРОВАНО:";
        upgradeLabel.style.color = "#10b981";
        upgradeVal.innerText = `${lastUpgradeSpentCached} ₽`;
        upgradeVal.style.color = "#10b981";

        targetLabel.innerText = "ФИКС ВЫИГРЫШ:";
        targetLabel.style.color = "#10b981";
        targetVal.innerText = `${lastUpgradeTargetCached} ₽`;
        targetVal.style.color = "#10b981";
      } else {
        upgradeLabel.innerText = "На апгрейд:";
        upgradeLabel.style.color = "#fbbf24";
        const currentSpent = activeAdapter.getUpgradeSpentPrice();
        upgradeVal.innerText = `${currentSpent} ₽`;
        upgradeVal.style.color = "#fbbf24";

        targetLabel.innerText = "Можно выиграть:";
        targetLabel.style.color = "#60a5fa";
        const currentTarget = activeAdapter.getUpgradeTargetPrice();
        targetVal.innerText = `${currentTarget} ₽`;
        targetVal.style.color = "#60a5fa";
      }
    } else {
      upgradeRow.style.display = "none";
    }
  }

  
  window.handleAuditEvent = function(type, spent, won) {
    const now = Date.now();
    if (now - lastLoggedTimestamp < 1500) return;
    lastLoggedTimestamp = now;

    if (type === "case") {
      casesCount += 1;
      casesSpent += spent;
      casesWon += won;
    } else if (type === "upgrade") {
      upgradesCount += 1;
      upgradesSpent += spent;
      upgradesWon += won;
    }

    updateWidget();

    
    let itemName = "upgrade";
    if (type === "case") {
      if (lastCaseNameCached !== "unknown") {
        itemName = lastCaseNameCached;
      } else if (activeAdapter.getCaseName) {
        itemName = activeAdapter.getCaseName();
      }
    }
    
    lastCaseNameCached = "unknown";

    console.log(`[CaseAudit Лог] Зафиксировано (${type === "case" ? "Кейс" : "Апгрейд"})! Траты: ${spent} ₽ | Выигрыш: ${won} ₽ | RTP: ${Math.round((won / spent) * 100)}%`);

    chrome.runtime.sendMessage({
      action: "log_opening",
      data: {
        timestamp: new Date().toISOString(),
        site: window.location.hostname,
        type: type, 
        item_name: itemName,
        spent: spent,
        won: won,
        rtp: Math.round((won / spent) * 100)
      }
    });
  };

  
  window.handleCaseOpenEvent = function(spent, won) {
    window.handleAuditEvent("case", spent, won);
  };

  document.addEventListener("mouseover", (e) => {
    if (window.isUpgradeSpinning || window.isCaseSpinning) return;

    const btn = e.target.closest("button, [action], .btn, [data-action]");
    if (!btn) return;
    const text = btn.innerText || btn.textContent || "";
    
    if (text.toLowerCase().includes(activeAdapter.upgradeButtonText.toLowerCase())) {
      const isBtnDisabled = btn.hasAttribute("disabled") || btn.disabled || btn.classList.contains("disabled");
      if (isBtnDisabled) {
        window.isUpgradeLocked = false;
        return;
      }
      const currentSpent = activeAdapter.getUpgradeSpentPrice();
      const currentTarget = activeAdapter.getUpgradeTargetPrice();
      if (currentSpent > 0 && currentTarget > 0) {
        lastUpgradeSpentCached = currentSpent;
        lastUpgradeTargetCached = currentTarget;
        window.isUpgradeLocked = true;
      }
    }

    
    if (!isCaseBattle && activeAdapter.isCasePage && activeAdapter.isCasePage()) {
      const casePrice = activeAdapter.parseCaseOpenClick(btn, text);
      if (casePrice !== null && casePrice > 0) {
        lastCaseSpentCached = casePrice;
        window.isCaseLocked = true;
        
        
        if (activeAdapter.getCaseName) {
          lastCaseNameCached = activeAdapter.getCaseName();
        }
      }
    }
  });

  document.addEventListener("mousedown", (e) => {
    const btn = e.target.closest("button, [action], .btn, [data-action]");
    if (!btn) return;
    const text = btn.innerText || btn.textContent || "";
    
    if (text.toLowerCase().includes(activeAdapter.upgradeButtonText.toLowerCase())) {
      const isBtnDisabled = btn.hasAttribute("disabled") || btn.disabled || btn.classList.contains("disabled");
      if (isBtnDisabled) {
        window.isUpgradeLocked = false;
        window.isUpgradeSpinning = false;
        return;
      }
      const currentSpent = activeAdapter.getUpgradeSpentPrice();
      const currentTarget = activeAdapter.getUpgradeTargetPrice();
      if (currentSpent > 0 && currentTarget > 0) {
        lastUpgradeSpentCached = currentSpent;
        lastUpgradeTargetCached = currentTarget;
        window.isUpgradeLocked = true;
        window.isUpgradeSpinning = true;
        console.log("[CaseAudit LOCK] Кнопка апгрейда зажата. Заблокировано:", currentSpent, "₽ | Цель:", currentTarget, "₽");
      }
    }

    
    if (!isCaseBattle && activeAdapter.isCasePage && activeAdapter.isCasePage()) {
      const casePrice = activeAdapter.parseCaseOpenClick(btn, text);
      if (casePrice !== null && casePrice > 0) {
        lastCaseSpentCached = casePrice;
        window.isCaseLocked = true;
        window.isCaseSpinning = true;
        caseSpinningTimestamp = Date.now();
        
        
        if (activeAdapter.getCaseName) {
          lastCaseNameCached = activeAdapter.getCaseName();
        }
        console.log("[CaseAudit LOCK] Запущен таймер ожидания дропа. Списано:", casePrice, "₽");
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (window.isUpgradeSpinning || window.isCaseSpinning) return;

    const btn = e.target.closest("button, [action], .btn, [data-action]");
    
    if (btn) {
      const text = btn.innerText || btn.textContent || "";
      if (!text.toLowerCase().includes(activeAdapter.upgradeButtonText.toLowerCase())) {
        window.isUpgradeLocked = false;
      }
      if (!isCaseBattle && activeAdapter.isCasePage && activeAdapter.isCasePage()) {
        const casePrice = activeAdapter.parseCaseOpenClick(btn, text);
        if (casePrice === null) {
          window.isCaseLocked = false;
        }
      }
    } else {
      window.isUpgradeLocked = false;
      window.isCaseLocked = false;
    }

    if (!btn) return;
    const text = btn.innerText || btn.textContent || "";

    
    if (isCaseBattle) {
      const casePrice = activeAdapter.parseCaseOpenClick(btn, text);
      if (casePrice !== null) {
        lastSpentPrice = casePrice;
        lastActionType = "case_open";
        console.log("[CaseAudit] Фиксация покупки кейса через адаптер. Цена:", casePrice, "₽");
      }
    }
  });

  const observer = new MutationObserver((mutations) => {
    if (activeAdapter.getUpgradeSpentPrice) {
      const currentSpent = activeAdapter.getUpgradeSpentPrice();
      const currentTarget = activeAdapter.getUpgradeTargetPrice ? activeAdapter.getUpgradeTargetPrice() : 0;
      
      if (currentSpent > 0) {
        lastUpgradeSpentCached = currentSpent;
      }
      if (currentTarget > 0) {
        lastUpgradeTargetCached = currentTarget;
      }
    }

    if (window.isUpgradeSpinning && activeAdapter.detectUpgradeResult) {
      const upgradeResult = activeAdapter.detectUpgradeResult();
      if (upgradeResult) {
        analyzeUpgradeOutcome(upgradeResult.isLoss, upgradeResult.isSuccess);
      }
    }

    
    if (isCaseBattle) {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!node.querySelector) continue;

          if (activeAdapter.parseCaseResult) {
            const wonPrice = activeAdapter.parseCaseResult(node);
            if (wonPrice !== null && lastSpentPrice && lastActionType === "case_open") {
              window.handleAuditEvent("case", lastSpentPrice, wonPrice);
              lastSpentPrice = null;
              lastActionType = null;
            }
          }
        }
      }
    }
  });

  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: true
  });

  setInterval(() => {
    updateWidget();

    
    if (!isCaseBattle && window.isCaseSpinning && activeAdapter.isCasePage && activeAdapter.isCasePage()) {
      const now = Date.now();
      
      if (now - caseSpinningTimestamp > 20000) {
        console.warn("[CaseAudit TIMEOUT] Превышено время ожидания дропа (20с). Очистка буфера.");
        window.isCaseSpinning = false;
        window.isCaseLocked = false;
        lastCaseSpentCached = 0;
        return;
      }

      if (now - caseSpinningTimestamp < 500) {
        return;
      }

      if (activeAdapter.parseCaseResult) {
        const wonPrice = activeAdapter.parseCaseResult(document.body);
        if (wonPrice !== null && wonPrice > 0 && lastCaseSpentCached > 0) {
          const spent = lastCaseSpentCached;
          window.handleAuditEvent("case", spent, wonPrice);
          
          window.isCaseSpinning = false;
          window.isCaseLocked = false;
          lastCaseSpentCached = 0;
        }
      }
    }
  }, 200);

  function analyzeUpgradeOutcome(isLoss, isSuccess) {
    if (isLoss || isSuccess) {
      const spent = lastUpgradeSpentCached;
      const target = lastUpgradeTargetCached;
      const won = isSuccess ? target : 0;

      if (spent > 0) {
        console.log(`[CaseAudit] Обнаружен Апгрейд. Затраты: ${spent} ₽ | Итог: ${isSuccess ? "ПОБЕДА" : "ПОРАЖЕНИЕ"} (${won} ₽)`);
        window.handleAuditEvent("upgrade", spent, won);
        
        lastUpgradeSpentCached = 0;
        lastUpgradeTargetCached = 0;
        window.isUpgradeLocked = false;
        window.isUpgradeSpinning = false;
      } else {
        console.warn("[CaseAudit Предупреждение] Результат апгрейда зафиксирован, но заблокированная сумма трат равна 0.");
      }
    }
  }

})();