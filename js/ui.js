/* ============================================
   ui.js — DOM 渲染和交互
   MineTalk v1.0
   ============================================ */

const UI = {
  currentTab: 'home',
  currentScene: null,
  trainingActive: false,
  trainingMessages: [],
  trainingRound: 0,

  /** ===== 初始化所有UI ===== */
  init() {
    this._initTabs();
    this._initSettings();
    this.renderHome();
    this.renderSceneList('all');
    this.renderFlashCardDecks();
    this.renderFlashCard();
  },

  /** ===== Tab 切换 ===== */
  _initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        this.switchTab(tab);
      });
    });
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const panel = document.getElementById(`tab-${tab}`);
    if (panel) panel.classList.add('active');
    const navItem = document.querySelector(`[data-tab="${tab}"]`);
    if (navItem) navItem.classList.add('active');

    // 切换到tab时刷新内容
    if (tab === 'home') this.renderHome();
    if (tab === 'scenes') this.renderSceneList();
    if (tab === 'cards') { this.renderFlashCardDecks(); this.renderFlashCard(); }
  },

  /** ===== 主页仪表盘 ===== */
  renderHome() {
    const state = Storage.load();
    const player = state.player;
    const levelInfo = Game.getLevelInfo(player.xp);
    const progress = Game.getXpProgress(player.xp);

    // Header
    document.getElementById('levelBadge').textContent = player.level;
    document.getElementById('playerName').textContent = player.name;
    document.getElementById('playerTitle').textContent = levelInfo.title;
    document.getElementById('xpMiniFill').style.width = `${progress}%`;
    document.getElementById('xpMiniText').textContent = `${player.xp} XP`;
    document.getElementById('streakCount').textContent = player.streak;

    // XP Card
    document.getElementById('xpLevel').textContent = player.level;
    const nextLevel = Game.getNextLevelInfo(player.xp);
    document.getElementById('xpNextLevel').textContent = nextLevel ? nextLevel.level : 'MAX';
    document.getElementById('xpBarLarge').style.width = `${progress}%`;
    document.getElementById('xpCurrent').textContent = `${player.xp} XP`;
    if (nextLevel) {
      const needed = nextLevel.xp - player.xp;
      document.getElementById('xpNeeded').textContent = `${needed} XP to next level`;
    } else {
      document.getElementById('xpNeeded').textContent = '🏆 Max Level!';
    }

    // Stats
    document.getElementById('statScenes').textContent = player.totalScenesCompleted;
    document.getElementById('statMinutes').textContent = player.totalTrainingMinutes;
    document.getElementById('statBest').textContent = player.bestScore || '--';

    // Daily Challenges
    this._renderDailyChallenges(state);

    // Achievements
    this._renderAchievements(state);
  },

  _renderDailyChallenges(state) {
    const allScenes = SCENES;
    const completed = Object.entries(state.scenes)
      .filter(([, p]) => p.completed)
      .map(([id]) => id);

    // 每天随机选3个未完成的场景
    const pending = allScenes.filter(s => !completed.includes(s.id));
    const shuffled = [...pending].sort(() => Math.random() - 0.5);
    const challenges = shuffled.slice(0, 3);

    // 如果不够3个，加入已完成的
    if (challenges.length < 3) {
      const extra = allScenes.filter(s => completed.includes(s.id));
      const extraShuffled = [...extra].sort(() => Math.random() - 0.5);
      challenges.push(...extraShuffled.slice(0, 3 - challenges.length));
    }

    // 存储今日挑战
    const today = new Date().toISOString().slice(0, 10);
    const stored = Storage.load();
    if (!stored._dailyChallenges || stored._dailyChallenges.date !== today) {
      stored._dailyChallenges = { date: today, ids: challenges.map(c => c.id) };
      Storage.save(stored);
    }

    const challengeIds = stored._dailyChallenges.ids;
    const displayChallenges = challengeIds
      .map(id => allScenes.find(s => s.id === id))
      .filter(Boolean);

    document.getElementById('dailyProgress').textContent =
      `${displayChallenges.filter(c => state.scenes[c.id]?.completed).length}/${displayChallenges.length}`;

    const container = document.getElementById('dailyChallengeList');
    container.innerHTML = displayChallenges.map(c => {
      const isDone = state.scenes[c.id]?.completed;
      const catClass = `cat-${c.category}`;
      return `
        <div class="challenge-card ${isDone ? 'completed' : ''}"
             data-scene-id="${c.id}"
             onclick="UI.selectScene('${c.id}')">
          <div class="challenge-check">${isDone ? '✅' : ''}</div>
          <div class="challenge-info">
            <div class="challenge-title">${c.title}</div>
            <div class="challenge-meta">
              <span class="challenge-difficulty">${'⭐'.repeat(c.difficulty)}</span>
              <span class="challenge-category ${catClass}">${c.category}</span>
              <span>${c.estimatedMinutes}min</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  _renderAchievements(state) {
    const allAch = Game.getAchievements();
    const unlocked = new Set(state.achievements);
    document.getElementById('achieveCount').textContent = `${unlocked.size}/${allAch.length}`;

    const container = document.getElementById('achievementsRow');
    container.innerHTML = allAch.slice(0, 8).map(a => {
      const isUnlocked = unlocked.has(a.id);
      return `
        <div class="achievement-chip ${isUnlocked ? 'unlocked' : 'locked'}"
             title="${a.name}: ${a.desc}">
          <span class="achievement-icon">${a.icon}</span>
          <span class="achievement-name">${isUnlocked ? a.name : '???'}</span>
        </div>
      `;
    }).join('');
  },

  /** ===== 场景选择 ===== */
  renderSceneList(filter) {
    this._currentFilter = filter || this._currentFilter || 'all';

    // 更新筛选按钮
    document.querySelectorAll('.cat-filter').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === this._currentFilter);
    });

    // 筛选按钮事件
    document.querySelectorAll('.cat-filter').forEach(b => {
      b.onclick = () => {
        this._currentFilter = b.dataset.cat;
        this.renderSceneList(this._currentFilter);
      };
    });

    const state = Storage.load();
    const filtered = this._currentFilter === 'all'
      ? SCENES
      : SCENES.filter(s => s.category === this._currentFilter);

    const container = document.getElementById('sceneList');
    container.innerHTML = filtered.map(s => {
      const progress = state.scenes[s.id];
      const isDone = progress?.completed;
      const score = progress?.bestScore || 0;
      const catClass = `cat-${s.category}`;

      return `
        <div class="scene-card ${isDone ? 'completed-card' : ''}"
             onclick="UI.selectScene('${s.id}')">
          <div class="scene-avatar">${s.character.avatar}</div>
          <div class="scene-info">
            <div class="scene-title">${s.title}</div>
            <div class="scene-subtitle">${s.subtitle}</div>
            <div class="scene-meta">
              <span class="challenge-difficulty">${'⭐'.repeat(s.difficulty)}</span>
              <span class="challenge-category ${catClass}">${s.category}</span>
              <span>${s.estimatedMinutes}min</span>
              <span>👤 ${s.character.name}</span>
              ${isDone ? `<span class="scene-score">🏆 ${score}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  selectScene(sceneId) {
    this.currentScene = SCENES.find(s => s.id === sceneId);
    if (!this.currentScene) return;

    // 保存场景到当前选择
    const state = Storage.load();
    state._selectedScene = sceneId;
    Storage.save(state);

    // 如果当前在场景页，切换到训练页
    this.switchTab('training');
    this._showTrainingStart();
  },

  /** ===== 训练界面 ===== */
  _showTrainingStart() {
    const scene = this.currentScene;

    document.getElementById('trainingStart').style.display = 'block';
    document.getElementById('trainingActive').style.display = 'none';
    this.trainingActive = false;

    if (scene) {
      document.getElementById('trainAvatar').textContent = scene.character.avatar;
      document.getElementById('trainCharName').textContent = scene.character.name;
      document.getElementById('trainCharRole').textContent =
        `${scene.character.role} · ${scene.context.setting}`;
      document.getElementById('trainSelectHint').style.display = 'none';
      document.getElementById('trainStartBtnWrap').style.display = 'block';

      // 绑定开始按钮
      const btn = document.getElementById('btnStartTraining');
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.onclick = () => UI.startTraining();
    } else {
      document.getElementById('trainAvatar').textContent = '👨‍🔧';
      document.getElementById('trainCharName').textContent = '选择一个场景开始';
      document.getElementById('trainCharRole').textContent = '';
      document.getElementById('trainSelectHint').style.display = 'block';
      document.getElementById('trainStartBtnWrap').style.display = 'none';
    }
  },

  startTraining(sceneId) {
    const scene = sceneId
      ? SCENES.find(s => s.id === sceneId)
      : this.currentScene;

    if (!scene) {
      this.showToast('请先在场景页面选择一个训练场景', 'error');
      return;
    }

    this.currentScene = scene;
    this.trainingActive = true;
    this.trainingMessages = [];
    this.trainingRound = 0;
    this._trainingStartTime = new Date();

    document.getElementById('trainingStart').style.display = 'none';
    document.getElementById('trainingActive').style.display = 'block';

    document.getElementById('trainAvatarActive').textContent = scene.character.avatar;
    document.getElementById('trainCharNameActive').textContent = scene.character.name;
    document.getElementById('trainCharRoleActive').textContent =
      `${scene.character.role} · ${scene.context.setting}`;

    // 渲染回合指示器
    this._renderRoundIndicator();
    // 清空聊天区
    document.getElementById('chatArea').innerHTML = '';
    // 渲染提示词
    this._renderHints();
    // 绑定麦克风
    this._bindMic();
    // 绑定手动输入
    this._bindManualInput();
    // 绑定结束按钮
    document.getElementById('btnEndTraining').onclick = () => this.endTraining();

    // 启动场景：AI先说话
    this._addChatBubble('system', `📍 ${scene.context.setting}`);
    this._addChatBubble('system', `👤 你的角色: ${scene.context.yourRole}`);
    this._startAIRound();
  },

  _renderRoundIndicator() {
    const total = this.currentScene.rounds;
    const container = document.getElementById('roundIndicator');
    let html = '';
    for (let i = 0; i < total; i++) {
      let cls = '';
      if (i < this.trainingRound) cls = 'done';
      if (i === this.trainingRound) cls = 'current';
      html += `<span class="round-dot ${cls}"></span>`;
    }
    html += `<span style="font-size:11px;color:var(--text-muted);margin-left:6px;">${this.trainingRound}/${total}</span>`;
    container.innerHTML = html;
  },

  _renderHints() {
    const scene = this.currentScene;
    const showHints = Storage.getSetting('showHints');
    const container = document.getElementById('hintWords');
    if (!showHints || !scene) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = scene.keyVocabulary.map(v =>
      `<span class="hint-chip" onclick="UI._useHint('${v.en}')">
        <span class="zh">${v.zh}</span> →
        <span class="en">${v.en}</span>
      </span>`
    ).join('');
  },

  _useHint(text) {
    const input = document.getElementById('manualInput');
    if (input) {
      input.value = (input.value + ' ' + text).trim();
      input.focus();
    }
  },

  _bindMic() {
    const btn = document.getElementById('micBtn');
    const hint = document.getElementById('micHint');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    const newHint = hint.cloneNode(true);
    hint.parentNode.replaceChild(newHint, hint);

    Speech.onStateChange = (listening) => {
      const micBtn = document.getElementById('micBtn');
      const micHint = document.getElementById('micHint');
      if (listening) {
        micBtn.classList.add('listening');
        micBtn.textContent = '🔴';
        micHint.textContent = '正在聆听...';
        micHint.classList.add('listening');
      } else {
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎤';
        micHint.textContent = '点击麦克风开始说话';
        micHint.classList.remove('listening');
      }
    };

    Speech.onResult = (text) => {
      this._onUserSpeak(text);
    };

    Speech.onError = (err) => {
      if (err !== 'no-speech') {
        this.showToast(`语音识别失败: ${err}`, 'error');
      }
    };

    document.getElementById('micBtn').onclick = () => {
      if (!Speech.isRecognitionSupported) {
        this.showToast('你的浏览器不支持语音识别，请使用Chrome浏览器', 'error');
        return;
      }
      if (Speech.isListening) {
        Speech.stopListening();
      } else {
        // 使用场景角色口音或用户设置的口音
        const accent = Storage.getSetting('accent') || 'en-ZA';
        Speech.startListening(accent);
      }
    };
  },

  _bindManualInput() {
    document.getElementById('btnSend').onclick = () => {
      const input = document.getElementById('manualInput');
      const text = input.value.trim();
      if (text) {
        this._onUserSpeak(text);
        input.value = '';
      }
    };

    document.getElementById('manualInput').onkeydown = (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btnSend').click();
      }
    };
  },

  _onUserSpeak(text) {
    if (!this.trainingActive) return;
    this._addChatBubble('user', text);
    this.trainingMessages.push({ role: 'user', content: text });
    this._startAIRound();
  },

  async _startAIRound() {
    if (!this.trainingActive) return;
    if (this.trainingRound >= this.currentScene.rounds) {
      this.endTraining();
      return;
    }

    const scene = this.currentScene;
    const apiKey = Storage.getSetting('apiKey');
    const accent = Storage.getSetting('accent') || scene.character.accent;

    // 显示加载状态
    this._addChatBubble('system', '🤔 ...');

    try {
      const { reply, evaluation } = await API.chat(
        this.trainingMessages,
        scene.systemPrompt,
        apiKey
      );

      // 移除加载气泡
      const chatArea = document.getElementById('chatArea');
      chatArea.removeChild(chatArea.lastChild);

      if (reply) {
        this._addChatBubble('ai', reply);
        this.trainingMessages.push({ role: 'assistant', content: reply });

        // TTS朗读
        Speech.speak(reply, accent, () => {
          // 朗读完成，用户可以开始说话
        });
      }

      this.trainingRound++;

      // 检查是否结束
      if (evaluation || this.trainingRound >= this.currentScene.rounds) {
        if (evaluation) {
          this._showEvaluation(evaluation);
        } else {
          this.endTraining();
        }
      } else {
        this._renderRoundIndicator();
      }
    } catch (e) {
      // 移除加载气泡
      const chatArea = document.getElementById('chatArea');
      if (chatArea.lastChild) chatArea.removeChild(chatArea.lastChild);

      if (e.message === 'NO_API_KEY') {
        this._addChatBubble('system', '⚠️ 请先在设置页面配置DeepSeek API Key');
        this.showToast('请先配置API Key', 'error');
      } else if (e.message === 'INVALID_API_KEY') {
        this._addChatBubble('system', '⚠️ API Key无效，请检查设置');
        this.showToast('API Key无效', 'error');
      } else {
        this._addChatBubble('system', '⚠️ 网络错误，请检查网络连接后重试');
        this.showToast('网络连接失败', 'error');
      }
    }
  },

  _addChatBubble(type, text) {
    const area = document.getElementById('chatArea');
    const label = type === 'ai' ? this.currentScene?.character?.name || 'AI' :
                  type === 'user' ? '你' : '';
    const div = document.createElement('div');
    div.className = `chat-bubble ${type}`;
    div.innerHTML = `${label ? `<div class="speaker-label">${label}</div>` : ''}${text}`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  },

  _showEvaluation(evaluation) {
    const totalScore = Math.round(
      (evaluation.fluency + evaluation.vocabulary + evaluation.grammar) / 3
    );

    // 保存到游戏状态
    const sceneId = this.currentScene.id;
    const state = Storage.load();
    const existing = state.scenes[sceneId] || { completed: false, score: 0, bestScore: 0, attempts: 0 };

    const now = new Date();
    const trainingMinutes = Math.round(
      (now - (this._trainingStartTime || now)) / 60000
    ) || this.currentScene.estimatedMinutes;

    // 更新场景进度
    Storage.updateSceneProgress(sceneId, {
      completed: true,
      score: totalScore,
      bestScore: Math.max(existing.bestScore || 0, totalScore),
      attempts: (existing.attempts || 0) + 1,
    });

    // 连击更新
    const player = state.player;
    const streakResult = Game.updateStreak(player.lastTrainingDate, player.streak);

    // XP
    const isFirstToday = streakResult.isNewDay;
    const xpResult = Game.awardXP(player.xp, Game.calcSceneXP(totalScore, isFirstToday, streakResult.streak));

    // 更新玩家
    Storage.updatePlayer({
      xp: xpResult.newXp,
      level: xpResult.newLevel,
      streak: streakResult.streak,
      lastTrainingDate: new Date().toISOString().slice(0, 10),
      totalScenesCompleted: player.totalScenesCompleted + 1,
      totalTrainingMinutes: player.totalTrainingMinutes + trainingMinutes,
      bestScore: Math.max(player.bestScore || 0, totalScore),
    });

    // 检查成就
    const newState = Storage.load();
    const newAchievements = Game.checkAchievements(newState);

    // 手动保存所有成就
    newAchievements.forEach(a => Storage.unlockAchievement(a.id));

    // 渲染弹窗
    this._renderEvalModal(evaluation, totalScore, xpResult, newAchievements);

    this.trainingActive = false;
    this._renderRoundIndicator();
    this.renderHome();
  },

  _renderEvalModal(evaluation, totalScore, xpResult, newAchievements) {
    const scoreClass = (s) => s >= 9 ? 'great' : s >= 7 ? 'good' : s >= 5 ? 'ok' : 'poor';

    let achieveHTML = '';
    if (newAchievements.length > 0) {
      achieveHTML = `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
          <div style="font-size:12px;color:var(--gold);font-weight:700;margin-bottom:6px;">🏆 新成就解锁！</div>
          ${newAchievements.map(a => `<span style="font-size:24px;margin:0 4px;" title="${a.name}">${a.icon}</span>`).join('')}
        </div>
      `;
    }

    let levelUpHTML = '';
    if (xpResult.leveledUp) {
      levelUpHTML = `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
          <span style="font-size:28px;">🎉</span>
          <div style="font-size:16px;font-weight:900;color:var(--gold);">升级了！</div>
          <div style="font-size:14px;color:var(--text-secondary);">${xpResult.newTitle}</div>
        </div>
      `;
    }

    const modal = document.getElementById('evalModal');
    modal.innerHTML = `
      <div class="eval-overlay" onclick="UI.closeEval()">
        <div class="eval-card" onclick="event.stopPropagation()">
          <div class="eval-title">📊 训练结果</div>
          <div class="eval-scores">
            <div class="eval-score-item">
              <div class="eval-score-circle ${scoreClass(evaluation.fluency)}">${evaluation.fluency}</div>
              <div class="eval-score-label">流利度</div>
            </div>
            <div class="eval-score-item">
              <div class="eval-score-circle ${scoreClass(evaluation.vocabulary)}">${evaluation.vocabulary}</div>
              <div class="eval-score-label">词汇</div>
            </div>
            <div class="eval-score-item">
              <div class="eval-score-circle ${scoreClass(evaluation.grammar)}">${evaluation.grammar}</div>
              <div class="eval-score-label">语法</div>
            </div>
          </div>
          <div style="font-size:24px;font-weight:900;color:var(--gold);margin-bottom:12px;">
            总分: ${totalScore}/10
          </div>
          <div class="eval-tip">
            💡 <strong>改进建议:</strong> ${evaluation.tip}
          </div>
          <div style="color:var(--success);font-weight:700;margin-bottom:8px;">
            +${xpResult.xpGained} XP ⚡
          </div>
          ${levelUpHTML}
          ${achieveHTML}
          <button class="btn btn-primary btn-block" style="margin-top:16px;" onclick="UI.closeEval()">
            继续训练 💪
          </button>
        </div>
      </div>
    `;

    if (xpResult.leveledUp) {
      this._spawnParticles();
    }
    if (newAchievements.length > 0) {
      newAchievements.forEach(a => this._showAchievementToast(a));
    }
  },

  closeEval() {
    document.getElementById('evalModal').innerHTML = '';
    this._showTrainingStart();
    this.renderHome();
  },

  endTraining() {
    if (this.trainingMessages.length === 0) {
      this._showTrainingStart();
      return;
    }

    this.trainingActive = false;
    Speech.stopSpeaking();

    // 如果没有AI评分，给一个简单的完成提示
    this._addChatBubble('system', '训练结束。在设置中配置API Key以获得AI评分。');
    setTimeout(() => {
      this._showTrainingStart();
    }, 2000);
  },

  /** ===== 词汇闪卡 ===== */
  renderFlashCardDecks() {
    const container = document.getElementById('deckSelector');
    const categories = [
      { key: 'all', label: '📦 全部' },
      { key: 'technical', label: '🔬 技术' },
      { key: 'field', label: '⛏️ 现场' },
      { key: 'social', label: '🍺 社交' },
      { key: 'business', label: '📋 商务' },
    ];

    const active = this._activeDeck || 'all';

    container.innerHTML = categories.map(c =>
      `<button class="deck-chip ${c.key === active ? 'active' : ''}"
               onclick="UI._switchDeck('${c.key}')">${c.label}</button>`
    ).join('');

    this._activeDeck = active;
  },

  _switchDeck(deck) {
    this._activeDeck = deck;
    this._cardIndex = 0;
    this.renderFlashCardDecks();
    this.renderFlashCard();
  },

  renderFlashCard() {
    const deck = this._activeDeck || 'all';
    const cards = deck === 'all'
      ? FLASH_CARDS
      : FLASH_CARDS.filter(c => c.category === deck);

    if (cards.length === 0) {
      document.getElementById('cardZh').textContent = '没有词汇卡片';
      document.getElementById('cardEn').textContent = '';
      document.getElementById('cardSceneRef').textContent = '';
      document.getElementById('cardProgress').textContent = '0 / 0';
      return;
    }

    const idx = this._cardIndex || 0;
    const card = cards[idx % cards.length];

    document.getElementById('cardZh').textContent = card.zh;
    document.getElementById('cardEn').textContent = card.en;
    document.getElementById('cardSceneRef').textContent = `📋 ${card.sceneTitle}`;
    document.getElementById('cardProgress').textContent = `${idx + 1} / ${cards.length}`;

    // 翻转状态重置
    document.getElementById('flashCard').classList.remove('flipped');

    // 绑定翻转
    const flashCard = document.getElementById('flashCard');
    const newCard = flashCard.cloneNode(true);
    flashCard.parentNode.replaceChild(newCard, flashCard);
    newCard.onclick = () => newCard.classList.toggle('flipped');

    // 绑定按钮
    document.getElementById('btnCardAgain').onclick = () => {
      newCard.classList.remove('flipped');
    };

    document.getElementById('btnCardMastered').onclick = () => {
      Storage.updateVocabProgress(card.id, {
        mastered: true,
        lastReview: new Date().toISOString().slice(0, 10),
        reviewCount: (Storage.getVocabProgress(card.id)?.reviewCount || 0) + 1,
      });
      this.showToast('已掌握！+5 XP ✨', 'xp');
      Storage.updatePlayer({ xp: Storage.getPlayer().xp + 5 });

      // 下一张
      this._cardIndex = (idx + 1) % cards.length;
      this.renderFlashCard();
      this.renderHome();
    };

    // 复习队列
    this._renderReviewQueue();
  },

  _renderReviewQueue() {
    const state = Storage.load();
    const reviewCards = Object.entries(state.vocabulary)
      .filter(([, v]) => !v.mastered)
      .map(([id]) => FLASH_CARDS.find(c => c.id === id))
      .filter(Boolean);

    if (reviewCards.length === 0) {
      document.getElementById('reviewQueue').style.display = 'none';
      return;
    }

    document.getElementById('reviewQueue').style.display = 'block';
    document.getElementById('reviewCount').textContent = reviewCards.length;
    document.getElementById('reviewList').innerHTML = reviewCards.slice(0, 5).map(c =>
      `<div class="review-item">
        <span>${c.zh} → <strong>${c.en}</strong></span>
        <span class="review-count">待复习</span>
      </div>`
    ).join('');
  },

  /** ===== 设置 ===== */
  _initSettings() {
    const state = Storage.load();
    document.getElementById('apiKeyInput').value = state.settings.apiKey || '';
    document.getElementById('nicknameInput').value = state.player.name;
    document.getElementById('defaultAccentSelect').value = state.settings.accent;
    document.getElementById('hintModeSelect').value = state.settings.showHints ? 'true' : 'false';
    document.getElementById('accentSelect').value = state.settings.accent;

    // API Key 变更
    document.getElementById('apiKeyInput').onchange = (e) => {
      Storage.updateSetting('apiKey', e.target.value.trim());
      this._checkAPIStatus();
    };

    // 昵称变更
    document.getElementById('nicknameInput').onchange = (e) => {
      Storage.updatePlayer({ name: e.target.value.trim() || '地质小王' });
      this.renderHome();
    };

    // 口音变更
    document.getElementById('defaultAccentSelect').onchange = (e) => {
      Storage.updateSetting('accent', e.target.value);
      document.getElementById('accentSelect').value = e.target.value;
    };

    // 场景页口音变更
    document.getElementById('accentSelect').onchange = (e) => {
      Storage.updateSetting('accent', e.target.value);
      document.getElementById('defaultAccentSelect').value = e.target.value;
    };

    // 辅助模式
    document.getElementById('hintModeSelect').onchange = (e) => {
      Storage.updateSetting('showHints', e.target.value === 'true');
    };

    // 导出
    document.getElementById('btnExportData').onclick = () => {
      const data = Storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minetalk-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('数据已导出', 'success');
    };

    // 导入
    document.getElementById('btnImportData').onclick = () => {
      document.getElementById('importFileInput').click();
    };

    document.getElementById('importFileInput').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const success = Storage.importData(ev.target.result);
        if (success) {
          this.showToast('数据导入成功！刷新页面生效', 'success');
          this._initSettings();
          this.renderHome();
        } else {
          this.showToast('数据格式错误', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    // 清除
    document.getElementById('btnResetData').onclick = () => {
      if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
        Storage.resetAll();
        location.reload();
      }
    };

    this._checkAPIStatus();
  },

  async _checkAPIStatus() {
    const apiKey = Storage.getSetting('apiKey');
    const statusEl = document.getElementById('apiStatus');
    if (!apiKey) {
      statusEl.innerHTML = '<span style="color:var(--text-muted);">⚪ 未配置API Key</span>';
      statusEl.className = 'api-status';
      return;
    }
    statusEl.innerHTML = '<span>🔄 正在验证...</span>';
    statusEl.className = 'api-status';
    const ok = await API.validateKey(apiKey);
    if (ok) {
      statusEl.innerHTML = '<span>✅ API Key 有效</span>';
      statusEl.className = 'api-status ok';
    } else {
      statusEl.innerHTML = '<span>❌ API Key 无效</span>';
      statusEl.className = 'api-status err';
    }
  },

  /** ===== 通用 UI 工具 ===== */
  showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  },

  _showAchievementToast(achievement) {
    const container = document.getElementById('achievementPopup');
    const div = document.createElement('div');
    div.className = 'achievement-toast';
    div.innerHTML = `
      <div class="achieve-icon">${achievement.icon}</div>
      <div class="achieve-label">🏆 成就解锁！</div>
      <div class="achieve-name">${achievement.name}</div>
    `;
    container.appendChild(div);
    setTimeout(() => {
      if (div.parentNode) div.parentNode.removeChild(div);
    }, 3500);
  },

  _spawnParticles() {
    const emojis = ['✨', '⭐', '💎', '🌟', '🎉', '💫', '⚡', '🔥'];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = `${40 + Math.random() * 20}%`;
      p.style.top = `${40 + Math.random() * 10}%`;
      p.style.setProperty('--px', `${(Math.random() - 0.5) * 300}px`);
      p.style.setProperty('--py', `${-Math.random() * 300 - 50}px`);
      p.style.animationDuration = `${1 + Math.random() * 1.5}s`;
      document.body.appendChild(p);
      setTimeout(() => {
        if (p.parentNode) p.parentNode.removeChild(p);
      }, 2000);
    }
  },
};
