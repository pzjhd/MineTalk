/* ============================================
   storage.js — localStorage 读写封装
   MineTalk v1.0
   ============================================ */

const STORAGE_KEY = 'minetalk_data';

const DEFAULT_STATE = {
  player: {
    name: '地质小王',
    level: 1,
    xp: 0,
    streak: 0,
    lastTrainingDate: null,
    totalScenesCompleted: 0,
    totalTrainingMinutes: 0,
    bestScore: 0,
  },
  scenes: {},
  vocabulary: {},
  achievements: [],
  settings: {
    apiKey: '',
    accent: 'en-ZA',
    showHints: true,
  },
};

const Storage = {
  /** 读取全部状态 */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this._deepClone(DEFAULT_STATE);
      const saved = JSON.parse(raw);
      return this._merge(DEFAULT_STATE, saved);
    } catch (e) {
      console.warn('Storage load failed, using defaults:', e);
      return this._deepClone(DEFAULT_STATE);
    }
  },

  /** 保存全部状态 */
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Storage save failed:', e);
    }
  },

  /** 获取设置项 */
  getSetting(key) {
    const state = this.load();
    return state.settings[key];
  },

  /** 更新设置项 */
  updateSetting(key, value) {
    const state = this.load();
    state.settings[key] = value;
    this.save(state);
    return state;
  },

  /** 获取玩家数据 */
  getPlayer() {
    return this.load().player;
  },

  /** 更新玩家数据 */
  updatePlayer(updates) {
    const state = this.load();
    Object.assign(state.player, updates);
    this.save(state);
    return state.player;
  },

  /** 获取场景进度 */
  getSceneProgress(sceneId) {
    const state = this.load();
    return state.scenes[sceneId] || null;
  },

  /** 更新场景进度 */
  updateSceneProgress(sceneId, data) {
    const state = this.load();
    if (!state.scenes[sceneId]) {
      state.scenes[sceneId] = { completed: false, score: 0, bestScore: 0, attempts: 0 };
    }
    Object.assign(state.scenes[sceneId], data);
    this.save(state);
    return state.scenes[sceneId];
  },

  /** 获取词汇卡片进度 */
  getVocabProgress(cardId) {
    const state = this.load();
    return state.vocabulary[cardId] || null;
  },

  /** 更新词汇卡片进度 */
  updateVocabProgress(cardId, data) {
    const state = this.load();
    if (!state.vocabulary[cardId]) {
      state.vocabulary[cardId] = { mastered: false, lastReview: null, reviewCount: 0 };
    }
    Object.assign(state.vocabulary[cardId], data);
    this.save(state);
    return state.vocabulary[cardId];
  },

  /** 解锁成就 */
  unlockAchievement(achieveId) {
    const state = this.load();
    if (!state.achievements.includes(achieveId)) {
      state.achievements.push(achieveId);
      this.save(state);
      return true; // 新解锁
    }
    return false; // 已解锁
  },

  /** 检查成就是否已解锁 */
  hasAchievement(achieveId) {
    const state = this.load();
    return state.achievements.includes(achieveId);
  },

  /** 导出数据 */
  exportData() {
    const state = this.load();
    return JSON.stringify(state, null, 2);
  },

  /** 导入数据 */
  importData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      // 基本验证
      if (!data.player || !data.settings) {
        throw new Error('Invalid data format');
      }
      this.save(this._merge(DEFAULT_STATE, data));
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  /** 完全重置 */
  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /** 深克隆 */
  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /** 合并：default + saved（saved优先） */
  _merge(def, saved) {
    const result = this._deepClone(def);
    for (const key of Object.keys(result)) {
      if (saved[key] !== undefined) {
        if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
          result[key] = { ...result[key], ...saved[key] };
        } else {
          result[key] = saved[key];
        }
      }
    }
    return result;
  },
};
