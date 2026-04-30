import { describe, expect, it } from 'vitest';
import {
  BRANDOPS_FUNCTION_CATALOG,
  BRANDOPS_OUTPUT_PRIORITY,
  BRANDOPS_PLATFORM_DOCTRINE,
  buildBrandOpsStrategicReadout,
  resolveBrandOpsFunction
} from '../../src/config/brandOpsFunctions';
import { cloneDemoSampleData } from '../helpers/fixtures';

describe('BrandOps strategy functions', () => {
  it('contains the full reusable function catalog', () => {
    expect(BRANDOPS_FUNCTION_CATALOG).toHaveLength(25);
    expect(BRANDOPS_FUNCTION_CATALOG.map((fn) => fn.id)).toContain('audit_positioning');
    expect(BRANDOPS_FUNCTION_CATALOG.map((fn) => fn.id)).toContain(
      'monthly_brand_consistency_review'
    );
  });

  it('anchors the doctrine in technical authority and proof', () => {
    expect(BRANDOPS_PLATFORM_DOCTRINE.join(' ')).toContain('principal-level AI engineering');
    expect(BRANDOPS_PLATFORM_DOCTRINE.join(' ')).toContain('AI governance');
    expect(BRANDOPS_OUTPUT_PRIORITY).toEqual([
      'positioning',
      'proof',
      'offer logic',
      'content angle',
      'commercial relevance',
      'CTA direction',
      'next actions'
    ]);
  });

  it('resolves function ids, labels, and natural aliases', () => {
    expect(resolveBrandOpsFunction('audit_positioning')?.id).toBe('audit_positioning');
    expect(resolveBrandOpsFunction('Define offer stack')?.id).toBe('define_offer_stack');
    expect(resolveBrandOpsFunction('please run the weekly market scan')?.id).toBe(
      'weekly_market_scan'
    );
  });

  it('builds a structured strategic readout from workspace context', () => {
    const fn = resolveBrandOpsFunction('build_case_study');
    expect(fn).toBeTruthy();
    const out = buildBrandOpsStrategicReadout(fn!, cloneDemoSampleData());
    expect(out).toContain('Objective:');
    expect(out).toContain('Diagnosis:');
    expect(out).toContain('Proof assets:');
    expect(out).toContain('Next action:');
  });
});
