let vocabData = [];
let currentQueue = [];
let learned = [];
let currentIndex = 0;
let flipped = false;

const flashcard = document.getElementById('flashcard');
const flashcardInner = flashcard.querySelector('.flashcard-inner');
const front = flashcard.querySelector('.front');
const back = flashcard.querySelector('.back');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const letterSelect = document.getElementById('letterSelect');

let reviewButtonsContainer = null;

/* Utility - safely escape text for HTML injection */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Populate select with letters (A-Z and 'All') */
function updateLetterOptions() {
  letterSelect.innerHTML = "";
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All';
  letterSelect.appendChild(allOption);

  const present = new Set();
  vocabData.forEach(card => {
    if (card.Word && typeof card.Word === 'string') {
      const first = card.Word.trim().charAt(0).toUpperCase();
      if (first) present.add(first);
    }
  });

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  letters.forEach(letter => {
    const option = document.createElement('option');
    option.value = letter;
    option.textContent = letter;
    if (!present.has(letter)) option.disabled = true;
    letterSelect.appendChild(option);
  });

  // default to 'all' if there are cards, otherwise leave 'all'
  letterSelect.value = 'all';
  resetQueue(letterSelect.value);
  if (currentQueue.length > 0) showCard(0);
  else {
    front.innerHTML = `No words loaded.`;
    back.innerHTML = '';
  }
}

/* Filter and sort */
function filterCardsByLetter(letter) {
  let filtered = vocabData.filter(card => {
    if (!card.Word) return false;
    if (letter === 'all') return true;
    return card.Word.trim().toUpperCase().startsWith(letter);
  });
  filtered.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
  return filtered;
}

/* Reset queue and learned for a fresh review */
function resetQueue(letter) {
  currentQueue = filterCardsByLetter(letter);
  learned = [];
  currentIndex = 0;
}

