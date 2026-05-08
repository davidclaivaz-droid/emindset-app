fetch("questions.json")
  .then(response => response.json())
  .then(data => {

    const questionnaire = document.getElementById("questionnaire");
    const answers = {};

    // --- 1. Flatten all questions and keep section reference ---
    let allQuestions = [];

    data.sections.forEach(section => {
      section.questions.forEach(q => {
        allQuestions.push({
          ...q,
          sectionTitle: section.title
        });
      });
    });

    // --- 2. Shuffle questions (Fisher–Yates) ---
    for (let i = allQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }

    // --- 3. Render questions WITHOUT section titles ---
    allQuestions.forEach(q => {
      const qDiv = document.createElement("div");
      qDiv.className = "question";

      qDiv.innerHTML = `
        <div class="question-text">${q.text}</div>
        <div class="scale">
          ${[1,2,3,4,5].map(v => `
            <label>
              <input type="radio" name="${q.id}" value="${v}">
              ${v}
            </label>
          `).join("")}
        </div>
      `;

      qDiv.querySelectorAll("input").forEach(input => {
        input.addEventListener("change", e => {
          answers[q.id] = {
            value: Number(e.target.value),
            section: q.sectionTitle,
            reverse: q.reverseGuess
          };
        });
      });

      questionnaire.appendChild(qDiv);
    });

    // --- 4. Scoring logic (unchanged conceptually) ---
    document.getElementById("btnShowResults").addEventListener("click", () => {
      const scores = {};
      const counts = {};

      Object.values(answers).forEach(a => {
        let v = a.reverse ? 6 - a.value : a.value;

        scores[a.section] = (scores[a.section] || 0) + v;
        counts[a.section] = (counts[a.section] || 0) + 1;
      });

      const averages = {};
      Object.keys(scores).forEach(k => {
        averages[k] = scores[k] / counts[k];
      });

      document.getElementById("results").classList.remove("hidden");

      new Chart(document.getElementById("chart"), {
        type: "bar",
        data: {
          labels: Object.keys(averages),
          datasets: [{
            label: "Average score",
            data: Object.values(averages)
          }]
        },
        options: {
          scales: {
            y: { min: 1, max: 5 }
          }
        }
      });
    });

  })
  .catch(err => {
    console.error("Error loading questions:", err);
  });
