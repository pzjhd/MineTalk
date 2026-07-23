/* ============================================
   api.js — DeepSeek API 封装 (OpenAI-compatible)
   MineTalk v1.0
   ============================================ */

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const MODEL = 'deepseek-chat';

const API = {
  /**
   * 发送对话请求
   * @param {Array} messages — 对话历史 [{role, content}, ...]
   * @param {string} systemPrompt — 系统提示词（角色设定+评分指令）
   * @param {string} apiKey
   * @returns {Promise<{reply: string, evaluation: object|null}>}
   */
  async chat(messages, systemPrompt, apiKey) {
    if (!apiKey) {
      throw new Error('NO_API_KEY');
    }

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    try {
      const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: fullMessages,
          temperature: 0.8,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('INVALID_API_KEY');
        }
        throw new Error(err.error?.message || `API Error ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // 解析回复中的JSON评分
      const { reply, evaluation } = this._parseResponse(content);

      return { reply, evaluation };
    } catch (e) {
      if (e.message === 'NO_API_KEY' || e.message === 'INVALID_API_KEY') {
        throw e;
      }
      console.error('API call failed:', e);
      throw new Error('NETWORK_ERROR');
    }
  },

  /**
   * 验证API Key是否有效
   */
  async validateKey(apiKey) {
    try {
      const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * 解析AI回复，分离对话内容和JSON评分
   */
  _parseResponse(content) {
    let reply = content;
    let evaluation = null;

    // 尝试提取JSON评分块
    const jsonMatch = content.match(/\{["']eval["']\s*:\s*\{[^}]+\}\s*\}/);
    if (jsonMatch) {
      try {
        evaluation = JSON.parse(jsonMatch[0]).eval;
        // 从回复中移除JSON块
        reply = content.replace(jsonMatch[0], '').trim();
      } catch {
        // JSON解析失败，保持原始回复
      }
    }

    // 也尝试匹配更宽松的JSON
    if (!evaluation) {
      const altMatch = content.match(/\{[^}]*"fluency"[^}]*\}/);
      if (altMatch) {
        try {
          const parsed = JSON.parse(altMatch[0]);
          evaluation = parsed.eval || parsed;
          reply = content.replace(altMatch[0], '').trim();
        } catch {
          // ignore
        }
      }
    }

    return { reply, evaluation };
  },
};
