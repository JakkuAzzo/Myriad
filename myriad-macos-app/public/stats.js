let hoursChart;
let categoryChart;
let sentimentChart;
let chatChart;

const cardsEl = document.getElementById('cards');
const aiSummaryTextEl = document.getElementById('aiSummaryText');
const aiSummaryHighlightsEl = document.getElementById('aiSummaryHighlights');
const topicsEl = document.getElementById('topics');
const deviceBreakdownEl = document.getElementById('deviceBreakdown');
const platformBreakdownEl = document.getElementById('platformBreakdown');
const consentToggle = document.getElementById('consentToggle');
const daysSelect = document.getElementById('daysSelect');
const deviceSelect = document.getElementById('deviceSelect');
const scopeSelect = document.getElementById('scopeSelect');
const adminKeyInput = document.getElementById('adminKeyInput');
const reassignDeviceSelect = document.getElementById('reassignDeviceSelect');
const reassignUnknownBtn = document.getElementById('reassignUnknownBtn');
const reassignStatus = document.getElementById('reassignStatus');

function getToken() {
  return localStorage.getItem('myriadToken') || '';
}

function clientPlatformHeader() {
  return window.myriadDesktop ? 'electron' : 'web';
}

function getAdminKey() {
  return adminKeyInput.value.trim();
}

function getScope() {
  return scopeSelect.value === 'global' ? 'global' : 'personal';
}

async function call(path, options = {}) {
  const headers = {
    'x-myriad-client-platform': clientPlatformHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }

  return response;
}

function renderCards(totals) {
  cardsEl.innerHTML = '';

  const items = [
    ['Total Events', totals.totalEvents || 0],
    ['Total Minutes', totals.totalMinutes || 0],
    ['Active Days', totals.activeDays || 0],
  ];

  for (const [label, value] of items) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `<h3>${label}</h3><p>${value}</p>`;
    cardsEl.appendChild(card);
  }
}

function mountChart(existing, canvasId, type, labels, data, label, color) {
  if (existing) {
    existing.destroy();
  }

  const ctx = document.getElementById(canvasId);
  return new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: `${color}44`,
          borderWidth: 2,
          fill: type === 'line',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0,
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 6,
          },
        },
      },
    },
  });
}

function renderTopics(topics) {
  topicsEl.innerHTML = '';
  if (!topics.length) {
    const li = document.createElement('li');
    li.textContent = 'No topic data yet.';
    topicsEl.appendChild(li);
    return;
  }

  for (const item of topics) {
    const li = document.createElement('li');
    li.textContent = `${item.topic}: ${item.count}`;
    topicsEl.appendChild(li);
  }
}

function renderDeviceBreakdown(rows) {
  deviceBreakdownEl.innerHTML = '';
  if (!rows.length) {
    const li = document.createElement('li');
    li.textContent = 'No device data yet.';
    deviceBreakdownEl.appendChild(li);
    return;
  }

  for (const row of rows) {
    const li = document.createElement('li');
    li.textContent = `${row.device}: ${row.events} events, ${row.minutes} minutes`;
    deviceBreakdownEl.appendChild(li);
  }
}

function renderPlatformBreakdown(rows) {
  platformBreakdownEl.innerHTML = '';
  if (!rows.length) {
    const li = document.createElement('li');
    li.textContent = 'No platform data yet.';
    platformBreakdownEl.appendChild(li);
    return;
  }

  for (const row of rows) {
    const li = document.createElement('li');
    li.textContent = `${row.platform}: ${row.events} events, ${row.minutes} minutes`;
    platformBreakdownEl.appendChild(li);
  }
}

function summaryPath(days, device) {
  const base = getScope() === 'global' ? '/api/summary/global' : '/api/summary';
  return `${base}?days=${days}&device=${encodeURIComponent(device)}`;
}

function enhancedSummaryPath(days, device) {
  const scope = getScope();
  return `/api/summary/enhanced?scope=${scope}&days=${days}&device=${encodeURIComponent(device)}`;
}

function renderEnhancedSummary(payload) {
  const aiSummary = payload && payload.aiSummary ? payload.aiSummary : null;
  aiSummaryHighlightsEl.innerHTML = '';

  if (!aiSummary) {
    aiSummaryTextEl.textContent = 'Enhanced insight not available.';
    return;
  }

  aiSummaryTextEl.textContent = aiSummary.narrative || 'No narrative available.';
  const highlights = Array.isArray(aiSummary.highlights) ? aiSummary.highlights : [];
  if (!highlights.length) {
    const li = document.createElement('li');
    li.textContent = 'No highlights available.';
    aiSummaryHighlightsEl.appendChild(li);
    return;
  }

  for (const item of highlights) {
    const li = document.createElement('li');
    li.textContent = item;
    aiSummaryHighlightsEl.appendChild(li);
  }
}

