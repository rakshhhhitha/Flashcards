/* Robust flashcards script:
   - Tries to fetch ./vocab-data.json
   - If fetch fails (e.g. file://), shows upload control and uses fallback sample
   - Numbering shows original position within the selected alphabet's list
*/

let vocabData = [];       // full dataset (with _uid)
let initialList = [];     // ordered list for selected letter
let currentQueue = [];    // remaining queue (references to objects in initialList)
let learned = [];         // mastered cards (in order they were moved on)
let currentIndex = 0;

const cardInner = document.getElementById('cardInner');
const frontWord = document.getElementById('frontWord');
const frontInfo = document.getElementById('frontInfo');
const backMeaning = document.getElementById('backMeaning');
const backExtra = document.getElementById('backExtra');

const progressEl = document.getElementById('progress');
const msgEl = document.getElementById('msg');

const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const againBtn = document.getElementById('againBtn');
const moveOnBtn = document.getElementById('moveOnBtn');
const letterSelect = document.getElementById('letterSelect');
const clearProgressBtn = document.getElementById('clearProgress');

const fileInput = document.getElementById('fileInput');
const showUpload = document.getElementById('showUpload');

const masteryOverlay = document.getElementById('masteryOverlay');
const masteredList = document.getElementById('masteredList');
const masterCount = document.getElementById('masterCount');
const closeMastery = document.getElementById('closeMastery');
const restartAlphabet = document.getElementById('restartAlphabet');

// ---------- helpers ----------
function setMessage(text, isError = false) {
  msgEl.textContent = text || '';
  msgEl.style.color = isError ? 'crimson' : '';
}

function assignUIDs(raw){
  return raw.map((c,i) => ({ ...c, _uid: i }));
}

function populateLetterOptions(){
  letterSelect.innerHTML = '';
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = 'All';
  letterSelect.appendChild(all);
  letters.forEach(l => {
    const opt = document.createElement('option'); opt.value = l; opt.textContent = l;
    letterSelect.appendChild(opt);
  });
}

function filterCards(letter){
  const filtered = vocabData.filter(c => {
    if (!c.Word) return false;
    if (letter === 'all') return true;
    return c.Word.toUpperCase().startsWith(letter);
  });
  // stable alphabetical sort by word
  filtered.sort((a,b) => a.Word.localeCompare(b.Word, undefined, { sensitivity: 'base' }));
  return filtered;
}

function resetQueue(letter){
  initialList = filterCards(letter);
  currentQueue = [...initialList];
  learned = [];
  currentIndex = 0;
  updateProgress();
  if (initialList.length === 0) {
    setMessage(`No words for "${letter}"`, false);
  } else {
    setMessage('');
  }
}

function updateProgress(){
  progressEl.textContent = `Learned ${learned.length} / ${initialList.length}`;
}

function showCard(index){
  if (initialList.length === 0) {
    frontWord.textContent = '';
    frontInfo.textContent = '';
    backMeaning.textContent = '';
    return;
  }
  if (currentQueue.length === 0) {
    showMasteryScreen();
    return;
  }
  // normalize index
  if (index < 0) index = currentQueue.length - 1;
  if (index >= currentQueue.length) index = 0;
  currentIndex = index;

  const card = currentQueue[currentIndex];
  // original position in the initialList
  const originalPos = initialList.findIndex(c => c._uid === card._uid) + 1;
  const total = initialList.length;

  frontWord.textContent = `${originalPos}. ${card.Word}`;
  frontInfo.textContent = `Card ${originalPos} of ${total} — Flip for meaning`;
  backMeaning.textContent = card.Meanings || 'No definition available';
  // show synonyms/antonyms if present
  let extra = '';
  if (card.Synonym) extra += `Syn: ${card.Synonym}\n`;
  if (card.Antonym) extra += `Ant: ${card.Antonym}`;
  backExtra.textContent = extra;
  // make sure card is front-facing
  cardInner.classList.remove('flipped');
  updateProgress();
}

function flipCard(){
  if (currentQueue.length === 0) return;
  cardInner.classList.toggle('flipped');
}

function handleDoAgain(){
  if (currentQueue.length === 0) return;
  // move current card to end of the queue
  const card = currentQueue.splice(currentIndex,1)[0];
  currentQueue.push(card);
  // currentIndex now points to the card that replaced it (same index)
  if (currentIndex >= currentQueue.length) currentIndex = 0;
  showCard(currentIndex);
}

