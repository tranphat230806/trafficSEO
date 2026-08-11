const express = require('express');
const cors = require('cors');
const path = require('path');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { google } = require('googleapis');

const app = express();
app.use(cors());

// 1. Cấu hình thông số kết nối (Dùng path.join để tránh lỗi ENOENT đường dẫn file)
const KEY_FILE_PATH = path.join(__dirname, 'service-account.json');
const GA4_PROPERTY_ID = '549439570'; 
const GSC_SITE_URL = 'https://daotaoseo.viocompany.com/'; 

// Khởi tạo Client xác thực Google
const analyticsDataClient = new BetaAnalyticsDataClient({ keyFilename: KEY_FILE_PATH });
const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE_PATH,
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server Backend đang chạy tại: http://localhost:${PORT}`);
});