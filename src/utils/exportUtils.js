import { escapeHtml } from './escapeHtml.js';
import { normalizeState, STATE_VERSION } from '../store/storage.js';

/**
 * @typedef {Object} ExportContext
 * @property {(key: string, params?: Record<string, unknown>) => string} t
 * @property {(iso: string, options?: Intl.DateTimeFormatOptions) => string} formatDate
 * @property {'en' | 'ar'} locale
 */

/** Order tasks by due date (soonest first), undated tasks last in creation order. */
export function sortTasksForExport(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Distinct destinations referenced by the tasks, in first-use order. */
export function destinationsInUse(tasks, destinations) {
  const seen = new Set();
  const out = [];
  for (const task of sortTasksForExport(tasks)) {
    const destination = task.destinationKey ? destinations[task.destinationKey] : null;
    if (destination && !seen.has(destination.key)) {
      seen.add(destination.key);
      out.push(destination);
    }
  }
  return out;
}

function weatherLine(destination, ctx) {
  const current = destination.weather?.current;
  if (!current || current.temperature === null) return ctx.t('export.weatherUnavailable');
  return `${current.temperature}°C, ${ctx.t(`weather.${current.conditionKey}`)} ${current.icon}`;
}

/**
 * Build a Markdown itinerary suitable for chat apps and note tools.
 *
 * @param {import('../store/storage.js').Task[]} tasks
 * @param {Record<string, import('../store/storage.js').Destination>} destinations
 * @param {ExportContext} ctx
 * @returns {string}
 */
export function buildMarkdown(tasks, destinations, ctx) {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const lines = [`# ✈️ ${ctx.t('export.itineraryTitle')}`, ctx.t('export.generated', { date: ctx.formatDate(todayIso, { dateStyle: 'medium' }) }), ''];

  const used = destinationsInUse(tasks, destinations);
  if (used.length > 0) {
    lines.push(`## 📍 ${ctx.t('export.destinations')}`);
    for (const d of used) {
      lines.push(`- **${d.flag} ${d.name} (${d.country})**: ${weatherLine(d, ctx)}`);
    }
    lines.push('');
  }

  lines.push(`## 📋 ${ctx.t('export.checklist')}`);
  if (tasks.length === 0) {
    lines.push(`_${ctx.t('export.noItems')}_`);
  } else {
    for (const task of sortTasksForExport(tasks)) {
      const check = task.status === 'completed' ? '[x]' : '[ ]';
      const destination = task.destinationKey ? destinations[task.destinationKey] : null;
      const parts = [`- ${check} ${task.title}`];
      if (task.dueDate) parts.push(`📅 ${ctx.formatDate(task.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })}`);
      if (destination) parts.push(`[${destination.flag} ${destination.name}]`);
      lines.push(parts.join(' '));
    }
  }

  lines.push('', '---', `*${ctx.t('export.footer')}*`);
  return lines.join('\n');
}

/**
 * Build a self-contained, print-friendly HTML document. Every user- or
 * API-provided value is escaped.
 *
 * @param {import('../store/storage.js').Task[]} tasks
 * @param {Record<string, import('../store/storage.js').Destination>} destinations
 * @param {ExportContext} ctx
 * @returns {string}
 */
export function buildPrintHtml(tasks, destinations, ctx) {
  const dir = ctx.locale === 'ar' ? 'rtl' : 'ltr';
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const used = destinationsInUse(tasks, destinations);

  const destinationItems = used.length
    ? used
        .map(
          (d) =>
            `<li><span class="badge">${escapeHtml(d.flag)} ${escapeHtml(d.name)}</span> <span class="muted">${escapeHtml(d.country)}</span> — ${escapeHtml(weatherLine(d, ctx))}</li>`,
        )
        .join('')
    : `<li class="muted">${escapeHtml(ctx.t('export.noDestinations'))}</li>`;

  const taskItems = tasks.length
    ? sortTasksForExport(tasks)
        .map((task) => {
          const destination = task.destinationKey ? destinations[task.destinationKey] : null;
          const date = task.dueDate
            ? `<span class="date">${escapeHtml(ctx.formatDate(task.dueDate, { day: 'numeric', month: 'short', year: 'numeric' }))}</span>`
            : '';
          const place = destination ? `<span class="badge">${escapeHtml(destination.flag)} ${escapeHtml(destination.name)}</span>` : '';
          return `<li class="${task.status === 'completed' ? 'completed' : ''}"><span class="box">${task.status === 'completed' ? '☑' : '☐'}</span><strong>${escapeHtml(task.title)}</strong>${date}${place}</li>`;
        })
        .join('')
    : `<li class="muted">${escapeHtml(ctx.t('export.noItems'))}</li>`;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(ctx.locale)}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(ctx.t('export.itineraryTitle'))}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Arabic", sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
  h1 { color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 8px; }
  h2 { color: #334155; margin-top: 28px; font-size: 1.15rem; }
  ul { list-style: none; padding: 0; }
  li { padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge { background: #e0f2fe; color: #0369a1; padding: 2px 10px; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; }
  .date { color: #64748b; font-size: 0.85rem; }
  .muted { color: #94a3b8; }
  .completed strong { text-decoration: line-through; color: #94a3b8; }
  .box { font-size: 1.1rem; }
  .footer { margin-top: 40px; font-size: 0.8rem; color: #94a3b8; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>✈️ ${escapeHtml(ctx.t('export.itineraryTitle'))}</h1>
  <p class="muted">${escapeHtml(ctx.t('export.generated', { date: ctx.formatDate(todayIso, { dateStyle: 'full' }) }))}</p>
  <h2>📍 ${escapeHtml(ctx.t('export.destinations'))}</h2>
  <ul>${destinationItems}</ul>
  <h2>📋 ${escapeHtml(ctx.t('export.checklist'))}</h2>
  <ul>${taskItems}</ul>
  <div class="footer">${escapeHtml(ctx.t('export.footer'))}</div>
</body>
</html>`;
}

/**
 * Serialise the whole app state as a backup file.
 *
 * @param {import('../store/storage.js').AppState} state
 * @returns {string}
 */
export function buildBackup(state) {
  return JSON.stringify(
    {
      app: 'fly-list',
      version: STATE_VERSION,
      exportedAt: new Date().toISOString(),
      state: {
        seeded: true,
        tasks: state.tasks,
        destinations: state.destinations,
        dismissedSuggestions: state.dismissedSuggestions,
      },
    },
    null,
    2,
  );
}

/**
 * Parse a backup file. Accepts both the wrapped backup format and a raw state
 * object. Throws on anything else.
 *
 * @param {string} json
 * @returns {import('../store/storage.js').AppState}
 */
export function parseBackup(json) {
  const parsed = JSON.parse(json);
  if (parsed && typeof parsed === 'object' && parsed.app === 'fly-list' && parsed.state) {
    return normalizeState(parsed.state);
  }
  return normalizeState(parsed);
}

/**
 * Trigger a browser download of a text file.
 *
 * @param {string} filename
 * @param {string} content
 * @param {string} [mime='text/plain']
 */
export function downloadTextFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
