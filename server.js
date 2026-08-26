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

const GA4_PROPERTY_ID = '478422291';
const GSC_SITE_URL = 'https://halongbayluxcruises.com/';

// Khởi tạo Client xác thực Google bằng biến credentials
const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const searchconsole = google.searchconsole({ version: 'v1', auth });

// 2. Endpoint lấy dữ liệu từ GA4 & GSC (Overview)
app.get('/api/live-traffic-report', async (req, res) => {
  try {
    // --- [1] LẤY DỮ LIỆU REALTIME GA4 (Đếm người đang online ngay lúc này) ---
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      metrics: [
        { name: 'activeUsers' },
      ]
    });

    const activeUsersNow = parseInt(realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

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

    const organicShare = totalSessions30Days > 0 ? (organicSessions / totalSessions30Days) : 0;

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

    // --- TRẢ VỀ JSON CHO FRONTEND ---
    res.json({
      success: true,
      source: 'Live Google API',
      data: {
        activeUsers: activeUsersNow > 0 ? activeUsersNow : activeUsers30Days,
        sessions: totalSessions30Days, // Không dùng pageViewsNow làm sessions
        organicShare: organicShare,
        clicks: totalClicks,
        impressions: totalImpressions,
      }
    });

  } catch (error) {
    console.error('Lỗi kết nối API Google:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Endpoint Traffic Trend (GA4)
app.get('/api/traffic-trend', async (req, res) => {
  try {
    const [gaResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' }
      ],
      dimensions: [
        { name: 'date' }
      ]
    });

    const data = (gaResponse.rows || []).map(row => ({
      date: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value, 10),
      sessions: parseInt(row.metricValues[1].value, 10)
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Lỗi API Traffic Trend:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Endpoint SEO Performance (GSC)
app.get('/api/seo-performance', async (req, res) => {
  try {
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

    const data = (gscResponse.data.rows || []).map(row => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Lỗi API SEO Performance:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Endpoint Keywords (GSC)
app.get('/api/keywords', async (req, res) => {
  try {
    const endDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const gscResponse = await searchconsole.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: {
        startDate: startDate,
        endDate: endDate,
        dimensions: ['query'],
        rowLimit: 50
      },
    });

    const data = (gscResponse.data.rows || []).map(row => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Lỗi API Keywords:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Endpoint Landing Pages (GSC)
app.get('/api/landing-pages', async (req, res) => {
  try {
    const endDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const gscResponse = await searchconsole.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: {
        startDate: startDate,
        endDate: endDate,
        dimensions: ['page'],
        rowLimit: 50
      },
    });

    const data = (gscResponse.data.rows || []).map(row => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Lỗi API Landing Pages:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Endpoint Traffic Overview (Current vs Previous)
app.get('/api/traffic-overview', async (req, res) => {
  try {
    // Determine dates
    let { startDate, endDate, prevStartDate, prevEndDate } = req.query;
    
    if (!startDate || !endDate || !prevStartDate || !prevEndDate) {
      endDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      startDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      prevEndDate = new Date(Date.now() - 33 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      prevStartDate = new Date(Date.now() - 63 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    // Helper to fetch GA4 stats for a date range
    const getGA4Stats = async (start, end) => {
      const [totalRes] = await analyticsDataClient.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' }
        ]
      });

      const [seoRes] = await analyticsDataClient.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensionFilter: {
          filter: { fieldName: 'sessionMedium', stringFilter: { value: 'organic' } }
        },
        metrics: [{ name: 'sessions' }]
      });

      const row = totalRes.rows?.[0]?.metricValues || [];
      const seoRow = seoRes.rows?.[0]?.metricValues || [];

      const sessions = parseInt(row[1]?.value || '0', 10);
      const seoSessions = parseInt(seoRow[0]?.value || '0', 10);

      return {
        users: parseInt(row[0]?.value || '0', 10),
        sessions,
        pageviews: parseInt(row[2]?.value || '0', 10),
        averageSessionDuration: parseFloat(row[3]?.value || '0'),
        seoSessions,
        seoContribution: sessions > 0 ? (seoSessions / sessions) * 100 : 0
      };
    };

    // Helper to fetch GSC stats for a date range
    const getGSCStats = async (start, end) => {
      const gscRes = await searchconsole.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: { startDate: start, endDate: end, dimensions: ['date'] },
      });
      let clicks = 0;
      let impressions = 0;
      if (gscRes.data.rows) {
        gscRes.data.rows.forEach(r => {
          clicks += r.clicks;
          impressions += r.impressions;
        });
      }
      return { clicks, impressions };
    };

    const [curGA4, prevGA4, curGSC, prevGSC] = await Promise.all([
      getGA4Stats(startDate, endDate),
      getGA4Stats(prevStartDate, prevEndDate),
      getGSCStats(startDate, endDate),
      getGSCStats(prevStartDate, prevEndDate)
    ]);

    // Lấy target từ ENV (mặc định 8000 nếu chưa cấu hình)
    const kpiTarget = parseInt(process.env.TRAFFIC_KPI_TARGET || '8000', 10);
    const actualSessions = curGA4.sessions;
    const achievement = kpiTarget > 0 ? (actualSessions / kpiTarget) * 100 : 0;

    res.json({
      success: true,
      data: {
        users: { current: curGA4.users, previous: prevGA4.users },
        sessions: { current: curGA4.sessions, previous: prevGA4.sessions },
        seoSessions: { current: curGA4.seoSessions, previous: prevGA4.seoSessions },
        seoContribution: { current: curGA4.seoContribution, previous: prevGA4.seoContribution },
        pageviews: { current: curGA4.pageviews, previous: prevGA4.pageviews },
        gscClicks: { current: curGSC.clicks, previous: prevGSC.clicks },
        gscImpressions: { current: curGSC.impressions, previous: prevGSC.impressions },
        averageSessionDuration: { current: curGA4.averageSessionDuration, previous: prevGA4.averageSessionDuration },
        kpiAchievement: { actual: actualSessions, target: kpiTarget, achievement: achievement }
      }
    });

  } catch (error) {
    console.error('Lỗi API Traffic Overview:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Endpoint Traffic By Device
app.get('/api/traffic-by-device', async (req, res) => {
  try {
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      endDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      startDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const [gaResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }]
    });

    const data = (gaResponse.rows || []).map(row => ({
      device: row.dimensionValues[0].value.toLowerCase(),
      sessions: parseInt(row.metricValues[0].value, 10)
    }));

    res.json({ success: true, source: 'Live Google API', data });
  } catch (error) {
    console.error('Lỗi API Traffic By Device:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// LƯU Ý QUAN TRỌNG: Nhận cổng kết nối động do Render cấp phát (tránh lỗi 502 Bad Gateway)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server Backend đang chạy tại cổng: ${PORT}`);
});