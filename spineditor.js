const { XMLParser } = require('fast-xml-parser');

const SPINEDITOR_URL = 'https://spineditor.com/Code/Web/WebService.asmx/DoAction';

class SpinEditorError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false
});

function normalizePosition(value) {
  const position = Number(value);
  return Number.isFinite(position) && position > 0 ? position : null;
}

function normalizeKeyword(keyword) {
  const currentPosition = normalizePosition(keyword.Position);
  const oldPosition = normalizePosition(keyword.PositionOld);

  return {
    id: keyword.Id ?? null,
    keyword: keyword.Keyword ?? '',
    position: currentPosition,
    position_best: normalizePosition(keyword.PositionBest),
    position_old: oldPosition,
    position_change: currentPosition !== null && oldPosition !== null
      ? oldPosition - currentPosition
      : null,
    url: keyword.LinkDisplay ?? null,
    domain: keyword.GetLinkDomain ?? null,
    date_update: keyword.DateUpdate ?? null
  };
}

function findJsonArray(content) {
  const functionStart = content.search(/CheckListKeyword\s*\(/i);
  if (functionStart < 0) return null;

  const arrayStart = content.indexOf('[', functionStart);
  if (arrayStart < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = arrayStart; index < content.length; index += 1) {
    const character = content[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === '[') depth += 1;
    else if (character === ']') {
      depth -= 1;
      if (depth === 0) return content.slice(arrayStart, index + 1);
    }
  }

  return null;
}

function extractSearchEngine(content) {
  const match = content.match(/CheckListKeyword\s*\(\s*[^,]+,\s*"((?:\\.|[^"\\])*)"/i);
  if (!match) return null;

  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1];
  }
}

function parseSpinEditorResponse(xml) {
  let envelope;
  try {
    envelope = parser.parse(xml);
  } catch {
    throw new SpinEditorError('invalid_xml', 'SpinEditor trả về XML không hợp lệ.');
  }

  const rawString = envelope?.string;
  if (typeof rawString !== 'string') {
    throw new SpinEditorError('invalid_xml', 'Không tìm thấy nội dung string trong XML.');
  }

  let response;
  try {
    response = JSON.parse(rawString);
  } catch {
    throw new SpinEditorError('invalid_response_json', 'Nội dung string của SpinEditor không phải JSON hợp lệ.');
  }

  if (response.Success !== true) {
    throw new SpinEditorError(
      'authentication/session_expired',
      'SpinEditor từ chối request. Hãy dùng lại toàn bộ cookie trong -b (bao gồm DateCreate) và lấy lại payload DoAction trong cùng phiên.'
    );
  }

  const content = response.Content;
  const arrayText = typeof content === 'string' ? findJsonArray(content) : null;
  if (!arrayText) {
    throw new SpinEditorError('unexpected_response_format', 'Không tìm thấy CheckListKeyword trong response SpinEditor.');
  }

  let keywords;
  try {
    keywords = JSON.parse(arrayText);
  } catch {
    throw new SpinEditorError('unexpected_response_format', 'Danh sách keyword trong CheckListKeyword không hợp lệ.');
  }

  if (!Array.isArray(keywords)) {
    throw new SpinEditorError('unexpected_response_format', 'Danh sách keyword không phải một mảng.');
  }

  return {
    search_engine: extractSearchEngine(content),
    keywords: keywords.map(normalizeKeyword)
  };
}

function getSpinEditorPayload() {
  if (!process.env.SPINEDITOR_PAYLOAD_JSON) {
    return { m: 'SearchKeyword' };
  }

  try {
    const payload = JSON.parse(process.env.SPINEDITOR_PAYLOAD_JSON);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error();
    return payload;
  } catch {
    throw new SpinEditorError(
      'configuration_error',
      'SPINEDITOR_PAYLOAD_JSON phải là một JSON object hợp lệ trên một giá trị cấu hình. Không dán dạng danh sách key/value từ DevTools.',
      500
    );
  }
}

function encodeFormPayload(payload) {
  return Object.entries(payload).reduce((form, [key, value]) => {
    form.append(key, value !== null && typeof value === 'object'
      ? JSON.stringify(value)
      : String(value ?? ''));
    return form;
  }, new URLSearchParams());
}

function getSpinEditorBody() {
  if (process.env.SPINEDITOR_FORM_BODY) {
    // Copy as cURL from Windows cmd escapes form-body characters with ^.
    let body = process.env.SPINEDITOR_FORM_BODY.trim();
    if (body.endsWith('^"')) body = body.slice(0, -2);
    else if (body.endsWith('"')) body = body.slice(0, -1);
    return body.replace(/\^/g, '');
  }

  return encodeFormPayload(getSpinEditorPayload()).toString();
}

async function fetchSpinEditorRankings() {
  if (!process.env.SPINEDITOR_COOKIE) {
    throw new SpinEditorError('configuration_error', 'Chưa cấu hình SPINEDITOR_COOKIE.', 500);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(SPINEDITOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/xml, text/xml, */*',
        Origin: 'https://spineditor.com',
        Referer: 'https://spineditor.com/kiem-tra-thu-hang-tu-khoa',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: process.env.SPINEDITOR_COOKIE
      },
      body: getSpinEditorBody(),
      signal: controller.signal
    });

    if (response.status === 401 || response.status === 403) {
      throw new SpinEditorError('authentication/session_expired', 'Phiên SpinEditor đã hết hạn hoặc không hợp lệ.', 502);
    }

    if (!response.ok) {
      throw new SpinEditorError('upstream_error', `SpinEditor trả về HTTP ${response.status}.`, 502);
    }

    return parseSpinEditorResponse(await response.text());
  } catch (error) {
    if (error instanceof SpinEditorError) throw error;
    if (error.name === 'AbortError') {
      throw new SpinEditorError('upstream_timeout', 'SpinEditor không phản hồi trong thời gian cho phép.', 504);
    }
    throw new SpinEditorError('upstream_error', 'Không thể kết nối tới SpinEditor.', 502);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  fetchSpinEditorRankings,
  parseSpinEditorResponse,
  normalizePosition
};