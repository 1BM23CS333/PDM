if(!localStorage.getItem("token")) location.href = "index.html";
ensureAuth();

let calendar;

async function loadMachines() {
  const res = await fetch(`${API_BASE}/machines/all`, { headers: authHeader() });
  const machines = await res.json();

  const select = document.getElementById("machineSelect");
  machines.forEach(m => {
    select.innerHTML += `<option value="${m._id}">${m.name}</option>`;
  });
}

async function loadCalendar() {
  const res = await fetch(`${API_BASE}/maintenance/all`, { headers: authHeader() });
  const events = await res.json();

  const calendarEl = document.getElementById("calendar");
  if(calendar) calendar.destroy();

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: 600,
    events,
    eventClick: async (info) => {
      if(confirm(`Delete maintenance for ${info.event.title}?`)){
        await fetch(`${API_BASE}/maintenance/delete/${info.event.id}`, {
          method:"DELETE",
          headers: authHeader()
        });
        loadCalendar();
      }
    }
  });

  calendar.render();
}

async function addEvent() {
  const machineId = document.getElementById("machineSelect").value;
  const date = document.getElementById("dateInput").value;
  const description = document.getElementById("descInput").value;

  await fetch(`${API_BASE}/maintenance/add`, {
    method:"POST",
    headers:{ ...authHeader(), "Content-Type":"application/json" },
    body: JSON.stringify({ machineId, date, description })
  });

  loadCalendar();
}

loadMachines();
loadCalendar();
