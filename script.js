let vocabData = [];
let currentQueue = [];
let learned = [];
let currentIndex = 0;

const flashcard = document.getElementById('flashcard');
const frontWord = document.getElementById('frontWord');
const frontInfo = document.getElementById('frontInfo');
const backMeaning = document.getElementById('backMeaning');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const againBtn = document.getElementById('againBtn');
const moveOnBtn = document.getElementById('moveOnBtn');
const letterSelect = document.getElementById('letterSelect');
const progressDisplay = document.getElementById('progress');
const clearProgressBtn = document.getElementById('clearProgress');

function populateLetterOptions() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All';
  letterSelect.appendChild(allOption);

  letters.forEach(letter => {
    const option = document.createElement('option');
    option.value = letter;
    option.textContent = letter;
    letterSelect.appendChild(option);
  });
}

function filterCardsByLetter(letter) {
  let filtered = vocabData.filter(card => {
    if (letter === 'all') return true;
    return card.Word.toUpperCase().startsWith(letter);
  });
  filtered.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
  return filtered;
}

function resetQueue(letter) {
  currentQueue = filterCardsByLetter(letter);
  learned = [];
  currentIndex = 0;
  updateProgress();
}

function showCard(index) {
  if (currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  const card = currentQueue[index];
  const total = currentQueue.length;

  frontWord.textContent = card.Word;
  frontInfo.textContent = `Card ${index + 1} of ${total} — Flip for meaning`;
  backMeaning.textContent = card.Meanings || "No definition available";

  currentIndex = index;
  flashcard.classList.remove('flipped');
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

  updateProgress();

  if (currentQueue.length > 0) {
    showCard(currentIndex);
  } else {
    showMasteryScreen();
  }
}

function showMasteryScreen() {
  frontWord.textContent = "🎉 You have mastered this!";
  frontInfo.textContent = "";
  backMeaning.textContent = learned.map((c, i) => `${i + 1}. ${c.Word} → ${c.Meanings}`).join("\n");
  flashcard.classList.add('flipped');
}

function updateProgress() {
  progressDisplay.textContent = `Learned ${learned.length}`;
}

function flipCard() {
  if (currentQueue.length === 0) return;
  flashcard.classList.toggle('flipped');
}

function nextCard() {
  if (currentQueue.length === 0) return;
  let nextIndex = currentIndex + 1;
  if (nextIndex >= currentQueue.length) nextIndex = 0;
  showCard(nextIndex);
}

function prevCard() {
  if (currentQueue.length === 0) return;
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = currentQueue.length - 1;
  showCard(prevIndex);
}

async function loadVocab() {
  try {
    const response = await fetch('vocab-data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    vocabData = await response.json();
    vocabData.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));

    resetQueue('all');
    if (currentQueue.length > 0) {
      showCard(0);
    } else {
      frontWord.textContent = 'No words found.';
      frontInfo.textContent = '';
    }
  } catch (error) {
    frontWord.textContent = 'Error loading vocab data.';
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  populateLetterOptions();
  loadVocab();

  letterSelect.addEventListener('change', (e) => {
    resetQueue(e.target.value);
    if (currentQueue.length > 0) {
      showCard(0);
    } else {
      frontWord.textContent = `No words for "${e.target.value}".`;
      frontInfo.textContent = '';
    }
  });

  prevBtn.addEventListener('click', prevCard);
  nextBtn.addEventListener('click', nextCard);
  flipBtn.addEventListener('click', flipCard);
  againBtn.addEventListener('click', () => handleReview(false));
  moveOnBtn.addEventListener('click', () => handleReview(true));
  clearProgressBtn.addEventListener('click', () => {
    resetQueue(letterSelect.value);
    showCard(0);
  });

  flashcard.addEventListener('click', flipCard);
});
