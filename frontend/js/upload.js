const API = "http://127.0.0.1:5000";

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files.length) return alert("Select a file first!");

  const token = localStorage.getItem("token");
  if (!token) return alert("⚠️ Please log in again — No token found");

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const res = await fetch(`${API}/train`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) return alert(`❌ Upload error: ${data.message}`);

    alert("✅ Model training started successfully!");
  } catch (err) {
    alert("❌ Upload failed — Backend not responding");
  }
});
