/**
 * 群声镜 MindMirror · AI 模块
 * Claude API 调用封装
 */

const AI = {
  // API 配置
  API_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-haiku-4-5-20251001',

  // 获取 API Key
  getApiKey() {
    return sessionStorage.getItem('mindmirror_api_key') || '';
  },

  // 设置 API Key
  setApiKey(key) {
    sessionStorage.setItem('mindmirror_api_key', key);
  },

  // 检查是否已配置 API Key
  hasApiKey() {
    return !!this.getApiKey();
  },

  /**
   * 通用消息调用
   * @param {string[]} systemPrompts - 系统提示词数组
   * @param {Array} messages - 对话历史 [{role, content}]
   * @param {number} maxTokens - 最大 token 数
   * @returns {Promise<string>} AI 回复内容
   */
  async sendMessage(systemPrompts, messages, maxTokens = 1024) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('请先在页面顶部输入 API Key');
    }

    // 构建 system prompt
    const system = systemPrompts.join('\n\n');

    // 构建消息体
    const requestBody = {
      model: this.MODEL,
      max_tokens: maxTokens,
      system,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    };

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API 请求失败 (${response.status})`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      if (error.message.includes('请先在页面顶部输入 API Key')) {
        throw error;
      }
      throw new Error(`AI 服务暂时不可用: ${error.message}`);
    }
  },

  /**
   * 树洞 AI 回复
   * @param {string} userContent - 用户书写的内容
   * @returns {Promise<string>} AI 共情回复（40字以内）
   */
  async getTreeholeReply(userContent) {
    const systemPrompts = [
      '你是一个温暖共情的倾听者，名字是 MindMirror。',
      '用户刚刚在心情树洞中写下了他们的感受。',
      '你的回复需要：',
      '1. 温暖、包容、不评判',
      '2. 简短（40字以内），说1-2句话即可',
      '3. 先共情，再适度回应',
      '4. 不要使用"你应该"、"你必须"等指令性语言',
      '5. 不要进行诊断或给出专业心理建议',
      '6. 语言风格：像朋友在深夜发来的一条安慰消息'
    ];

    const messages = [
      {
        role: 'user',
        content: `用户写道：${userContent}`
      }
    ];

    return this.sendMessage(systemPrompts, messages, 100);
  },

  /**
   * AI 伴侣对话
   * @param {Array} conversationHistory - 对话历史 [{role: 'user'|'assistant', content: string}]
   * @param {string} newMessage - 用户新消息
   * @param {object} userData - 用户近期打卡数据（用于个性化）
   * @returns {Promise<string>} AI 回复
   */
  async getCompanionReply(conversationHistory, newMessage, userData = null) {
    let systemContent = [
      '你是一个温暖、支持性的 AI 心理伴侣，名字是 MindMirror。',
      '你的角色是：',
      '1. 共情倾听：先回应用户的感受，表达理解',
      '2. 非评判：不批评、不指责、不说教',
      '3. 适度引导：可以温和地提问，帮助用户探索自己的感受',
      '4. 去医学化：避免使用诊断性词汇，不做诊断',
      '5. 边界清晰：知道自己是 AI，不能替代专业心理咨询',
      '',
      '回复风格：',
      '- 温暖但不过度煽情',
      '- 简短自然，像朋友的对话',
      '- 每条回复控制在 60 字以内',
      '- 可以适当使用 emoji 增添温度'
    ];

    // 如果有用户数据，加入个性化上下文
    if (userData && Object.keys(userData).length > 0) {
      let context = '\n\n用户近期数据背景：';
      if (userData.recentEmotions?.length) {
        context += `\n- 最近的情绪状态：${userData.recentEmotions.join('、')}`;
      }
      if (userData.recentFactors?.length) {
        context += `\n- 最近主要压力源：${userData.recentFactors.join('、')}`;
      }
      if (userData.lastCheckIn) {
        context += `\n- 上次打卡时间：${userData.lastCheckIn}`;
      }
      context += '\n\n你可以适当引用这些背景信息来表达关心，但不要直接罗列数据。';
      systemContent.push(context);
    }

    const messages = [...conversationHistory, { role: 'user', content: newMessage }];
    return this.sendMessage(systemContent, messages, 300);
  },

  /**
   * 生成情绪报告摘要
   * @param {object} reportData - 报告数据 {emotions, keywords, factors}
   * @returns {Promise<string>} AI 生成的摘要文字
   */
  async generateReportSummary(reportData) {
    const systemPrompts = [
      '你是一个温暖的心理状态叙事者，为用户生成个性化的情绪周报/月报总结。',
      '要求：',
      '1. 第一人称，温暖叙事风格，约 80-120 字',
      '2. 像朋友在帮你回顾：你这周/月的情绪状态',
      '3. 提及具体的情绪波动和可能的触发因素',
      '4. 结尾可以有一点积极的信息或鼓励',
      '5. 不要太正式，像发朋友圈的文案风格'
    ];

    const content = `请根据以下数据生成一段情绪总结：
情绪记录：[${reportData.emotions?.join(', ')}]
高频关键词：${reportData.keywords?.map(k => `${k.name}(${k.count}次)`).join('、')}
影响因素：${reportData.factors?.map(f => `${f.name} ${f.percent}%`).join('、')}
时间范围：${reportData.period || '本周'}`;

    const messages = [{ role: 'user', content }];
    return this.sendMessage(systemPrompts, messages, 300);
  }
};

// 导出
window.AI = AI;