/* Show one card (index bounded) */
function showCard(index = 0) {
  if (!currentQueue || currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  if (index < 0) index = 0;
  if (index >= currentQueue.length) index = currentQueue.length - 1;

  const card = currentQueue[index];

  // front: show count and word
  front.innerHTML = `<div class="word-count">(${index + 1}/${currentQueue.length})</div>
                     <div class="word">${escapeHTML(card.Word || 'No word')}</div>`;

  // back: show nicely formatted details
  const meaning = card.Meanings || 'No definition';
  const synonym = card.Synonym || '—';
  const antonym = card.Antonym || '—';

  back.innerHTML = `<div class="card-details">
                      <p><strong>Meaning:</strong> ${escapeHTML(meaning)}</p>
                      <p><strong>Synonym:</strong> ${escapeHTML(synonym)}</p>
                      <p><strong>Antonym:</strong> ${escapeHTML(antonym)}</p>
                    </div>`;

  currentIndex = index;
  flipped = false;
  flashcard.classList.remove('flipped');
  removeReviewButtons();
}

/* Remove review buttons and restore controls */
function removeReviewButtons() {
  if (reviewButtonsContainer) {
    reviewButtonsContainer.remove();
    reviewButtonsContainer = null;
  }
  flipBtn.style.display = '';
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

/* Show recall / judgement buttons when back is shown */
function showRecallButtons() {
  if (reviewButtonsContainer) return;

  reviewButtonsContainer = document.createElement('div');
  reviewButtonsContainer.className = 'review-buttons';

  const againBtn = document.createElement('button');
  againBtn.textContent = 'Do it again';
  againBtn.className = 'btn btn-danger btn-sm';
  againBtn.addEventListener('click', () => handleReview(false));

  const moveOnBtn = document.createElement('button');
  moveOnBtn.textContent = 'Move on';
  moveOnBtn.className = 'btn btn-success btn-sm';
  moveOnBtn.addEventListener('click', () => handleReview(true));

  reviewButtonsContainer.appendChild(againBtn);
  reviewButtonsContainer.appendChild(moveOnBtn);

  // append just below controls
  flashcard.parentElement.appendChild(reviewButtonsContainer);

  // while judging/discouraging, disable nav and hide flip button
  flipBtn.style.display = 'none';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

/* handle the user's selection after revealing the back
   moveOn === true  -> mark learned & remove from queue
   moveOn === false -> reinsert card later in queue (see comments) */
function handleReview(moveOn) {
  if (!currentQueue || currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  const card = currentQueue[currentIndex];

  if (moveOn) {
    // mark learned and remove card
    learned.push(card);
    currentQueue.splice(currentIndex, 1);
  } else {
    // "Do it again" : remove card from current position and reinsert a bit later
    // This shows the card again soon but not immediately stuck in a loop.
    currentQueue.splice(currentIndex, 1);
    // insert 2 positions after the current position (or at the end if short)
    const insertAfter = Math.min(currentIndex + 2, currentQueue.length);
    currentQueue.splice(insertAfter, 0, card);
  }

  // If queue empty -> mastery page
  if (currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  // ensure currentIndex still points to a valid next card
  if (currentIndex >= currentQueue.length) currentIndex = 0;

  // show the (new) card at currentIndex
  showCard(currentIndex);
}

/* Mastery screen when queue is empty */
function showMasteryScreen() {
  front.innerHTML = `🎉 You have mastered ${learned.length} word${learned.length !== 1 ? 's' : ''}!`;
  if (learned.length === 0) {
    back.innerHTML = `<div style="text-align:center;">No words learned yet.</div>`;
  } else {
    const listHtml = learned.map((c, i) => `<li>${escapeHTML(c.Word || '—')} — ${escapeHTML(c.Meanings || '—')}</li>`).join('');
    back.innerHTML = `<div style="text-align:left; max-height:160px; overflow:auto;"><ol>${listHtml}</ol></div>`;
  }

  removeReviewButtons();

  // show simple restart controls (replace previous controls temporarily)
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  flipBtn.style.display = 'none';

  // Add a 'Restart' button if not present
  if (!document.getElementById('masteryRestart')) {
    const restart = document.createElement('button');
    restart.id = 'masteryRestart';
    restart.className = 'btn btn-outline-primary mt-3';
    restart.textContent = 'Restart this letter';
    restart.addEventListener('click', () => {
      // pick current letter from select and restart
      resetQueue(letterSelect.value || 'all');
      if (currentQueue.length > 0) {
        showCard(0);
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        flipBtn.style.display = '';
      } else {
        front.textContent = `No words for "${letterSelect.value}".`;
        back.textContent = '';
      }
      restart.remove();
    });
    flashcard.parentElement.appendChild(restart);
  }
}

/* flip card (show back or front) */
function flipCard(e) {
  // prevent flip when there are no cards
  if (!currentQueue || currentQueue.length === 0) {
    return;
  }

  flipped = !flipped;
  flashcard.classList.toggle('flipped');

  if (flipped) {
    // show review buttons when the back is visible
    showRecallButtons();
  } else {
    removeReviewButtons();
  }
}

/* previous / next navigation */
function nextCard() {
  if (!currentQueue || currentQueue.length === 0) return;
  let nextIndex = currentIndex + 1;
  if (nextIndex >= currentQueue.length) nextIndex = 0;
  showCard(nextIndex);
}
function prevCard() {
  if (!currentQueue || currentQueue.length === 0) return;
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = currentQueue.length - 1;
  showCard(prevIndex);
}

/* Load vocab JSON (vocab-data.json expected in same folder) */
async function loadVocab() {
  try {
    const response = await fetch('vocab-data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    vocabData = await response.json();
    // sanitize / ensure Word property exists
    vocabData = vocabData.filter(c => c.Word && String(c.Word).trim().length > 0);
    vocabData.sort((a, b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
    updateLetterOptions();
  } catch (error) {
    front.textContent = 'Error loading vocab data.';
    back.textContent = '';
    console.error(error);
  }
}

/* Event bindings */
document.addEventListener('DOMContentLoaded', () => {
  loadVocab();

  letterSelect.addEventListener('change', (e) => {
    resetQueue(e.target.value);
    if (currentQueue.length > 0) showCard(0);
    else {
      front.textContent = `No words for "${e.target.value}".`;
      back.textContent = '';
      removeReviewButtons();
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  });

  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevCard(); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextCard(); });
  flipBtn.addEventListener('click', (e) => { e.stopPropagation(); flipCard(); });
  // clicking the card flips it
  flashcard.addEventListener('click', (e) => flipCard());

  // Optional: keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { nextCard(); }
    else if (e.key === 'ArrowLeft') { prevCard(); }
    else if (e.key === ' ' || e.key === 'Spacebar') { // space flips
      e.preventDefault();
      flipCard();
    }
  });
});
