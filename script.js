let vocabData = [];
let currentQueue = [];
let learned = [];
let currentIndex = 0;
let flipped = false;

const flashcard = document.getElementById('flashcard');
const front = flashcard.querySelector('.front');
const back = flashcard.querySelector('.back');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const letterSelect = document.getElementById('letterSelect');

let reviewButtonsContainer;

// Placeholder options
function populateLetterOptions() {
  letterSelect.innerHTML = "";
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All';
  letterSelect.appendChild(allOption);
}

// Update dropdown based on dataset
function updateLetterOptions() {
  letterSelect.innerHTML = "";

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All';
  letterSelect.appendChild(allOption);

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  letters.forEach(letter => {
    const option = document.createElement('option');
    option.value = letter;
    option.textContent = letter;

    const hasWord = vocabData.some(card => card.Word && card.Word.toUpperCase().startsWith(letter));
    if (!hasWord) option.disabled = true;

    letterSelect.appendChild(option);
  });

  const firstAvailable = letters.find(l => vocabData.some(card => card.Word && card.Word.toUpperCase().startsWith(l))) || 'all';
  letterSelect.value = firstAvailable;
  resetQueue(letterSelect.value);
  showCard(0);
}

// Filter cards
function filterCardsByLetter(letter) {
  let filtered = vocabData.filter(card => {
    if (letter === 'all') return true;
    return card.Word && card.Word.toUpperCase().startsWith(letter);
  });
  filtered.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
  return filtered;
}

// Reset queue
function resetQueue(letter) {
  currentQueue = filterCardsByLetter(letter);
  learned = [];
  currentIndex = 0;
}

// Show flashcard
function showCard(index) {
  if (currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  const card = currentQueue[index];
  front.textContent = `(${index + 1}/${currentQueue.length}) ${card.Word || 'No word'}`;
  back.textContent =
    `Meaning: ${card.Meanings || 'No definition'}\n\n` +
    `Synonym: ${card.Synonym || '—'}\n` +
    `Antonym: ${card.Antonym || '—'}`;

  currentIndex = index;
  flipped = false;
  flashcard.classList.remove('flipped');
  removeReviewButtons();
}

// Remove review buttons
function removeReviewButtons() {
  if (reviewButtonsContainer) {
    reviewButtonsContainer.remove();
    reviewButtonsContainer = null;
  }
  flipBtn.style.display = 'inline-block';
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// Show recall buttons
function showRecallButtons() {
  if (reviewButtonsContainer) return;

  reviewButtonsContainer = document.createElement('div');
  reviewButtonsContainer.className = 'review-buttons';

  const againBtn = document.createElement('button');
  againBtn.textContent = 'Do it again';
  againBtn.className = 'btn btn-danger btn-sm me-2';
  againBtn.addEventListener('click', () => handleReview(false));

  const moveOnBtn = document.createElement('button');
  moveOnBtn.textContent = 'Move on';
  moveOnBtn.className = 'btn btn-success btn-sm';
  moveOnBtn.addEventListener('click', () => handleReview(true));

  reviewButtonsContainer.appendChild(againBtn);
  reviewButtonsContainer.appendChild(moveOnBtn);

  flashcard.parentElement.appendChild(reviewButtonsContainer);

  flipBtn.style.display = 'none';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

// Handle review
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

// Mastery screen
function showMasteryScreen() {
  front.textContent = `🎉 You have mastered this!`;
  back.textContent = learned.map((c, i) => `${i + 1}. ${c.Word} → ${c.Meanings}`).join('\n');
  removeReviewButtons();
}

// Flip card
function flipCard() {
  if (currentQueue.length === 0) return;
  flipped = !flipped;
  flashcard.classList.toggle('flipped');
  if (flipped) showRecallButtons();
  else removeReviewButtons();
}

// Next / Previous
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

// Load vocab
async function loadVocab() {
  try {
    const response = await fetch('vocab-data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    vocabData = await response.json();
    vocabData.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
    updateLetterOptions();
  } catch (error) {
    front.textContent = 'Error loading vocab data.';
    back.textContent = '';
    console.error(error);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  populateLetterOptions();
  loadVocab();

  letterSelect.addEventListener('change', (e) => {
    resetQueue(e.target.value);
    if (currentQueue.length > 0) showCard(0);
    else {
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
