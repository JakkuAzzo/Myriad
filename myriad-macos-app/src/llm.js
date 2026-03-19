function buildHighlights(summary) {
  const highlights = [];
  const totals = summary.totals || { totalEvents: 0, totalMinutes: 0, activeDays: 0 };

  if (totals.totalEvents === 0) {
    highlights.push('No tracked events yet in the selected window.');
    return highlights;
  }

  highlights.push(`Captured ${totals.totalEvents} events across ${totals.activeDays} active days.`);
  highlights.push(`Total tracked activity is ${totals.totalMinutes} minutes.`);

  const topCategory = (summary.categoryUsage || [])[0];
  if (topCategory) {
    highlights.push(`Top category is ${topCategory.category} (${topCategory.minutes} minutes).`);
  }

  const topDevice = (summary.deviceBreakdown || [])[0];
  if (topDevice) {
    highlights.push(`Most activity is on ${topDevice.device} (${topDevice.events} events).`);
  }

  const topPlatform = (summary.platformBreakdown || [])[0];
  if (topPlatform) {
    highlights.push(`Reporting platform leader is ${topPlatform.platform} (${topPlatform.events} events).`);
  }

  const topTopic = (summary.topTopics || [])[0];
  if (topTopic && topTopic.topic) {
    highlights.push(`Most frequent topic: ${topTopic.topic}.`);
  }

  return highlights;
}

function redactText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted-phone]')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .trim();
}

function redactEventSample(sample) {
  return {
    occurredAt: sample.occurredAt,
    source: sample.source,
    category: sample.category,
    topic: redactText(sample.topic || ''),
    device: sample.device,
    clientPlatform: sample.clientPlatform,
    durationMinutes: sample.durationMinutes,
  };
}

function sanitizePromptContext(summary, context) {
  const samples = Array.isArray(context.eventSamples) ? context.eventSamples.map(redactEventSample) : [];
  return {
    scope: context.scope,
    days: context.days,
    device: context.device,
    summary,
    eventSamples: samples,
  };
}

function buildPrompt(summary, context) {
  const safe = sanitizePromptContext(summary, context);
  const totals = safe.summary.totals || { totalEvents: 0, totalMinutes: 0, activeDays: 0 };
  const categories = (safe.summary.categoryUsage || []).slice(0, 5).map((x) => `${x.category}:${x.minutes}m`).join(', ');
  const platforms = (safe.summary.platformBreakdown || []).slice(0, 5).map((x) => `${x.platform}:${x.events}`).join(', ');
  const topics = (safe.summary.topTopics || []).slice(0, 5).map((x) => redactText(x.topic || '')).join(', ');
  const sampleLines = (safe.eventSamples || []).slice(0, 8).map((x) => {
    return `- ${x.occurredAt} | ${x.clientPlatform}/${x.device} | ${x.source}/${x.category} | ${x.durationMinutes}m | ${x.topic || 'n/a'}`;
  }).join('\n');

  return [
    'You are a product analytics assistant. Output concise JSON only with keys:',
    'narrative (string), highlights (array of strings), confidence (low|medium|high), warnings (array of strings).',
    `Scope: ${safe.scope}. Days: ${safe.days}. Device filter: ${safe.device}.`,
    `Totals: events=${totals.totalEvents}, minutes=${totals.totalMinutes}, activeDays=${totals.activeDays}.`,
    `Top categories: ${categories || 'none'}.`,
    `Platform breakdown: ${platforms || 'none'}.`,
    `Top topics: ${topics || 'none'}.`,
    'Recent event samples (already redacted):',
    sampleLines || '- none',
  ].join('\n');
}

function narrativeFromSummary(summary, context) {
  const highlights = buildHighlights(summary);
  const scopeLabel = context.scope === 'global' ? 'global' : 'personal';
  const windowText = `${context.days} day${context.days === 1 ? '' : 's'}`;
  const deviceLabel = context.device && context.device !== 'all' ? context.device : 'all devices';

  if (!highlights.length) {
    return `No usable data found for the ${scopeLabel} ${windowText} window on ${deviceLabel}.`;
  }

  return [
    `This ${scopeLabel} summary covers ${windowText} on ${deviceLabel}.`,
    highlights.slice(0, 3).join(' '),
  ].join(' ');
}

class HeuristicProvider {
  constructor() {
    this.name = 'heuristic-fallback';
    this.model = process.env.MYRIAD_LLM_MODEL || 'myriad-summary-v1';
  }

  async generate(summary, context) {
    return {
      narrative: narrativeFromSummary(summary, context),
      highlights: buildHighlights(summary),
      confidence: 'medium',
      warnings: [
        'AI insights are assistive and may be incomplete.',
      ],
    };
  }
}

class OnnxProvider {
  constructor() {
    this.name = 'onnx-transformers';
    this.model = process.env.MYRIAD_LLM_MODEL || 'myriad-7b-onnx';
    this.modelPath = process.env.MYRIAD_ONNX_MODEL_PATH || this.model;
    this._pipelinePromise = null;
  }

