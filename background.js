
const CLOUDFLARE_GATEWAY_URL = "https://audit.greenbatch.xyz/log-api";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[CaseAudit] Фоновый сервис мониторинга успешно установлен.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "log_opening") {
    const payload = request.data;
    const hostname = payload.site;

    let storageKey = "";
    if (hostname.includes("case-battle") || hostname.includes("casebattle")) storageKey = "id_casebattle";
    else if (hostname.includes("mycs2")) storageKey = "id_mycs2";
    else if (hostname.includes("easydrop")) storageKey = "id_easydrop";

    if (storageKey) {
      chrome.storage.local.get([storageKey], (res) => {
        const userId = res[storageKey] || null;
        sendDataToGateway(payload, userId);
      });
    } else {
      sendDataToGateway(payload, null);
    }
  }
  return true;
});


function sendDataToGateway(payload, userId) {
  let siteName = "unknown";
  if (payload.site.includes("case-battle") || payload.site.includes("casebattle")) siteName = "case-battle";
  else if (payload.site.includes("mycs2")) siteName = "mycs2";
  else if (payload.site.includes("easydrop")) siteName = "easydrop";

  const dbRow = {
    site: siteName,
    type: payload.type,
    item_name: payload.item_name || "unknown",
    spent: parseFloat(payload.spent),
    won: parseFloat(payload.won),
    rtp: parseFloat(payload.rtp),
    user_id: userId
  };

  fetch(CLOUDFLARE_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Signature": "$argon2id$v=19$m=65536,t=3,p=4$bXlzYWx0MTIzNDU2Nzg$OEVmNXA3Q3Y5a013TnpRUFJZU0RhUT09"
    },
    body: JSON.stringify(dbRow)
  })
  .then(res => {
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    console.log(`[CaseAudit GW] Транзакция [${dbRow.type}] успешно отправлена на шлюз.`);
  })
  .catch(err => {
    console.error("[CaseAudit GW ERROR] Ошибка отправки на шлюз:", err);
  });
}