function handleMoveOn(){
  if (currentQueue.length === 0) return;
  const card = currentQueue.splice(currentIndex,1)[0];
  learned.push(card);
  if (currentIndex >= currentQueue.length) currentIndex = 0;
  updateProgress();
  if (currentQueue.length === 0) {
    showMasteryScreen();
  } else {
    showCard(currentIndex);
  }
}

function showMasteryScreen(){
  // show overlay with learned list
  masteryOverlay.style.display = 'flex';
  masteredList.innerHTML = '';
  learned.forEach((c,i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${i+1}. ${escapeHtml(c.Word)}</strong><div class="small text-muted" style="margin-top:6px">${escapeHtml(c.Meanings || '')}${c.Synonym?'<br><em>Syn:</em> '+escapeHtml(c.Synonym):''}${c.Antonym?'<br><em>Ant:</em> '+escapeHtml(c.Antonym):''}</div>`;
    masteredList.appendChild(li);
  });
  masterCount.textContent = `You mastered ${learned.length} of ${initialList.length} words`;
}

function escapeHtml(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// ---------- data loading ----------
async function fetchVocabAuto(){
  try {
    setMessage('Loading vocab-data.json…');
    const resp = await fetch('vocab-data.json', {cache:'no-store'});
    if (!resp.ok) throw new Error('Network response not OK');
    const data = await resp.json();
    vocabData = assignUIDs(data);
    populateLetterOptions();
    resetQueue('all');
    if (currentQueue.length > 0) showCard(0);
    setMessage('');
  } catch (err) {
    console.warn('Auto fetch failed:', err);
    setMessage('Could not auto-load vocab-data.json. You can upload it manually.', true);
    // fallback sample data so UI still usable
    vocabData = assignUIDs([
      {Word:'zany', Meanings:'a clown or buffoon, a half-witted person', Synonym:'clownish', Antonym:'sensible'},
      {Word:'zeal', Meanings:'intense enthusiasm, ardour, fervour'},
      {Word:'zenith', Meanings:'the highest point'},
      {Word:'zephyr', Meanings:'a gentle breeze'},
      {Word:'zymurgy', Meanings:'the chemistry of fermentation as applied in brewing'}
    ]);
    populateLetterOptions();
    resetQueue('all');
    if (currentQueue.length > 0) showCard(0);
  }
}

// If user uploads a JSON file via file input
function handleFileUpload(file){
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
      vocabData = assignUIDs(parsed);
      setMessage('Loaded JSON successfully');
      populateLetterOptions();
      resetQueue('all');
      showCard(0);
    } catch (err) {
      setMessage('Invalid JSON file: ' + err.message, true);
      console.error(err);
    }
  };
  reader.readAsText(file);
}

// ---------- event wiring ----------
document.addEventListener('DOMContentLoaded', () => {
  // initial UI wiring
  populateLetterOptions();
  fetchVocabAuto();

  // controls
  letterSelect.addEventListener('change', (e) => {
    resetQueue(e.target.value);
    if (currentQueue.length > 0) showCard(0);
  });

  flipBtn.addEventListener('click', flipCard);
  cardInner.addEventListener('click', (ev) => {
    // only flip when clicking on empty space; don't flip when clicking the buttons
    const tag = ev.target.tagName.toLowerCase();
    if (tag === 'button' || ev.target.closest('button')) return;
    flipCard();
  });

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

  againBtn.addEventListener('click', handleDoAgain);
  moveOnBtn.addEventListener('click', handleMoveOn);

  clearProgressBtn.addEventListener('click', () => {
    resetQueue(letterSelect.value || 'all');
    if (currentQueue.length > 0) showCard(0);
  });

  showUpload.addEventListener('click', () => {
    fileInput.click();
  });
  fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFileUpload(f);
    // clear the input so selecting same file again works
    fileInput.value = '';
  });

  // mastery overlay actions
  document.getElementById('closeMastery').addEventListener('click', () => {
    masteryOverlay.style.display = 'none';
  });
  document.getElementById('restartAlphabet').addEventListener('click', () => {
    masteryOverlay.style.display = 'none';
    resetQueue(letterSelect.value || 'all');
    if (currentQueue.length > 0) showCard(0);
  });
});
