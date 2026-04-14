/**
 * 群声镜 MindMirror · 主应用逻辑
 */

// ============================================
// 模拟数据
// ============================================

const MOCK_DATA = {
  // 历史记录
  historyRecords: [
    { time: '今天 10:30', emotion: 'neutral', level: '不悲不喜', factor: '学业' },
    { time: '昨天 22:15', emotion: 'happy', level: '有点愉快', factor: '兴趣爱好' }
  ],

  // 情绪报告（周报）
  weeklyReport: {
    emotions: [3, 2, 3, 4, 2, 3, 3], // 1-5 级
    keywords: [
      { name: '疲惫', count: 5 },
      { name: '平静', count: 3 },
      { name: '焦虑', count: 3 },
      { name: '满足', count: 2 }
    ],
    factors: [
      { name: '学业', percent: 60 },
      { name: '人际关系', percent: 25 },
      { name: '身体状态', percent: 15 }
    ],
    aiSummary: '这周你的情绪整体偏向平稳，有几次明显的压力波动，主要集中在学业方面。周中有一天你的状态特别好，不知道发生了什么，但那种轻盈感很珍贵。'
  },

  // 月报数据（稍作变化）
  monthlyReport: {
    emotions: [3, 2, 4, 3, 2, 3, 4, 3, 2, 3, 4, 3, 2, 3, 3, 4, 2, 3, 4, 3, 2, 3, 3, 4, 3, 2, 3, 4, 3, 2],
    keywords: [
      { name: '疲惫', count: 12 },
      { name: '平静', count: 8 },
      { name: '焦虑', count: 7 },
      { name: '满足', count: 5 },
      { name: '迷茫', count: 4 }
    ],
    factors: [
      { name: '学业', percent: 55 },
      { name: '人际关系', percent: 28 },
      { name: '身体状态', percent: 12 },
      { name: '其他', percent: 5 }
    ],
    aiSummary: '这个月你经历了不少变化，情绪像天气一样有晴有雨。学业压力贯穿整个月，但你也给自己留了一些喘息的时间。那些让你满足的瞬间，虽然短暂，却很珍贵。'
  }
};

// ============================================
// 打卡状态管理
// ============================================

const CheckInState = {
  step: 1,
  data: {
    timeDimension: null,   // 'now' | 'today'
    emotionLevel: null,    // 1-5
    keywords: [],           // string[]
    customKeywords: [],    // string[]
    factors: []            // string[]
  },

  reset() {
    this.step = 1;
    this.data = {
      timeDimension: null,
      emotionLevel: null,
      keywords: [],
      customKeywords: [],
      factors: []
    };
  },

  getAllKeywords() {
    return [...this.data.keywords, ...this.data.customKeywords];
  },

  generateSummary() {
    const levelText = ['', '非常愉快', '有点愉快', '不悲不喜', '不太愉快', '很不愉快'];
    const emotionIcon = ['', 'happy', 'smile', 'neutral', 'sad', 'upset'];
    const level = this.data.emotionLevel || 3;
    const factors = this.data.factors.join('、') || '其他';

    return {
      emotion: emotionIcon[level],
      level: levelText[level],
      keywords: this.getAllKeywords().join('、') || '平静',
      factors,
      summary: `你今天${level <= 3 ? '有点' : '整体'}感觉${levelText[level].replace('愉快', '').replace('不', '不太') || '一般'}，主要受${factors}影响。`
    };
  }
};

// ============================================
// 树洞状态管理
// ============================================

const TreeholeState = {
  content: '',
  aiReply: '',

  reset() {
    this.content = '';
    this.aiReply = '';
  }
};

// ============================================
// AI 伴侣对话状态
// ============================================

const CompanionState = {
  history: [],
  userData: {
    recentEmotions: ['疲惫', '平静', '焦虑', '疲惫', '平静'],
    recentFactors: ['学业', '人际关系'],
    lastCheckIn: '今天 10:30'
  },

  reset() {
    this.history = [];
  },

  addMessage(role, content) {
    this.history.push({ role, content });
  }
};

// ============================================
// 页面导航
// ============================================

