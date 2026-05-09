
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

      new Chart(document.getElementById('chart'), {
        type: 'bar',
        data: {
          labels: Object.keys(scores),
          datasets: [{ data: Object.values(scores) }]
        }
      });
    });
  });
