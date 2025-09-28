// script.js
// Robust loader + UI for vocab-data.json (handles array or grouped-by-letter formats)

const letterSelect = document.getElementById('letterSelect');
const progressEl = document.getElementById('progress');
const messageEl = document.getElementById('message');

const flashcard = document.getElementById('flashcard');
const frontFace = flashcard.querySelector('.face.front');
const backFace = flashcard.querySelector('.face.back');

const prevBtn = document.getElementById('prev');
const flipBtn = document.getElementById('flip');
const nextBtn = document.getElementById('next');

let dataset = {};      // { "A": [ {Word, Meanings, Synonym, Antonym}, ... ], ... }
let letters = [];      // sorted available letters
let currentLetter = null;
let queue = [];        // current working queue (array of card objects)
let learned = [];      // learned list for current letter (session)
let currentIndex = 0;
let flipped = false;
let reviewButtonsContainer = null;

// helpers
function escapeHTML(s){ if (s == null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function setProgress(text){ progressEl.textContent = text || ''; }
function setMessage(text){ messageEl.innerHTML = text || ''; }

// Attempt to parse many shapes of vocab-data.json
function parseData(raw) {
  if (Array.isArray(raw)) {
    const map = {};
    raw.forEach(item => {
      const w = (item.Word || item.word || '').toString().trim();
      if (!w) return;
      const letter = w[0].toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(item);
    });
    Object.keys(map).forEach(k => {
      map[k].sort((a,b) => (a.Word || a.word || '').toLowerCase().localeCompare((b.Word || b.word || '').toLowerCase()));
    });
    return map;
  }

  if (raw && typeof raw === 'object') {
    // If keys are single letters -> treat as grouped object
    const keys = Object.keys(raw || {});
    const letterKeys = keys.filter(k => /^[A-Za-z]$/.test(k));
    if (letterKeys.length >= 1) {
      const map = {};
      letterKeys.sort().forEach(k => {
        map[k.toUpperCase()] = Array.isArray(raw[k]) ? raw[k].slice() : [];
      });
      Object.keys(map).forEach(k => {
        map[k].sort((a,b) => ((a.Word || a.word || '')).toLowerCase().localeCompare((b.Word || b.word || '').toLowerCase()));
      });
      return map;
    }

    // wrapper patterns: { data: [...]} or { words: [...] }
    const wrappers = ['data','words','items','vocab'];
    for (const w of wrappers) {
      if (Array.isArray(raw[w])) return parseData(raw[w]);
    }

    // fallback: find object values that look like arrays of words
    const maybe = {};
    keys.forEach(k => {
      if (Array.isArray(raw[k]) && raw[k].length > 0 && (raw[k][0].Word || raw[k][0].word)) {
        maybe[k.toUpperCase()] = raw[k].slice();
      }
    });
    if (Object.keys(maybe).length) {
      Object.keys(maybe).forEach(k => {
        maybe[k].sort((a,b)=>((a.Word||a.word||'').toLowerCase().localeCompare((b.Word||b.word||'').toLowerCase())));
      });
      return maybe;
    }
  }

  return null;
}

function populateLetters(map) {
  letterSelect.innerHTML = '';
  letters = Object.keys(map).sort();
  if (!letters.length) {
    const opt = document.createElement('option');
    opt.textContent = '—';
    opt.disabled = true;
    letterSelect.appendChild(opt);
    return;
  }
  // add 'All' option at top
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All';
  letterSelect.appendChild(allOpt);

  letters.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = l;
    letterSelect.appendChild(opt);
  });
}

function resetQueue(selection) {
  if (selection === 'all') {
    // flatten all letters into one queue
    queue = [];
    const sortedLetters = Object.keys(dataset).sort();
    sortedLetters.forEach(l => {
      (dataset[l] || []).forEach(card => queue.push(card));
    });
    queue.sort((a,b) => (a.Word||'').toLowerCase().localeCompare((b.Word||'').toLowerCase()));
    currentLetter = 'all';
  } else {
    currentLetter = selection;
    queue = (dataset[selection] || []).slice();
  }
  learned = [];
  currentIndex = 0;
  flipped = false;
  flashcard.classList.remove('flipped');
  removeReviewButtons();
  renderCard();
  setProgress(`Remaining: ${queue.length} • Learned: ${learned.length}`);
  setMessage('');
}

