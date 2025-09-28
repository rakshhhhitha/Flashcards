// Robust fetch + file-input fallback + correct flip/back content
// Works with vocab-data.json that is:
//  - an array of objects [{Word, Meanings, Synonym, Antonym}, ...]
//  - OR an object grouped by letter { "A": [...], "B": [...] }
//  - OR wrappers like { data: [...] } etc.

const letterSelect = document.getElementById('letterSelect');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const messageEl = document.getElementById('message');

const flashcard = document.getElementById('flashcard');
const frontFace = flashcard.querySelector('.face.front');
const backFace = flashcard.querySelector('.face.back');

const reviewContainer = document.getElementById('reviewContainer');

const prevBtn = document.getElementById('prevBtn');
const flipBtn = document.getElementById('flipBtn');
const nextBtn = document.getElementById('nextBtn');

const fileInput = document.getElementById('fileInput');
const sampleBtn = document.getElementById('sampleBtn');

let dataset = {};     // grouped dataset by letter
let letters = [];
let currentLetter = null;
let queue = [];
let learned = [];
let currentIndex = 0;
let flipped = false;
let originalCount = 0;
let reviewButtons = null;

// helpers
const esc = s => (s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'));
const setProgress = txt => progressText.textContent = txt || '';
const setMessage = txt => messageEl.innerHTML = txt || '';
const setProgressBar = pct => progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;

// Parse flexible JSON shapes
function parseData(raw) {
  if (Array.isArray(raw)) {
    const map = {};
    raw.forEach(it => {
      const w = (it.Word || it.word || '').toString().trim();
      if (!w) return;
      const L = w[0].toUpperCase();
      if (!map[L]) map[L] = [];
      map[L].push(it);
    });
    Object.keys(map).forEach(k => map[k].sort((a,b)=>(a.Word||a.word||'').toLowerCase().localeCompare((b.Word||b.word||'').toLowerCase())));
    return map;
  }
  if (raw && typeof raw === 'object') {
    const keys = Object.keys(raw);
    const letterKeys = keys.filter(k => /^[A-Za-z]$/.test(k));
    if (letterKeys.length) {
      const map = {};
      letterKeys.sort().forEach(k => map[k.toUpperCase()] = Array.isArray(raw[k]) ? raw[k].slice() : []);
      Object.keys(map).forEach(k => map[k].sort((a,b)=>(a.Word||a.word||'').toLowerCase().localeCompare((b.Word||b.word||'').toLowerCase())));
      return map;
    }
    const wrappers = ['data','words','items','vocab'];
    for (const w of wrappers) if (Array.isArray(raw[w])) return parseData(raw[w]);
    // fallback detect arrays of word-objects in values
    const maybe = {};
    keys.forEach(k => {
      if (Array.isArray(raw[k]) && raw[k].length && (raw[k][0].Word || raw[k][0].word)) maybe[k.toUpperCase()] = raw[k].slice();
    });
    if (Object.keys(maybe).length) {
      Object.keys(maybe).forEach(k=> maybe[k].sort((a,b)=>(a.Word||a.word||'').toLowerCase().localeCompare((b.Word||b.word||'').toLowerCase())));
      return maybe;
    }
  }
  return null;
}

// Populate select options
function populateSelect(map) {
  letterSelect.innerHTML = '';
  letters = Object.keys(map).sort();
  if (!letters.length) {
    const opt = document.createElement('option');
    opt.textContent = '—';
    opt.disabled = true;
    letterSelect.appendChild(opt);
    return;
  }
  const allOpt = document.createElement('option'); allOpt.value='all'; allOpt.textContent='All';
  letterSelect.appendChild(allOpt);
  letters.forEach(l=>{
    const o = document.createElement('option'); o.value = l; o.textContent = l;
    letterSelect.appendChild(o);
  });
}

// Reset queue for selection
function resetQueue(selection) {
  if (selection === 'all') {
    queue = [];
    Object.keys(dataset).sort().forEach(k => (dataset[k]||[]).forEach(c => queue.push(c)));
    queue.sort((a,b)=>(a.Word||a.word||'').toLowerCase().localeCompare((b.Word||b.word||'').toLowerCase()));
    currentLetter = 'all';
  } else {
    currentLetter = selection;
    queue = (dataset[selection] || []).slice();
  }
  originalCount = queue.length;
  learned = [];
  currentIndex = 0;
  flipped = false;
  flashcard.classList.remove('flipped');
  removeReviewButtons();
  renderCard();
  updateProgressUI();
}

// Render front/back ALWAYS populated correctly
function renderCard() {
  if (!queue.length) {
    frontFace.innerHTML = `<div style="color:${getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#888'}">No words for ${esc(currentLetter || 'this selection')}.</div>`;
    backFace.innerHTML = '';
    setProgress(`Remaining: 0 • Learned: ${learned.length}`);
    prevBtn.disabled = true; nextBtn.disabled = true; flipBtn.disabled = true;
    setProgressBar(0);
    return;
  }

  const card = queue[currentIndex];
  const word = card.Word || card.word || 'No word';
  const meaning = card.Meanings || card.Meaning || card.meanings || card.Definition || '';
  const synonym = card.Synonym || card.synonym || card.Synonyms || '';
  const antonym = card.Antonym || card.antonym || '';

  // front: word + count
  frontFace.innerHTML = `<div class="word-count">(${currentIndex+1}/${queue.length})</div>
                         <div class="word">${esc(word)}</div>`;

  // back: meaning/synonym/antonym (this is critical)
  backFace.innerHTML = `<div class="card-details">
                          <p><strong>Meaning:</strong> ${esc(meaning || '—')}</p>
                          <p><strong>Synonym:</strong> ${esc(synonym || '—')}</p>
                          <p><strong>Antonym:</strong> ${esc(antonym || '—')}</p>
                        </div>`;

  const remaining = queue.length - currentIndex - 1;
  setProgress(`Remaining: ${remaining} • Learned: ${learned.length}`);
  const percent = originalCount ? Math.round((learned.length / originalCount) * 100) : 0;
  setProgressBar(percent);

  prevBtn.disabled = (queue.length <= 1);
  nextBtn.disabled = false;
  flipBtn.disabled = false;

  // ensure visibility matches flipped state
  if (!flipped) {
    flashcard.classList.remove('flipped');
    frontFace.setAttribute('aria-hidden','false');
    backFace.setAttribute('aria-hidden','true');
  } else {
    flashcard.classList.add('flipped');
    frontFace.setAttribute('aria-hidden','true');
    backFace.setAttribute('aria-hidden','false');
  }
}

// Review buttons handling
function showReviewButtons() {
  if (reviewButtons) return;
  reviewButtons = document.createElement('div');
  reviewButtons.className = 'review-buttons';

  const again = document.createElement('button');
  again.className = 'btn btn-outline-danger';
  again.textContent = 'Do it again';
  again.addEventListener('click', (e)=>{ e.stopPropagation(); handleReview(false); });

  const moveOn = document.createElement('button');
  moveOn.className = 'btn btn-success';
  moveOn.textContent = 'Move on';
  moveOn.addEventListener('click', (e)=>{ e.stopPropagation(); handleReview(true); });

  reviewButtons.appendChild(again);
  reviewButtons.appendChild(moveOn);

  reviewContainer.appendChild(reviewButtons);

  flipBtn.style.display = 'none';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

function removeReviewButtons() {
  if (!reviewButtons) return;
  reviewButtons.remove();
  reviewButtons = null;
  flipBtn.style.display = '';
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// handle the judgement
function handleReview(moveOn) {
  if (!queue.length) return;
  const card = queue[currentIndex];

  if (moveOn) {
    learned.push(card);
    queue.splice(currentIndex,1);
  } else {
    const removed = queue.splice(currentIndex,1)[0];
    const insertPos = Math.min(currentIndex + 1, queue.length);
    queue.splice(insertPos, 0, removed);
  }

  removeReviewButtons();

  if (!queue.length) {
    showCompletion();
    return;
  }
  if (currentIndex >= queue.length) currentIndex = 0;
  flipped = false;
  renderCard();
  updateProgressUI();
}

// Flip: toggles .flipped and shows review buttons when showing back
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

// prev / next
function prevCard() {
  if (!queue.length) return;
  currentIndex = (currentIndex - 1 + queue.length) % queue.length;
  flipped = false; removeReviewButtons(); renderCard();
}
function nextCard() {
  if (!queue.length) return;
  currentIndex = (currentIndex + 1) % queue.length;
  flipped = false; removeReviewButtons(); renderCard();
}

// completion UI
function showCompletion() {
  frontFace.innerHTML = '';
  backFace.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'completion';
  box.innerHTML = `<h2>🎉 You have mastered <strong>${esc(currentLetter)}</strong>!</h2>
                   <p>Move to the next alphabet or restart this one.</p>`;

  const actions = document.createElement('div');
  actions.className = 'd-flex gap-2';

  const restart = document.createElement('button');
  restart.className = 'btn btn-outline-primary';
  restart.textContent = `Restart ${esc(currentLetter)}`;
  restart.addEventListener('click', ()=> { resetQueue(currentLetter); box.remove(); });

  const nextAlpha = document.createElement('button');
  nextAlpha.className = 'btn btn-success';
  nextAlpha.textContent = 'Next Alphabet →';
  nextAlpha.addEventListener('click', ()=> { goToNextAlphabet(); box.remove(); });

  actions.appendChild(restart);
  actions.appendChild(nextAlpha);
  box.appendChild(actions);

  frontFace.appendChild(box);

  prevBtn.disabled = true; nextBtn.disabled = true; flipBtn.style.display = 'none';
  setProgress(`Remaining: 0 • Learned: ${learned.length}`); setProgressBar(100);
}

// find next available alphabet
function goToNextAlphabet() {
  const idx = letters.indexOf(currentLetter);
  for (let i = idx + 1; i < letters.length; ++i) {
    const l = letters[i];
    if (dataset[l] && dataset[l].length) { letterSelect.value = l; resetQueue(l); return; }
  }
  setMessage('🏆 You completed all available alphabets!');
}

// update progress ui
function updateProgressUI() {
  setProgress(`Remaining: ${queue.length} • Learned: ${learned.length}`);
  const percent = originalCount ? Math.round((learned.length / originalCount) * 100) : 0;
  setProgressBar(percent);
}

// initialization: try fetch then fallback to file input
async function init() {
  setProgress('Loading vocab-data.json...');
  setMessage('');

  try {
    const resp = await fetch('vocab-data.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const raw = await resp.json();
    const parsed = parseData(raw);
    if (!parsed || Object.keys(parsed).length === 0) throw new Error('Empty/unknown shape');
    dataset = parsed;
  } catch (err) {
    console.warn('Fetch failed or parsing failed:', err);
    setMessage('Could not auto-load vocab-data.json. Choose the file manually below (no server needed), or click "Use sample data".');
    // leave dataset empty until user loads file or uses sample
    dataset = {};
  }

  letters = Object.keys(dataset).sort();
  populateSelect(dataset);

  if (letters.length) {
    const first = letters[0];
    letterSelect.value = first;
    resetQueue(first);
  } else {
    // show empty UI until user loads file
    frontFace.innerHTML = `<div style="color:var(--muted)">No data loaded. Please choose your vocab-data.json below or click "Use sample data".</div>`;
    backFace.innerHTML = '';
    setProgress('Remaining: 0 • Learned: 0');
    setProgressBar(0);
  }
}

// file input handler: reads local file and parses
fileInput.addEventListener('change', (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = JSON.parse(reader.result);
      const parsed = parseData(raw);
      if (!parsed || Object.keys(parsed).length === 0) throw new Error('Parsed dataset empty');
      dataset = parsed;
      letters = Object.keys(dataset).sort();
      populateSelect(dataset);
      letterSelect.value = letters[0];
      resetQueue(letters[0]);
      setMessage('Loaded vocab-data.json from file.');
    } catch (e) {
      console.error(e);
      setMessage('Failed to parse JSON file. Please check the format.');
    }
  };
  reader.onerror = () => setMessage('Failed reading file.');
  reader.readAsText(f);
});

// sample button: load small sample for testing
sampleBtn.addEventListener('click', () => {
  const fallback = [
    { Word:'Apple', Meanings:'A fruit; e.g. a pome', Synonym:'Fruit', Antonym:'—' },
    { Word:'Abridge', Meanings:'To shorten text while keeping meaning', Synonym:'Condense', Antonym:'Expand' },
    { Word:'Zeal', Meanings:'Great enthusiasm', Synonym:'Passion', Antonym:'Apathy' },
    { Word:'Zany', Meanings:'Amusingly unconventional', Synonym:'Wacky', Antonym:'Sober' }
  ];
  dataset = parseData(fallback);
  letters = Object.keys(dataset).sort();
  populateSelect(dataset);
  letterSelect.value = letters[0];
  resetQueue(letters[0]);
  setMessage('Sample data loaded.');
});

// select change
letterSelect.addEventListener('change', e => {
  const v = e.target.value;
  if (!v) return;
  if (v === 'all') resetQueue('all'); else resetQueue(v);
});

// button events — stop propagation so click won't flip the card
prevBtn.addEventListener('click', e => { e.stopPropagation(); prevCard(); });
nextBtn.addEventListener('click', e => { e.stopPropagation(); nextCard(); });
flipBtn.addEventListener('click', e => { e.stopPropagation(); flipCard(e); });

// flashcard click flips (unless click inside review buttons)
flashcard.addEventListener('click', e => flipCard(e));

// keyboard
document.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowLeft') prevCard();
  else if (ev.key === 'ArrowRight') nextCard();
  else if (ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); flipCard(ev); }
});

// convenience wrapper prev/next
function prevCard(){ if (queue.length) { currentIndex = (currentIndex - 1 + queue.length) % queue.length; flipped = false; removeReviewButtons(); renderCard(); } }
function nextCard(){ if (queue.length) { currentIndex = (currentIndex + 1) % queue.length; flipped = false; removeReviewButtons(); renderCard(); } }

// start
init();
