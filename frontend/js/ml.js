ensureAuth();

async function ingestImage(){
  const file = document.getElementById("img").files[0];
  if(!file){ alert("Choose an image"); return; }
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(`${API_BASE}/ml/ingest-image`, { method:"POST", headers: authHeader(), body: fd });
  const data = await res.json();
  document.getElementById("imgResult").textContent = JSON.stringify(data, null, 2);
}

async function ingestCSV(){
  const file = document.getElementById("csv").files[0];
  if(!file){ alert("Choose a CSV"); return; }
  const fd = new FormData();
  fd.append("csv", file);
  const res = await fetch(`${API_BASE}/ml/ingest-csv`, { method:"POST", headers: authHeader(), body: fd });
  const data = await res.json();
  document.getElementById("csvResult").textContent = JSON.stringify(data, null, 2);
}

async function trainModel(){
  const res = await fetch(`${API_BASE}/ml/train`, { method:"POST", headers: authHeader() });
  const data = await res.json();
  document.getElementById("trainResult").textContent = JSON.stringify(data, null, 2);
}

async function loadMachines(){
  const res = await fetch(`${API_BASE}/machines/all`, { headers: authHeader() });
  const machines = await res.json();
  const sel = document.getElementById("machineSelect");
  sel.innerHTML = machines.map(m => `<option value="${m._id}">${m.name}</option>`).join("");
}
loadMachines();

async function predictSelected(){
  const id = document.getElementById("machineSelect").value;
  const res = await fetch(`${API_BASE}/ml/predict/${id}`, { method:"POST", headers: authHeader() });
  const data = await res.json();
  document.getElementById("predictResult").textContent = JSON.stringify(data, null, 2);
}
