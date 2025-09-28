/* Responsive Flashcards - script.js
   Now with next-alphabet progression after mastering a letter
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

/* HTML-escape helper */
function escapeHTML(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* update alphabet dropdown */
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

/* filter and sort */
function filterCardsByLetter(letter) {
  let arr = vocabData.filter(c => c.Word && String(c.Word).trim() !== '');
  if (letter !== 'all') {
    arr = arr.filter(c => String(c.Word).trim().toUpperCase().startsWith(letter));
  }
  arr.sort((a,b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
  return arr;
}

/* reset queue for given letter */
function resetQueue(letter) {
  currentQueue = filterCardsByLetter(letter);
  learned = [];
  currentIndex = 0;
  flipped = false;
  flashcard.classList.remove('flipped');
  removeReviewButtons();
  updateProgress();
}

/* show a card */
function showCard(index = 0) {
  if (!currentQueue || currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }
  index = Math.max(0, Math.min(index, currentQueue.length - 1));
  const card = currentQueue[index];

  front.innerHTML = `
    <div class="word-count">(${index + 1}/${currentQueue.length})</div>
    <div class="word">${escapeHTML(card.Word || 'No word')}</div>
  `;

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

/* progress text */
function updateProgress() {
  const total = currentQueue ? currentQueue.length : 0;
  const learnedCount = learned.length;
  progressEl.textContent = `Remaining: ${total} • Learned: ${learnedCount}`;
}

/* remove recall buttons */
function removeReviewButtons() {
  if (reviewButtonsContainer) {
    reviewButtonsContainer.remove();
    reviewButtonsContainer = null;
  }
  flipBtn.style.display = '';
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

/* show recall buttons */
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

  flashcard.parentElement.appendChild(reviewButtonsContainer);
  flipBtn.style.display = 'none';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

/* handle recall */
function handleReview(moveOn) {
  if (!currentQueue || currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  const card = currentQueue[currentIndex];

  if (moveOn) {
    learned.push(card);
    currentQueue.splice(currentIndex, 1);
  } else {
    const removed = currentQueue.splice(currentIndex, 1)[0];
    const insertPos = Math.min(currentIndex + 1, currentQueue.length);
    currentQueue.splice(insertPos, 0, removed);
  }

  if (currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }

  if (currentIndex >= currentQueue.length) currentIndex = 0;
  showCard(currentIndex);
}

/* mastery screen */
function showMasteryScreen() {
  const currentLetter = letterSelect.value;
  front.innerHTML = `🎉 You mastered all words in "${currentLetter}"!`;
  back.innerHTML = '';

  removeReviewButtons();
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  flipBtn.style.display = 'none';

  // container for actions
  const actionWrap = document.createElement('div');
  actionWrap.className = 'mt-3 d-flex flex-column align-items-center gap-2';

  // restart current
  const restart = document.createElement('button');
  restart.className = 'btn btn-outline-primary';
  restart.textContent = `Restart ${currentLetter}`;
  restart.addEventListener('click', () => {
    resetQueue(currentLetter);
    if (currentQueue.length > 0) showCard(0);
    restart.remove();
    if (nextBtn) nextBtn.disabled = false;
    if (prevBtn) prevBtn.disabled = false;
    flipBtn.style.display = '';
  });
  actionWrap.appendChild(restart);

  // next alphabet suggestion
  const nextLetter = getNextAvailableLetter(currentLetter);
  if (nextLetter) {
    const nextBtnEl = document.createElement('button');
    nextBtnEl.className = 'btn btn-success';
    nextBtnEl.textContent = `Next Alphabet → ${nextLetter}`;
    nextBtnEl.addEventListener('click', () => {
      letterSelect.value = nextLetter;
      resetQueue(nextLetter);
      if (currentQueue.length > 0) showCard(0);
      actionWrap.remove();
      prevBtn.disabled = false;
      nextBtn.disabled = false;
      flipBtn.style.display = '';
    });
    actionWrap.appendChild(nextBtnEl);
  } else {
    // no more alphabets left
    const doneMsg = document.createElement('div');
    doneMsg.className = 'text-success fw-bold mt-2';
    doneMsg.textContent = '🎉 You have mastered ALL words!';
    actionWrap.appendChild(doneMsg);
  }

  flashcard.parentElement.appendChild(actionWrap);
  updateProgress();
}

/* find next alphabet with words */
function getNextAvailableLetter(currentLetter) {
  const options = Array.from(letterSelect.options)
    .filter(opt => !opt.disabled && opt.value !== 'all')
    .map(opt => opt.value);

  if (!currentLetter || currentLetter === 'all') return null;
  const idx = options.indexOf(currentLetter);
  if (idx >= 0 && idx < options.length - 1) return options[idx + 1];
  return null;
}

/* flip */
function flipCard(e) {
  if (!currentQueue || currentQueue.length === 0) return;
  if (e && e.target && e.target.closest && e.target.closest('.review-buttons')) return;

  flipped = !flipped;
  flashcard.classList.toggle('flipped');
  flashcard.setAttribute('aria-pressed', String(flipped));
  back.setAttribute('aria-hidden', String(!flipped));
  front.setAttribute('aria-hidden', String(flipped ? 'true' : 'false'));

  if (flipped) showRecallButtons();
  else removeReviewButtons();
}

/* navigation */
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

/* load vocab-data.json */
async function loadVocab() {
  try {
    const resp = await fetch('vocab-data.json');
    if (!resp.ok) throw new Error('Failed to load vocab-data.json');
    vocabData = await resp.json();
    vocabData = vocabData.filter(c => c.Word && String(c.Word).trim().length > 0);
    vocabData.sort((a,b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
    updateLetterOptions();
  } catch (err) {
    console.error(err);
    vocabData = [
      { Word: 'Venom', Meanings: 'poison, toxin', Synonym: 'toxin', Antonym: 'antidote' },
      { Word: 'Thickset', Meanings: 'stout or stocky', Synonym: 'sturdy', Antonym: 'slender' },
      { Word: 'Abridge', Meanings: 'shorten while preserving meaning', Synonym: 'condense', Antonym: 'expand' }
    ];
    vocabData.sort((a,b) => a.Word.toLowerCase().localeCompare(b.Word.toLowerCase()));
    updateLetterOptions();
    progressEl.textContent += ' (using fallback sample data)';
  }
}

/* DOM events */
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

  prevBtn.addEventListener('click', (ev) => { ev.stopPropagation(); prevCard(); });
  nextBtn.addEventListener('click', (ev) => { ev.stopPropagation(); nextCard(); });
  flipBtn.addEventListener('click', (ev) => { ev.stopPropagation(); flipCard(ev); });
  flashcard.addEventListener('click', (ev) => flipCard(ev));

  document.addEventListener('keydown', (ev) => {
    const key = ev.key;
    if (key === 'ArrowRight') nextCard();
    else if (key === 'ArrowLeft') prevCard();
    else if (key === ' ' || key === 'Spacebar') { ev.preventDefault(); flipCard(ev); }
  });
});
