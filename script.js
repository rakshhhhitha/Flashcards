let data = [];
let currentLetter = "";
let words = [];
let currentIndex = 0;

const flashcard = document.getElementById("flashcard");
const front = flashcard.querySelector(".front");
const back = flashcard.querySelector(".back");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const flipBtn = document.getElementById("flip");
const progress = document.getElementById("progress");
const letterSelect = document.getElementById("letterSelect");

// Load JSON dataset
async function loadData() {
  try {
    const response = await fetch("vocab-data.json");
    data = await response.json();
    initAlphabetOptions();
  } catch (err) {
    progress.textContent = "❌ Failed to load vocab-data.json";
    console.error("Error loading data:", err);
  }
}

// Create alphabet dropdown
function initAlphabetOptions() {
  const letters = [...new Set(data.map(w => w.Word[0].toUpperCase()))].sort();
  letterSelect.innerHTML = letters.map(l => `<option value="${l}">${l}</option>`).join("");
  currentLetter = letters[0];
  filterWords();
}

// Filter words by selected letter
function filterWords() {
  currentLetter = letterSelect.value;
  words = data.filter(w => w.Word[0].toUpperCase() === currentLetter);
  currentIndex = 0;
  if (words.length === 0) {
    front.textContent = "";
    back.textContent = "";
    progress.textContent = "No words available for this letter.";
    return;
  }
  updateCard();
  updateProgress();
}

// Update card content
function updateCard() {
  const wordObj = words[currentIndex];
  front.textContent = wordObj.Word;
  back.innerHTML = `
    <p><strong>Meaning:</strong> ${wordObj.Meanings}</p>
    <p><strong>Synonym:</strong> ${wordObj.Synonym}</p>
    <p><strong>Antonym:</strong> ${wordObj.Antonym}</p>
  `;
  flashcard.classList.remove("flipped");
}

// Update progress
function updateProgress() {
  progress.textContent = `Word ${currentIndex + 1} of ${words.length}`;
}

// Flip card
function flipCard() {
  flashcard.classList.toggle("flipped");
}

// Previous card
function prevCard() {
  if (currentIndex > 0) {
    currentIndex--;
    updateCard();
    updateProgress();
  }
}

// Next card
function nextCard() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    updateCard();
    updateProgress();
  } else {
    // Completed all words
    front.textContent = "🎉 You’ve mastered this alphabet!";
    back.innerHTML = "";
    progress.textContent = `Completed all ${words.length} words for "${currentLetter}"`;
    flashcard.classList.remove("flipped");
  }
}

// Event listeners
flipBtn.addEventListener("click", flipCard);
flashcard.addEventListener("click", flipCard);
prevBtn.addEventListener("click", prevCard);
nextBtn.addEventListener("click", nextCard);
letterSelect.addEventListener("change", filterWords);

// Keyboard support (space = flip, arrows = navigation)
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    flipCard();
  } else if (e.code === "ArrowRight") {
    nextCard();
  } else if (e.code === "ArrowLeft") {
    prevCard();
  }
});

// Init
loadData();
