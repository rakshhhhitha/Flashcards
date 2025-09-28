let dataset = {}; // will hold grouped words by alphabet
let currentAlphabet = "A";
let currentIndex = 0;
let showingFront = true;
let learnedCount = 0;

const alphabetSelect = document.getElementById("alphabetSelect");
const flashcard = document.getElementById("flashcard");
const remainingCount = document.getElementById("remainingCount");
const learnedCountEl = document.getElementById("learnedCount");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const flipBtn = document.getElementById("flipBtn");

// Load dataset and group by alphabet
fetch("vocab-data.json")
  .then(res => res.json())
  .then(data => {
    // Group words by first letter
    dataset = {};
    data.forEach(item => {
      if (!item.Word) return;
      const letter = item.Word[0].toUpperCase();
      if (!dataset[letter]) dataset[letter] = [];
      dataset[letter].push(item);
    });

    // Sort words inside each letter
    for (const key in dataset) {
      dataset[key].sort((a, b) => a.Word.localeCompare(b.Word));
    }

    // Populate dropdown
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(l => {
      const opt = document.createElement("option");
      opt.value = l;
      opt.textContent = l;
      if (!dataset[l]) opt.disabled = true;
      alphabetSelect.appendChild(opt);
    });

    // Load the first available letter
    const firstAvailable = Object.keys(dataset)[0] || "A";
    alphabetSelect.value = firstAvailable;
    loadAlphabet(firstAvailable);
  })
  .catch(err => {
    console.error("Error loading vocab-data.json", err);
    flashcard.innerHTML = "<p>⚠️ Failed to load vocab data.</p>";
  });

alphabetSelect.addEventListener("change", () => {
  loadAlphabet(alphabetSelect.value);
});

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    showingFront = true;
    renderCard();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentIndex < (dataset[currentAlphabet]?.length || 0) - 1) {
    currentIndex++;
    showingFront = true;
    renderCard();
  } else {
    showCompletionScreen();
  }
});

flipBtn.addEventListener("click", () => {
  showingFront = !showingFront;
  if (!showingFront) learnedCount++;
  renderCard();
});

function loadAlphabet(letter) {
  currentAlphabet = letter;
  currentIndex = 0;
  learnedCount = 0;
  showingFront = true;
  renderCard();
}

function renderCard() {
  const words = dataset[currentAlphabet] || [];
  if (words.length === 0) {
    flashcard.innerHTML = `<p>No words available for ${currentAlphabet}</p>`;
    return;
  }

  const wordData = words[currentIndex];
  flashcard.innerHTML = showingFront
    ? `<h2>${wordData.Word}</h2>`
    : `<div>
        <p><strong>Meaning:</strong> ${wordData.Meanings || "—"}</p>
        <p><strong>Synonym:</strong> ${wordData.Synonym || "—"}</p>
        <p><strong>Antonym:</strong> ${wordData.Antonym || "—"}</p>
      </div>`;

  remainingCount.textContent = `Remaining: ${words.length - currentIndex - 1}`;
  learnedCountEl.textContent = `Learned: ${learnedCount}`;
}

function showCompletionScreen() {
  const letter = currentAlphabet;
  flashcard.innerHTML = `
    <div class="completion">
      <h2>🎉 You have mastered all words for <strong>${letter}</strong>!</h2>
      <p>Great job! Move on to the next alphabet 🚀</p>
      <button id="nextAlphabet">Next Alphabet ➡️</button>
      <button id="restartLetter">🔄 Restart this letter</button>
    </div>
  `;

  document.getElementById("nextAlphabet").addEventListener("click", () => {
    moveToNextAlphabet(letter);
  });

  document.getElementById("restartLetter").addEventListener("click", () => {
    loadAlphabet(letter);
  });
}

function moveToNextAlphabet(current) {
  const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  let index = alphabets.indexOf(current);
  if (index !== -1 && index < alphabets.length - 1) {
    let nextLetter = alphabets[index + 1];
    while (nextLetter && !dataset[nextLetter]) {
      index++;
      nextLetter = alphabets[index + 1];
    }
    if (nextLetter) {
      loadAlphabet(nextLetter);
      alphabetSelect.value = nextLetter;
    } else {
      flashcard.innerHTML = `
        <div class="completion">
          <h2>🏆 Amazing! You’ve completed all alphabets!</h2>
        </div>
      `;
    }
  }
}
