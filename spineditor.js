const axios = require('axios');
const xml2js = require('xml2js');

/**
 * Bỏ ký tự escape ^ của cURL Windows
 */
function cleanCurlBody(rawBody) {
  if (!rawBody) return '';
  let cleaned = rawBody.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\^/g, '');
}

/**
 * Tìm mảng JSON chứa Keyword từ hàm CheckListKeyword(...)
 */
function findJsonArray(content) {
  if (!content) return null;
  const match = content.match(/CheckListKeyword\s*\(\s*\d+\s*,\s*['"][^'"]*['"]\s*,\s*(\[\s*\{[\s\S]*?\}\s*\])/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error('Lỗi parse JSON array từ CheckListKeyword:', e.message);
    }
  }
  return null;
}

/**
 * Parse XML response từ SpinEditor
 */
async function parseSpinEditorResponse(xmlRaw) {
  const parser = new xml2js.Parser({ explicitArray: false });
  const parsedXml = await parser.parseStringPromise(xmlRaw);
  const stringContent = parsedXml.string?._ || parsedXml.string;

  if (!stringContent) {
    throw new Error('Response XML không chứa thẻ <string>');
  }

  const jsonResponse = JSON.parse(stringContent);
  if (!jsonResponse.Success) {
    throw new Error(jsonResponse.Message || 'SpinEditor trả về Success = false');
  }

  const rawKeywords = findJsonArray(jsonResponse.Content || '');
  if (!rawKeywords || !Array.isArray(rawKeywords)) {
    return { search_engine: 'https://www.google.com.vn', total: 0, keywords: [] };
  }

  const keywords = rawKeywords.map(item => ({
    id: String(item.Id || ''),
    keyword: item.Keyword || '',
    position: typeof item.Position === 'number' ? item.Position : null,
    position_best: typeof item.PositionBest === 'number' ? item.PositionBest : null,
    position_old: typeof item.PositionOld === 'number' ? item.PositionOld : null,
    position_change: (typeof item.PositionOld === 'number' && typeof item.Position === 'number') 
      ? item.PositionOld - item.Position 
      : 0,
    url: item.LinkDisplay || '',
    domain: item.GetLinkDomain || '',
    date_update: item.DateUpdate || new Date().toISOString()
  }));

  return {
    search_engine: 'https://www.google.com.vn',
    total: keywords.length,
    keywords
  };
}

/**
 * Hàm gọi API lấy Thứ Hạng Keywords thật từ SpinEditor
 */
async function fetchSpinEditorRankings() {
  const cookie = process.env.SPINEDITOR_COOKIE;
  const rawBody = process.env.SPINEDITOR_FORM_BODY;

  if (!cookie) {
    throw new Error('CHƯA CẤU HÌNH SPINEDITOR_COOKIE TRONG .ENV');
  }
  if (!rawBody) {
    throw new Error('CHƯA CẤU HÌNH SPINEDITOR_FORM_BODY TRONG .ENV');
  }

  const body = cleanCurlBody(rawBody);

  try {
    const response = await axios.post(
      'https://spineditor.com/Code/Web/WebService.asmx/DoAction',
      body,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://spineditor.com',
          'Referer': 'https://spineditor.com/danh-sach-tu-khoa.html'
        },
        timeout: 30000
      }
    );

    return await parseSpinEditorResponse(response.data);
  } catch (err) {
    if (err.response) {
      console.error('SpinEditor HTTP Error Status:', err.response.status);
    }
    throw err;
  }
}

module.exports = {
  fetchSpinEditorRankings
};