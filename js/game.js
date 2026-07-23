/* ============================================
   game.js — 游戏机制 (XP/等级/成就/连击)
   MineTalk v1.0
   ============================================ */

const LEVELS = [
  { level: 1,  title: '🥾 Rookie',          xp: 0 },
  { level: 2,  title: '⛏️ Junior Miner',    xp: 100 },
  { level: 3,  title: '💎 Senior Miner',    xp: 250 },
  { level: 4,  title: '📋 Foreman',         xp: 500 },
  { level: 5,  title: '🔬 Geologist',       xp: 800 },
  { level: 6,  title: '🏔️ Senior Geologist', xp: 1200 },
  { level: 7,  title: '👑 Mine Manager',    xp: 2000 },
  { level: 8,  title: '🌟 Director',        xp: 3500 },
  { level: 9,  title: '🏭 VP Operations',   xp: 5500 },
  { level: 10, title: '🌍 CEO',             xp: 8000 },
];

const ACHIEVEMENTS = [
  { id: 'first-scene',     icon: '🎯', name: '初次下井',   desc: '完成第一次训练',         hint: '完成任意场景训练' },
  { id: 'scenes-5',        icon: '⭐', name: '五次历练',   desc: '完成5次训练',           hint: '累计完成5个场景' },
  { id: 'scenes-20',       icon: '🌟', name: '二十连胜',   desc: '完成20次训练',          hint: '累计完成20个场景' },
  { id: 'scenes-100',      icon: '🏆', name: '百炼成钢',   desc: '完成100次训练',         hint: '累计完成100个场景' },
  { id: 'streak-3',        icon: '🔥', name: '三日之火',   desc: '连续打卡3天',           hint: '连续3天完成训练' },
  { id: 'streak-7',        icon: '💥', name: '一周之星',   desc: '连续打卡7天',           hint: '连续7天完成训练' },
  { id: 'streak-30',       icon: '☄️', name: '月度传奇',   desc: '连续打卡30天',          hint: '连续30天完成训练' },
  { id: 'score-90',        icon: '💯', name: '满分对话',   desc: '单次评分90+',           hint: '训练评分达到90分以上' },
  { id: 'perfect',         icon: '✨', name: '完美演绎',   desc: '单次评分100分',         hint: '训练获得满分评价' },
  { id: 'vocab-20',        icon: '📚', name: '词汇学徒',   desc: '掌握20张词汇卡',        hint: '标记20张卡片为已掌握' },
  { id: 'vocab-50',        icon: '📖', name: '词汇大师',   desc: '掌握50张词汇卡',        hint: '标记50张卡片为已掌握' },
  { id: 'all-categories',  icon: '🌍', name: '全能矿工',   desc: '完成全部四类场景',      hint: '技术/现场/社交/商务各完成一次' },
  { id: 'multi-accent',    icon: '🎭', name: '多语言者',   desc: '用3种口音完成训练',     hint: '切换口音完成训练各一次' },
  { id: 'speed-demon',     icon: '⚡', name: '快速反应',   desc: '3秒内开始回答',         hint: 'AI说完后3秒内开始说话' },
  { id: 'night-owl',       icon: '🦉', name: '深夜矿工',   desc: '晚上10点后完成训练',    hint: '在22:00-04:00间完成训练' },
];

