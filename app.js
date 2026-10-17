/**
 * MEB 8. Sınıf İngilizce Uygulaması - Ana Kontrolcü (app.js)
 * Tüm mini-oyunlar, ilerleme takibi ve kullanıcı arayüzü kontrolü.
 */

class EnglishApp {
  constructor() {
    this.currentUnit = null;
    this.currentScreen = 'screen-units';
    this.activeGame = null;
    
    // Saklanan kullanıcı durumu
    this.state = this.loadState();

    // Oyun durumları
    this.cardIndex = 0;
    this.quizIndex = 0;
    this.quizQuestions = [];
    this.quizScore = 0;
    
    this.matchSelected = null;
    this.matchedPairsCount = 0;

    this.spellingCurrentWord = null;
    this.spellingEnteredLetters = [];
    this.spellingScrambled = [];

    this.tfQuestions = [];
    this.tfIndex = 0;
    this.tfScore = 0;

    this.listenQuestions = [];
    this.listenIndex = 0;

    this.initUI();
    this.applySettings();
    this.renderUnitsList();
    this.updateHeaderStats();
  }

  loadState() {
    const defaultState = {
      totalStars: 0,
      totalPracticed: 0,
      perfectQuizzes: 0,
      matchesCompleted: 0,
      wordsSpelled: 0,
      listeningCorrect: 0,
      learnedWords: {},
      calmMode: false,
      largeText: false,
      speechSpeed: 'slow' // Başlangıçta daha anlaşılır yavaş telaffuz
    };

    try {
      const saved = localStorage.getItem('ugur_english_state_v1');
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch (e) {
      return defaultState;
    }
  }

  saveState() {
    try {
      localStorage.setItem('ugur_english_state_v1', JSON.stringify(this.state));
    } catch (e) {}
    this.updateHeaderStats();
    this.checkAchievements();
  }

  addStar(amount = 1) {
    this.state.totalStars += amount;
    this.saveState();
  }

  markWordPracticed(wordId) {
    if (!this.state.learnedWords[wordId]) {
      this.state.learnedWords[wordId] = true;
      this.state.totalPracticed++;
      this.addStar(1);
    }
    this.saveState();
  }

  applySettings() {
    // Sakin Mod
    if (this.state.calmMode) {
      document.body.classList.add('calm-mode');
      const btn = document.getElementById('btn-toggle-calm');
      if (btn) btn.classList.add('active');
    } else {
      document.body.classList.remove('calm-mode');
      const btn = document.getElementById('btn-toggle-calm');
      if (btn) btn.classList.remove('active');
    }

    // Büyük Yazı Modu
    if (this.state.largeText) {
      document.body.classList.add('large-text-mode');
      const btn = document.getElementById('btn-toggle-text');
      if (btn) btn.classList.add('active');
    } else {
      document.body.classList.remove('large-text-mode');
      const btn = document.getElementById('btn-toggle-text');
      if (btn) btn.classList.remove('active');
    }

    // Okuma Hızı
    const rate = this.state.speechSpeed === 'slow' ? 0.75 : 0.95;
    sound.setSpeechRate(rate);
    const speedBtn = document.getElementById('btn-toggle-speed');
    if (speedBtn) {
      speedBtn.textContent = this.state.speechSpeed === 'slow' ? '🐢 Yavaş Ses' : '⚡ Normal Ses';
      speedBtn.classList.toggle('active', this.state.speechSpeed === 'slow');
    }
  }

  initUI() {
    // Üst butonlar
    document.getElementById('btn-home')?.addEventListener('click', () => this.showScreen('screen-units'));
    document.getElementById('btn-trophy')?.addEventListener('click', () => this.openTrophyModal());
    document.getElementById('star-badge-btn')?.addEventListener('click', () => this.openTrophyModal());

    // Hızlı Ayarlar
    document.getElementById('btn-toggle-calm')?.addEventListener('click', () => {
      sound.playClick();
      this.state.calmMode = !this.state.calmMode;
      this.applySettings();
      this.saveState();
    });

    document.getElementById('btn-toggle-text')?.addEventListener('click', () => {
      sound.playClick();
      this.state.largeText = !this.state.largeText;
      this.applySettings();
      this.saveState();
    });

    document.getElementById('btn-toggle-speed')?.addEventListener('click', () => {
      sound.playClick();
      this.state.speechSpeed = this.state.speechSpeed === 'slow' ? 'normal' : 'slow';
      this.applySettings();
      this.saveState();
    });

    // Alt navigasyon butonları
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sound.playClick();
        const target = btn.dataset.target;
        if (target === 'units') this.showScreen('screen-units');
        else if (target === 'games') {
          if (!this.currentUnit) this.selectUnit(MEB_UNITS[0]);
          else this.selectUnit(this.currentUnit);
        } else if (target === 'trophies') {
          this.openTrophyModal();
        }
      });
    });

    // Modalları kapatma
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
      window.scrollTo(0, 0);
    }

    // Alt navigasyon çubuğunu senkronize et
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (screenId === 'screen-units') {
      document.querySelector('.nav-item[data-target="units"]')?.classList.add('active');
    } else if (screenId === 'screen-unit-detail' || screenId.startsWith('screen-game-')) {
      document.querySelector('.nav-item[data-target="games"]')?.classList.add('active');
    }
  }

  updateHeaderStats() {
    const starCountEl = document.getElementById('total-stars-count');
    if (starCountEl) starCountEl.textContent = this.state.totalStars;
  }

  // ---------------- 1. ÜNİTE LİSTESİ ----------------
  renderUnitsList() {
    const listContainer = document.getElementById('units-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // Tüm Üniteler Karışık Kartı
    const allUnitsCard = document.createElement('div');
    allUnitsCard.className = 'unit-card';
    allUnitsCard.style.borderColor = '#F59E0B';
    allUnitsCard.style.background = '#FFFBEB';

    allUnitsCard.innerHTML = `
      <div class="unit-card-icon" style="background: #FEF3C7; color: #D97706;">
        🌟
      </div>
      <div class="unit-card-content">
        <div class="unit-card-title" style="color: #B45309;">Tüm Üniteler: Genel Tekrar</div>
        <div class="unit-card-subtitle">200+ Kelime • Karışık LGS Pratiği</div>
        <div class="unit-meta">
          <span class="unit-badge" style="background: #FDE68A; color: #92400E;">Büyük Sınav & Hızlı Alıştırma</span>
        </div>
      </div>
    `;

    allUnitsCard.addEventListener('click', () => {
      sound.playClick();
      const virtualAllUnit = {
        id: 0,
        title: "All Units: Mixed Practice",
        titleTr: "Tüm Üniteler: Genel Tekrar",
        icon: "🌟",
        themeColor: "#F59E0B",
        accentBg: "#FEF3C7",
        description: "10 ünitenin tamamından karışık kelimeler ve kalıplarla süper pratik yap!",
        words: MEB_UNITS.flatMap(u => u.words),
        expressions: MEB_UNITS.flatMap(u => u.expressions)
      };
      this.selectUnit(virtualAllUnit);
    });

    listContainer.appendChild(allUnitsCard);

    MEB_UNITS.forEach(unit => {
      const card = document.createElement('div');
      card.className = 'unit-card';
      
      // Ünitedeki öğrenilen kelime oranı
      const learnedCount = unit.words.filter(w => this.state.learnedWords[w.id]).length;
      const progressPercent = Math.round((learnedCount / unit.words.length) * 100);

      card.innerHTML = `
        <div class="unit-card-icon" style="background: ${unit.accentBg}; color: ${unit.themeColor};">
          ${unit.icon}
        </div>
        <div class="unit-card-content">
          <div class="unit-card-title">${unit.titleTr}</div>
          <div class="unit-card-subtitle">${unit.words.length} Kelime • 8 Kalıp İfade</div>
          <div class="unit-progress-bar">
            <div class="unit-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="unit-meta">
            <span class="unit-badge">${progressPercent}% Tamamlandı</span>
            ${learnedCount > 0 ? `<span>⭐ ${learnedCount} kelime biliniyor</span>` : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        sound.playClick();
        this.selectUnit(unit);
      });

      listContainer.appendChild(card);
    });
  }

  selectUnit(unit) {
    this.currentUnit = unit;

    // Ünite detay ekranını hazırla
    document.getElementById('detail-unit-title').textContent = unit.titleTr;
    document.getElementById('detail-unit-subtitle').textContent = unit.description;
    document.getElementById('detail-unit-icon').textContent = unit.icon;

    // Geri butonu
    const backBtn = document.getElementById('btn-back-to-units');
    if (backBtn) {
      backBtn.onclick = () => {
        sound.playClick();
        this.renderUnitsList();
        this.showScreen('screen-units');
      };
    }

    // Oyun butonlarını bağla
    this.setupGameTile('game-tile-cards', () => this.startFlashcards());
    this.setupGameTile('game-tile-quiz', () => this.startQuiz());
    this.setupGameTile('game-tile-match', () => this.startMatch());
    this.setupGameTile('game-tile-spelling', () => this.startSpelling());
    this.setupGameTile('game-tile-truefalse', () => this.startTrueFalse());
    this.setupGameTile('game-tile-listen', () => this.startListening());
    this.setupGameTile('game-tile-expressions', () => this.startExpressions());

    this.showScreen('screen-unit-detail');
  }

  setupGameTile(elementId, callback) {
    const el = document.getElementById(elementId);
    if (el) {
      el.onclick = () => {
        sound.playClick();
        callback();
      };
    }
  }

  // ---------------- 2. FLASHCARD OYUNU ----------------
  startFlashcards() {
    this.cardIndex = 0;
    this.showScreen('screen-game-flashcards');
    this.renderCurrentCard();

    document.getElementById('btn-card-prev').onclick = () => {
      sound.playClick();
      if (this.cardIndex > 0) {
        this.cardIndex--;
        this.renderCurrentCard();
      }
    };

    document.getElementById('btn-card-next').onclick = () => {
      sound.playClick();
      if (this.cardIndex < this.currentUnit.words.length - 1) {
        this.cardIndex++;
        this.renderCurrentCard();
      }
    };

    document.getElementById('btn-card-learned').onclick = () => {
      sound.playSuccess();
      const currentWord = this.currentUnit.words[this.cardIndex];
      this.markWordPracticed(currentWord.id);
      
      if (this.cardIndex < this.currentUnit.words.length - 1) {
        this.cardIndex++;
        this.renderCurrentCard();
      } else {
        this.showCelebrationModal("Harika İş!", "Bu ünitedeki tüm kartlara göz attın!", 3);
      }
    };

    document.getElementById('btn-exit-flashcards').onclick = () => {
      sound.playClick();
      this.showScreen('screen-unit-detail');
    };
  }

  renderCurrentCard() {
    const word = this.currentUnit.words[this.cardIndex];
    if (!word) return;

    document.getElementById('flashcard-unit-badge').textContent = `${this.currentUnit.titleTr}`;
    document.getElementById('flashcard-step-badge').textContent = `${this.cardIndex + 1} / ${this.currentUnit.words.length}`;
    document.getElementById('flashcard-icon').textContent = word.icon || "📖";
    document.getElementById('flashcard-en-word').textContent = word.en;
    document.getElementById('flashcard-phonetic').textContent = `[ ${word.phonetic || ''} ]`;
    document.getElementById('flashcard-tr-meaning').textContent = word.tr;
    document.getElementById('flashcard-example-en').textContent = `"${word.example}"`;
    document.getElementById('flashcard-example-tr').textContent = word.exampleTr;

    // Ses butonları
    const playBtn = document.getElementById('btn-play-card-sound');
    playBtn.onclick = (e) => {
      e.stopPropagation();
      sound.speak(word.en);
    };

    const slowPlayBtn = document.getElementById('btn-play-card-slow');
    slowPlayBtn.onclick = (e) => {
      e.stopPropagation();
      sound.speak(word.en, 0.65); // Ekstra yavaş telaffuz
    };

    // Örnek cümleyi seslendir
    const speakExampleBtn = document.getElementById('btn-speak-example');
    if (speakExampleBtn) {
      speakExampleBtn.onclick = (e) => {
        e.stopPropagation();
        sound.speak(word.example);
      };
    }

    // Karta dokununca kelimeyi seslendir
    const flashcardEl = document.querySelector('.flashcard');
    if (flashcardEl) {
      flashcardEl.onclick = (e) => {
        if (!e.target.closest('button')) {
          sound.speak(word.en);
        }
      };
    }

    // Kart açılınca İngilizce kelimeyi otomatik hafifçe telaffuz et
    sound.speak(word.en);
  }

  // ---------------- 3. ÇOKTAN SEÇMELİ TEST (QUIZ) ----------------
  startQuiz() {
    this.quizIndex = 0;
    this.quizScore = 0;
    
    // 5 soruluk test hazırla (dikkat süresi için kısa tutuldu)
    const shuffledWords = [...this.currentUnit.words].sort(() => 0.5 - Math.random());
    const selectedWords = shuffledWords.slice(0, Math.min(6, shuffledWords.length));

    this.quizQuestions = selectedWords.map(targetWord => {
      // 3 yanlış seçenek bul
      const wrongPool = this.currentUnit.words.filter(w => w.id !== targetWord.id);
      const wrongOptions = wrongPool.sort(() => 0.5 - Math.random()).slice(0, 3);
      const allChoices = [targetWord, ...wrongOptions].sort(() => 0.5 - Math.random());
      return { target: targetWord, choices: allChoices };
    });

    this.showScreen('screen-game-quiz');
    this.renderQuizQuestion();

    document.getElementById('btn-exit-quiz').onclick = () => {
      sound.playClick();
      this.showScreen('screen-unit-detail');
    };
  }

  renderQuizQuestion() {
    if (this.quizIndex >= this.quizQuestions.length) {
      // Test bitti
      const isPerfect = this.quizScore === this.quizQuestions.length;
      if (isPerfect) this.state.perfectQuizzes++;
      this.addStar(this.quizScore);
      this.showCelebrationModal(
        isPerfect ? "Mükemmel! 🌟" : "Tebrikler! 🎉",
        `${this.quizQuestions.length} sorudan ${this.quizScore} tanesini doğru bildin!`,
        this.quizScore
      );
      return;
    }

    const q = this.quizQuestions[this.quizIndex];
    document.getElementById('quiz-step-badge').textContent = `Soru ${this.quizIndex + 1} / ${this.quizQuestions.length}`;
    document.getElementById('quiz-word-display').textContent = q.target.en;

    // Telaffuz butonu
    const audioBtn = document.getElementById('btn-quiz-audio');
    audioBtn.onclick = () => sound.speak(q.target.en);
    sound.speak(q.target.en); // Soruyu açınca seslendir

    const optionsContainer = document.getElementById('quiz-options-container');
    optionsContainer.innerHTML = '';

    q.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.innerHTML = `<span>${choice.icon || '🔹'} ${choice.tr}</span> <span>👉</span>`;

      btn.onclick = () => {
        // Çift tıklamayı önle
        optionsContainer.querySelectorAll('button').forEach(b => b.style.pointerEvents = 'none');

        if (choice.id === q.target.id) {
          btn.classList.add('correct');
          sound.playSuccess();
          this.quizScore++;
          this.markWordPracticed(q.target.id);
        } else {
          btn.classList.add('wrong');
          sound.playGentleTryAgain();
          // Doğru olanı yeşil göster
          optionsContainer.querySelectorAll('button').forEach(b => {
            if (b.innerText.includes(q.target.tr)) b.classList.add('correct');
          });
        }

        setTimeout(() => {
          this.quizIndex++;
          this.renderQuizQuestion();
        }, 1200);
      };

      optionsContainer.appendChild(btn);
    });
  }

  // ---------------- 4. KELİME EŞLEŞTİRME (MEMORY & MATCH) ----------------
  startMatch() {
    this.matchSelected = null;
    this.matchedPairsCount = 0;

    // 4 kelime seç (8 kart) - Aşırı bilişsel yük oluşturmamak için
    const words = [...this.currentUnit.words].sort(() => 0.5 - Math.random()).slice(0, 4);

    const cards = [];
    words.forEach(w => {
      cards.push({ id: w.id, type: 'en', text: w.en, audioText: w.en, icon: w.icon });
      cards.push({ id: w.id, type: 'tr', text: w.tr, audioText: w.en, icon: '🇹🇷' });
    });

    // Kartları karıştır
    cards.sort(() => 0.5 - Math.random());

    this.showScreen('screen-game-match');
    const grid = document.getElementById('match-grid-container');
    grid.innerHTML = '';

    cards.forEach(cardData => {
      const cardEl = document.createElement('div');
      cardEl.className = 'match-card';
      cardEl.innerHTML = `${cardData.type === 'en' ? '🇬🇧' : '🇹🇷'} <b>${cardData.text}</b>`;
      
      cardEl.onclick = () => this.handleMatchCardClick(cardEl, cardData);
      grid.appendChild(cardEl);
    });

    document.getElementById('btn-exit-match').onclick = () => {
      sound.playClick();
      this.showScreen('screen-unit-detail');
    };
  }

  handleMatchCardClick(cardEl, cardData) {
    if (cardEl.classList.contains('matched') || cardEl.classList.contains('selected')) return;

    sound.playClick();
    if (cardData.audioText) sound.speak(cardData.audioText);

    if (!this.matchSelected) {
      // İlk kart seçildi
      this.matchSelected = { el: cardEl, data: cardData };
      cardEl.classList.add('selected');
    } else {
      // İkinci kart seçildi
      const first = this.matchSelected;

      // Aynı kart tipine mi tıkladı? (örn: iki İngilizce)
      if (first.data.type === cardData.type) {
        first.el.classList.remove('selected');
        this.matchSelected = { el: cardEl, data: cardData };
        cardEl.classList.add('selected');
        return;
      }

      // Eşleşti mi?
      if (first.data.id === cardData.id) {
        // DOĞRU EŞLEŞME
        sound.playSuccess();
        first.el.classList.remove('selected');
        first.el.classList.add('matched');
        cardEl.classList.add('matched');
        this.matchSelected = null;
        this.matchedPairsCount++;
        this.markWordPracticed(cardData.id);

        if (this.matchedPairsCount === 4) {
          this.state.matchesCompleted++;
          this.addStar(4);
          setTimeout(() => {
            this.showCelebrationModal("Müthişsin! 🧠", "Tüm kelimeleri hatasız eşleştirdin!", 4);
          }, 600);
        }
      } else {
        // YANLIŞ EŞLEŞME
        cardEl.classList.add('selected');
        sound.playGentleTryAgain();
        setTimeout(() => {
          first.el.classList.remove('selected');
          cardEl.classList.remove('selected');
          this.matchSelected = null;
        }, 800);
      }
    }
  }

  // ---------------- 5. HARF TAMAMLAMA (SPELLING BEE) ----------------
  startSpelling() {
    this.spellingWordsPool = [...this.currentUnit.words].sort(() => 0.5 - Math.random());
    this.spellingWordIndex = 0;
    this.showScreen('screen-game-spelling');
    this.renderSpellingRound();

    document.getElementById('btn-exit-spelling').onclick = () => {
      sound.playClick();
      this.showScreen('screen-unit-detail');
    };

    document.getElementById('btn-spell-clear').onclick = () => {
      sound.playClick();
      this.resetSpellingSlots();
    };

    document.getElementById('btn-spell-hint').onclick = () => {
      sound.playClick();
      this.provideSpellingHint();
    };
  }

  renderSpellingRound() {
    if (this.spellingWordIndex >= Math.min(5, this.spellingWordsPool.length)) {
      this.showCelebrationModal("Harika Yazdın! ✍️", "5 kelimeyi de doğru harflerle tamamladın!", 5);
      return;
    }

    this.spellingCurrentWord = this.spellingWordsPool[this.spellingWordIndex];
    const cleanWord = this.spellingCurrentWord.en.replace(/[^a-zA-Z]/g, '').toUpperCase();
    this.targetLetters = cleanWord.split('');
    this.spellingEnteredLetters = [];

    document.getElementById('spell-step-badge').textContent = `Kelime ${this.spellingWordIndex + 1} / 5`;
    document.getElementById('spell-tr-clue').textContent = `${this.spellingCurrentWord.icon || '🎯'} ${this.spellingCurrentWord.tr}`;

    // Ses butonu
    const audioBtn = document.getElementById('btn-spell-audio');
    audioBtn.onclick = () => sound.speak(this.spellingCurrentWord.en);
    sound.speak(this.spellingCurrentWord.en);

    this.buildSpellingSlots();
    this.buildSpellingKeyboard();
  }

  buildSpellingSlots() {
    const slotsRow = document.getElementById('spell-slots-row');
    slotsRow.innerHTML = '';

    for (let i = 0; i < this.targetLetters.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'letter-slot';
      slot.dataset.index = i;
      slot.onclick = () => this.handleSlotClick(i);
      slotsRow.appendChild(slot);
    }
  }

  buildSpellingKeyboard() {
    const kbRow = document.getElementById('spell-keyboard-row');
    kbRow.innerHTML = '';

    // Harfleri karıştır
    const letters = [...this.targetLetters].sort(() => 0.5 - Math.random());

    letters.forEach((char, index) => {
      const btn = document.createElement('button');
      btn.className = 'letter-bubble';
      btn.textContent = char;
      btn.dataset.kbIndex = index;
      btn.dataset.char = char;

      btn.onclick = () => {
        sound.playClick();
        this.addLetterToSlot(char, btn);
      };

      kbRow.appendChild(btn);
    });
  }

  addLetterToSlot(char, btnElement) {
    if (this.spellingEnteredLetters.length >= this.targetLetters.length) return;

    btnElement.classList.add('used');
    this.spellingEnteredLetters.push({ char, btnElement });

    this.updateSlotsDisplay();
    this.checkSpellingCompletion();
  }

  handleSlotClick(slotIndex) {
    // Tıklanan son harfi geri al
    if (slotIndex === this.spellingEnteredLetters.length - 1 && this.spellingEnteredLetters.length > 0) {
      sound.playClick();
      const last = this.spellingEnteredLetters.pop();
      last.btnElement.classList.remove('used');
      this.updateSlotsDisplay();
    }
  }

  resetSpellingSlots() {
    this.spellingEnteredLetters.forEach(item => item.btnElement.classList.remove('used'));
    this.spellingEnteredLetters = [];
    this.updateSlotsDisplay();
  }

  provideSpellingHint() {
    const nextIndex = this.spellingEnteredLetters.length;
    if (nextIndex >= this.targetLetters.length) return;

    const neededChar = this.targetLetters[nextIndex];
    const availableBtn = Array.from(document.querySelectorAll('.letter-bubble:not(.used)'))
      .find(btn => btn.dataset.char === neededChar);

    if (availableBtn) {
      this.addLetterToSlot(neededChar, availableBtn);
    }
  }

  updateSlotsDisplay() {
    const slots = document.querySelectorAll('.letter-slot');
    slots.forEach((slot, i) => {
      if (this.spellingEnteredLetters[i]) {
        slot.textContent = this.spellingEnteredLetters[i].char;
        slot.classList.add('filled');
      } else {
        slot.textContent = '';
        slot.classList.remove('filled');
      }
    });
  }

  checkSpellingCompletion() {
    if (this.spellingEnteredLetters.length === this.targetLetters.length) {
      const enteredWord = this.spellingEnteredLetters.map(i => i.char).join('');
      const targetWord = this.targetLetters.join('');

      if (enteredWord === targetWord) {
        sound.playSuccess();
        sound.speak(this.spellingCurrentWord.en);
        this.state.wordsSpelled++;
        this.markWordPracticed(this.spellingCurrentWord.id);

        setTimeout(() => {
          this.spellingWordIndex++;
          this.renderSpellingRound();
        }, 1000);
      } else {
        sound.playGentleTryAgain();
        setTimeout(() => {
          this.resetSpellingSlots();
        }, 900);
      }
    }
  }

  // ---------------- 6. DOĞRU MU YANLIŞ MI (TRUE OR FALSE) ----------------
  startTrueFalse() {
    this.tfIndex = 0;
    this.tfScore = 0;

    const words = [...this.currentUnit.words].sort(() => 0.5 - Math.random()).slice(0, 6);
    this.tfQuestions = words.map((targetWord, index) => {
      const isCorrectPair = Math.random() > 0.5;
      let displayTr = targetWord.tr;
      if (!isCorrectPair) {
        const otherWord = this.currentUnit.words.find(w => w.id !== targetWord.id);
        displayTr = otherWord ? otherWord.tr : "Farklı bir anlam";
      }
      return {
        target: targetWord,
        displayTr: displayTr,
        isCorrect: isCorrectPair
      };
    });

    this.showScreen('screen-game-truefalse');
    this.renderTrueFalseCard();

    document.getElementById('btn-tf-true').onclick = () => this.handleTrueFalseAnswer(true);
    document.getElementById('btn-tf-false').onclick = () => this.handleTrueFalseAnswer(false);

    document.getElementById('btn-exit-tf').onclick = () => {
      sound.playClick();
      this.showScreen('screen-unit-detail');
    };
  }

  renderTrueFalseCard() {
    if (this.tfIndex >= this.tfQuestions.length) {
      this.addStar(this.tfScore);
      this.showCelebrationModal("Tebrikler! ⚡", `${this.tfQuestions.length} sorudan ${this.tfScore} tanesini doğru bildin!`, this.tfScore);
      return;
    }

    const q = this.tfQuestions[this.tfIndex];
    document.getElementById('tf-step-badge').textContent = `Soru ${this.tfIndex + 1} / ${this.tfQuestions.length}`;
    document.getElementById('tf-en-word').textContent = q.target.en;
    document.getElementById('tf-tr-word').textContent = q.displayTr;

    sound.speak(q.target.en);
  }

  handleTrueFalseAnswer(userChoice) {
    const q = this.tfQuestions[this.tfIndex];
    if (userChoice === q.isCorrect) {
      sound.playSuccess();
      this.tfScore++;
      this.markWordPracticed(q.target.id);
    } else {
      sound.playGentleTryAgain();
    }

    setTimeout(() => {
      this.tfIndex++;
      this.renderTrueFalseCard();
    }, 700);
  }

  // ---------------- 7. DİNLE VE BUL (LISTENING CHALLENGE) ----------------
  startListening() {
    this.listenIndex = 0;
    this.listenScore = 0;

    const words = [...this.currentUnit.words].sort(() => 0.5 - Math.random()).slice(0, 5);
    this.listenQuestions = words.map(targetWord => {
      const wrong = this.currentUnit.words.filter(w => w.id !== targetWord.id).sort(() => 0.5 - Math.random()).slice(0, 3);
      const choices = [targetWord, ...wrong].sort(() => 0.5 - Math.random());
      return { target: targetWord, choices };
    });

    this.showScreen('screen-game-listen');
    this.renderListeningQuestion();

    document.getElementById('btn-exit-listen').onclick = () => {
      sound.playClick();
      this.showScreen('screen-unit-detail');
    };
  }

  renderListeningQuestion() {
    if (this.listenIndex >= this.listenQuestions.length) {
      this.state.listeningCorrect += this.listenScore;
      this.addStar(this.listenScore);
      this.showCelebrationModal("Harika Kulak! 🎧", `${this.listenQuestions.length} kelimeden ${this.listenScore} tanesini sesinden tanıdın!`, this.listenScore);
      return;
    }

    const q = this.listenQuestions[this.listenIndex];
    document.getElementById('listen-step-badge').textContent = `Soru ${this.listenIndex + 1} / ${this.listenQuestions.length}`;

    // Ses butonu
    const speakerBtn = document.getElementById('btn-listen-play-big');
    speakerBtn.onclick = () => sound.speak(q.target.en);

    const slowSpeakerBtn = document.getElementById('btn-listen-play-slow');
    slowSpeakerBtn.onclick = () => sound.speak(q.target.en, 0.65);

    // Otomatik ilk telaffuz
    setTimeout(() => sound.speak(q.target.en), 300);

    const container = document.getElementById('listen-options-container');
    container.innerHTML = '';

    q.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.innerHTML = `<span>${choice.icon || '🔹'} ${choice.tr}</span> <span>🔊</span>`;

      btn.onclick = () => {
        container.querySelectorAll('button').forEach(b => b.style.pointerEvents = 'none');

        if (choice.id === q.target.id) {
          btn.classList.add('correct');
          sound.playSuccess();
          this.listenScore++;
          this.markWordPracticed(q.target.id);
        } else {
          btn.classList.add('wrong');
          sound.playGentleTryAgain();
          container.querySelectorAll('button').forEach(b => {
            if (b.innerText.includes(q.target.tr)) b.classList.add('correct');
          });
        }

        setTimeout(() => {
          this.listenIndex++;
          this.renderListeningQuestion();
        }, 1100);
      };

      container.appendChild(btn);
    });
  }

  // ---------------- 8. KALIPLAR VE DİYALOGLAR (EXPRESSIONS) ----------------
  startExpressions() {
    this.showScreen('screen-game-expressions');
    const container = document.getElementById('expressions-list-container');
    container.innerHTML = '';

    document.getElementById('expressions-unit-title').textContent = `${this.currentUnit.titleTr} - LGS Kalıpları`;

    this.currentUnit.expressions.forEach(exp => {
      const card = document.createElement('div');
      card.className = 'expression-card';
      card.innerHTML = `
        <span class="expression-category">${exp.category}</span>
        <div class="expression-en">${exp.en}</div>
        <div class="expression-tr">${exp.tr}</div>
        <div style="margin-top: 8px;">
          <button class="sound-play-btn" style="padding: 6px 12px; font-size: 12px;">
            🔊 Sesli Dinle
          </button>
        </div>
      `;

      const audioBtn = card.querySelector('button');
      audioBtn.onclick = () => {
        sound.playClick();
        sound.speak(exp.en);
      };

      container.appendChild(card);
    });

    document.getElementById('btn-exit-expressions').onclick = () => {
      sound.playClick();
      this.showScreen('screen-unit-detail');
    };
  }

  // ---------------- KUTLAMA MODALI ----------------
  showCelebrationModal(title, desc, starsEarned = 1) {
    sound.playFanfare();
    const modal = document.getElementById('celebration-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-desc').textContent = desc;

    const starsContainer = document.getElementById('modal-stars-row');
    starsContainer.innerHTML = '⭐'.repeat(Math.max(1, Math.min(5, starsEarned)));

    modal.classList.add('active');

    document.getElementById('btn-modal-continue').onclick = () => {
      sound.playClick();
      modal.classList.remove('active');
      this.showScreen('screen-unit-detail');
    };
  }

  // ---------------- BAŞARI & ROZETLER ODASI ----------------
  openTrophyModal() {
    sound.playClick();
    const modal = document.getElementById('trophy-modal');
    const container = document.getElementById('trophy-badges-container');
    container.innerHTML = '';

    document.getElementById('trophy-total-stars').textContent = this.state.totalStars;
    document.getElementById('trophy-total-words').textContent = this.state.totalPracticed;

    ACHIEVEMENTS.forEach(ach => {
      const isUnlocked = ach.condition(this.state);
      const item = document.createElement('div');
      item.className = `badge-item ${isUnlocked ? '' : 'locked'}`;
      item.innerHTML = `
        <div style="font-size: 28px;">${isUnlocked ? '🏅' : '🔒'}</div>
        <div>
          <div style="font-weight: 800; font-size: 14px; color: #1E293B;">${ach.title}</div>
          <div style="font-size: 12px; color: #64748B;">${ach.desc}</div>
        </div>
      `;
      container.appendChild(item);
    });

    modal.classList.add('active');
  }

  checkAchievements() {
    // Rozet kontrolleri otomatik olarak açık modala yansır
  }
}

// Uygulamayı DOM hazır olduğunda başlat
document.addEventListener('DOMContentLoaded', () => {
  window.app = new EnglishApp();
});
