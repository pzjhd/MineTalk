/* ============================================
   speech.js — Web Speech API 封装 (STT + TTS)
   MineTalk v1.0
   ============================================ */

const Speech = {
  recognition: null,
  isListening: false,
  isSupported: false,
  isRecognitionSupported: false,
  onResult: null,    // callback(text)
  onError: null,     // callback(error)
  onStateChange: null, // callback(isListening)

  /** 初始化 */
  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isRecognitionSupported = !!SpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US'; // 默认，后续可切换
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event) => {
        const text = event.results[0][0].transcript.trim();
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
        if (this.onResult && text) this.onResult(text);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
        if (this.onError) this.onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
      };
    }

    this.isSupported = 'speechSynthesis' in window;
  },

  /** 检查语音识别支持 */
  checkSupport() {
    return {
      recognition: this.isRecognitionSupported,
      synthesis: this.isSupported,
    };
  },

  /** 开始听 */
  startListening(lang) {
    if (!this.recognition) {
      if (this.onError) this.onError('not-supported');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    // 更新语言
    if (lang) {
      this.recognition.lang = lang;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      if (this.onStateChange) this.onStateChange(true);
      return true;
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      return false;
    }
  },

  /** 停止听 */
  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    if (this.onStateChange) this.onStateChange(false);
  },

  /**
   * 朗读文本
   * @param {string} text
   * @param {string} accent — e.g. 'en-ZA', 'en-AU'
   * @param {function} onEnd — 朗读完成回调
   */
  speak(text, accent, onEnd) {
    if (!this.isSupported) return;

    // 先取消当前朗读
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // 选择对应口音的声音
    const voices = window.speechSynthesis.getVoices();
    const voice = this._pickVoice(voices, accent);
    if (voice) utterance.voice = voice;

    utterance.lang = accent || 'en-ZA';
    utterance.rate = 0.9;   // 稍慢，便于听清
    utterance.pitch = 1.0;

    if (onEnd) {
      utterance.onend = onEnd;
    }

    // Chrome需要延迟一下才能正常播放
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  },

  /** 停止朗读 */
  stopSpeaking() {
    if (this.isSupported) {
      window.speechSynthesis.cancel();
    }
  },

  /** 获取可用声音列表 */
  getVoices() {
    if (!this.isSupported) return [];
    return window.speechSynthesis.getVoices();
  },

  /** 根据accent偏好选择声音 */
  _pickVoice(voices, accent) {
    if (!voices || voices.length === 0) return null;

    // 映射accent到语言代码前缀
    const langMap = {
      'en-ZA': 'en-ZA',  // 南非
      'en-AU': 'en-AU',  // 澳洲
      'en-GB': 'en-GB',  // 英国
      'en-US': 'en-US',  // 美国
      'en-IN': 'en-IN',  // 印度
    };

    const targetLang = langMap[accent] || 'en-US';

    // 精确匹配
    let voice = voices.find(v => v.lang === targetLang);
    if (voice) return voice;

    // 前缀匹配
    const prefix = targetLang.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(prefix));
    if (voice) return voice;

    // 回退到第一个英文声音
    voice = voices.find(v => v.lang.startsWith('en'));
    return voice || voices[0];
  },
};
