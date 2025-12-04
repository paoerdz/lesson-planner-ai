// public/script.js
const form = document.getElementById("lesson-form");
const outputArea = document.getElementById("output-area");
const saveBtn = document.getElementById("save");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const grade = document.getElementById("grade").value.trim();
  const subject = document.getElementById("subject").value.trim();
  const objective = document.getElementById("objective").value.trim();

  if (!grade || !subject || !objective) {
    alert("Please complete all fields.");
    return;
  }

  outputArea.innerHTML = "<em>Generating lesson plan…</em>";
  saveBtn.disabled = true;

  try {
    const resp = await fetch("/api/generate-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, subject, objective })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      outputArea.innerHTML = `<div style="color:darkred">Error: ${err.error || resp.statusText}</div>`;
      return;
    }

    const data = await resp.json();
    // data.html is the HTML table, data.raw is the raw text
    if (data.html) {
      outputArea.innerHTML = data.html;
    } else {
      // fallback: show raw text
      outputArea.textContent = data.raw || JSON.stringify(data);
    }

    // enable save button (if you implement /api/save-lesson)
    saveBtn.disabled = false;
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      try {
        const saveResp = await fetch("/api/save-lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade, subject, objective, raw: data.raw, html: data.html })
        });
        const saveData = await saveResp.json();
        if (saveResp.ok) {
          alert("Saved successfully.");
        } else {
          alert("Save failed: " + (saveData.error || saveResp.statusText));
        }
      } catch (err) {
        alert("Save failed: " + err.message);
      } finally {
        saveBtn.disabled = false;
      }
    };

  } catch (err) {
    outputArea.innerHTML = `<div style="color:darkred">Request failed: ${err.message}</div>`;
    saveBtn.disabled = true;
  }
});

