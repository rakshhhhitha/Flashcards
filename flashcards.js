let vocabData = [];
let currentRound = [];
let nextRound = [];
let currentIndex = 0;
let flipped = false;

const flashcard = document.getElementById('flashcard');
const front = flashcard.querySelector('.front');
const back = flashcard.querySelector('.back');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const letterSelect = document.getElementById('letterSelect');

const REVIEW_QUALITY = ['Again', 'Hard', 'Good', 'Easy'];

let reviewButtonsContainer;

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

function showCard(index) {
  if (currentRound.length === 0) {
    front.textContent = 'No words due for review.';
    back.textContent = '';
    removeReviewButtons();
    return;
  }

  const card = currentRound[index];
  front.textContent = card.Word || 'No word';
  back.textContent = card.Meanings || 'No definition';
  currentIndex = index;
  flipped = false;
  flashcard.classList.remove('flipped');

  removeReviewButtons();
}

// Remove recall rating buttons
function removeReviewButtons() {
  if (reviewButtonsContainer) {
    reviewButtonsContainer.remove();
    reviewButtonsContainer = null;
  }
  flipBtn.style.display = 'inline-block';
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// Show recall rating buttons after flipping
function showRecallButtons() {
  if (reviewButtonsContainer) return; // already shown

  reviewButtonsContainer = document.createElement('div');
  reviewButtonsContainer.className = 'mb-3 mt-3';

  REVIEW_QUALITY.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'btn btn-sm me-2';

    // color coding similar to Anki
    if (label === 'Again') btn.classList.add('btn-danger');
    else if (label === 'Hard') btn.classList.add('btn-warning');
    else if (label === 'Good') btn.classList.add('btn-success');
    else btn.classList.add('btn-primary');

    btn.addEventListener('click', () => handleReview(i));

    reviewButtonsContainer.appendChild(btn);
  });

  flashcard.parentElement.appendChild(reviewButtonsContainer);

  // Hide flip button and disable prev/next while rating
  flipBtn.style.display = 'none';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

function handleReview(qualityIndex) {
  const card = currentRound[currentIndex];

  if (qualityIndex === 0) { // Again
    nextRound.push(card, card); // show again twice
  } else if (qualityIndex === 1) { // Hard
    nextRound.push(card);
  } else if (qualityIndex === 2) { // Good
    nextRound.push(card);
  } else if (qualityIndex === 3) { // Easy
    // mastered, don’t push
  }

  // Remove card from current round
  currentRound.splice(currentIndex, 1);

  if (currentRound.length === 0) {
    if (nextRound.length > 0) {
      currentRound = [...nextRound];
      nextRound = [];
    }
  }

  if (currentRound.length > 0) {
    let nextIndex = currentIndex;
    if (nextIndex >= currentRound.length) nextIndex = 0;
    showCard(nextIndex);
  } else {
    front.textContent = "All words mastered for this alphabet 🎉";
    back.textContent = "";
    removeReviewButtons();
  }
}

function flipCard() {
  if (currentRound.length === 0) return;
  flipped = !flipped;
  flashcard.classList.toggle('flipped');
  if (flipped) {
    showRecallButtons();
  } else {
    removeReviewButtons();
  }
}

function nextCard() {
  if (currentRound.length === 0) return;
  let nextIndex = currentIndex + 1;
  if (nextIndex >= currentRound.length) nextIndex = 0;
  showCard(nextIndex);
}

function prevCard() {
  if (currentRound.length === 0) return;
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = currentRound.length - 1;
  showCard(prevIndex);
}

async function loadVocab() {
  try {
    const response = await fetch('vocab-data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    vocabData = await response.json();
    vocabData.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));

    currentRound = filterCardsByLetter('all');
    nextRound = [];

    if (currentRound.length > 0) {
      showCard(0);
    } else {
      front.textContent = 'No words due for review.';
      back.textContent = '';
    }
  } catch (error) {
    front.textContent = 'Error loading vocab data.';
    back.textContent = '';
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  populateLetterOptions();
  loadVocab();

  letterSelect.addEventListener('change', (e) => {
    currentRound = filterCardsByLetter(e.target.value);
    nextRound = [];
    if (currentRound.length > 0) {
      showCard(0);
    } else {
      front.textContent = `No words for "${e.target.value}".`;
      back.textContent = '';
      removeReviewButtons();
    }
  });

  prevBtn.addEventListener('click', prevCard);
  nextBtn.addEventListener('click', nextCard);
  flipBtn.addEventListener('click', flipCard);
  flashcard.addEventListener('click', flipCard);
});
