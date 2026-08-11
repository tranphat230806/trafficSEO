const express = require('express');
const cors = require('cors');
const path = require('path');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { google } = require('googleapis');

const app = express();
app.use(cors());

// Phục vụ các file tĩnh (như index.html, css, js) ngay tại thư mục gốc
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. Cấu hình đọc credentials an toàn (Ưu tiên đọc từ Render Env, nếu không có mới tìm file local)
let credentials;
try {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  } else {
    credentials = require('./service-account.json');
  }
} catch (err) {
  console.error('Không thể tải Google Credentials:', err.message);
}

const GA4_PROPERTY_ID = '549439570'; 
const GSC_SITE_URL = 'https://daotaoseo.viocompany.com/'; 

// Khởi tạo Client xác thực Google bằng biến credentials
const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const searchconsole = google.searchconsole({ version: 'v1', auth });

// 2. Endpoint lấy dữ liệu từ GA4 & GSC
app.get('/api/live-traffic-report', async (req, res) => {
  try {
    // --- [1] LẤY DỮ LIỆU REALTIME GA4 (Đếm người đang online ngay lúc này) ---
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' }
      ]
    });

    const activeUsersNow = parseInt(realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
    const pageViewsNow = parseInt(realtimeResponse.rows?.[0]?.metricValues?.[1]?.value || '0', 10);

    // --- [2] LẤY DỮ LIỆU GA4 NGUYÊN BẢN (30 ngày gần nhất) ---
    const [gaResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' }
      ],
      dimensions: [
        { name: 'sessionMedium' }
      ]
    });

    let activeUsers30Days = 0;
    let totalSessions30Days = 0;
    let organicSessions = 0;

    if (gaResponse.rows) {
      gaResponse.rows.forEach(row => {
        const medium = row.dimensionValues[0].value;
        const users = parseInt(row.metricValues[0].value, 10);
        const sessions = parseInt(row.metricValues[1].value, 10);

        activeUsers30Days += users;
        totalSessions30Days += sessions;

        if (medium === 'organic') {
          organicSessions += sessions;
        }
      });
    }

    const organicShare = totalSessions30Days > 0 
      ? ((organicSessions / totalSessions30Days) * 100).toFixed(1) + '%' 
      : '0%';

    // --- [3] LẤY DỮ LIỆU SEARCH CONSOLE (30 ngày gần nhất) ---
    const endDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const gscResponse = await searchconsole.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: {
        startDate: startDate,
        endDate: endDate,
        dimensions: ['date']
      },
    });

    let totalClicks = 0;
    let totalImpressions = 0;

    if (gscResponse.data.rows) {
      gscResponse.data.rows.forEach(row => {
        totalClicks += row.clicks;
        totalImpressions += row.impressions;
      });
    }

    // Ưu tiên hiển thị số Realtime nếu đang có người online, nếu không sẽ hiện tổng 30 ngày
    const displayActiveUsers = activeUsersNow > 0 ? activeUsersNow : activeUsers30Days;
    const displaySessions = pageViewsNow > 0 ? pageViewsNow : totalSessions30Days;

    // --- TRẢ VỀ JSON CHO FRONTEND ---
    res.json({
      success: true,
      source: 'Live Google API',
      data: {
        activeUsers: displayActiveUsers.toLocaleString('vi-VN'),
        sessions: displaySessions.toLocaleString('vi-VN'),
        organicShare: organicShare,
        clicks: totalClicks.toLocaleString('vi-VN'),
        impressions: totalImpressions.toLocaleString('vi-VN'),
      }
    });

  } catch (error) {
    console.error('Lỗi kết nối API Google:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// LƯU Ý QUAN TRỌNG: Nhận cổng kết nối động do Render cấp phát (tránh lỗi 502 Bad Gateway)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server Backend đang chạy tại cổng: ${PORT}`);
});