// script.js — expects vocab-data.json with objects containing keys:
// "Word", "Meanings", optional "Synonym", optional "Antonym"

// State
let vocabData = [];    // full dataset with _uid
let initialList = [];  // words for selected alphabet (stable order)
let currentQueue = []; // remaining queue (references by _uid)
let learned = [];      // mastered words, in order moved-on
let currentIndex = 0;

// DOM
const letterSelect = document.getElementById('letterSelect');
const clearProgressBtn = document.getElementById('clearProgress');
const msgEl = document.getElementById('msg');
const progressEl = document.getElementById('progress');

const cardInner = document.getElementById('cardInner');
const frontWord = document.getElementById('frontWord');
const frontInfo = document.getElementById('frontInfo');
const backMeaning = document.getElementById('backMeaning');
const backExtra = document.getElementById('backExtra');

const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const againBtn = document.getElementById('againBtn');
const moveOnBtn = document.getElementById('moveOnBtn');

const masteryOverlay = document.getElementById('masteryOverlay');
const masteredList = document.getElementById('masteredList');
const masterCount = document.getElementById('masterCount');
const closeMastery = document.getElementById('closeMastery');
const restartAlphabet = document.getElementById('restartAlphabet');

// --- Helpers ---
function setMsg(text, isError = false) {
  msgEl.textContent = text || '';
  msgEl.style.color = isError ? 'crimson' : '';
}

function assignUIDs(arr) {
  return arr.map((c, i) => ({ ...c, _uid: i }));
}

function populateLetterOptions() {
  letterSelect.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All';
  letterSelect.appendChild(allOpt);

  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
    const opt = document.createElement('option');
    opt.value = letter;
    opt.textContent = letter;
    letterSelect.appendChild(opt);
  });
}

function filterByLetter(letter) {
  const filtered = vocabData.filter(item => {
    if (!item.Word) return false;
    if (letter === 'all') return true;
    return item.Word.toUpperCase().startsWith(letter);
  });
  // stable alphabetic sort ignoring case
  filtered.sort((a, b) =>
    a.Word.localeCompare(b.Word, undefined, { sensitivity: 'base' })
  );
  return filtered;
}

function resetQueueForLetter(letter) {
  initialList = filterByLetter(letter);
  currentQueue = initialList.slice(); // copy
  learned = [];
  currentIndex = 0;
  updateProgress();
  if (initialList.length === 0) {
    setMsg(`No words for "${letter}"`);
    frontWord.textContent = 'No words found';
    frontInfo.textContent = '';
    backMeaning.textContent = '';
    backExtra.textContent = '';
  } else {
    setMsg('');
    showCard(0);
  }
}

function updateProgress() {
  progressEl.textContent = `Learned ${learned.length} / ${initialList.length}`;
}

function showCard(index) {
  if (initialList.length === 0) {
    frontWord.textContent = '';
    frontInfo.textContent = '';
    backMeaning.textContent = '';
    backExtra.textContent = '';
    return;
  }
  if (currentQueue.length === 0) {
    // all moved on
    showMasteryScreen();
    return;
  }

  // normalize index
  if (index < 0) index = currentQueue.length - 1;
  if (index >= currentQueue.length) index = 0;
  currentIndex = index;

  const card = currentQueue[currentIndex];
  // original position among initialList (stable numbering)
  const originalPos = initialList.findIndex(c => c._uid === card._uid) + 1;
  const total = initialList.length;

  frontWord.textContent = `${originalPos}. ${card.Word}`;
  frontInfo.textContent = `Card ${originalPos} of ${total} — Flip for meaning`;
  backMeaning.textContent = card.Meanings || 'No definition available';

  // Compose Syn/Ant badges (if present)
  let extras = '';
  if (card.Synonym) {
    extras += `<span class="badge-syn">Synonyms</span> ${escapeHtml(card.Synonym)}<br/>`;
  }
  if (card.Antonym) {
    extras += `<span class="badge-ant">Antonyms</span> ${escapeHtml(card.Antonym)}<br/>`;
  }
  backExtra.innerHTML = extras;

  // ensure front-facing
  cardInner.classList.remove('flipped');
  updateProgress();
}

