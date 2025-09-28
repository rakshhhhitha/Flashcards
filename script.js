/* Responsive Flashcards - script.js
   - Fixed flipping so the back contains meaning/synonym/antonym
   - Responsive friendly, prevents accidental flips when clicking buttons
*/

let vocabData = [];
let currentQueue = [];
let learned = [];
let currentIndex = 0;
let flipped = false;

const flashcard = document.getElementById('flashcard');
const inner = flashcard.querySelector('.flashcard-inner');
const front = flashcard.querySelector('.face.front');
const back = flashcard.querySelector('.face.back');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const letterSelect = document.getElementById('letterSelect');
const progressEl = document.getElementById('progress');

let reviewButtonsContainer = null;

/* Small HTML-escape helper */
function escapeHTML(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* Update select with letter options based on dataset */
function updateLetterOptions() {
  letterSelect.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All';
  letterSelect.appendChild(allOpt);

  const present = new Set();
  vocabData.forEach(c => {
    if (c.Word && String(c.Word).trim()) {
      present.add(String(c.Word).trim()[0].toUpperCase());
    }
  });

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  letters.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = l;
    if (!present.has(l)) opt.disabled = true;
    letterSelect.appendChild(opt);
  });

  letterSelect.value = 'all';
  resetQueue('all');
  if (currentQueue.length) showCard(0);
  else updateProgress();
}