// Render card front/back and update UI state
function renderCard() {
  if (!queue.length) {
    frontFace.innerHTML = `<div style="color:var(--muted)">No words for ${escapeHTML(currentLetter || 'this selection')}</div>`;
    backFace.innerHTML = '';
    setProgress(`Remaining: 0 • Learned: ${learned.length}`);
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    flipBtn.disabled = true;
    return;
  }

  const card = queue[currentIndex];
  const word = card.Word || card.word || 'No word';
  const meaning = card.Meanings || card.Meaning || card.meanings || card.Definition || '';
  const synonym = card.Synonym || card.synonym || card.Synonyms || '';
  const antonym = card.Antonym || card.antonym || '';

  frontFace.innerHTML = `<div class="word-count">(${currentIndex + 1}/${queue.length})</div>
                         <div class="word">${escapeHTML(word)}</div>`;

  backFace.innerHTML = `<div class="card-details">
                         <p><strong>Meaning:</strong> ${escapeHTML(meaning || '—')}</p>
                         <p><strong>Synonym:</strong> ${escapeHTML(synonym || '—')}</p>
                         <p><strong>Antonym:</strong> ${escapeHTML(antonym || '—')}</p>
                        </div>`;

  setProgress(`Remaining: ${queue.length - currentIndex - 1} • Learned: ${learned.length}`);

  prevBtn.disabled = (queue.length <= 1); // if only one card, prev meaningless
  nextBtn.disabled = false;
  flipBtn.disabled = false;

  // ensure correct face visible
  if (!flipped) {
    flashcard.classList.remove('flipped');
    frontFace.setAttribute('aria-hidden', 'false');
    backFace.setAttribute('aria-hidden', 'true');
  } else {
    flashcard.classList.add('flipped');
    frontFace.setAttribute('aria-hidden', 'true');
    backFace.setAttribute('aria-hidden', 'false');
  }
}