function hydrateDeviceSelect(rows, selectedValue) {
  const current = selectedValue || deviceSelect.value || 'all';
  const values = ['all', ...rows.map((x) => x.device)];
  const unique = [...new Set(values)];

  deviceSelect.innerHTML = '';
  for (const value of unique) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value === 'all' ? 'All devices' : value;
    if (value === current) {
      option.selected = true;
    }
    deviceSelect.appendChild(option);
  }
}

async function refreshDashboard() {
  const days = Number(daysSelect.value);
  const device = deviceSelect.value || 'all';
  const headers = {};
  if (getScope() === 'global') {
    const adminKey = getAdminKey();
    if (!adminKey) {
      throw new Error('Enter admin key to use global summary mode.');
    }
    headers['x-myriad-admin-key'] = adminKey;
  }

  const response = await call(summaryPath(days, device), { headers });
  const summary = await response.json();

  renderCards(summary.totals);
  hydrateDeviceSelect(summary.deviceBreakdown || [], summary.selectedDevice || 'all');

  hoursChart = mountChart(
    hoursChart,
    'hoursChart',
    'bar',
    summary.activeHours.map((x) => x.hour),
    summary.activeHours.map((x) => x.count),
    'Events by Hour',
    '#007a6e'
  );

  categoryChart = mountChart(
    categoryChart,
    'categoryChart',
    'bar',
    summary.categoryUsage.map((x) => x.category),
    summary.categoryUsage.map((x) => x.minutes),
    'Minutes',
    '#d15f2a'
  );

  sentimentChart = mountChart(
    sentimentChart,
    'sentimentChart',
    'line',
    summary.sentimentTrend.map((x) => x.date),
    summary.sentimentTrend.map((x) => x.avgSentiment),
    'Average Sentiment',
    '#3f6fb5'
  );

  chatChart = mountChart(
    chatChart,
    'chatChart',
    'line',
    summary.conversationFrequency.map((x) => x.date),
    summary.conversationFrequency.map((x) => x.messages),
    'Messages',
    '#5f7b2f'
  );

  renderTopics(summary.topTopics || []);
  renderDeviceBreakdown(summary.deviceBreakdown || []);
  renderPlatformBreakdown(summary.platformBreakdown || []);

  const enhancedResponse = await call(enhancedSummaryPath(days, device), { headers });
  const enhanced = await enhancedResponse.json();
  renderEnhancedSummary(enhanced);
}

async function syncConsent() {
  const response = await call('/api/consent');
  const data = await response.json();
  consentToggle.checked = data.enabled;
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  refreshDashboard().catch((err) => alert(err.message));
});

daysSelect.addEventListener('change', () => {
  refreshDashboard().catch((err) => alert(err.message));
});

deviceSelect.addEventListener('change', () => {
  refreshDashboard().catch((err) => alert(err.message));
});

scopeSelect.addEventListener('change', () => {
  const isGlobal = getScope() === 'global';
  adminKeyInput.style.display = isGlobal ? 'inline-flex' : 'none';
  refreshDashboard().catch((err) => alert(err.message));
});

adminKeyInput.addEventListener('change', () => {
  if (getScope() === 'global') {
    refreshDashboard().catch((err) => alert(err.message));
  }
});

consentToggle.addEventListener('change', async () => {
  await call('/api/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: consentToggle.checked }),
  });
});

document.getElementById('exportBtn').addEventListener('click', async () => {
  window.location.href = '/api/events/export';
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  if (!window.confirm('Delete all local data? This cannot be undone.')) {
    return;
  }
  await call('/api/events', { method: 'DELETE' });
  await refreshDashboard();
});

reassignUnknownBtn.addEventListener('click', async () => {
  const device = reassignDeviceSelect.value;
  const response = await call('/api/events/reassign-unknown-device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device }),
  });
  const data = await response.json();

  reassignStatus.textContent = `Reassigned ${data.updated} unknown events to ${device}.`;
  await refreshDashboard();
});

(async function init() {
  await syncConsent();
  await refreshDashboard();
})();
