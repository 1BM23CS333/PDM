const API = "http://127.0.0.1:5000"; // backend URL

// Elements
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const goLogin = document.getElementById("goLogin");
const goSignup = document.getElementById("goSignup");

// Switch to Login View
function showLogin() {
  loginTab?.classList.add("active");
  signupTab?.classList.remove("active");
  loginForm.style.display = "block";
  signupForm.style.display = "none";
}

// Switch to Signup View
function showSignup() {
  signupTab?.classList.add("active");
  loginTab?.classList.remove("active");
  signupForm.style.display = "block";
  loginForm.style.display = "none";
}

// Tabs
loginTab?.addEventListener("click", showLogin);
signupTab?.addEventListener("click", showSignup);
goLogin?.addEventListener("click", showLogin);
goSignup?.addEventListener("click", showSignup);

// ============================ LOGIN ============================
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Login failed");

    localStorage.setItem("token", data.token);
    location.href = "dashboard.html"; // ✅ Go inside dashboard
  } catch {
    alert("⚠️ Backend not running!");
  }
});

// ============================ SIGNUP ============================
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  try {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Signup failed");

    alert("✅ Account created! Please Sign In.");
    showLogin(); // ✅ automatically switch to login form
  } catch {
    alert("⚠️ Backend not running!");
  }
});
