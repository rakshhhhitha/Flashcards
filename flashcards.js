let vocabData = [];
let currentQueue = [];
let againQueue = [];
let hardQueue = [];
let goodQueue = [];
let easyDone = [];
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

function resetQueues(letter) {
  againQueue = filterCardsByLetter(letter);
  hardQueue = [];
  goodQueue = [];
  easyDone = [];
  currentQueue = againQueue;
  currentIndex = 0;
}

function getQueueName(queue) {
  if (queue === againQueue) return "Again";
  if (queue === hardQueue) return "Hard";
  if (queue === goodQueue) return "Good";
  return "";
}

function showCard(index) {
  if (currentQueue.length === 0) {
    moveToNextQueue();
    return;
  }

  const card = currentQueue[index];
  const queueName = getQueueName(currentQueue);
  const position = index + 1;
  const total = currentQueue.length;

  front.textContent = `[${queueName}] (${position}/${total}) ${card.Word || 'No word'}`;
  back.textContent = `[${queueName}] (${position}/${total}) ${card.Meanings || 'No definition'}`;
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

    // color coding
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
  const card = currentQueue[currentIndex];

  if (qualityIndex === 0) { // Again
    againQueue.push(card);
  } else if (qualityIndex === 1) { // Hard
    hardQueue.push(card);
  } else if (qualityIndex === 2) { // Good
    goodQueue.push(card);
  } else if (qualityIndex === 3) { // Easy
    easyDone.push(card);
  }

  // Remove card from current queue
  currentQueue.splice(currentIndex, 1);

  if (currentQueue.length === 0) {
    moveToNextQueue();
  }

  if (currentQueue.length > 0) {
    let nextIndex = currentIndex;
    if (nextIndex >= currentQueue.length) nextIndex = 0;
    showCard(nextIndex);
  }
}

function moveToNextQueue() {
  if (againQueue.length > 0) {
    currentQueue = againQueue;
    againQueue = [];
  } else if (hardQueue.length > 0) {
    currentQueue = hardQueue;
    hardQueue = [];
  } else if (goodQueue.length > 0) {
    currentQueue = goodQueue;
    goodQueue = [];
  } else {
    currentQueue = [];
    showMasteryScreen();
    return;
  }
  currentIndex = 0;
  showCard(currentIndex);
}

function showMasteryScreen() {
  let masteredCount = easyDone.length;
  let masteredList = easyDone
    .map((card, i) => `${i + 1}. ${card.Word} → ${card.Meanings}`)
    .join('\n');

  front.textContent = `🎉 You have mastered this alphabet!\n\nWords mastered: ${masteredCount}`;
  back.textContent = masteredList || "No words were mastered.";
  removeReviewButtons();
}

function flipCard() {
  if (currentQueue.length === 0) return;
  flipped = !flipped;
  flashcard.classList.toggle('flipped');
  if (flipped) {
    showRecallButtons();
  } else {
    removeReviewButtons();
  }
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

    resetQueues('all');
    if (currentQueue.length > 0) {
      showCard(0);
    } else {
      front.textContent = 'No words found.';
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
    resetQueues(e.target.value);
    if (currentQueue.length > 0) {
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
