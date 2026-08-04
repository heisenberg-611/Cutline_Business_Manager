import type { ExportSection, ExportValue, UserExportBundle } from './collect';

/**
 * Renders the export bundle as one self-contained HTML page: no external CSS,
 * fonts or scripts, so it opens correctly from a folder years from now and
 * prints straight to PDF.
 */

const escapeHtml = (value: ExportValue) =>
  String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const READABLE_DATE = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function renderSection(section: ExportSection): string {
  const body = section.rows.length
    ? `<div class="scroll"><table>
        <thead><tr>${section.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${section.rows
          .map(
            (row) =>
              `<tr>${section.columns
                .map((c) => `<td data-label="${escapeHtml(c.label)}">${escapeHtml(row[c.key])}</td>`)
                .join('')}</tr>`,
          )
          .join('')}</tbody>
      </table></div>`
    : `<p class="empty">${escapeHtml(section.emptyText)}</p>`;

  return `<section id="${escapeHtml(section.id)}">
    <h2>${escapeHtml(section.title)}<span class="count">${section.rows.length} ${
      section.rows.length === 1 ? 'record' : 'records'
    }</span></h2>
    <p class="desc">${escapeHtml(section.description)}</p>
    ${body}
  </section>`;
}

export function renderUserExportHtml(
  bundle: UserExportBundle,
  options: { supportEmail?: string | null; platformName?: string } = {},
): string {
  const platform = options.platformName ?? 'Cutline OS';
  const generatedOn = READABLE_DATE.format(new Date(bundle.generatedAt));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your data — ${escapeHtml(bundle.subject.name)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 40px 24px 80px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px; line-height: 1.6; color: #18181b; background: #f4f4f5;
  }
  .page { max-width: 1000px; margin: 0 auto; }
  header { background: #fff; border: 1px solid #e4e4e7; border-radius: 14px; padding: 32px; margin-bottom: 24px; }
  .eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: 11px; font-weight: 700; color: #4f46e5; margin: 0 0 8px; }
  h1 { font-size: 26px; margin: 0 0 6px; letter-spacing: -0.02em; }
  .sub { color: #52525b; margin: 0; }
  .intro { background: #fff; border: 1px solid #e4e4e7; border-radius: 14px; padding: 28px 32px; margin-bottom: 24px; }
  .intro h2 { font-size: 17px; margin: 0 0 10px; }
  .intro p { margin: 0 0 12px; color: #3f3f46; }
  .intro p:last-child { margin-bottom: 0; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 24px; }
  .card { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 14px 16px; }
  .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #71717a; font-weight: 600; }
  .card .value { font-size: 20px; font-weight: 700; margin-top: 4px; letter-spacing: -0.01em; }
  nav { background: #fff; border: 1px solid #e4e4e7; border-radius: 14px; padding: 24px 32px; margin-bottom: 24px; }
  nav h2 { font-size: 17px; margin: 0 0 12px; }
  nav ol { margin: 0; padding-left: 20px; columns: 2; column-gap: 32px; }
  nav li { margin-bottom: 6px; break-inside: avoid; }
  nav a { color: #4338ca; text-decoration: none; }
  nav a:hover { text-decoration: underline; }
  section { background: #fff; border: 1px solid #e4e4e7; border-radius: 14px; padding: 28px 32px; margin-bottom: 20px; break-inside: avoid; }
  section h2 { font-size: 19px; margin: 0 0 6px; letter-spacing: -0.01em; display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
  .count { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #52525b; background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 999px; padding: 3px 10px; }
  .desc { color: #52525b; margin: 0 0 18px; font-size: 14px; }
  .scroll { overflow-x: auto; border: 1px solid #e4e4e7; border-radius: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th { text-align: left; background: #fafafa; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #52525b; padding: 10px 14px; border-bottom: 1px solid #e4e4e7; white-space: nowrap; }
  td { padding: 11px 14px; border-bottom: 1px solid #f4f4f5; vertical-align: top; max-width: 460px; overflow-wrap: anywhere; }
  tr:last-child td { border-bottom: 0; }
  tbody tr:nth-child(even) { background: #fcfcfd; }
  .empty { color: #71717a; font-style: italic; background: #fafafa; border: 1px dashed #e4e4e7; border-radius: 10px; padding: 16px; margin: 0; }
  footer { color: #52525b; font-size: 13px; text-align: center; padding: 32px 16px 0; }
  footer a { color: #4338ca; }
  @media (max-width: 640px) {
    body { padding: 20px 12px 48px; }
    header, .intro, nav, section { padding: 20px; }
    nav ol { columns: 1; }
    thead { display: none; }
    table, tbody, tr, td { display: block; width: 100%; }
    tr { border-bottom: 1px solid #e4e4e7; padding: 6px 0; }
    tr:last-child { border-bottom: 0; }
    td { border: 0; max-width: none; padding: 6px 14px; }
    td::before { content: attr(data-label); display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #71717a; font-weight: 700; }
  }
  @media print {
    body { background: #fff; padding: 0; font-size: 11px; }
    header, .intro, nav, section { border-radius: 0; border-color: #d4d4d8; break-inside: avoid; }
    nav { display: none; }
  }
</style>
</head>
<body>
<div class="page">
  <header>
    <p class="eyebrow">${escapeHtml(platform)} · Personal data report</p>
    <h1>Everything we store about ${escapeHtml(bundle.subject.name)}</h1>
    <p class="sub">${escapeHtml(bundle.subject.email)} · Account ID ${escapeHtml(bundle.subject.id)}</p>
    <p class="sub">Prepared ${escapeHtml(generatedOn)} UTC</p>
    <div class="cards">
      ${bundle.summary
        .map(
          (s) =>
            `<div class="card"><div class="label">${escapeHtml(s.label)}</div><div class="value">${escapeHtml(
              s.value,
            )}</div></div>`,
        )
        .join('')}
    </div>
  </header>

  <div class="intro">
    <h2>How to read this report</h2>
    <p>This is a complete copy of the personal information held in your ${escapeHtml(
      platform,
    )} account, written out in plain language. Every section below explains what that piece of data is and why we have it.</p>
    <p>All dates and times are shown in UTC (Coordinated Universal Time), so they may differ by a few hours from your local clock. A dash (—) means we hold nothing for that field.</p>
    <p>This report is a snapshot taken on the date above. It covers your own account only — it does not include your colleagues' data, or your clients' records, even where you worked on them together.</p>
  </div>

  <nav>
    <h2>What's in this report</h2>
    <ol>
      ${bundle.sections
        .map(
          (s) =>
            `<li><a href="#${escapeHtml(s.id)}">${escapeHtml(s.title)}</a> — ${s.rows.length} ${
              s.rows.length === 1 ? 'record' : 'records'
            }</li>`,
        )
        .join('')}
    </ol>
  </nav>

  ${bundle.sections.map(renderSection).join('\n')}

  <footer>
    <p>Think something is missing or wrong? ${
      options.supportEmail
        ? `Get in touch at <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(
            options.supportEmail,
          )}</a> and we'll correct it.`
        : `Contact our support team and we'll correct it.`
    }</p>
    <p>Generated by ${escapeHtml(platform)} on ${escapeHtml(generatedOn)} UTC.</p>
  </footer>
</div>
</body>
</html>`;
}
