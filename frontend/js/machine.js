if(!localStorage.getItem("token")) location.href = "index.html";
ensureAuth();

const params = new URLSearchParams(location.search);
const id = params.get("id");
if(!id){ alert("No machine id"); location.href="dashboard.html"; }

let chart;

async function loadMachine(){
  const res = await fetch(`${API_BASE}/machines/${id}`, { headers: authHeader() });
  const m = await res.json();

  document.getElementById("machineTitle").textContent = m.name;
  document.getElementById("currentFail").textContent = (m.failureProbability ?? "--") + "%";
  document.getElementById("overallHealth").textContent = (m.overallHealth ?? "--") + "%";

  const fb = document.getElementById("failBadge");
  fb.className = "badge " + ((m.failureProbability>=70) ? "crit" : (m.failureProbability>=50 ? "warn" : "ok"));
  fb.textContent = (m.failureProbability>=70) ? "Critical" : (m.failureProbability>=50 ? "Warning" : "Normal");

  // Critical panel
  const cp = document.getElementById("criticalPanel");
  if(m.mostCritical){
    const u = (m.mostCritical.current / m.mostCritical.critical) * 100;
    cp.innerHTML = `
      <div class="tag">Weighted risk score: <b style="color:#fff">${m.mostCritical.score.toFixed(1)}</b></div>
      <p style="margin-top:10px;">Parameter <b>${m.mostCritical.parameter}</b> is at <b>${u.toFixed(1)}%</b> of its limit (${m.mostCritical.current}/${m.mostCritical.critical} ${m.mostCritical.unit}).</p>
    `;
  } else {
    cp.textContent = "No critical parameter.";
  }

  // Table
  const table = document.getElementById("paramTable");
  table.innerHTML = `
    <tr><th>Parameter</th><th>Current</th><th>Critical</th><th>Weight</th><th>Health (%)</th><th>Status</th></tr>
    ${(m.parameters||[]).map(p=>{
      const health = Math.max(0, (1 - (p.current/p.critical)) * 100);
      const usage = (p.current/p.critical)*100;
      const status = usage>=90 ? "crit" : usage>=75 ? "warn" : "ok";
      const label = usage>=90 ? "Critical" : usage>=75 ? "Warning" : "Normal";
      return `<tr>
        <td>${p.parameter}</td>
        <td>${p.current} ${p.unit||""}</td>
        <td>${p.critical} ${p.unit||""}</td>
        <td>${(p.weight||0).toFixed(2)}</td>
        <td>${health.toFixed(2)}</td>
        <td><span class="badge ${status}">${label}</span></td>
      </tr>`;
    }).join("")}
  `;

  // Chart
  const labels = (m.monthlyProbabilities||[]).map(x=>x.month);
  const data = (m.monthlyProbabilities||[]).map(x=>x.probability);
  const ctx = document.getElementById("machineChart");
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: m.name, data, borderWidth:1 }] },
    options: {
      responsive:true,
      plugins:{ legend:{ labels:{ color:"#dbe7f5" } } },
      scales:{
        x:{ ticks:{ color:"#a9b7c7" }, grid:{ color:"#202a38" } },
        y:{ beginAtZero:true, ticks:{ color:"#a9b7c7", callback:(v)=>v+"%" }, grid:{ color:"#202a38" } }
      }
    }
  });

  // Alerts
  const ares = await fetch(`${API_BASE}/machines/${id}/alerts`, { headers: authHeader() });
  const alerts = await ares.json();
  const container = document.getElementById("alerts");
  if(!alerts.length){ container.innerHTML = `<span class="badge">No alerts</span>`; }
  else{
    container.innerHTML = alerts.map(a => `<div class="tag" style="margin:6px 0;">
      <span class="badge ${a.type.toLowerCase()==="critical" ? "crit" : "warn"}">${a.type}</span> ${a.message}
    </div>`).join("");
  }
}

loadMachine();
// Auto-refresh alerts every 10s
setInterval(async ()=>{
  try{
    const ares = await fetch(`${API_BASE}/machines/${id}/alerts`, { headers: authHeader() });
    const alerts = await ares.json();
    const container = document.getElementById("alerts");
    if(!alerts.length){ container.innerHTML = `<span class="badge">No alerts</span>`; }
    else{
      container.innerHTML = alerts.map(a => `<div class="tag" style="margin:6px 0;">
        <span class="badge ${a.type.toLowerCase()==="critical" ? "crit" : "warn"}">${a.type}</span> ${a.message}
      </div>`).join("");
    }
  }catch(e){}
}, 10000);
