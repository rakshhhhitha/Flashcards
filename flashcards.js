let vocabData = [];
let currentIndex = 0;
let flipped = false;

const flashcard = document.getElementById('flashcard');
const front = flashcard.querySelector('.front');
const back = flashcard.querySelector('.back');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');

async function loadVocab() {
  try {
    const response = await fetch('vocab-data.json');
    vocabData = await response.json();
    if (vocabData.length > 0) {
      showCard(0);
    } else {
      front.textContent = 'No vocab data found.';
      back.textContent = '';
    }
  } catch (error) {
    front.textContent = 'Error loading vocab data.';
    back.textContent = '';
    console.error(error);
  }
}

function showCard(index) {
  const card = vocabData[index];
  front.textContent = card.word || 'No word';
  back.textContent = card.definition || 'No definition';
  currentIndex = index;
  flipped = false;
  flashcard.classList.remove('flipped');
}

function flipCard() {
  flipped = !flipped;
  flashcard.classList.toggle('flipped');
}

function nextCard() {
  if (currentIndex < vocabData.length - 1) {
    showCard(currentIndex + 1);
  }
}

function prevCard() {
  if (currentIndex > 0) {
    showCard(currentIndex - 1);
  }
}

prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
flipBtn.addEventListener('click', flipCard);

loadVocab();
