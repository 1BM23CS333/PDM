// Base config
const API_BASE = "http://localhost:5000";

// auth helpers
function getToken(){ return localStorage.getItem("token"); }
function authHeader(){ return { "Authorization": "Bearer " + getToken() }; }
function ensureAuth(){
  if(!getToken()){ window.location = "index.html"; }
}
function logout(){
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location = "index.html";
}
function setUser(u){ localStorage.setItem("user", JSON.stringify(u)); }
function getUser(){ try{ return JSON.parse(localStorage.getItem("user")||"{}"); } catch { return {}; } }
