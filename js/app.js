/* ============================================
   app.js — 主控制器，应用入口
   MineTalk v1.0
   ============================================ */

(function () {
  'use strict';

  /** ===== 应用初始化 ===== */
  function init() {
    // 初始化语音引擎
    Speech.init();

    // 预加载voice列表（Chrome异步加载）
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // 初始化UI
    UI.init();

    // 检查是否有选中的场景（从场景页跳转过来）
    const state = Storage.load();
    if (state._selectedScene) {
      const scene = SCENES.find(s => s.id === state._selectedScene);
      if (scene) {
        UI.currentScene = scene;
        UI._showTrainingStart();
      }
    }

    // 显示欢迎提示（首次使用）
    if (!state.player.totalScenesCompleted && !state.settings.apiKey) {
      setTimeout(() => {
        UI.showToast('👋 欢迎！请先在设置中配置API Key', 'info');
      }, 800);
    }

    // 如果有API Key但没有完成过训练，提示
    if (!state.player.totalScenesCompleted && state.settings.apiKey) {
      setTimeout(() => {
        UI.showToast('🎯 去场景页面选择第一个训练吧！', 'info');
      }, 800);
    }

    // 注册Service Worker (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // 离线缓存注册失败，不影响主功能
      });
    }

    console.log('⛏️ MineTalk v1.0 initialized');
    console.log('📊 Scenes loaded:', SCENES.length);
    console.log('📚 Flash cards loaded:', FLASH_CARDS.length);
    console.log('🎤 Speech recognition:', Speech.isRecognitionSupported ? 'supported' : 'not supported');
    console.log('🔊 Speech synthesis:', Speech.isSupported ? 'supported' : 'not supported');
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
