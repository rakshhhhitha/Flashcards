// script.js — works with vocab-data.json entries using keys:
// "Word", "Meanings", optional "Synonym", optional "Antonym"

// State
let vocabData = [];    // entire dataset with stable _uid
let initialList = [];  // filtered list (selected alphabet), ordered
let currentQueue = []; // remaining queue (objects from initialList)
let learned = [];      // mastered words (order moved-on)
let currentIndex = 0;  // index into currentQueue

// DOM refs
const letterSelect = document.getElementById('letterSelect');
const resetBtn = document.getElementById('resetBtn');
const msgEl = document.getElementById('msg');
const progressEl = document.getElementById('progress');

const cardInner = document.getElementById('cardInner');
const card = document.getElementById('card');
const frontWord = document.getElementById('frontWord');
const frontInfo = document.getElementById('frontInfo');
const backMeaning = document.getElementById('backMeaning');
const backExtra = document.getElementById('backExtra');

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const flipBtn = document.getElementById('flipBtn');
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
  return arr.map((o, i) => ({ ...o, _uid: i }));
}

function populateAlphabet() {
  letterSelect.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All';
  letterSelect.appendChild(allOpt);

  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(L => {
    const opt = document.createElement('option');
    opt.value = L;
    opt.textContent = L;
    letterSelect.appendChild(opt);
  });
}

function filterBy(letter) {
  const filtered = vocabData.filter(item => {
    if (!item.Word) return false;
    if (letter === 'all') return true;
    return item.Word.toUpperCase().startsWith(letter);
  });
  filtered.sort((a,b) => a.Word.localeCompare(b.Word, undefined, { sensitivity: 'base' }));
  return filtered;
}

function resetQueue(letter) {
  initialList = filterBy(letter);
  currentQueue = initialList.slice(); // copy
  learned = [];
  currentIndex = 0;
  updateProgress();
  if (initialList.length === 0) {
    setMsg(`No words for "${letter}"`);
    showEmpty();
  } else {
    setMsg('');
    showCard(0);
  }
}

function updateProgress() {
  progressEl.textContent = `Learned ${learned.length} / ${initialList.length}`;
}

function showEmpty() {
  frontWord.textContent = 'No words';
  frontInfo.textContent = '';
  backMeaning.textContent = '';
  backExtra.textContent = '';
  card.classList.remove('flipped');
}

function showCard(index) {
  if (initialList.length === 0) {
    showEmpty();
    return;
  }
  if (currentQueue.length === 0) {
    showMastery();
    return;
  }

  // normalize index
  if (index < 0) index = currentQueue.length - 1;
  if (index >= currentQueue.length) index = 0;
  currentIndex = index;

  const cardObj = currentQueue[currentIndex];
  // stable numbering relative to initialList
  const originalPos = initialList.findIndex(c => c._uid === cardObj._uid) + 1;
  const total = initialList.length;

  frontWord.textContent = `${originalPos}. ${cardObj.Word}`;
  frontInfo.textContent = `Card ${originalPos} of ${total} — tap Flip to reveal`;

  backMeaning.textContent = cardObj.Meanings || 'No definition available';

  let extrasHtml = '';
  if (cardObj.Synonym) extrasHtml += `<span class="badge-syn">Synonyms</span> ${escapeHtml(cardObj.Synonym)}<br/>`;
  if (cardObj.Antonym) extrasHtml += `<span class="badge-ant">Antonyms</span> ${escapeHtml(cardObj.Antonym)}<br/>`;
  backExtra.innerHTML = extrasHtml;

  // ensure front-facing
  card.classList.remove('flipped');
  updateProgress();
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

// --- Actions ---
function flipCard() {
  if (currentQueue.length === 0) return;
  card.classList.toggle('flipped');
}

function doItAgain() {
  if (currentQueue.length === 0) return;
  const obj = currentQueue.splice(currentIndex, 1)[0];
  currentQueue.push(obj); // send to end
  if (currentIndex >= currentQueue.length) currentIndex = 0;
  showCard(currentIndex);
}

function moveOn() {
  if (currentQueue.length === 0) return;
  const obj = currentQueue.splice(currentIndex, 1)[0];
  learned.push(obj);
  if (currentIndex >= currentQueue.length) currentIndex = 0;
  updateProgress();
  if (currentQueue.length === 0) {
    showMastery();
  } else {
    showCard(currentIndex);
  }
}

function showMastery() {
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
    const res = await fetch('vocab-data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch vocab-data.json');
    const data = await res.json();
    vocabData = assignUIDs(data);
    populateAlphabet();
    resetQueue('all');
    setMsg('');
  } catch (err) {
    console.warn('Could not fetch vocab-data.json, falling back to sample:', err);
    setMsg('Could not load vocab-data.json — using sample data', true);
    const sample = [
      { Word:'venom', Meanings:'poison, toxin, bane, acrimony', Synonym:'toxin, poison', Antonym:'antidote, remedy' },
      { Word:'Thickset', Meanings:'Stout or stocky', Synonym:'Sturdy, Stocky', Antonym:'Thin, Slender' },
      { Word:'loll', Meanings:'rest; to sit or stand in a lazy way', Synonym:'Lounge, Recline', Antonym:'Stand upright' }
    ];
    vocabData = assignUIDs(sample);
    populateAlphabet();
    resetQueue('all');
  }
}

// --- Wiring & init ---
document.addEventListener('DOMContentLoaded', () => {
  populateAlphabet();
  loadVocab();

  letterSelect.addEventListener('change', (e) => {
    resetQueue(e.target.value);
  });

  prevBtn.addEventListener('click', () => {
    if (currentQueue.length === 0) return;
    const prev = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
    showCard(prev);
  });

  nextBtn.addEventListener('click', () => {
    if (currentQueue.length === 0) return;
    const next = (currentIndex + 1) % currentQueue.length;
    showCard(next);
  });

  flipBtn.addEventListener('click', (e) => { e.stopPropagation(); flipCard(); });
  card.addEventListener('click', (ev) => {
    // avoid flipping when clicking buttons (not applicable here because buttons are outside the .card),
    // but keep safety check for any inner content
    if (ev.target.closest('button')) return;
    flipCard();
  });

  againBtn.addEventListener('click', (e) => { e.stopPropagation(); doItAgain(); });
  moveOnBtn.addEventListener('click', (e) => { e.stopPropagation(); moveOn(); });

  resetBtn.addEventListener('click', () => {
    resetQueue(letterSelect.value || 'all');
  });

  closeMastery.addEventListener('click', () => { masteryOverlay.style.display = 'none'; });
  restartAlphabet.addEventListener('click', () => {
    masteryOverlay.style.display = 'none';
    resetQueue(letterSelect.value || 'all');
  });

  // keyboard: optional
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextBtn.click();
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); flipBtn.click(); }
  });
});
