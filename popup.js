document.addEventListener("DOMContentLoaded", () => {
  const fields = {
    "casebattle": document.getElementById("id-casebattle"),
    "mycs2": document.getElementById("id-mycs2"),
    "easydrop": document.getElementById("id-easydrop")
  };
  const warningEl = document.getElementById("personal-warning");

  
  chrome.storage.local.get(["id_casebattle", "id_mycs2", "id_easydrop"], (res) => {
    fields.casebattle.value = res.id_casebattle || "";
    fields.mycs2.value = res.id_mycs2 || "";
    fields.easydrop.value = res.id_easydrop || "";
    updateWarning();
  });

  
  Object.keys(fields).forEach(key => {
    fields[key].addEventListener("input", () => {
      const val = fields[key].value.trim();
      chrome.storage.local.set({ [`id_${key}`]: val }, () => {
        updateWarning();
      });
    });
  });

  function updateWarning() {
    const cb = fields.casebattle.value.trim();
    const my = fields.mycs2.value.trim();
    const ed = fields.easydrop.value.trim();
    
    if (cb && my && ed) {
      warningEl.innerText = "Все ID определены. Синхронизация личной статистики активна.";
      warningEl.style.color = "#10b981";
      warningEl.style.borderTopColor = "rgba(16, 185, 129, 0.2)";
    } else {
      warningEl.innerText = "Внимание: если ID не указан, вы не сможете получать личную статистику открытий в будущем.";
      warningEl.style.color = "#fbbf24";
      warningEl.style.borderTopColor = "rgba(251, 191, 36, 0.2)";
    }
  }
});