const Router = {
  currentTab: 'record',
  currentPage: 'index',
  pageStack: [],

  navigate(pageId, addToStack = true) {
    if (addToStack && this.currentPage !== pageId) {
      this.pageStack.push(this.currentPage);
    }
    this.currentPage = pageId;

    // 隐藏所有页面
    document.querySelectorAll('.page-view').forEach(el => {
      el.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // 隐藏 tab bar（需要时）
    const hideTabBarPages = ['checkin', 'treehole', 'treehole-reply', 'companion', 'splash'];
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
      tabBar.style.display = hideTabBarPages.includes(pageId) ? 'none' : 'flex';
    }
  },

  goBack() {
    if (this.pageStack.length > 0) {
      const prevPage = this.pageStack.pop();
      this.navigate(prevPage, false);
    }
  },

  switchTab(tabId) {
    this.currentTab = tabId;
    this.pageStack = [];

    // 更新 tab 样式
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // 导航到对应 tab 的首页
    const tabPages = {
      'record': 'index',
      'mirror': 'mirror',
      'resource': 'resource'
    };
    this.navigate(tabPages[tabId], false);
  }
};

// ============================================
// UI 渲染函数
// ============================================

const UI = {
  // 渲染历史记录
  renderHistoryRecords() {
    const container = document.getElementById('history-list');
    if (!container) return;

    const emotionSVGs = {
      happy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      smile: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 1 4 1 4-1 4-1"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      neutral: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      sad: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      upset: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'
    };

    const deleteIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

    container.innerHTML = MOCK_DATA.historyRecords.map((record, idx) => `
      <div class="history-item">
        <div class="history-item-content">
          <span class="history-time">${record.time}</span>
          <span class="history-icon">${emotionSVGs[record.emotion] || emotionSVGs.neutral}</span>
          <span class="history-text">${record.level}</span>
          <span class="history-factor">· ${record.factor}</span>
        </div>
        <span class="history-delete" data-index="${idx}" aria-label="删除">${deleteIcon}</span>
      </div>
    `).join('');

    // Bind delete handlers
    container.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        if (confirm('确定要删除这条记录吗？')) {
          MOCK_DATA.historyRecords.splice(idx, 1);
          this.renderHistoryRecords();
        }
      });
    });
  },

  // 渲染情绪关键词标签
  renderEmotionTags(containerId, selectedTags, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allTags = ['焦虑', '平静', '疲惫', '满足', '孤独', '期待', '烦躁', '开心', '委屈', '充实', '压抑', '轻松', '迷茫', '感激', '失落', '兴奋', '无聊', '紧张', '释然', '难过'];

    container.innerHTML = allTags.map(tag => `
      <button class="tag ${selectedTags.includes(tag) ? 'selected' : ''}" data-tag="${tag}">
        ${tag}
      </button>
    `).join('') + `
      <button class="tag" id="add-custom-tag">+ 自定义</button>
    `;

    // 绑定点击事件
    container.querySelectorAll('.tag[data-tag]').forEach(tagEl => {
      tagEl.addEventListener('click', () => {
        const tag = tagEl.dataset.tag;
        const idx = selectedTags.indexOf(tag);
        if (idx > -1) {
          selectedTags.splice(idx, 1);
        } else if (selectedTags.length < 5) {
          selectedTags.push(tag);
        }
        this.renderEmotionTags(containerId, selectedTags, onSelect);
        updateSelectedCount(selectedTags.length);
      });
    });

    // 自定义标签
    const addBtn = container.querySelector('#add-custom-tag');
    addBtn.addEventListener('click', showCustomTagInput);
  },

  // 渲染影响因素卡片
  renderFactorCards(containerId, selectedFactors, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const factors = ['学业', '人际关系', '恋爱', '家庭', '兴趣爱好', '身体状态', '其他'];

    container.innerHTML = factors.map(f => `
      <button class="tag ${selectedFactors.includes(f) ? 'selected' : ''}" data-factor="${f}">
        ${f}
      </button>
    `).join('');

    // 绑定点击事件
    container.querySelectorAll('.tag').forEach(tagEl => {
      tagEl.addEventListener('click', () => {
        const factor = tagEl.dataset.factor;
        const idx = selectedFactors.indexOf(factor);
        if (idx > -1) {
          selectedFactors.splice(idx, 1);
        } else {
          selectedFactors.push(factor);
        }
        this.renderFactorCards(containerId, selectedFactors, onSelect);
      });
    });
  },

  // 渲染打卡完成摘要
  renderCheckInSummary() {
    const summary = CheckInState.generateSummary();
    const summaryCard = document.getElementById('summary-card');

    const emotionSVGs = {
      happy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      smile: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 1 4 1 4-1 4-1"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      neutral: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      sad: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      upset: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'
    };

    const bookIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
    const tagIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';

    if (summaryCard) {
      summaryCard.innerHTML = `
        <p class="summary-text">${summary.summary}</p>
        <div class="summary-tags">
          <span class="summary-tag">${emotionSVGs[summary.emotion] || emotionSVGs.neutral} ${summary.level}</span>
          <span class="summary-tag">${tagIcon} ${summary.keywords}</span>
          <span class="summary-tag">${bookIcon} ${summary.factors}</span>
        </div>
      `;
    }
  },

  // 渲染情绪报告
  renderMirrorReport(period = 'week') {
    const data = period === 'week' ? MOCK_DATA.weeklyReport : MOCK_DATA.monthlyReport;

    // AI 总结
    const summaryCard = document.getElementById('report-summary');
    if (summaryCard) {
      summaryCard.textContent = data.aiSummary;
    }

    // 关键词
    const keywordsContainer = document.getElementById('report-keywords');
    if (keywordsContainer) {
      keywordsContainer.innerHTML = data.keywords.map(k => `
        <span class="keyword-bubble" style="font-size: ${14 + k.count * 2}px">${k.name}</span>
      `).join('');
    }

    // 影响因素
    const factorsContainer = document.getElementById('report-factors');
    if (factorsContainer) {
      factorsContainer.innerHTML = data.factors.map(f => `
        <div class="factor-bar">
          <span class="factor-name">${f.name}</span>
          <div class="factor-progress">
            <div class="factor-fill" style="width: ${f.percent}%"></div>
          </div>
          <span class="factor-percent">${f.percent}%</span>
        </div>
      `).join('');
    }

    // 渲染图表
    this.renderEmotionChart(data.emotions, period);
  },

  // 渲染情绪折线图
  renderEmotionChart(emotions, period) {
    const canvas = document.getElementById('emotion-chart');
    if (!canvas) return;

    // 销毁旧图表
    if (window.emotionChartInstance) {
      window.emotionChartInstance.destroy();
    }

    const labels = period === 'week'
      ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      : Array.from({length: 30}, (_, i) => `${i + 1}日`);

    const ctx = canvas.getContext('2d');

    // 颜色映射 (CSS variables fallback)
    const emotionColors = [
      '#90A4C8', // 1 - 很不愉快
      '#C8D9F0', // 2
      '#E8E8ED', // 3 - 不悲不喜
      '#FFE4B5', // 4
      '#FFD580'  // 5 - 非常愉快
    ];
    const getColor = (value) => emotionColors[value - 1] || emotionColors[2];

    const gradient = ctx.createLinearGradient(0, 0, 0, 140);
    gradient.addColorStop(0, 'rgba(123, 159, 212, 0.3)');
    gradient.addColorStop(1, 'rgba(123, 159, 212, 0)');

    window.emotionChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: period === 'week' ? labels : labels.slice(-7),
        datasets: [{
          data: period === 'week' ? emotions : emotions.slice(-7),
          borderColor: '#7B9FD4',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: emotions.map(v => getColor(v)),
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1C1C1E',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const levels = ['', '很不愉快', '不太愉快', '不悲不喜', '有点愉快', '非常愉快'];
                return levels[context.raw] || '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#8E8E93', font: { size: 11 } }
          },
          y: {
            min: 1,
            max: 5,
            grid: { color: '#E5E5EA' },
            ticks: {
              color: '#8E8E93',
              font: { size: 11 },
              stepSize: 1,
              callback: (value) => {
                const labels = ['', '很不愉快', '不太愉快', '不悲不喜', '有点愉快', '非常愉快'];
                return labels[value] || '';
              }
            }
          }
        }
      }
    });
  },

  // 渲染 AI 伴侣对话
  renderCompanionMessages() {
    const container = document.getElementById('companion-messages');
    if (!container) return;

    const avatarIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 5 6.5"/><path d="M12 22a7 7 0 0 0 7-7c0-3-2-5.5-5-6.5"/><line x1="12" y1="2" x2="12" y2="22"/></svg>';

    container.innerHTML = CompanionState.history.map(msg => `
      <div class="message-item ${msg.role}">
        ${msg.role === 'ai' ? `<span class="message-avatar">${avatarIcon}</span>` : ''}
        <div class="message-bubble ${msg.role}">${msg.content}</div>
      </div>
    `).join('');

    // 滚动到底部
    container.scrollTop = container.scrollHeight;
  },

  // 添加打字指示器
  showTypingIndicator() {
    const container = document.getElementById('companion-messages');
    if (!container) return;

    const avatarIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 5 6.5"/><path d="M12 22a7 7 0 0 0 7-7c0-3-2-5.5-5-6.5"/><line x1="12" y1="2" x2="12" y2="22"/></svg>';

    const typingEl = document.createElement('div');
    typingEl.id = 'typing-indicator';
    typingEl.className = 'message-item ai';
    typingEl.innerHTML = `
      <span class="message-avatar">${avatarIcon}</span>
      <div class="message-bubble ai">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
  },

  // 移除打字指示器
  hideTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }
};

// ============================================
// 事件绑定
// ============================================

function bindEvents() {
  // Tab 切换
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      Router.switchTab(tab.dataset.tab);
    });
  });

  // 入口卡片点击
  document.getElementById('btn-checkin')?.addEventListener('click', () => {
    CheckInState.reset();
    Router.navigate('checkin');
    showCheckInStep(1);
  });

  document.getElementById('btn-treehole')?.addEventListener('click', () => {
    TreeholeState.reset();
    Router.navigate('treehole');
  });

  // 打卡流程返回
  document.getElementById('checkin-back')?.addEventListener('click', () => {
    if (CheckInState.step > 1) {
      CheckInState.step--;
      showCheckInStep(CheckInState.step);
    } else {
      Router.navigate('index');
    }
  });

  // 树洞返回
  document.getElementById('treehole-back')?.addEventListener('click', () => {
    Router.goBack();
  });

  // 树洞回复页返回
  document.getElementById('treehole-reply-back')?.addEventListener('click', () => {
    Router.navigate('treehole');
  });

  // 打卡完成页 - 继续写点什么
  document.getElementById('btn-continue-treehole')?.addEventListener('click', () => {
    TreeholeState.reset();
    Router.navigate('treehole');
  });

  // 打卡完成页 - 完成先这样
  document.getElementById('btn-finish')?.addEventListener('click', () => {
    Router.navigate('index');
  });

  // 树洞 AI 回复页 - 查看镜像
  document.getElementById('btn-view-mirror')?.addEventListener('click', () => {
    Router.switchTab('mirror');
  });

  // 树洞 AI 回复页 - 再写一段
  document.getElementById('btn-write-more')?.addEventListener('click', () => {
    TreeholeState.reset();
    Router.navigate('treehole');
  });

  // 树洞发送
  document.getElementById('btn-treehole-send')?.addEventListener('click', submitTreehole);

  // 树洞输入字数统计
  document.getElementById('treehole-input')?.addEventListener('input', (e) => {
    const count = e.target.value.length;
    const counter = document.getElementById('treehole-count');
    const sendBtn = document.getElementById('btn-treehole-send');
    if (counter) {
      counter.textContent = `${count} / 500`;
      counter.style.color = count > 500 ? 'var(--color-error, #FF3B30)' : 'var(--color-text-tertiary)';
    }
    if (sendBtn) {
      sendBtn.disabled = count === 0;
    }
  });

  // AI 伴侣返回
  document.getElementById('companion-back')?.addEventListener('click', () => {
    Router.navigate('mirror');
  });

  // AI 伴侣发送
  document.getElementById('btn-companion-send')?.addEventListener('click', submitCompanionMessage);

  // AI 伴侣输入
  document.getElementById('companion-input')?.addEventListener('input', (e) => {
    const sendBtn = document.getElementById('btn-companion-send');
    if (sendBtn) {
      sendBtn.disabled = e.target.value.trim().length === 0;
    }
  });

  // 镜像页 - AI 伴侣入口
  document.getElementById('btn-open-companion')?.addEventListener('click', async () => {
    // 添加 AI 开场白
    const intro = '你好，今天感觉怎么样？我在这里倾听你。';
    CompanionState.addMessage('assistant', intro);
    Router.navigate('companion');
    UI.renderCompanionMessages();
  });

  // 镜像页 - 周/月切换
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      UI.renderMirrorReport(tab.dataset.period);
    });
  });

  // API Key 保存
  document.getElementById('btn-save-apikey')?.addEventListener('click', () => {
    const input = document.getElementById('apikey-input');
    if (input && input.value.trim()) {
      AI.setApiKey(input.value.trim());
      input.value = '';
      alert('API Key 已保存');
    }
  });

  // 阻止 Enter 提交
  document.getElementById('apikey-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-save-apikey')?.click();
    }
  });

  // 伴侣输入框 Enter 提交
  document.getElementById('companion-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitCompanionMessage();
    }
  });
}

// ============================================
// 打卡流程
// ============================================

function showCheckInStep(step) {
  // 隐藏所有步骤
  document.querySelectorAll('.checkin-step').forEach(el => el.classList.remove('active'));

  // 显示当前步骤
  const stepEl = document.getElementById(`checkin-step-${step}`);
  if (stepEl) stepEl.classList.add('active');

  // 更新进度条
  updateProgressBar(step);

  // 根据步骤初始化 UI
  if (step === 1) {
    // 时间维度
  } else if (step === 2) {
    // 情绪量级
    renderEmotionLevelCards();
  } else if (step === 3) {
    // 关键词
    CheckInState.data.keywords = [];
    updateSelectedCount(0);
    UI.renderEmotionTags('emotion-tags', CheckInState.data.keywords);
  } else if (step === 4) {
    // 影响因素
    CheckInState.data.factors = [];
    UI.renderFactorCards('factor-cards', CheckInState.data.factors);
  }

  CheckInState.step = step;
}

function updateProgressBar(step) {
  const dots = document.querySelectorAll('.progress-dot');
  dots.forEach((dot, i) => {
    dot.classList.remove('active', 'completed');
    if (i + 1 < step) dot.classList.add('completed');
    if (i + 1 === step) dot.classList.add('active');
  });

  const progressText = document.querySelector('.progress-text');
  if (progressText) progressText.textContent = `${step} / 4`;
}

function updateSelectedCount(count) {
  const countEl = document.getElementById('selected-count');
  if (countEl) countEl.textContent = `已选 ${count} / 5`;
}

function renderEmotionLevelCards() {
  const container = document.getElementById('emotion-level-cards');
  if (!container) return;

  const emotionColors = ['#FFD580', '#FFE4B5', '#E8E8ED', '#C8D9F0', '#90A4C8'];
  const emotionIcons = [
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 1 4 1 4-1 4-1"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'
  ];

  const levels = [
    { value: 5, label: '非常愉快', color: emotionColors[0] },
    { value: 4, label: '有点愉快', color: emotionColors[1] },
    { value: 3, label: '不悲不喜', color: emotionColors[2] },
    { value: 2, label: '不太愉快', color: emotionColors[3] },
    { value: 1, label: '很不愉快', color: emotionColors[4] }
  ];

  container.innerHTML = levels.map((l, i) => `
    <button class="emotion-card" data-level="${l.value}">
      <span class="emotion-indicator" style="background-color: ${l.color}"></span>
      <span class="emotion-icon" style="color: ${l.color}">${emotionIcons[i]}</span>
      <span class="emotion-text">${l.label}</span>
    </button>
  `).join('');

  container.querySelectorAll('.emotion-card').forEach(card => {
    card.addEventListener('click', () => {
      CheckInState.data.emotionLevel = parseInt(card.dataset.level);
      setTimeout(() => showCheckInStep(4), 300);
    });
  });
}

function submitCheckIn() {
  // 显示完成页
  Router.navigate('checkin-complete');
  UI.renderCheckInSummary();
}

// ============================================
// 树洞
// ============================================

async function submitTreehole() {
  const input = document.getElementById('treehole-input');
  if (!input || !input.value.trim()) return;

  TreeholeState.content = input.value.trim();
  Router.navigate('treehole-reply');

  // 显示用户内容
  const userContent = document.getElementById('user-content');
  if (userContent) {
    userContent.textContent = TreeholeState.content;
  }

  // 调用 AI
  try {
    const reply = await AI.getTreeholeReply(TreeholeState.content);
    TreeholeState.aiReply = reply;

    setTimeout(() => {
      const aiReplyEl = document.getElementById('ai-reply-content');
      if (aiReplyEl) {
        aiReplyEl.textContent = reply;
        document.getElementById('ai-reply-card').classList.add('visible');
        document.getElementById('reply-actions').classList.add('visible');
      }
    }, 1500);
  } catch (error) {
    const aiReplyEl = document.getElementById('ai-reply-content');
    if (aiReplyEl) {
      aiReplyEl.textContent = '今天好像有些沉，能把这些写出来，本身就很勇敢。';
    }
    console.error('AI 回复失败:', error);
  }
}

// ============================================
// AI 伴侣
// ============================================

async function submitCompanionMessage() {
  const input = document.getElementById('companion-input');
  if (!input || !input.value.trim()) return;

  const message = input.value.trim();
  input.value = '';
  document.getElementById('btn-companion-send').disabled = true;

  // 添加用户消息
  CompanionState.addMessage('user', message);
  UI.renderCompanionMessages();

  // 显示打字指示器
  setTimeout(() => UI.showTypingIndicator(), 300);

  // 调用 AI
  try {
    const reply = await AI.getCompanionReply(
      CompanionState.history.slice(0, -1),
      message,
      CompanionState.userData
    );

    UI.hideTypingIndicator();
    CompanionState.addMessage('assistant', reply);
    UI.renderCompanionMessages();
  } catch (error) {
    UI.hideTypingIndicator();
    CompanionState.addMessage('assistant', '抱歉，AI 服务暂时不可用，请检查 API Key 是否正确配置。');
    UI.renderCompanionMessages();
    console.error('AI 伴侣回复失败:', error);
  }
}

// ============================================
// 自定义标签输入
// ============================================

function showCustomTagInput() {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'custom-tag-input';
  input.placeholder = '输入自定义词，按回车确认';
  input.maxLength = 10;

  const container = document.getElementById('emotion-tags');
  container.appendChild(input);
  input.focus();

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      const tag = input.value.trim();
      if (!CheckInState.data.customKeywords.includes(tag) && CheckInState.getAllKeywords().length < 5) {
        CheckInState.data.customKeywords.push(tag);
        UI.renderEmotionTags('emotion-tags', CheckInState.getAllKeywords());
        updateSelectedCount(CheckInState.getAllKeywords().length);
      }
    }
  });

  input.addEventListener('blur', () => {
    if (!input.value.trim()) {
      input.remove();
    }
  });
}

// ============================================
// 初始化
// ============================================

function init() {
  // 检查 API Key 是否已配置
  if (!AI.hasApiKey()) {
    const banner = document.getElementById('apikey-banner');
    if (banner) banner.style.display = 'flex';
    document.body.classList.add('has-banner');
  }

  // 渲染历史记录
  UI.renderHistoryRecords();

  // 绑定事件
  bindEvents();

  // 初始化路由
  Router.navigate('splash');

  // Splash 1.5s 后跳转
  setTimeout(() => {
    Router.navigate('index');
  }, 1500);

  // 关键词下一步
  document.getElementById('btn-keywords-next')?.addEventListener('click', () => {
    if (CheckInState.getAllKeywords().length > 0) {
      showCheckInStep(4);
    }
  });

  // 影响因素完成
  document.getElementById('btn-factor-done')?.addEventListener('click', submitCheckIn);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
