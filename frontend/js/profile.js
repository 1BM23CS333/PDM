ensureAuth();

async function loadProfile(){
  const res = await fetch(`${API_BASE}/user/me`, { headers: authHeader() });
  const user = await res.json();

  document.getElementById("nameInput").value = user.name || "";
  document.getElementById("emailInput").value = user.email || "";
  document.getElementById("roleInput").value = user.role || "";
}

async function saveProfile(){
  const name = document.getElementById("nameInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();

  const res = await fetch(`${API_BASE}/user/update`, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ name, email })
  });

  const data = await res.json();
  if(data.ok){
    alert("✅ Profile Updated Successfully!");
  } else {
    alert("⚠️ " + data.message);
  }
}

loadProfile();