  async ensurePipeline() {
    if (this._pipelinePromise) {
      return this._pipelinePromise;
    }

    this._pipelinePromise = (async () => {
      const transformers = await import('@xenova/transformers');
      if (process.env.MYRIAD_HF_LOCAL_ONLY === 'true') {
        transformers.env.allowRemoteModels = false;
      }
      if (process.env.MYRIAD_HF_CACHE_DIR) {
        transformers.env.cacheDir = process.env.MYRIAD_HF_CACHE_DIR;
      }

      return transformers.pipeline('text-generation', this.modelPath, {
        quantized: process.env.MYRIAD_LLM_QUANTIZED !== 'false',
      });
    })();

    return this._pipelinePromise;
  }

  async generate(summary, context) {
    const fallback = {
      narrative: narrativeFromSummary(summary, context),
      highlights: buildHighlights(summary),
      confidence: 'medium',
      warnings: ['AI insights are assistive and may be incomplete.'],
    };

    try {
      const generator = await this.ensurePipeline();
      const prompt = buildPrompt(summary, context);
      const maxNewTokens = Number(process.env.MYRIAD_LLM_MAX_NEW_TOKENS || 220);
      const temperature = Number(process.env.MYRIAD_LLM_TEMPERATURE || 0.2);

      const output = await generator(prompt, {
        max_new_tokens: Number.isFinite(maxNewTokens) ? Math.max(64, Math.min(maxNewTokens, 512)) : 220,
        temperature: Number.isFinite(temperature) ? Math.max(0, Math.min(temperature, 1.5)) : 0.2,
        do_sample: true,
        top_p: 0.9,
        return_full_text: false,
      });

      const generatedText = Array.isArray(output) && output[0] && output[0].generated_text
        ? String(output[0].generated_text)
        : '';

      const parsed = parseModelOutput(generatedText, fallback);

      return {
        narrative: parsed.narrative,
        highlights: parsed.highlights,
        confidence: parsed.confidence,
        warnings: parsed.warnings,
      };
    } catch (error) {
      return {
        narrative: fallback.narrative,
        highlights: fallback.highlights,
        confidence: fallback.confidence,
        warnings: [
          ...fallback.warnings,
          `ONNX generation fallback: ${error && error.message ? String(error.message).slice(0, 180) : 'unknown error'}`,
        ],
      };
    }
  }
}

function parseModelOutput(text, fallback) {
  const trimmed = String(text || '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const rawJson = trimmed.slice(start, end + 1);
    try {
      const obj = JSON.parse(rawJson);
      const narrative = typeof obj.narrative === 'string' ? redactText(obj.narrative) : fallback.narrative;
      const highlights = Array.isArray(obj.highlights)
        ? obj.highlights.map((x) => redactText(String(x))).filter(Boolean).slice(0, 6)
        : fallback.highlights;
      const confidence = ['low', 'medium', 'high'].includes(obj.confidence) ? obj.confidence : fallback.confidence;
      const warnings = Array.isArray(obj.warnings)
        ? obj.warnings.map((x) => redactText(String(x))).filter(Boolean).slice(0, 6)
        : fallback.warnings;

      return {
        narrative,
        highlights,
        confidence,
        warnings: warnings.length ? warnings : fallback.warnings,
      };
    } catch (_) {
      // Fall through to fallback.
    }
  }

  return fallback;
}

let providerSingleton;
let providerKey;

function getSummaryProvider() {
  const configured = String(process.env.MYRIAD_LLM_PROVIDER || 'heuristic-fallback').toLowerCase();
  const desiredKey = configured === 'onnx' || configured === 'onnx-runtime'
    ? 'onnx'
    : 'heuristic';

  if (providerSingleton && providerKey === desiredKey) {
    return providerSingleton;
  }

  if (desiredKey === 'onnx') {
    providerSingleton = new OnnxProvider();
    providerKey = desiredKey;
    return providerSingleton;
  }

  providerSingleton = new HeuristicProvider();
  providerKey = desiredKey;
  return providerSingleton;
}

async function generateEnhancedSummary(summary, context = {}) {
  const days = Number.isFinite(context.days) ? context.days : 7;
  const scope = context.scope === 'global' ? 'global' : 'personal';
  const device = typeof context.device === 'string' && context.device.trim() ? context.device.trim() : 'all';
  const provider = getSummaryProvider();
  const generated = await provider.generate(summary, {
    scope,
    days,
    device,
    eventSamples: Array.isArray(context.eventSamples) ? context.eventSamples : [],
  });
  const generatedAt = new Date().toISOString();

  return {
    summary,
    aiSummary: {
      provider: provider.name,
      model: provider.model,
      generatedAt,
      scope,
      days,
      device,
      narrative: generated.narrative,
      highlights: generated.highlights,
      confidence: generated.confidence,
      warnings: generated.warnings,
    },
    meta: {
      generatedAt,
      provider: provider.name,
      model: provider.model,
    },
  };
}

module.exports = {
  generateEnhancedSummary,
  getSummaryProvider,
};
