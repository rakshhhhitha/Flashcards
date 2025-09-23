let vocabData = [];
let currentQueue = [];
let learned = [];
let currentIndex = 0;
let flipped = false;

const cardInner = document.getElementById("cardInner");
const cardWord = document.getElementById("cardWord");
const cardMeaning = document.getElementById("cardMeaning");
const cardNumbering = document.getElementById("cardNumbering");
const progressLine = document.getElementById("progressLine");
const recallButtons = document.getElementById("recallButtons");
const masteredList = document.getElementById("masteredList");
const masteryOverlay = document.getElementById("masteryOverlay");
const masterCount = document.getElementById("masterCount");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const flipBtn = document.getElementById("flip");
const doAgainBtn = document.getElementById("doAgain");
const moveOnBtn = document.getElementById("moveOn");
const letterSelect = document.getElementById("letterSelect");

function populateLetterOptions() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  letterSelect.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All";
  letterSelect.appendChild(allOption);

  letters.forEach(letter => {
    const option = document.createElement("option");
    option.value = letter;
    option.textContent = letter;
    letterSelect.appendChild(option);
  });
}

function filterCards(letter) {
  let filtered = vocabData.filter(card =>
    letter === "all" ? true : card.Word.toUpperCase().startsWith(letter)
  );
  return filtered.sort((a, b) => a.Word.localeCompare(b.Word));
}

function resetQueue(letter) {
  currentQueue = filterCards(letter);
  learned = [];
  currentIndex = 0;
  updateProgress();
}

function updateProgress() {
  progressLine.textContent =
    `Learned ${learned.length} / ${learned.length + currentQueue.length}`;
}

function showCard(index) {
  if (currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  const card = currentQueue[index];
  cardWord.textContent = card.Word;
  cardMeaning.textContent = card.Meanings;
  cardNumbering.textContent = `Card ${index + 1} of ${currentQueue.length}`;
  currentIndex = index;
  flipped = false;
  cardInner.classList.remove("flipped");
  recallButtons.style.display = "none";
  updateProgress();
}

function flipCard() {
  if (currentQueue.length === 0) return;
  flipped = !flipped;
  cardInner.classList.toggle("flipped");
  recallButtons.style.display = flipped ? "flex" : "none";
}

function handleReview(moveOn) {
  const card = currentQueue[currentIndex];
  if (moveOn) {
    learned.push(card);
    currentQueue.splice(currentIndex, 1);
  } else {
    currentIndex++;
  }
  if (currentIndex >= currentQueue.length) currentIndex = 0;

  if (currentQueue.length > 0) {
    showCard(currentIndex);
  } else {
    showMasteryScreen();
  }
}

function showMasteryScreen() {
  masteryOverlay.style.display = "flex";
  masteredList.innerHTML = "";
  learned.forEach((c, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${c.Word} → ${c.Meanings}`;
    masteredList.appendChild(li);
  });
  masterCount.textContent = `You mastered ${learned.length} words 🎉`;
}

function nextCard() {
  if (currentQueue.length === 0) return;
  let nextIndex = (currentIndex + 1) % currentQueue.length;
  showCard(nextIndex);
}

function prevCard() {
  if (currentQueue.length === 0) return;
  let prevIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  showCard(prevIndex);
}

async function loadVocab() {
  try {
    const response = await fetch("vocab-data.json");
    vocabData = await response.json();
    resetQueue("all");
    if (currentQueue.length > 0) showCard(0);
    else cardWord.textContent = "No words found";
  } catch (err) {
    console.error(err);
    cardWord.textContent = "Error loading vocab data";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateLetterOptions();
  loadVocab();

  letterSelect.addEventListener("change", e => {
    resetQueue(e.target.value);
    if (currentQueue.length > 0) showCard(0);
    else cardWord.textContent = "No words for this alphabet";
  });

  prevBtn.addEventListener("click", prevCard);
  nextBtn.addEventListener("click", nextCard);
  flipBtn.addEventListener("click", flipCard);
  doAgainBtn.addEventListener("click", () => handleReview(false));
  moveOnBtn.addEventListener("click", () => handleReview(true));

  document.getElementById("closeMastery").addEventListener("click", () => {
    masteryOverlay.style.display = "none";
  });
  document.getElementById("restartAlphabet").addEventListener("click", () => {
    masteryOverlay.style.display = "none";
    resetQueue(letterSelect.value);
    if (currentQueue.length > 0) showCard(0);
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", e => {
    if (e.code === "ArrowRight") nextCard();
    if (e.code === "ArrowLeft") prevCard();
    if (e.code === "Space") flipCard();
  });
});
