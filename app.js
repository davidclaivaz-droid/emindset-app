const SCALE_MIN = 1;
const SCALE_MAX = 5;
const STORAGE_KEY = "emindset_answers_v2_shuffled";

// Category colors (10 distinct colors)
const PALETTE = [
  "#4f8cff", "#2bd4a7", "#ffb020", "#ff6b6b", "#a78bfa",
  "#22c55e", "#e879f9", "#60a5fa", "#f97316", "#facc15"
];

let chart = null;
let allQuestions = [];
let answers = {}; // { [qid]: { value, sectionTitle, reverse } }
let colorBySection = {}; // { [sectionTitle]: color }

const $ = (sel) => document.querySelector(sel);


window.exportPdf = async function exportPdf() {
  // ... pdf code ...
};

function shuffleInPlace(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function loadAnswers(){
  try{
    answers = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  }catch{
    answers = {};
  }
}

function saveAnswers(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}

function countAnswered(){
  const total = allQuestions.length;
  const answered = Object.keys(answers).length;
  return { total, answered };
}

function updateProgress(){
  const { total, answered } = countAnswered();
  const pct = total ? Math.round((answered / total) * 100) : 0;

  $("#progressText").textContent = `Answered ${answered} / ${total}`;
  $("#progressPercent").textContent = `${pct}%`;
  $("#progressBar").style.width = `${pct}%`;

  // Optional: warn if incomplete
  if (answered < total) {
    $("#incompleteNote").classList.remove("hidden");
  } else {
    $("#incompleteNote").classList.add("hidden");
  }
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll("\"","&quot;")
    .replaceAll("'","&#039;");
}

function renderQuestions(){
  const container = $("#questionnaire");
  container.innerHTML = "";

  allQuestions.forEach((q, idx) => {
    const qDiv = document.createElement("div");
    qDiv.className = "question";

    const number = idx + 1;
    const current = answers[q.id]?.value;

    qDiv.innerHTML = `
      <div class="question-top">
        <div class="qnum">Q${number}</div>
        <div class="question-text">${escapeHtml(q.text)}</div>
      </div>
      <div class="scale" role="radiogroup" aria-label="Question ${number}">
        ${[1,2,3,4,5].map(v => `
          <label>
            <input type="radio" name="${q.id}" value="${v}" ${Number(current) === v ? "checked" : ""}>
            ${v}
          </label>
        `).join("")}
      </div>
    `;

    qDiv.querySelectorAll("input").forEach(input => {
      input.addEventListener("change", (e) => {
        answers[q.id] = {
          value: Number(e.target.value),
          sectionTitle: q.sectionTitle,
          reverse: !!q.reverseGuess
        };
        saveAnswers();
        updateProgress();
      });
    });

    container.appendChild(qDiv);
  });

  updateProgress();
}

function computeAverages(){
  const sums = {};
  const counts = {};

  Object.values(answers).forEach(a => {
    let v = a.reverse ? (SCALE_MAX + SCALE_MIN - a.value) : a.value; // 6 - value on 1..5
    sums[a.sectionTitle] = (sums[a.sectionTitle] || 0) + v;
    counts[a.sectionTitle] = (counts[a.sectionTitle] || 0) + 1;
  });

  const averages = {};
  Object.keys(sums).forEach(k => {
    averages[k] = sums[k] / counts[k];
  });

  return { averages, counts };
}

function renderResults(){
  const { total, answered } = countAnswered();
  const { averages, counts } = computeAverages();

  // Show results at top
  $("#results").classList.remove("hidden");

  $("#resultsMeta").textContent =
    `Answered items used in results: ${answered} / ${total}.`;

  // Build rows in a stable order (matching the sections order from JSON)
  const sectionTitles = Object.keys(colorBySection);

  const rowsHtml = sectionTitles.map(title => {
    const avg = averages[title];
    const used = counts[title] || 0;
    const color = colorBySection[title];

    const displayAvg = (avg == null) ? "—" : avg.toFixed(2);

    return `
      <div class="legend-row">
        <div class="legend-left">
          <span class="dot" style="background:${color}"></span>
          <div class="legend-title">${escapeHtml(title)}</div>
        </div>
        <div class="legend-score">${displayAvg}</div>
        <div class="muted small">${used} answered</div>
      </div>
    `;
  }).join("");

  $("#resultsTable").innerHTML = rowsHtml;

async function exportPdf() {
   alert("ExportPdf function entered");
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;

  // --- Time handling ---
  const now = new Date();

  // Option A: user local time
  const localTime = now.toLocaleString();

  // Option B: CET time (explicit)
  const cetTime = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Europe/Paris"
  }).format(now) + " (CET)";

  // ✅ Choose which one to show:
  const timeLabel = cetTime; // <-- change to localTime if you prefer

  // --- Create PDF ---
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Entrepreneurial Mindset – Results", pageWidth / 2, 18, { align: "center" });

  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Date & time: ${timeLabel}`, pageWidth / 2, 26, { align: "center" });

  let y = 38;

  // --- Category table ---
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Category scores", 14, y);
  y += 8;

  const rows = document.querySelectorAll("#resultsTable .legend-row");
  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(10);

  rows.forEach(row => {
    const title = row.querySelector(".legend-title")?.innerText ?? "";
    const score = row.querySelector(".legend-score")?.innerText ?? "";

    pdf.text(`${title}: ${score}`, 14, y);
    y += 6;
  });

  // --- New page for radar chart ---
  pdf.addPage();

  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Radar profile", pageWidth / 2, 18, { align: "center" });

  const chartCanvas = document.getElementById("chart");
  const chartImage = await html2canvas(chartCanvas, { scale: 2 });
  const imgData = chartImage.toDataURL("image/png");

  const imgWidth = pageWidth - 30;
  const imgHeight = (chartImage.height * imgWidth) / chartImage.width;

  pdf.addImage(imgData, "PNG", 15, 30, imgWidth, imgHeight);

  // --- Save PDF ---
  pdf.save("Entrepreneurial_Mindset_Results.pdf");
}
  
// Chart
const labels = sectionTitles;
const values = labels.map(t => averages[t] ?? 0);

// Use per-category colors for the radar POINTS (one per axis)
// Chart.js supports point* properties as arrays. [4](https://cdn.jsdelivr.net/npm/chart.js@2.7.3/dist/docs/charts/radar.html)[5](https://stackoverflow.com/questions/28159595/chartjs-different-color-per-data-point)
const pointColors = labels.map(t => colorBySection[t]);

if (window.Chart) {
  try {
    if (chart) chart.destroy();

    chart = new Chart($("#chart").getContext("2d"), {
      type: "radar",
      data: {
        labels,
        datasets: [{
          label: "Average score",
          data: values,
          fill: true,
          backgroundColor: "rgba(79, 140, 255, 0.15)",
          borderColor: "rgba(79, 140, 255, 0.9)",
          borderWidth: 2,

          // Different colour per category point (array per point)
          pointBackgroundColor: pointColors,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // allow the chart to fill .chart-wrap [3](https://www.chartjs.org/docs/latest/configuration/responsive.html)
        scales: {
          r: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1
            },
            grid: {
              color: "rgba(255,255,255,.10)"
            },
            angleLines: {
              color: "rgba(255,255,255,.10)"
            },
            pointLabels: {
              color: "rgba(231,238,247,.90)",
              font: { size: 12 }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Avg: ${ctx.parsed.r.toFixed(2)}`
            }
          }
        },
        elements: {
          line: { borderWidth: 2 }
        }
      }
    });
  } catch (e) {
    console.error("Chart render error:", e);
  }
}


  // Scroll to top so results are visible
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAll(){
  if (!confirm("Clear all saved answers?")) return;
  answers = {};
  saveAnswers();
  $("#results").classList.add("hidden");
  renderQuestions();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function init(){
  loadAnswers();

  const resp = await fetch("questions.json");
  const model = await resp.json();

  // Build stable section color mapping in section order
  
const sectionOrder = [];
colorBySection = {};

model.sections.forEach((sec, idx) => {
  sectionOrder.push(sec.title);
  colorBySection[sec.title] = PALETTE[idx % PALETTE.length];
});


  // Flatten and shuffle questions (but keep section titles for scoring)
  allQuestions = [];
  model.sections.forEach(sec => {
    sec.questions.forEach(q => {
      allQuestions.push({
        ...q,
        sectionTitle: sec.title
      });
    });
  });

  shuffleInPlace(allQuestions);

  // Render
  renderQuestions();
  updateProgress();

  // Button after questions
  $("#btnShowResults").addEventListener("click", renderResults);
  $("#btnReset").addEventListener("click", resetAll);
  $("#btnExportPdf").addEventListener("click", exportPdf);
}

init().catch(err => console.error("Init error:", err));
``
