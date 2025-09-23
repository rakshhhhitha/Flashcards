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

function populateLetterOptions() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  letters.forEach(letter => {
    const option = document.createElement('option');
    option.value = letter;
    option.textContent = letter;
    letterSelect.appendChild(option);
  });
}

async function loadVocab() {
  try {
    const response = await fetch('vocab-data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    vocabData = await response.json();

    // Sort alphabetically by Word, case insensitive
    vocabData.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));

    filteredVocab = vocabData;

    if (filteredVocab.length > 0) {
      showCard(0);
    } else {
      front.textContent = 'No vocab data found.';
      back.textContent = '';
    }
  } catch (error) {
    front.textContent = 'Error loading vocab data.';
    back.textContent = '';
    console.error('Fetch error:', error);
  }
}

function showCard(index) {
  if (filteredVocab.length === 0) {
    front.textContent = 'No words to display.';
    back.textContent = '';
    return;
  }
  const card = filteredVocab[index];
  front.textContent = card.Word || 'No word';
  back.textContent = card.Meanings || 'No definition';
  currentIndex = index;
  flipped = false;
  flashcard.classList.remove('flipped');
}

function flipCard() {
  flipped = !flipped;
  flashcard.classList.toggle('flipped');
}

function nextCard() {
  if (filteredVocab.length === 0) return;
  if (currentIndex < filteredVocab.length - 1) {
    showCard(currentIndex + 1);
  } else {
    showCard(0);
  }
}

function prevCard() {
  if (filteredVocab.length === 0) return;
  if (currentIndex > 0) {
    showCard(currentIndex - 1);
  } else {
    showCard(filteredVocab.length - 1);
  }
}

function filterByLetter(letter) {
  if (letter === 'all') {
    filteredVocab = vocabData;
  } else {
    filteredVocab = vocabData.filter(item =>
      item.Word.toUpperCase().startsWith(letter)
    );
  }
  if (filteredVocab.length > 0) {
    showCard(0);
  } else {
    front.textContent = `No words found for "${letter}".`;
    back.textContent = '';
    currentIndex = 0;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  populateLetterOptions();
  loadVocab();

  letterSelect.addEventListener('change', (e) => {
    filterByLetter(e.target.value);
  });

  prevBtn.addEventListener('click', prevCard);
  nextBtn.addEventListener('click', nextCard);
  flipBtn.addEventListener('click', flipCard);
  flashcard.addEventListener('click', flipCard);
});
