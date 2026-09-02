/**
 * The scorecard's total has to equal the scores it is a total of.
 *
 * It did not. The TOTAL row read **98.0** while the fifteen dimensions above it
 * summed to **95.5** — a running figure carried forward by hand across
 * forty-two cycles, drifting 2.5 points in the one direction hand-carried
 * numbers drift.
 *
 * Nothing about it looked wrong. Every dimension was tied to evidence and moved
 * only when evidence arrived; each cycle's `Δ` was defensible on its own. The
 * error was in a cell nobody re-derived, and it survived because the document
 * that exists to hold the product to account was the one artifact never checked
 * by anything.
 *
 * The directive this work runs under says a score may rise only on new evidence,
 * and that truth is worth more than a high score. An unchecked total is how both
 * get violated without anyone deciding to.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCORECARD = join(process.cwd(), 'BRANDOPS_PRODUCTION_SCORECARD.md');

interface Row {
  id: string;
  weight: number;
  score: number;
}

interface ScoreTable {
  rows: Row[];
  total: number;
  totalWeight: number;
}

/**
 * Every score table in the document, not just the first.
 *
 * The scorecard grew a second one — the PLAN surface score — and a checker that
 * assumed a single table read the product dimensions against PLAN's total and
 * reported a 16.5-point discrepancy that did not exist. A guard that only works
 * while the document has one shape is a guard with an expiry date on it.
 *
 * Tables are delimited by their TOTAL row: rows accumulate, a TOTAL closes the
 * table, and the next row starts the next one.
 */
function scoreTables(): ScoreTable[] {
  const tables: ScoreTable[] = [];
  let rows: Row[] = [];
  const numeric = (cell: string) => Number(cell.replace(/[*\s]/g, ''));

  for (const line of readFileSync(SCORECARD, 'utf8').split(String.fromCharCode(10))) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|');
    if (cells.length < 6) continue;
    const id = cells[1].replace(/[*\s]/g, '');

    if (/^[DP]\d+$/.test(id)) {
      rows.push({ id, weight: numeric(cells[3]), score: numeric(cells[4]) });
    } else if (cells[2].replace(/[*\s]/g, '') === 'TOTAL') {
      tables.push({ rows, total: numeric(cells[4]), totalWeight: numeric(cells[3]) });
      rows = [];
    }
  }
  return tables;
}

const round = (value: number) => Math.round(value * 10) / 10;

describe('the production scorecard adds up', () => {
  it('finds the tables at all', () => {
    const tables = scoreTables();
    // Without this the checks below would pass vacuously on an empty document —
    // which is how a guard ends up certifying nothing.
    expect(tables.length, 'score tables found').toBeGreaterThanOrEqual(2);
    for (const table of tables) {
      expect(table.rows.length, 'rows in table').toBeGreaterThanOrEqual(10);
      expect(Number.isNaN(table.total), 'TOTAL row parsed').toBe(false);
    }
  });

  it('totals the dimension scores exactly', () => {
    for (const { rows, total } of scoreTables()) {
      const sum = round(rows.reduce((acc, row) => acc + row.score, 0));
      const where = rows[0]?.id ?? '?';
      expect(sum, `table at ${where}: rows sum to ${sum}, TOTAL says ${total}`).toBe(total);
    }
  });

  it('totals the weights exactly', () => {
    for (const { rows, totalWeight } of scoreTables()) {
      const sum = round(rows.reduce((acc, row) => acc + row.weight, 0));
      // The weights are fixed by the directive. A total that no longer sums to
      // 100 means one was edited, which the directive forbids outright.
      expect(sum, `table at ${rows[0]?.id}`).toBe(totalWeight);
      expect(sum, `table at ${rows[0]?.id}`).toBe(100);
    }
  });

  it('never scores a dimension above its weight', () => {
    const over = scoreTables()
      .flatMap((table) => table.rows)
      .filter((row) => row.score > row.weight);
    expect(over.map((row) => `${row.id}: ${row.score}/${row.weight}`)).toEqual([]);
  });

  it('never scores a dimension below zero', () => {
    const rows = scoreTables().flatMap((table) => table.rows);
    expect(rows.filter((row) => !(row.score >= 0)).map((row) => row.id)).toEqual([]);
  });

  it('keeps the PLAN table in step with the movements its own cycle log records', () => {
    /**
     * The PLAN table sat at 79.0 while the cycle log traced 79.0 to 81.0 to
     * 81.5 to 82.5 to 83.0 to 83.5 to 84.0 to 85.5 across seven cycles. Every
     * increase was written down and none was ever applied, so the table was
     * self-consistent — it summed correctly — and contradicted the document it
     * lives in.
     *
     * Summing to the right number is what let it hide. So this compares against
     * the most recent figure the log itself states, which is the one thing the
     * table cannot quietly disagree with.
     */
    const text = readFileSync(SCORECARD, 'utf8');
    const movements = [...text.matchAll(/PLAN score: [\d.]+ . ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(
      movements.length,
      'no PLAN score movements found — has the log changed shape?'
    ).toBeGreaterThan(0);

    // The log is newest-first, so the first match is the current figure.
    const [latest] = movements;
    const planTable = scoreTables()[1];
    expect(planTable, 'no PLAN table found').toBeDefined();
    expect(
      planTable.total,
      `PLAN table totals ${planTable.total}; the log last recorded ${latest}`
    ).toBe(latest);
  });

  it('states the same total in the headline as in the table', () => {
    // The product total is the first table; the PLAN surface score follows it.
    const { total } = scoreTables()[0];
    const headline = readFileSync(SCORECARD, 'utf8').match(/\*\*Total: ([\d.]+) \/ 100/);
    // The number a reader sees first is the one most likely to be quoted
    // elsewhere, and it was wrong for the same reason the table was.
    expect(headline?.[1]).toBeDefined();
    expect(Number(headline?.[1])).toBe(total);
  });
});
