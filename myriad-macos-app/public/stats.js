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
const goalTitleInput = document.getElementById('goalTitleInput');
const goalCategoryInput = document.getElementById('goalCategoryInput');
const goalDeviceInput = document.getElementById('goalDeviceInput');
const goalMaxDailyMinutesInput = document.getElementById('goalMaxDailyMinutesInput');
const goalPlanInput = document.getElementById('goalPlanInput');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const goalStatus = document.getElementById('goalStatus');
const goalList = document.getElementById('goalList');
const interventionList = document.getElementById('interventionList');

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

function renderGoals(goals) {
  goalList.innerHTML = '';
  if (!goals.length) {
    const li = document.createElement('li');
    li.textContent = 'No goals yet. Add one above to start behavior-change tracking.';
    goalList.appendChild(li);
    return;
  }

  for (const goal of goals) {
    const li = document.createElement('li');
    li.className = 'goal-item';

    const description = document.createElement('span');
    const scopeLabel = goal.device === 'all' ? 'all devices' : goal.device;
    description.textContent = `${goal.title}: keep ${goal.category} under ${goal.maxDailyMinutes} minutes/day on ${scopeLabel}.`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'danger';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', async () => {
      await call(`/api/habits/goals/${goal.id}`, { method: 'DELETE' });
      goalStatus.textContent = 'Goal removed.';
      await refreshHabitPlan();
    });

    li.appendChild(description);
    li.appendChild(removeBtn);

    if (goal.interventionPlan) {
      const plan = document.createElement('div');
      plan.className = 'muted';
      plan.textContent = `Plan: ${goal.interventionPlan}`;
      li.appendChild(plan);
    }

    goalList.appendChild(li);
  }
}

function renderInterventions(plan) {
  interventionList.innerHTML = '';
  const interventions = Array.isArray(plan.interventions) ? plan.interventions : [];

  if (!interventions.length) {
    const li = document.createElement('li');
    li.textContent = 'No interventions yet. Add a goal to generate actions.';
    interventionList.appendChild(li);
    return;
  }

  for (const intervention of interventions) {
    const li = document.createElement('li');
    const heading = document.createElement('strong');
    heading.textContent = `${intervention.goalTitle} (${intervention.status})`;
    li.appendChild(heading);

    const ul = document.createElement('ul');
    for (const action of intervention.actions || []) {
      const actionLi = document.createElement('li');
      actionLi.textContent = action;
      ul.appendChild(actionLi);
    }

    li.appendChild(ul);
    interventionList.appendChild(li);
  }
}

async function refreshHabitPlan() {
  const days = Number(daysSelect.value);
  const [goalsResponse, planResponse] = await Promise.all([
    call('/api/habits/goals'),
    call(`/api/habits/plan?days=${days}`),
  ]);

  const goalsPayload = await goalsResponse.json();
  const planPayload = await planResponse.json();

  renderGoals(Array.isArray(goalsPayload.goals) ? goalsPayload.goals : []);
  renderInterventions(planPayload);
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

  await refreshHabitPlan();
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

saveGoalBtn.addEventListener('click', async () => {
  const title = goalTitleInput.value.trim();
  const category = goalCategoryInput.value.trim();
  const device = goalDeviceInput.value;
  const maxDailyMinutes = Number(goalMaxDailyMinutesInput.value);
  const interventionPlan = goalPlanInput.value.trim();

  await call('/api/habits/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      category,
      device,
      maxDailyMinutes,
      interventionPlan,
      active: true,
    }),
  });

  goalStatus.textContent = 'Goal saved.';
  goalTitleInput.value = '';
  goalCategoryInput.value = '';
  goalPlanInput.value = '';
  await refreshHabitPlan();
});

async function checkAndSendNudges() {
  if (!window.myriadDesktop) {
    return;
  }

  try {
    const planResponse = await call('/api/habits/plan');
    const plan = await planResponse.json();

    for (const intervention of plan.interventions || []) {
      const riskLevel = intervention.riskLevel || 'low';
      if (riskLevel === 'critical' || riskLevel === 'high') {
        const recentNotif = sessionStorage.getItem(`nudge-${intervention.goalId}`);
        const now = Date.now();

        if (!recentNotif || parseInt(recentNotif, 10) < now - 600000) {
          const summary = plan.goalProgress?.find((p) => p.goal.id === intervention.goalId);
          if (summary) {
            const title = `⚠️ ${intervention.goalTitle}`;
            const body =
              riskLevel === 'critical'
                ? `Critical risk: ${intervention.actions[0] || 'Reduce usage immediately.'}`
                : `High risk: ${summary.goal.category} at ${summary.percentToLimit}% of daily limit.`;

            await window.myriadDesktop.showNudgeNotification(title, body, riskLevel);
            sessionStorage.setItem(`nudge-${intervention.goalId}`, String(now));
          }
        }
      }
    }
  } catch (err) {
    console.error('Nudge check failed:', err.message);
  }
}

(async function init() {
  await syncConsent();
  await refreshDashboard();

  if (window.myriadDesktop) {
    await checkAndSendNudges();

    if (window.myriadDesktop.onNudgeCheckInterval) {
      window.myriadDesktop.onNudgeCheckInterval(() => {
        checkAndSendNudges().catch(() => {});
      });
    }

    await window.myriadDesktop.scheduleNudgeCheck(300000);
  }
})();
