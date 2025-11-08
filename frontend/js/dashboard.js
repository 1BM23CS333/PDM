if(!localStorage.getItem("token")) location.href = "index.html";

ensureAuth();

const kpiMachines = document.getElementById("kpiMachines");
const kpiCritical = document.getElementById("kpiCritical");
const kpiAvgHealth = document.getElementById("kpiAvgHealth");
const cards = document.getElementById("machineCards");

let chart;

async function loadMachines(){
  const res = await fetch(`${API_BASE}/machines/all`, { headers: authHeader() });
  const machines = await res.json();

  // KPIs
  kpiMachines.textContent = machines.length.toString();
  let criticalCount = 0;
  let sumHealth = 0;

  machines.forEach(m => {
    sumHealth += (m.overallHealth || 0);

    if ((m.failureProbability || 0) >= 70) criticalCount++;

    (m.parameters || []).forEach(p => {
      const usage = (p.current / p.critical) * 100;
      if (usage >= 90) criticalCount++;
    });
  });

  kpiCritical.textContent = criticalCount.toString();
  kpiAvgHealth.textContent = `${(sumHealth / Math.max(machines.length,1)).toFixed(1)}%`;

  // Cards
  cards.innerHTML = "";
  machines.forEach(m => {

    const badge =
      (m.failureProbability >= 70) ? `<span class="badge crit">Critical</span>` :
      (m.failureProbability >= 50) ? `<span class="badge warn">Warning</span>` :
      `<span class="badge ok">Normal</span>`;

    cards.innerHTML += `
      <div class="card">

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0;">${m.name}</h3>
          ${badge}
        </div>

        <p style="margin:8px 0 6px; color:#9db0c7;">
          Type: ${m.type || "-"} • Last Service: ${m.lastServiceDate ? new Date(m.lastServiceDate).toLocaleDateString() : "-"}
        </p>

        <div class="grid cols-3" style="margin-top:12px;">

          <div class="kpi">
            <h2>${m.failureProbability ?? "--"}%</h2>
            <small>Failure Prob.</small>
          </div>

          <div class="kpi">
            <h2>${m.overallHealth ?? "--"}%</h2>
            <small>Overall Health</small>
          </div>

          <div class="kpi">
            <h2>${m.remainingLife ?? "--"}</h2>
            <small>Remaining Life (days)</small>
          </div>

        </div>

        <p class="tag" style="margin-top:12px;">
          ${m.mostCritical 
            ? `Most Critical: <b style="color:#fff">${m.mostCritical.parameter}</b> (${m.mostCritical.current}/${m.mostCritical.critical} ${m.mostCritical.unit})` 
            : "No critical parameter"}
        </p>

        <div style="margin-top:14px; display:flex; gap:10px;">
          <button class="btn" onclick="location.href='machine.html?id=${m._id}'">Open</button>
          <button class="btn secondary" onclick="downloadReport('${m._id}')">Download PDF</button>
        </div>

      </div>
    `;
  });

  buildChart(machines);
}

function buildChart(machines){
  const labels = Array.from(new Set(
    machines.flatMap(m => (m.monthlyProbabilities || []).map(x => x.month))
  ));

  const datasets = machines.map(m => ({
    label: m.name,
    data: labels.map(l => (m.monthlyProbabilities || []).find(x => x.month === l)?.probability ?? 0),
    borderWidth: 1
  }));

  const ctx = document.getElementById("probabilityChart");

  if(chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color:"#dbe7f5" } } },
      scales: {
        x: { ticks:{ color:"#a9b7c7" }, grid:{ color:"#202a38" } },
        y: { beginAtZero:true, ticks:{ color:"#a9b7c7", callback:(v)=>v+"%" }, grid:{ color:"#202a38" } }
      }
    }
  });
}

loadMachines();
runScheduler();
async function runScheduler(){
  await fetch(`${API_BASE}/scheduler/auto`, { method: "POST", headers: authHeader() });
}
async function downloadReport(id) {
  const res = await fetch(`${API_BASE}/machines/${id}`, { headers: authHeader() });
  const m = await res.json();

  // Ask user company/organization name
  let company = prompt("Enter Company / Organization Name:");
  if(!company || company.trim() === "") company = "Predictive Maintenance System";

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // ========== Style 3: Futuristic Neon Header ==========
  doc.setFillColor(18, 25, 40); // dark base
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(0, 153, 255); // neon cyan text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(company, 105, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Predictive Maintenance Report", 105, 23, { align: "center" });

  let y = 40;

  // Machine Info
  doc.setTextColor(255,255,255);
  doc.setFontSize(14);
  doc.text(`Machine: ${m.name}`, 14, y); y += 8;
  doc.text(`Type: ${m.type || "-"}`, 14, y); y += 8;
  doc.text(`Last Service: ${m.lastServiceDate ? new Date(m.lastServiceDate).toLocaleDateString() : "-"}`, 14, y); y += 12;

  // Health Summary
  doc.setTextColor(0,153,255);
  doc.setFontSize(13);
  doc.text("Health Summary", 14, y); y += 8;

  doc.setTextColor(255,255,255);
  doc.setFontSize(12);
  doc.text(`Overall Health: ${m.overallHealth ?? "--"}%`, 14, y); y += 7;
  doc.text(`Failure Probability: ${m.failureProbability ?? "--"}%`, 14, y); y += 7;

  if(m.mostCritical){
    doc.text(`Most Critical: ${m.mostCritical.parameter} (${m.mostCritical.current}/${m.mostCritical.critical} ${m.mostCritical.unit})`, 14, y);
    y += 12;
  }

  // Parameters Section Title
  doc.setTextColor(0,153,255);
  doc.setFontSize(13);
  doc.text("Parameter Readings", 14, y); y += 8;

  // Parameter Table
  doc.setTextColor(255,255,255);
  doc.setFontSize(11);

  m.parameters?.forEach(p => {
    doc.text(`• ${p.parameter}:  ${p.current}${p.unit}   (Critical: ${p.critical}${p.unit})`, 14, y);
    y += 6;
  });

  // Signature Line
  y += 18;
  doc.setDrawColor(120,120,120);
  doc.line(14, y, 90, y);
  doc.setFontSize(10);
  doc.text("Authorized Signatory", 14, y+6);

  // Footer Timestamp
  doc.setFontSize(9);
  doc.setTextColor(160,160,160);
  doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 287);

  doc.save(`${m.name}_Report.pdf`);
}


  // Parameters Table
  doc.setFont("helvetica", "bold");
  doc.text("Parameters", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  m.parameters?.forEach(p => {
    doc.text(`• ${p.parameter}: ${p.current}${p.unit}  (Critical: ${p.critical}${p.unit})`, 14, y);
    y += 6;
  });

  y += 10;
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, y);

  doc.save(`${m.name}_Report.pdf`);
}

