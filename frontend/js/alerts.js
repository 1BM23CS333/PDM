ensureAuth();

const alertPanel = document.getElementById("alertPanel");
const alertList = document.getElementById("alertList");
const toast = document.getElementById("toast");

function toggleAlerts(){
  alertPanel.classList.toggle("open");
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(()=> toast.classList.remove("show"), 3500);
}

async function fetchAlerts(){
  const res = await fetch(`${API_BASE}/machines/all`, { headers: authHeader() });
  const machines = await res.json();

  let alerts = [];

  machines.forEach(m => {
    if((m.failureProbability || 0) >= 70){
      alerts.push(`⚠ High failure probability detected in ${m.name}`);
    }
    (m.parameters || []).forEach(p => {
      const usage = (p.current / p.critical) * 100;
      if(usage >= 90){
        alerts.push(`🔥 ${p.parameter} is critical in ${m.name}`);
      }
    });
  });

  alertList.innerHTML = alerts.length
    ? alerts.map(a => `<div class="alert-item">${a}</div>`).join("")
    : `<p style="color:#7a8697;">No active alerts</p>`;

  // Trigger pop-up for new alerts
  if(window.lastAlertCount !== undefined && alerts.length > window.lastAlertCount){
    showToast("🚨 New critical alert detected!");
  }
  window.lastAlertCount = alerts.length;
}

// Refresh every 10 seconds
setInterval(fetchAlerts, 10000);
fetchAlerts();
