import prisma from '../repositories/prisma/prisma-client.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const norm = (value) => (value || '')
  .toString()
  .toLowerCase()
  .replace(/ё/g, 'е')
  .replace(/[^a-zа-я0-9]+/gi, ' ')
  .trim();

const num = (value) => Number(value || 0);

export const getCoverage = asyncHandler(async (req, res) => {
  const department = (req.query.department || '').trim() || null;
  const q = (req.query.q || '').trim().toLowerCase();
  const statusFilter = ['gap', 'fact', 'library', 'both'].includes(req.query.status)
    ? req.query.status
    : null;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 80, 1), 300);

  const [planRows, factRows, titles, departments] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT i.discipline_name, i.department_name
      FROM curriculum_plan_items i
      JOIN curriculum_plans p ON p.id = i.plan_id
      WHERE p.kind = 'plan'
        AND ($1::text IS NULL OR i.department_name = $1)
    `, department),
    prisma.$queryRawUnsafe(`
      SELECT i.discipline_name
      FROM curriculum_plan_items i
      JOIN curriculum_plans p ON p.id = i.plan_id
      WHERE p.kind = 'fact'
    `),
    prisma.$queryRawUnsafe(`SELECT title FROM materials WHERE title IS NOT NULL`),
    prisma.$queryRawUnsafe(`
      SELECT DISTINCT i.department_name AS name
      FROM curriculum_plan_items i
      JOIN curriculum_plans p ON p.id = i.plan_id
      WHERE p.kind = 'plan' AND COALESCE(i.department_name, '') <> ''
      ORDER BY 1
    `),
  ]);

  const plan = new Map();
  for (const row of planRows) {
    const key = norm(row.discipline_name);
    if (key.length < 4) continue;
    if (q && !String(row.discipline_name).toLowerCase().includes(q)) continue;
    const item = plan.get(key) || {
      discipline: row.discipline_name,
      plan_rows: 0,
      departments: new Set(),
    };
    if (String(row.discipline_name).length < item.discipline.length) {
      item.discipline = row.discipline_name;
    }
    item.plan_rows += 1;
    if (row.department_name) item.departments.add(row.department_name);
    plan.set(key, item);
  }

  const fact = new Map();
  for (const row of factRows) {
    const key = norm(row.discipline_name);
    if (!key) continue;
    fact.set(key, (fact.get(key) || 0) + 1);
  }

  const library = new Map();
  const keys = [...plan.keys()].filter((key) => key.length >= 6);
  for (const row of titles) {
    const title = norm(row.title);
    if (title.length < 6) continue;
    for (const key of keys) {
      if (title.includes(key)) library.set(key, (library.get(key) || 0) + 1);
    }
  }

  const items = [];
  const summary = { gap: 0, fact: 0, library: 0, both: 0, total: 0 };
  for (const [key, item] of plan) {
    const factRowsCount = fact.get(key) || 0;
    const libraryRows = library.get(key) || 0;
    let status = 'gap';
    if (factRowsCount > 0 && libraryRows > 0) status = 'both';
    else if (factRowsCount > 0) status = 'fact';
    else if (libraryRows > 0) status = 'library';
    summary[status] += 1;
    summary.total += 1;
    if (statusFilter && status !== statusFilter) continue;
    items.push({
      discipline: item.discipline,
      plan_rows: item.plan_rows,
      departments: item.departments.size,
      fact_rows: factRowsCount,
      library_rows: libraryRows,
      status,
    });
  }

  const order = { gap: 0, fact: 1, library: 2, both: 3 };
  items.sort((a, b) => order[a.status] - order[b.status] || a.discipline.localeCompare(b.discipline, 'ru'));

  res.json({
    summary,
    departments: departments.map((row) => row.name),
    items: items.slice(0, limit),
    total_matched: items.length,
    limit,
  });
});