// safe escape for HTML insertion
function escapeHtml(s){ if (!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// --- Actions ---
function flipCard() {
  if (currentQueue.length === 0) return;
  cardInner.classList.toggle('flipped');
}

function doItAgain() {
  if (currentQueue.length === 0) return;
  const card = currentQueue.splice(currentIndex, 1)[0];
  currentQueue.push(card);
  if (currentIndex >= currentQueue.length) currentIndex = 0;
  showCard(currentIndex);
}

function moveOn() {
  if (currentQueue.length === 0) return;
  const card = currentQueue.splice(currentIndex, 1)[0];
  learned.push(card);
  if (currentIndex >= currentQueue.length) currentIndex = 0;
  updateProgress();
  if (currentQueue.length === 0) {
    showMasteryScreen();
  } else {
    showCard(currentIndex);
  }
}

function showMasteryScreen() {
  masteryOverlay.style.display = 'flex';
  masteredList.innerHTML = '';
  learned.forEach((c, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${i+1}. ${escapeHtml(c.Word)}</strong>
      <div class="small text-muted" style="margin-top:6px">${escapeHtml(c.Meanings || '')}${c.Synonym?'<br><em>Syn:</em> '+escapeHtml(c.Synonym):''}${c.Antonym?'<br><em>Ant:</em> '+escapeHtml(c.Antonym):''}</div>`;
    masteredList.appendChild(li);
  });
  masterCount.textContent = `You mastered ${learned.length} of ${initialList.length} words`;
}

// --- Data loading ---
async function loadVocab() {
  try {
    setMsg('Loading vocab-data.json…');
    const resp = await fetch('vocab-data.json', {cache:'no-store'});
    if (!resp.ok) throw new Error('Network response not OK');
    const data = await resp.json();
    vocabData = assignUIDs(data);
    populateLetterOptions();
    resetQueueForLetter('all');
    setMsg('');
  } catch (err) {
    console.warn('Failed to load vocab-data.json:', err);
    setMsg('Could not load vocab-data.json — using small sample.', true);
    // small fallback sample so UI is usable
    const sample = [
      {Word:'venom', Meanings:'poison, toxin, bane, acrimony', Synonym:'toxin, poison', Antonym:'antidote, remedy'},
      {Word:'Thickset', Meanings:'Stout or stocky', Synonym:'Sturdy, Stocky', Antonym:'Thin, Slender'},
      {Word:'loll', Meanings:'rest; to sit or stand in a lazy way; hang (dog’s tongue)', Synonym:'Lounge, Recline', Antonym:'Stand upright'}
    ];
    vocabData = assignUIDs(sample);
    populateLetterOptions();
    resetQueueForLetter('all');
  }
}

// make sure each object has a stable uid
function assignUIDs(arr) {
  return arr.map((o, i) => ({ ...o, _uid: i }));
}

// --- Event wiring ---
document.addEventListener('DOMContentLoaded', () => {
  populateLetterOptions();
  loadVocab();

  // alphabet change
  letterSelect.addEventListener('change', (e) => {
    resetQueueForLetter(e.target.value);
  });

  // navigation
  nextBtn.addEventListener('click', () => {
    if (currentQueue.length === 0) return;
    const nextIndex = (currentIndex + 1) % currentQueue.length;
    showCard(nextIndex);
  });
  prevBtn.addEventListener('click', () => {
    if (currentQueue.length === 0) return;
    const prevIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
    showCard(prevIndex);
  });

  // flip via button and clicking on card (but avoid flipping when clicking recall buttons)
  flipBtn.addEventListener('click', flipCard);
  cardInner.addEventListener('click', (ev) => {
    if (ev.target.closest('button')) return; // don't flip when interacting with buttons inside card
    flipCard();
  });

  // recall actions
  againBtn.addEventListener('click', (e) => { e.stopPropagation(); doItAgain(); });
  moveOnBtn.addEventListener('click', (e) => { e.stopPropagation(); moveOn(); });

  // reset
  clearProgressBtn.addEventListener('click', () => {
    resetQueueForLetter(letterSelect.value || 'all');
  });

  // mastery overlay actions
  closeMastery.addEventListener('click', () => { masteryOverlay.style.display = 'none'; });
  restartAlphabet.addEventListener('click', () => {
    masteryOverlay.style.display = 'none';
    resetQueueForLetter(letterSelect.value || 'all');
  });

  // keyboard: left/right/space
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextBtn.click();
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); flipBtn.click(); }
  });
});
