// script.js
// Robust loader + correct flip logic (back always shows Meaning/Synonym/Antonym),
// responsive improvements and small UI niceties.

const letterSelect = document.getElementById('letterSelect');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const messageEl = document.getElementById('message');

const flashcard = document.getElementById('flashcard');
const frontFace = flashcard.querySelector('.face.front');
const backFace = flashcard.querySelector('.face.back');

const reviewContainer = document.getElementById('reviewContainer');

const prevBtn = document.getElementById('prev');
const flipBtn = document.getElementById('flip');
const nextBtn = document.getElementById('next');

let dataset = {};        // grouped dataset { A: [...], B: [...] }
let letters = [];        // available letters sorted
let currentLetter = null;
let originalCount = 0;   // number of cards at start for current letter (for %)
let queue = [];          // working queue (cards left)
let learned = [];        // learned cards this session (for current letter)
let currentIndex = 0;
let flipped = false;
let reviewButtons = null;

// HTML escape
function esc(s){ if (s == null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function setProgressText(s){ progressText.textContent = s || ''; }
function setMessage(s){ messageEl.innerHTML = s || ''; }
function setProgressBar(percent){
  progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

// parse dataset that may be an array or object
function parseData(raw){
  if (Array.isArray(raw)){
    const map = {};
    raw.forEach(item => {
      const w = (item.Word || item.word || '').toString().trim();
      if (!w) return;
      const L = w[0].toUpperCase();
      if (!map[L]) map[L] = [];
      map[L].push(item);
    });
    Object.keys(map).forEach(k => map[k].sort((a,b)=> (a.Word||a.word).toLowerCase().localeCompare((b.Word||b.word).toLowerCase())));
    return map;
  }
  if (raw && typeof raw === 'object'){
    // grouped by letter already?
    const keys = Object.keys(raw || {});
    const letterKeys = keys.filter(k => /^[A-Za-z]$/.test(k));
    if (letterKeys.length) {
      const map = {};
      letterKeys.sort().forEach(k => { map[k.toUpperCase()] = Array.isArray(raw[k]) ? raw[k].slice() : []; });
      Object.keys(map).forEach(k => map[k].sort((a,b)=> ((a.Word||a.word||'')).toLowerCase().localeCompare((b.Word||b.word||'').toLowerCase())));
      return map;
    }
    // wrapper: data: [...]
    const wrappers = ['data','words','items','vocab'];
    for (const w of wrappers) if (Array.isArray(raw[w])) return parseData(raw[w]);
    // fallback: detect keys that are arrays of words
    const maybe = {};
    keys.forEach(k => {
      if (Array.isArray(raw[k]) && raw[k].length && (raw[k][0].Word || raw[k][0].word)) maybe[k.toUpperCase()] = raw[k].slice();
    });
    if (Object.keys(maybe).length) {
      Object.keys(maybe).forEach(k => maybe[k].sort((a,b)=>((a.Word||a.word||'')).toLowerCase().localeCompare((b.Word||b.word||'').toLowerCase())));
      return maybe;
    }
  }
  return null;
}

// populate letter select
function populateLetters(map){
  letterSelect.innerHTML = '';
  letters = Object.keys(map).sort();
  if (!letters.length) {
    const opt = document.createElement('option'); opt.textContent = '—'; opt.disabled = true; letterSelect.appendChild(opt);
    return;
  }
  // 'All' option
  const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = 'All'; letterSelect.appendChild(allOpt);
  letters.forEach(l => {
    const o = document.createElement('option'); o.value = l; o.textContent = l; letterSelect.appendChild(o);
  });
}

// reset queue for selected letter (or 'all')
function resetQueue(selection){
  if (selection === 'all') {
    queue = [];
    Object.keys(dataset).sort().forEach(l => (dataset[l]||[]).forEach(card => queue.push(card)));
    queue.sort((a,b)=> (a.Word||a.word||'').toLowerCase().localeCompare((b.Word||b.word||'').toLowerCase()));
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

// render current card
function renderCard(){
  if (!queue.length){
    frontFace.innerHTML = `<div style="color:var(--muted)">No words for ${esc(currentLetter || 'this selection')}</div>`;
    backFace.innerHTML = '';
    setProgressText(`Remaining: 0 • Learned: ${learned.length}`);
    prevBtn.disabled = true; nextBtn.disabled = true; flipBtn.disabled = true;
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

  // back: meaning/synonym/antonym — this is the important part
  backFace.innerHTML = `<div class="card-details">
                          <p><strong>Meaning:</strong> ${esc(meaning || '—')}</p>
                          <p><strong>Synonym:</strong> ${esc(synonym || '—')}</p>
                          <p><strong>Antonym:</strong> ${esc(antonym || '—')}</p>
                        </div>`;

  // update UI states
  const remaining = queue.length - currentIndex - 1;
  setProgressText(`Remaining: ${remaining} • Learned: ${learned.length}`);
  const percent = originalCount ? Math.round((learned.length / originalCount) * 100) : 0;
  setProgressBar(percent);

  prevBtn.disabled = (queue.length <= 1);
  nextBtn.disabled = false;
  flipBtn.disabled = false;

  // ensure correct face visibility
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

// review buttons
function showReviewButtons(){
  if (reviewButtons) return;
  reviewButtons = document.createElement('div');
  reviewButtons.className = 'review-buttons';

  const again = document.createElement('button');
  again.className = 'btn btn-outline-danger';
  again.textContent = 'Do it again';
  again.addEventListener('click', (ev)=>{ ev.stopPropagation(); handleReview(false); });

  const moveOn = document.createElement('button');
  moveOn.className = 'btn btn-success';
  moveOn.textContent = 'Move on';
  moveOn.addEventListener('click', (ev)=>{ ev.stopPropagation(); handleReview(true); });

  reviewButtons.appendChild(again);
  reviewButtons.appendChild(moveOn);

  reviewContainer.appendChild(reviewButtons);

  // disable nav while choosing
  prevBtn.disabled = true; nextBtn.disabled = true; flipBtn.style.display = 'none';
}

function removeReviewButtons(){
  if (!reviewButtons) return;
  reviewButtons.remove();
  reviewButtons = null;
  flipBtn.style.display = '';
  prevBtn.disabled = false; nextBtn.disabled = false;
}

// handle the review choice
function handleReview(moveOn){
  if (!queue.length) return;
  const card = queue[currentIndex];

  if (moveOn){
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
  updateProgressUI();
}

// flipping logic (important: back shows meaning/syn/synonym)
function flipCard(e){
  if (!queue.length) return;
  // prevent flipping when clicking review area
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

// navigation
function nextCard(){
  if (!queue.length) return;
  currentIndex = (currentIndex + 1) % queue.length;
  flipped = false;
  removeReviewButtons();
  renderCard();
}
function prevCard(){
  if (!queue.length) return;
  currentIndex = (currentIndex - 1 + queue.length) % queue.length;
  flipped = false;
  removeReviewButtons();
  renderCard();
}

// completion UI
function showCompletionScreen(){
  const letter = currentLetter;
  frontFace.innerHTML = '';
  backFace.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'completion';
  box.innerHTML = `<h2>🎉 You mastered <strong>${esc(letter)}</strong>!</h2>
                   <p>Nice work — move to the next alphabet or restart this one.</p>`;

  const actions = document.createElement('div');
  actions.className = 'actions';
  const restart = document.createElement('button');
  restart.className = 'btn btn-outline-primary';
  restart.textContent = `Restart ${esc(letter)}`;
  restart.addEventListener('click', ()=> { resetQueue(letter); box.remove(); });

  const nextAlpha = document.createElement('button');
  nextAlpha.className = 'btn btn-success';
  nextAlpha.textContent = 'Next Alphabet →';
  nextAlpha.addEventListener('click', ()=>{
    goToNextAlphabet(); box.remove();
  });

  actions.appendChild(restart);
  actions.appendChild(nextAlpha);
  box.appendChild(actions);

  frontFace.appendChild(box);

  // disable controls
  prevBtn.disabled = true; nextBtn.disabled = true; flipBtn.style.display = 'none';

  setProgressText(`Remaining: 0 • Learned: ${learned.length}`);
  setProgressBar(100);
}

// go to next available letter
function goToNextAlphabet(){
  const idx = letters.indexOf(currentLetter);
  for (let i = idx + 1; i < letters.length; ++i){
    const l = letters[i];
    if (dataset[l] && dataset[l].length) {
      letterSelect.value = l;
      resetQueue(l);
      return;
    }
  }
  setMessage('🏆 You have completed all available alphabets!');
}

// update progress UI (progress bar + text)
function updateProgressUI(){
  setProgressText(`Remaining: ${queue.length} • Learned: ${learned.length}`);
  const percent = originalCount ? Math.round((learned.length / originalCount) * 100) : 0;
  setProgressBar(percent);
}

// init: fetch and prepare dataset
async function init(){
  setProgressText('Loading vocabulary...');
  setMessage('');

  try {
    const resp = await fetch('vocab-data.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const raw = await resp.json();
    const parsed = parseData(raw);
    if (!parsed || Object.keys(parsed).length === 0) throw new Error('No usable data after parsing.');
    dataset = parsed;
  } catch (err) {
    console.error('Failed loading vocab-data.json', err);
    if (location.protocol === 'file:') {
      setMessage('⚠️ fetch() of local files is frequently blocked. Run a local server (e.g. python3 -m http.server 8000).');
    } else {
      setMessage('⚠️ Failed to load vocab-data.json — using a small fallback sample for testing.');
    }
    const fallback = [
      { Word:'Apple', Meanings:'A fruit', Synonym:'Fruit', Antonym:'—' },
      { Word:'Abridge', Meanings:'To shorten', Synonym:'Condense', Antonym:'Expand' },
      { Word:'Zany', Meanings:'Clownish', Synonym:'Wacky', Antonym:'Sober' },
      { Word:'Zeal', Meanings:'Enthusiasm', Synonym:'Passion', Antonym:'Apathy' }
    ];
    dataset = parseData(fallback);
  }

  letters = Object.keys(dataset).sort();
  populateLetters(dataset);

  if (!letters.length) {
    setProgressText('No words found.');
    setMessage('Your vocab-data.json is empty or has an unexpected shape.');
    frontFace.innerHTML = `<div style="color:var(--muted)">No data</div>`;
    return;
  }

  // Choose first available letter
  const first = letters[0];
  letterSelect.value = first;
  resetQueue(first);
  setProgressText(`Remaining: ${queue.length} • Learned: ${learned.length}`);
}

// populate select UI
function populateLetters(map){
  letterSelect.innerHTML = '';
  const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = 'All'; letterSelect.appendChild(allOpt);
  letters = Object.keys(map).sort();
  letters.forEach(l => {
    const o = document.createElement('option'); o.value = l; o.textContent = l; letterSelect.appendChild(o);
  });
}

// wire events
document.addEventListener('DOMContentLoaded', ()=>{
  // ensure faces exist
  if (!frontFace || !backFace) {
    flashcard.innerHTML = `<div class="flashcard-inner"><div class="face front"></div><div class="face back"></div></div>`;
  }

  init();

  letterSelect.addEventListener('change', (e)=>{
    const v = e.target.value;
    if (v === 'all') resetQueue('all');
    else resetQueue(v);
  });

  prevBtn.addEventListener('click', (e)=>{ e.stopPropagation(); prevCard(); });
  nextBtn.addEventListener('click', (e)=>{ e.stopPropagation(); nextCard(); });
  flipBtn.addEventListener('click', (e)=>{ e.stopPropagation(); flipCard(e); });

  // clicking card toggles flip (but ignore clicks inside review buttons)
  flashcard.addEventListener('click', (e)=> flipCard(e));

  // keyboard shortcuts
  document.addEventListener('keydown', (ev)=>{
    if (ev.key === 'ArrowLeft') prevCard();
    else if (ev.key === 'ArrowRight') nextCard();
    else if (ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); flipCard(ev); }
  });
});

// helper prev/next wrappers used in event wiring
function prevCard(){ prevBtn.disabled || (currentIndex = (currentIndex - 1 + queue.length) % queue.length, flipped = false, removeReviewButtons(), renderCard()); }
function nextCard(){ nextBtn.disabled || (currentIndex = (currentIndex + 1) % queue.length, flipped = false, removeReviewButtons(), renderCard()); }
