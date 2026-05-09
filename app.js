
fetch('questions.json')
  .then(response => response.json())
  .then(data => {

    const container = document.getElementById('questionnaire');
    const answers = {};

    data.sections.forEach(section => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'section';
      sectionDiv.innerHTML = `<h3>${section.title}</h3>`;

      section.questions.forEach(q => {
        const qDiv = document.createElement('div');
        qDiv.className = 'question';

        qDiv.innerHTML = `
          <div>${q.text}</div>
          ${[1,2,3,4,5].map(v =>
            `<label>
               <input type="radio" name="${q.id}" value="${v}">
               ${v}
             </label>`
          ).join(' ')}
        `;

        qDiv.querySelectorAll('input').forEach(input => {
          input.addEventListener('change', e => {
            
answers[q.id] = Number(e.target.value);
updateProgress(
  Object.keys(answers).length,
  data.sections.reduce((n,s) => n + s.questions.length, 0)
);

          });
        });

        sectionDiv.appendChild(qDiv);
      });

      container.appendChild(sectionDiv);
    });


function updateProgress(answerCount, total) {
  document.getElementById("progressText").textContent =
    `Answered ${answerCount} / ${total}`;
  document.getElementById("progressBar").style.width =
    `${Math.round((answerCount / total) * 100)}%`;
}
    
    document.getElementById('btnShowResults').addEventListener('click', () => {
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

        if (count > 0) scores[section.title] = sum / count;
      });

      document.getElementById('results').classList.remove('hidden');


const labels = Object.keys(scores);

// stable color palette
const palette = [
  "#4f8cff","#2bd4a7","#ffb020","#ff6b6b","#a78bfa",
  "#22c55e","#e879f9","#60a5fa","#f97316","#facc15"
];

new Chart(document.getElementById('chart'), {
  type: 'bar',
  data: {
    labels,
    datasets: [{
      data: Object.values(scores),
      backgroundColor: labels.map((_, i) => palette[i % palette.length])
    }]
  },
  opt

    });
  });