// Review buttons
function showReviewButtons() {
  if (reviewButtonsContainer) return;
  reviewButtonsContainer = document.createElement('div');
  reviewButtonsContainer.className = 'review-buttons';

  const againBtn = document.createElement('button');
  againBtn.textContent = 'Do it again';
  againBtn.className = 'btn btn-outline-danger btn-sm';
  againBtn.addEventListener('click', (e) => { e.stopPropagation(); handleReview(false); });

  const moveOnBtn = document.createElement('button');
  moveOnBtn.textContent = 'Move on';
  moveOnBtn.className = 'btn btn-success btn-sm';
  moveOnBtn.addEventListener('click', (e) => { e.stopPropagation(); handleReview(true); });

  reviewButtonsContainer.appendChild(againBtn);
  reviewButtonsContainer.appendChild(moveOnBtn);

  flashcard.parentElement.appendChild(reviewButtonsContainer);

  // hide flip & disable nav while choosing
  flipBtn.style.display = 'none';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

function removeReviewButtons() {
  if (reviewButtonsContainer) {
    reviewButtonsContainer.remove();
    reviewButtonsContainer = null;
  }
  flipBtn.style.display = '';
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// When user clicks Do it again / Move on
function handleReview(moveOn) {
  if (!queue.length) return;
  const card = queue[currentIndex];

  if (moveOn) {
    learned.push(card);
    queue.splice(currentIndex, 1);
  } else {
    const removed = queue.splice(currentIndex, 1)[0];
    const insertPos = Math.min(currentIndex + 1, queue.length);
    queue.splice(insertPos, 0, removed);
  }

  removeReviewButtons();

  if (!queue.length) {
    showCompletionScreen();
    return;
  }
  if (currentIndex >= queue.length) currentIndex = 0;
  flipped = false;
  renderCard();
}

// flip card
function flipCard(e) {
  if (!queue.length) return;
  if (e && e.target && e.target.closest && e.target.closest('.review-buttons')) return;
  flipped = !flipped;
  if (flipped) {
    flashcard.classList.add('flipped');
    showReviewButtons();
  } else {
    flashcard.classList.remove('flipped');
    removeReviewButtons();
  }
}

// prev/next navigation (wrap-around)
function nextCard() {
  if (!queue.length) return;
  currentIndex = (currentIndex + 1) % queue.length;
  flipped = false;
  removeReviewButtons();
  renderCard();
}
function prevCard() {
  if (!queue.length) return;
  currentIndex = (currentIndex - 1 + queue.length) % queue.length;
  flipped = false;
  removeReviewButtons();
  renderCard();
}

// completion screen when queue empty
function showCompletionScreen() {
  const letter = currentLetter;
  frontFace.innerHTML = '';
  backFace.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'completion';
  container.innerHTML = `<h2>🎉 You have mastered all words for <strong>${escapeHTML(letter)}</strong>!</h2>
                         <p>Great job — choose an action below.</p>`;

  const actions = document.createElement('div');
  actions.className = 'actions';

  const restart = document.createElement('button');
  restart.className = 'btn btn-outline-primary';
  restart.textContent = `Restart ${escapeHTML(letter)}`;
  restart.addEventListener('click', () => {
    resetQueue(letter);
    container.remove();
  });

  const nextAlpha = document.createElement('button');
  nextAlpha.className = 'btn btn-success';
  nextAlpha.textContent = 'Next Alphabet →';
  nextAlpha.addEventListener('click', () => {
    goToNextAlphabet();
    container.remove();
  });

  actions.appendChild(restart);
  actions.appendChild(nextAlpha);
  container.appendChild(actions);

  frontFace.appendChild(container);

  // disable controls while at completion
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  flipBtn.style.display = 'none';

  setProgress(`Remaining: 0 • Learned: ${learned.length}`);
}

// find and go to next available letter (skips letters without words)
function goToNextAlphabet() {
  const idx = letters.indexOf(currentLetter);
  for (let i = idx + 1; i < letters.length; ++i) {
    const l = letters[i];
    if (dataset[l] && dataset[l].length) {
      letterSelect.value = l;
      resetQueue(l);
      return;
    }
  }
  // nothing more
  setMessage('🏆 You have completed all available alphabets!');
}

// initialize: fetch and parse file, then populate select
async function init() {
  setProgress('Loading vocab-data.json...');
  setMessage('');

  try {
    const resp = await fetch('vocab-data.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();
    const parsed = parseData(raw);
    if (!parsed || Object.keys(parsed).length === 0) {
      throw new Error('Parsed dataset is empty or unknown shape.');
    }
    dataset = parsed;
  } catch (err) {
    console.error('Failed to load vocab-data.json:', err);
    if (location.protocol === 'file:') {
      setMessage('⚠️ Loading local files via file:// may be blocked by the browser. Run a local server (e.g. `python3 -m http.server`) and open http://localhost:8000');
    } else {
      setMessage('⚠️ Failed to load vocab-data.json — using a small fallback sample for testing.');
    }
    // fallback sample so UI is usable
    const fallback = [
      { Word: 'Apple', Meanings: 'A fruit', Synonym: 'Fruit', Antonym: '—' },
      { Word: 'Abridge', Meanings: 'To shorten', Synonym: 'Condense', Antonym: 'Expand' },
      { Word: 'Zany', Meanings: 'Clownish', Synonym: 'Wacky', Antonym: 'Sober' },
      { Word: 'Zeal', Meanings: 'Enthusiasm', Synonym: 'Passion', Antonym: 'Apathy' }
    ];
    dataset = parseData(fallback);
  }

  // build letter list and populate select
  letters = Object.keys(dataset).sort();
  populateLetters(dataset);

  if (letters.length === 0) {
    setProgress('No words found in dataset.');
    setMessage('Your vocab-data.json appears empty or has an unexpected shape. See console for details.');
    frontFace.innerHTML = `<div style="color:var(--muted)">No data available</div>`;
    return;
  }

  // choose first available letter by default
  const first = letters[0];
  letterSelect.value = first;
  resetQueue(first);
  setProgress(`Remaining: ${queue.length} • Learned: ${learned.length}`);
}

// wire events
document.addEventListener('DOMContentLoaded', () => {
  // ensure flashcard inner exists (in case HTML changed)
  if (!flashcard.querySelector('.face.front')) {
    flashcard.innerHTML = `<div class="flashcard-inner"><div class="face front"></div><div class="face back"></div></div>`;
  }

  init();

  letterSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'all') resetQueue('all');
    else resetQueue(val);
  });

  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevCard(); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextCard(); });
  flipBtn.addEventListener('click', (e) => { e.stopPropagation(); flipCard(e); });

  flashcard.addEventListener('click', (e) => flipCard(e));

  // keyboard shortcuts
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') prevCard();
    else if (ev.key === 'ArrowRight') nextCard();
    else if (ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); flipCard(ev); }
  });
});
