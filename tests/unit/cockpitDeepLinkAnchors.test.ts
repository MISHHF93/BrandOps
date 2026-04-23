import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getCockpitMobileSectionHeadingId,
  observedSectionIds,
  type DashboardSectionId
} from '../../src/shared/config/dashboardNavigation';

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Cockpit deep link anchors (URL contract)', () => {
  it('maps each workstream to a unique heading id for scrollIntoView', () => {
    const ids = observedSectionIds.map((s: DashboardSectionId) => getCockpitMobileSectionHeadingId(s));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^cockpit-/);
    }
  });

  it('keeps stable id attributes on split Today workstream section modules', () => {
    const files = [
      'src/pages/mobile/CockpitTodayWorkstreamSection.tsx',
      'src/pages/mobile/CockpitPipelineWorkstreamSection.tsx',
      'src/pages/mobile/CockpitBrandContentWorkstreamSection.tsx',
      'src/pages/mobile/CockpitConnectionsWorkstreamSection.tsx'
    ];
    const expected = observedSectionIds.map((s) => getCockpitMobileSectionHeadingId(s));
    const combined = files.map(read).join('\n');
    for (const id of expected) {
      expect(combined).toContain(`id="${id}"`);
    }
  });

  it('keeps pipeline projection sub-heading for tests and layout', () => {
    const pipeline = read('src/pages/mobile/CockpitPipelineWorkstreamSection.tsx');
    expect(pipeline).toContain('id="cockpit-pipeline-projection-heading"');
  });
});
