/**
 * Ses ve Telaffuz Yönetimi (Audio & Speech Synthesis)
 * - Web Speech API ile İngilizce sesli okuma (Normal ve Yavaş hız seçenekli)
 * - Web Audio API ile sıfır bağımlılıklı, sakin ve yumuşak oyun sesleri (Bip, başarı akoru, alkış tınısı)
 * - Epilepsi dostu: Kesinlikle ani, rahatsız edici veya yüksek frekanslı sesler içermez.
 */

class SoundController {
  constructor() {
    this.audioCtx = null;
    this.speechRate = parseFloat(localStorage.getItem('ugur_speech_rate') || '0.85'); // Başlangıçta biraz yavaş ve anlaşılır
    this.soundEffectsEnabled = localStorage.getItem('ugur_sfx_enabled') !== 'false';
    this.speechEnabled = true;
    this.selectedVoice = null;

    this.initAudioContext();
    this.initSpeech();
  }

  initAudioContext() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    } catch (e) {
      console.warn("AudioContext başlatılamadı:", e);
    }

    // Mobil cihazlarda ilk dokunmada kilidi aç
    const unlock = () => {
      this.ensureAudioContext();
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('click', unlock);
  }

  ensureAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  initSpeech() {
    if (!('speechSynthesis' in window)) {
      console.warn("Bu tarayıcı Web Speech API desteklemiyor.");
      this.speechEnabled = false;
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Tercihen doğal İngilizce sesleri bul (en-US veya en-GB)
      this.selectedVoice = voices.find(v => (v.lang === 'en-US' || v.lang === 'en-GB') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Samantha')))
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * İngilizce bir kelime veya cümleyi telaffuz eder.
   * @param {string} text - Okunacak metin
   * @param {number|null} customRate - İsteğe bağlı özel hız (ör. 0.7 çok yavaş)
   */
  speak(text, customRate = null) {
    if (!('speechSynthesis' in window)) return;
    
    // Önceki konuşmayı kes (üst üste binmeyi önler)
    window.speechSynthesis.cancel();

    if (!text || typeof text !== 'string') return;

    // Temiz metin
    const cleanText = text.replace(/[/()]/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = customRate || this.speechRate;
    utterance.pitch = 1.0;

    if (!this.selectedVoice && window.speechSynthesis.getVoices) {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        this.selectedVoice = voices.find(v => (v.lang === 'en-US' || v.lang === 'en-GB') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Samantha')))
          || voices.find(v => v.lang.startsWith('en'))
          || voices[0];
      }
    }

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Telaffuz hızını ayarlar ve saklar
   */
  setSpeechRate(rate) {
    this.speechRate = Math.max(0.5, Math.min(1.2, rate));
    localStorage.setItem('ugur_speech_rate', this.speechRate.toString());
  }

  toggleSfx() {
    this.soundEffectsEnabled = !this.soundEffectsEnabled;
    localStorage.setItem('ugur_sfx_enabled', this.soundEffectsEnabled.toString());
    return this.soundEffectsEnabled;
  }

  // ---- YUMUŞAK OYUN SES EFEKTLERİ (Web Audio API) ----

  /**
   * Hafif buton tıklama tıkırtısı (ahşap/yumuşak dokunma hissi)
   */
  playClick() {
    if (!this.soundEffectsEnabled || !this.audioCtx) return;
    this.ensureAudioContext();

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.audioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);
    } catch (e) {}
  }

  /**
   * Doğru cevap / Başarı sesi (Yumuşak, dinlendirici 3 notalı neşeli akor: C5 -> E5 -> G5)
   */
  playSuccess() {
    if (!this.soundEffectsEnabled || !this.audioCtx) return;
    this.ensureAudioContext();

    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, index) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        const startTime = this.audioCtx.currentTime + index * 0.08;
        const duration = 0.25;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {}
  }

  /**
   * Yanlış / Tekrar Dene sesi (Asla cezalandırıcı veya tiz olmayan yumuşak su damlası tonu)
   */
  playGentleTryAgain() {
    if (!this.soundEffectsEnabled || !this.audioCtx) return;
    this.ensureAudioContext();

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      const startTime = this.audioCtx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, startTime);
      osc.frequency.linearRampToValueAtTime(220, startTime + 0.15);

      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    } catch (e) {}
  }

  /**
   * Seviye/Oyun Tamamlama Melodisi (Çok tatlı, sakin bir zafer tınısı)
   */
  playFanfare() {
    if (!this.soundEffectsEnabled || !this.audioCtx) return;
    this.ensureAudioContext();

    try {
      const melody = [
        { f: 440.00, d: 0.12 }, // A4
        { f: 554.37, d: 0.12 }, // C#5
        { f: 659.25, d: 0.14 }, // E5
        { f: 880.00, d: 0.35 }  // A5
      ];

      let t = this.audioCtx.currentTime;
      melody.forEach(note => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + note.d);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(t);
        osc.stop(t + note.d);
        t += note.d * 0.9;
      });
    } catch (e) {}
  }
}

// Global ses yöneticisi
const sound = new SoundController();
