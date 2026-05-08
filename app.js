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

  // Chart
  const labels = sectionTitles;
  const data = labels.map(t => averages[t] ?? 0);
  const colors = labels.map(t => colorBySection[t]);

  if (window.Chart){
    try{
      if (chart) chart.destroy();

      chart = new Chart($("#chart").getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Average score",
            data,
            backgroundColor: colors
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { min: SCALE_MIN, max: SCALE_MAX }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Avg: ${ctx.parsed.y.toFixed(2)}`
              }
            }
          }
        }
      });
    }catch(e){
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
  colorBySection = {};
  model.sections.forEach((sec, idx) => {
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
}

init().catch(err => console.error("Init error:", err));
``
