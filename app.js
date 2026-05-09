
fetch('questions.json')
  .then(response => response.json())
  .then(data => {

    const container = document.getElementById('questionnaire');
    const answers = {};


function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

    

function updateProgress(answerCount, total) {
  const percent = total === 0
    ? 0
    : Math.round((answerCount / total) * 100);

  document.getElementById("progressText").textContent =
    `Answered ${answerCount} / ${total}`;

  document.getElementById("progressPercent").textContent =
    `${percent}%`;

  document.getElementById("progressBar").style.width =
    `${percent}%`;
}


// 1) Flatten all questions with their section title kept internally
const allQuestions = [];

data.sections.forEach(section => {
  section.questions.forEach(q => {
    allQuestions.push({
      ...q,
      sectionTitle: section.title
    });
  });
});

// 2) Shuffle questions on every reload
shuffle(allQuestions);

// 3) Render as a single list (no category titles)
allQuestions.forEach(q => {
  const qDiv = document.createElement('div');
  qDiv.className = 'question';

  qDiv.innerHTML = `
    <div>${q.text}</div>  
<div class="scale">
  ${[1,2,3,4,5].map(v => `
    <label class="scale-option">
      <input type="radio" name="${q.id}" value="${v}">
      <span>${v}</span>
    </label>
  `).join('')}
</div>

  `;

  qDiv.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', e => {
      answers[q.id] = Number(e.target.value);

      updateProgress(
        Object.keys(answers).length,
        allQuestions.length
      );
    });
  });

  container.appendChild(qDiv);
});

   
    

document.getElementById('btnShowResults')
  .addEventListener('click', () => {

    // ---- COMPUTE SCORES ----
    const scores = {};

    data.sections.forEach(section => {
      let sum = 0;
      let count = 0;

      section.questions.forEach(q => {
        if (answers[q.id]) {
          let v = answers[q.id];
          if (q.reverseGuess) v = 6 - v;
          sum += v;
          count++;
        }
      });

      if (count > 0) {
        scores[section.title] = sum / count;
      }
    });

    // ---- CATEGORY BREAKDOWN ----
    const resultsTable = document.getElementById("resultsTable");
    resultsTable.innerHTML = "";

    const palette = [
      "#4f8cff","#2bd4a7","#ffb020","#ff6b6b","#a78bfa",
      "#22c55e","#e879f9","#60a5fa","#f97316","#facc15"
    ];

    data.sections.forEach((section, index) => {
      const score = scores[section.title];
      if (score == null) return;

      
const row = document.createElement("div");
row.className = "results-row";

const left = document.createElement("div");
left.className = "results-left";

const color = palette[index % palette.length];

const dot = document.createElement("span");
dot.className = "results-dot";
dot.style.backgroundColor = color;

const title = document.createElement("span");
title.className = "results-title";
title.textContent = section.title;
title.style.color = color;   // ✅ FORCE color

left.appendChild(dot);
left.appendChild(title);

const value = document.createElement("span");
value.className = "results-score";
value.textContent = score.toFixed(2);
value.style.color = color;   // ✅ FORCE color

row.appendChild(left);
row.appendChild(value);

resultsTable.appendChild(row);

    });


    
    // ---- SHOW RESULTS ----
    document.getElementById('results').classList.remove('hidden');

    // ---- BAR CHART (unchanged for now) ----
    new Chart(document.getElementById('chart'), {
      type: 'radar',
      data: {
        labels: Object.keys(scores),
        
datasets: [{
  label: 'Category score',
  data: Object.values(scores),
  fill: true,
  backgroundColor: 'rgba(79, 140, 255, 0.2)',
  borderColor: 'rgba(79, 140, 255, 0.9)',
  borderWidth: 2,
  pointBackgroundColor: Object.keys(scores)
    .map((_, i) => palette[i % palette.length]),
  pointBorderColor: '#ffffff',
  pointBorderWidth: 1,
  pointRadius: 4
}]

      },
      
options: {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      min: 1,
      max: 5,
      ticks: {
        stepSize: 1,
        showLabelBackdrop: false
      },
      grid: {
        color: 'rgba(0,0,0,0.08)'
      },
      angleLines: {
        color: 'rgba(0,0,0,0.15)'
      },
      pointLabels: {
        font: { size: 12 }
      }
    }
  },
  plugins: {
    legend: { display: false }
  }
}

    });
  

 }); // ✅ END OF CLICK HANDLER

    
// ---- EXPORT PDF ----


const { jsPDF } = window.jspdf;

document.getElementById('btnExportPdf')
  .addEventListener('click', async () => {

    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    const target = document.getElementById('resultsContent');
    if (!target) return;

    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
      scrollY: -window.scrollY
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    // ---- HEADER ----
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('Entrepreneurial Mindset Self-Assessment', 15, 20);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Generated on ${dateStr} at ${timeStr}`, 15, 28);

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 35;
    let heightLeft = imgHeight;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - position);

    while (heightLeft > 0) {
      pdf.addPage();
      position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save('Questionnaire_Results.pdf');
  });
    


});   // ✅ END OF fetch().then(data => { ... })