/* Filter and sort */
function filterCardsByLetter(letter) {
  let arr = vocabData.filter(c => c.Word && String(c.Word).trim() !== '');
  if (letter !== 'all') {
    arr = arr.filter(c => String(c.Word).trim().toUpperCase().startsWith(letter));
  }
  arr.sort((a,b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
  return arr;
}

/* Reset queue for chosen letter */
function resetQueue(letter) {
  currentQueue = filterCardsByLetter(letter);
  learned = [];
  currentIndex = 0;
  flipped = false;
  flashcard.classList.remove('flipped');
  removeReviewButtons();
  updateProgress();
}

/* Show a specific card (index safe-checked) */
function showCard(index = 0) {
  if (!currentQueue || currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }
  index = Math.max(0, Math.min(index, currentQueue.length - 1));
  const card = currentQueue[index];

  // FRONT: count + word
  front.innerHTML = `
    <div class="word-count">(${index + 1}/${currentQueue.length})</div>
    <div class="word">${escapeHTML(card.Word || 'No word')}</div>
  `;

  // BACK: meaning, synonym, antonym (clearly separate)
  const meaning = card.Meanings || 'No definition';
  const synonym = card.Synonym || '—';
  const antonym = card.Antonym || '—';

  back.innerHTML = `
    <div class="card-details">
      <p><strong>Meaning:</strong> ${escapeHTML(meaning)}</p>
      <p><strong>Synonym:</strong> ${escapeHTML(synonym)}</p>
      <p><strong>Antonym:</strong> ${escapeHTML(antonym)}</p>
    </div>
  `;

  currentIndex = index;
  flipped = false;
  flashcard.classList.remove('flipped');
  flashcard.setAttribute('aria-pressed', 'false');
  back.setAttribute('aria-hidden', 'true');
  front.setAttribute('aria-hidden', 'false');
  removeReviewButtons();
  updateProgress();
}

/* update progress display */
function updateProgress() {
  const total = currentQueue ? currentQueue.length : 0;
  const learnedCount = learned.length;
  progressEl.textContent = `Remaining: ${total} • Learned: ${learnedCount}`;
}

/* remove recall buttons and restore nav */
function removeReviewButtons() {
  if (reviewButtonsContainer) {
    reviewButtonsContainer.remove();
    reviewButtonsContainer = null;
  }
  flipBtn.style.display = '';
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

/* show Do it again / Move on buttons */
function showRecallButtons() {
  if (reviewButtonsContainer) return;
  reviewButtonsContainer = document.createElement('div');
  reviewButtonsContainer.className = 'review-buttons';

  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'btn btn-danger btn-sm';
  again.textContent = 'Do it again';
  again.addEventListener('click', (ev) => { ev.stopPropagation(); handleReview(false); });

  const moveOn = document.createElement('button');
  moveOn.type = 'button';
  moveOn.className = 'btn btn-success btn-sm';
  moveOn.textContent = 'Move on';
  moveOn.addEventListener('click', (ev) => { ev.stopPropagation(); handleReview(true); });

  reviewButtonsContainer.appendChild(again);
  reviewButtonsContainer.appendChild(moveOn);

  // Place review buttons below the card (inside wrapper)
  flashcard.parentElement.appendChild(reviewButtonsContainer);

  // Hide flip and disable nav while judging
  flipBtn.style.display = 'none';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

/* Handle user's judgement */
function handleReview(moveOn) {
  if (!currentQueue || currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  const card = currentQueue[currentIndex];

  if (moveOn) {
    // mark learned and remove from queue
    learned.push(card);
    currentQueue.splice(currentIndex, 1);
  } else {
    // "Do it again": remove from current position and reinsert shortly after (after next card)
    const removed = currentQueue.splice(currentIndex, 1)[0];
    const insertPos = Math.min(currentIndex + 1, currentQueue.length);
    currentQueue.splice(insertPos, 0, removed);
    // currentIndex stays the same to show the next card
  }

  // If queue empty -> mastery
  if (currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  // clamp index
  if (currentIndex >= currentQueue.length) currentIndex = 0;
  showCard(currentIndex);
}

/* Mastery screen */
function showMasteryScreen() {
  front.innerHTML = `🎉 You have mastered ${learned.length} word${learned.length !== 1 ? 's' : ''}!`;
  if (learned.length === 0) {
    back.innerHTML = `<div style="text-align:center">No words learned yet.</div>`;
  } else {
    const list = learned.map(c => `<li>${escapeHTML(c.Word || '—')} — ${escapeHTML(c.Meanings || '—')}</li>`).join('');
    back.innerHTML = `<div style="text-align:left; max-height:160px; overflow:auto"><ol>${list}</ol></div>`;
  }

  removeReviewButtons();

  // Disable nav and hide flip
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  flipBtn.style.display = 'none';

  // Add restart button
  if (!document.getElementById('masteryRestart')) {
    const restart = document.createElement('button');
    restart.id = 'masteryRestart';
    restart.className = 'btn btn-outline-primary mt-3';
    restart.textContent = 'Restart this letter';
    restart.addEventListener('click', () => {
      const letter = letterSelect.value || 'all';
      resetQueue(letter);
      if (currentQueue.length > 0) {
        showCard(0);
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        flipBtn.style.display = '';
      } else {
        front.textContent = `No words for "${letter}".`;
        back.textContent = '';
      }
      restart.remove();
    });
    flashcard.parentElement.appendChild(restart);
  }

  updateProgress();
}

/* flip handler (should show back details) */
function flipCard(e) {
  // if flashcard has no cards, ignore
  if (!currentQueue || currentQueue.length === 0) return;

  // prevent flip if clicking inside review buttons area
  if (e && e.target && e.target.closest && e.target.closest('.review-buttons')) return;

  flipped = !flipped;
  flashcard.classList.toggle('flipped');
  flashcard.setAttribute('aria-pressed', String(flipped));
  back.setAttribute('aria-hidden', String(!flipped));
  front.setAttribute('aria-hidden', String(flipped ? 'true' : 'false'));

  if (flipped) {
    // show the back content and show recall buttons
    showRecallButtons();
  } else {
    // hide recall controls
    removeReviewButtons();
  }
}

/* next / prev navigation */
function nextCard() {
  if (!currentQueue || currentQueue.length === 0) return;
  let nxt = currentIndex + 1;
  if (nxt >= currentQueue.length) nxt = 0;
  showCard(nxt);
}
function prevCard() {
  if (!currentQueue || currentQueue.length === 0) return;
  let p = currentIndex - 1;
  if (p < 0) p = currentQueue.length - 1;
  showCard(p);
}

/* load vocab-data.json; if fetch fails, show helpful message */
async function loadVocab() {
  try {
    const resp = await fetch('vocab-data.json');
    if (!resp.ok) throw new Error('Failed to load vocab-data.json');
    vocabData = await resp.json();
    // keep only items with a Word
    vocabData = vocabData.filter(c => c.Word && String(c.Word).trim().length > 0);
    vocabData.sort((a,b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
    updateLetterOptions();
  } catch (err) {
    console.error(err);
    // Friendly fallback: show an example dataset so UI is visible for testing
    vocabData = [
      { Word: 'Venom', Meanings: 'poison, toxin', Synonym: 'toxin', Antonym: 'antidote' },
      { Word: 'Thickset', Meanings: 'stout or stocky', Synonym: 'sturdy', Antonym: 'slender' },
      { Word: 'Abridge', Meanings: 'shorten while preserving meaning', Synonym: 'condense', Antonym: 'expand' }
    ];
    vocabData.sort((a,b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
    updateLetterOptions();
    // Also show an unobtrusive notice in progress
    progressEl.textContent += ' (using fallback sample data)';
  }
}

/* Event bindings */
document.addEventListener('DOMContentLoaded', () => {
  loadVocab();

  letterSelect.addEventListener('change', (e) => {
    resetQueue(e.target.value || 'all');
    if (currentQueue.length > 0) {
      showCard(0);
      prevBtn.disabled = false;
      nextBtn.disabled = false;
    } else {
      front.textContent = `No words for "${e.target.value}".`;
      back.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  });

  // make sure clicks on buttons don't bubble to card and flip it
  prevBtn.addEventListener('click', (ev) => { ev.stopPropagation(); prevCard(); });
  nextBtn.addEventListener('click', (ev) => { ev.stopPropagation(); nextCard(); });
  flipBtn.addEventListener('click', (ev) => { ev.stopPropagation(); flipCard(ev); });

  // clicking the card flips it (unless click came from review controls)
  flashcard.addEventListener('click', (ev) => flipCard(ev));

  // keyboard shortcuts
  document.addEventListener('keydown', (ev) => {
    const key = ev.key;
    if (key === 'ArrowRight') nextCard();
    else if (key === 'ArrowLeft') prevCard();
    else if (key === ' ' || key === 'Spacebar') { ev.preventDefault(); flipCard(ev); }
  });
});
