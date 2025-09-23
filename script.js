let words = [];
let currentIndex = 0;
let mastered = [];

const wordEl = document.getElementById("word");
const typeEl = document.getElementById("type");
const meaningEl = document.getElementById("meaning");
const cardInner = document.getElementById("cardInner");
const msg = document.getElementById("msg");
const againBtn = document.getElementById("againBtn");
const moveOnBtn = document.getElementById("moveOnBtn");
const masteryOverlay = document.getElementById("masteryOverlay");
const masteredList = document.getElementById("masteredList");
const closeMastery = document.getElementById("closeMastery");

// Load vocab-data.json automatically
fetch("vocab-data.json")
  .then(res => res.json())
  .then(data => {
    words = data;
    currentIndex = 0;
    mastered = [];
    showCard();
    msg.textContent = `Word 1 of ${words.length}`;
  })
  .catch(err => {
    msg.textContent = "⚠️ Error loading vocab-data.json";
    console.error(err);
  });

// Show current card
function showCard() {
  if (words.length === 0) return;

  const w = words[currentIndex];

  // Word shown on front
  wordEl.textContent = w.Word;

  // Prepare Synonyms and Antonyms
  let extraInfo = "";
  if (w.Synonym) {
    extraInfo += `<span class="badge green">Synonyms:</span> ${w.Synonym}<br>`;
  }
  if (w.Antonym) {
    extraInfo += `<span class="badge red">Antonyms:</span> ${w.Antonym}<br>`;
  }

  // Show extra info
  typeEl.innerHTML = extraInfo;

  // Show meaning
  meaningEl.textContent = w.Meanings;

  // Reset flip
  cardInner.classList.remove("flipped");

  // Progress counter
  msg.textContent = `Word ${currentIndex + 1} of ${words.length}`;
}

// Flip card
document.getElementById("flashcard").addEventListener("click", () => {
  cardInner.classList.toggle("flipped");
});

// "Do It Again" button
againBtn.addEventListener("click", () => {
  words.push(words.splice(currentIndex, 1)[0]); // send card to end
  if (currentIndex >= words.length) currentIndex = 0;
  showCard();
});

// "Move On" button
moveOnBtn.addEventListener("click", () => {
  mastered.push(words[currentIndex]);
  words.splice(currentIndex, 1); // remove word

  if (currentIndex >= words.length) currentIndex = 0;

  if (words.length === 0) {
    showMastery();
  } else {
    showCard();
  }
});

// Show mastery screen
function showMastery() {
  masteryOverlay.style.display = "flex";
  masteredList.innerHTML = mastered
    .map(
      (w, i) =>
        `<li>
          <strong>${i + 1}. ${w.Word}</strong> — ${w.Meanings}<br>
          <em>Synonyms:</em> ${w.Synonym || "—"}<br>
          <em>Antonyms:</em> ${w.Antonym || "—"}
        </li>`
    )
    .join("");
}

// Close mastery overlay
closeMastery.addEventListener("click", () => {
  masteryOverlay.style.display = "none";
  // Restart
  location.reload();
});