const Game = {
  /** 获取当前等级信息 */
  getLevelInfo(xp) {
    let info = LEVELS[0];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xp) {
        info = LEVELS[i];
        break;
      }
    }
    return info;
  },

  /** 获取下一等级信息 */
  getNextLevelInfo(xp) {
    const current = this.getLevelInfo(xp);
    const idx = LEVELS.findIndex(l => l.level === current.level);
    if (idx < LEVELS.length - 1) {
      return LEVELS[idx + 1];
    }
    return null; // 满级
  },

  /** 计算XP进度百分比 */
  getXpProgress(xp) {
    const current = this.getLevelInfo(xp);
    const next = this.getNextLevelInfo(xp);
    if (!next) return 100;
    const levelXp = xp - current.xp;
    const needed = next.xp - current.xp;
    return Math.min(100, Math.floor((levelXp / needed) * 100));
  },

  /** 获取等级列表 */
  getLevels() {
    return LEVELS;
  },

  /** 获取成就列表 */
  getAchievements() {
    return ACHIEVEMENTS;
  },

  /** 根据ID获取单个成就 */
  getAchievement(id) {
    return ACHIEVEMENTS.find(a => a.id === id) || null;
  },

  /**
   * 奖励XP
   * @returns {{ xpGained: number, leveledUp: boolean, newLevel: number|null, newTitle: string|null }}
   */
  awardXP(currentXp, amount) {
    const oldLevel = this.getLevelInfo(currentXp);
    const newXp = currentXp + amount;
    const newLevelInfo = this.getLevelInfo(newXp);

    return {
      xpGained: amount,
      newXp,
      leveledUp: newLevelInfo.level > oldLevel.level,
      newLevel: newLevelInfo.level,
      newTitle: newLevelInfo.title,
    };
  },

  /**
   * 计算场景训练XP
   */
  calcSceneXP(score, isFirstToday, streakDays) {
    let xp = 50; // 基础
    if (score >= 90) xp += 50;      // 完美
    else if (score >= 80) xp += 20; // 优秀
    if (isFirstToday) {
      xp += 10 + Math.min(streakDays, 7) * 5; // 连击加成
    }
    return xp;
  },

  /**
   * 更新连击
   * @returns {{ streak: number, isNewDay: boolean }}
   */
  updateStreak(lastTrainingDate, currentStreak) {
    const today = this._today();
    if (lastTrainingDate === today) {
      return { streak: currentStreak, isNewDay: false };
    }
    const yesterday = this._daysAgo(1);
    if (lastTrainingDate === yesterday) {
      return { streak: currentStreak + 1, isNewDay: true };
    }
    // 断签了
    return { streak: 1, isNewDay: true };
  },

  /**
   * 检查并解锁成就
   * @returns {Array} 新解锁的成就列表
   */
  checkAchievements(state) {
    const newly = [];
    const player = state.player;
    const unlocked = new Set(state.achievements);

    const check = (id, condition) => {
      if (!unlocked.has(id) && condition) {
        newly.push(this.getAchievement(id));
      }
    };

    check('first-scene', player.totalScenesCompleted >= 1);
    check('scenes-5', player.totalScenesCompleted >= 5);
    check('scenes-20', player.totalScenesCompleted >= 20);
    check('scenes-100', player.totalScenesCompleted >= 100);
    check('streak-3', player.streak >= 3);
    check('streak-7', player.streak >= 7);
    check('streak-30', player.streak >= 30);
    check('score-90', player.bestScore >= 90);
    check('perfect', player.bestScore >= 100);

    // 词汇掌握数量
    const masteredCount = Object.values(state.vocabulary).filter(v => v.mastered).length;
    check('vocab-20', masteredCount >= 20);
    check('vocab-50', masteredCount >= 50);

    // 全类别完成
    const categories = new Set();
    for (const [sceneId, progress] of Object.entries(state.scenes)) {
      if (progress.completed) {
        const cat = sceneId.split('-')[0];
        categories.add(cat);
      }
    }
    check('all-categories', categories.size >= 4);

    // 多口音
    check('multi-accent', false); // TODO: track accents used

    // 快速反应
    check('speed-demon', false); // TODO: track response time

    // 深夜矿工
    const hour = new Date().getHours();
    check('night-owl', hour >= 22 || hour < 4);

    return newly;
  },

  /** 今日日期 YYYY-MM-DD */
  _today() {
    return new Date().toISOString().slice(0, 10);
  },

  /** N天前日期 */
  _daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  },
};
