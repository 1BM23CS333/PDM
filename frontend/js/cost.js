ensureAuth();

let machineCostChart, pieChart;

async function loadCostData(){
  const res = await fetch(`${API_BASE}/machines/all`, { headers: authHeader() });
  const machines = await res.json();

  const names = machines.map(m => m.name);
  const costSaved = machines.map(m => m.costSaved || 0);

  // Bar Chart (Cost Saved per Machine)
  const ctx1 = document.getElementById("machineCostChart");
  if(machineCostChart) machineCostChart.destroy();
  machineCostChart = new Chart(ctx1, {
    type: "bar",
    data: { labels: names, datasets: [{ label:"% Cost Saved", data: costSaved }] },
    options: {
      responsive:true,
      scales:{
        x:{ ticks:{ color:"#a9b7c7" }, grid:{ color:"#202a38" }},
        y:{ beginAtZero:true, ticks:{ color:"#a9b7c7", callback:(v)=>v+"%" }, grid:{ color:"#202a38" }}
      },
      plugins:{ legend:{ labels:{ color:"#dbe7f5" }} }
    }
  });

  // Pie Chart (Cost Distribution)
  const ctx2 = document.getElementById("pieChart");
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(ctx2, {
    type: "pie",
    data: { labels: names, datasets: [{ data: costSaved }] },
    options: {
      responsive:true,
      plugins:{
        legend:{ labels:{ color:"#dbe7f5" }},
        tooltip:{ callbacks:{ label:(c)=>`${c.label}: ${c.raw}% saved` } }
      }
    }
  });
}

loadCostData();
