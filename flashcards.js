let vocabData = [];
let filteredVocab = [];
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
  letters.forEach(letter => {
    const option = document.createElement('option');
    option.value = letter;
    option.textContent = letter;
    letterSelect.appendChild(option);
  });
}

// Load or initialize spaced repetition data from localStorage
function loadSpacedRepetitionData() {
  let data = localStorage.getItem('spacedRepetitionData');
  if (data) return JSON.parse(data);
  return {}; // key = word, value = { repetitions, interval, easeFactor, due }
}

function saveSpacedRepetitionData(data) {
  localStorage.setItem('spacedRepetitionData', JSON.stringify(data));
}

let spacedRepetitionData = {};

function initSpacedRepetitionForCard(word) {
  if (!spacedRepetitionData[word]) {
    spacedRepetitionData[word] = {
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      due: new Date().toISOString().split('T')[0]  // due today
    };
  }
}

// Update spaced repetition data for a card using SM-2 algorithm
function updateCardReview(word, quality) {
  // quality: 0=Again, 1=Hard, 2=Good, 3=Easy
  const cardData = spacedRepetitionData[word];
  if (!cardData) return;

  if (quality < 2) { // Again or Hard
    cardData.repetitions = 0;
    cardData.interval = 1;
  } else {
    cardData.repetitions++;
    if (cardData.repetitions === 1) {
      cardData.interval = 1;
    } else if (cardData.repetitions === 2) {
      cardData.interval = 6;
    } else {
      cardData.interval = Math.round(cardData.interval * cardData.easeFactor);
    }

    cardData.easeFactor = Math.max(1.3, cardData.easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02)));
  }

  // Set next due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + cardData.interval);
  cardData.due = dueDate.toISOString().split('T')[0];
  
  saveSpacedRepetitionData(spacedRepetitionData);
}

// Get today in yyyy-mm-dd
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Filter vocab based on letter and due date (only due cards)
function filterDueCards(letter) {
  const today = getTodayDate();
  let filtered = vocabData.filter(card => {
    initSpacedRepetitionForCard(card.Word);
    const spData = spacedRepetitionData[card.Word];
    const due = spData.due;
    // Filter due cards
    if (due > today) return false;
    // Filter by letter or all
    if (letter === 'all') return true;
    return card.Word.toUpperCase().startsWith(letter);
  });
  // Sort alphabetically
  filtered.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
  return filtered;
}

function showCard(index) {
  if (filteredVocab.length === 0) {
    front.textContent = 'No words due for review.';
    back.textContent = '';
    removeReviewButtons();
    return;
  }

  const card = filteredVocab[index];
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

    btn.addEventListener('click', () => {
      const card = filteredVocab[currentIndex];
      updateCardReview(card.Word, i);
      // After rating, move to next due card
      filteredVocab = filterDueCards(letterSelect.value);
      if (filteredVocab.length === 0) {
        showCard(0);
      } else {
        // Show next card cyclically
        let nextIndex = currentIndex + 1;
        if (nextIndex >= filteredVocab.length) nextIndex = 0;
        showCard(nextIndex);
      }
    });

    reviewButtonsContainer.appendChild(btn);
  });

  flashcard.parentElement.appendChild(reviewButtonsContainer);

  // Hide flip button and disable prev/next while rating
  flipBtn.style.display = 'none';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

function flipCard() {
  if (filteredVocab.length === 0) return;
  flipped = !flipped;
  flashcard.classList.toggle('flipped');
  if (flipped) {
    showRecallButtons();
  } else {
    removeReviewButtons();
  }
}

function nextCard() {
  if (filteredVocab.length === 0) return;
  let nextIndex = currentIndex + 1;
  if (nextIndex >= filteredVocab.length) nextIndex = 0;
  showCard(nextIndex);
}

function prevCard() {
  if (filteredVocab.length === 0) return;
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = filteredVocab.length - 1;
  showCard(prevIndex);
}

async function loadVocab() {
  try {
    const response = await fetch('vocab-data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    vocabData = await response.json();

    // Sort vocab alphabetically
    vocabData.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));

    spacedRepetitionData = loadSpacedRepetitionData();

    filteredVocab = filterDueCards('all');

    if (filteredVocab.length > 0) {
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
    filteredVocab = filterDueCards(e.target.value);
    if (filteredVocab.length > 0) {
      showCard(0);
    } else {
      front.textContent = `No words due for "${e.target.value}".`;
      back.textContent = '';
      removeReviewButtons();
    }
  });

  prevBtn.addEventListener('click', prevCard);
  nextBtn.addEventListener('click', nextCard);
  flipBtn.addEventListener('click', flipCard);
  flashcard.addEventListener('click', flipCard);
});
