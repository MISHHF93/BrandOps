import { describe, expect, it } from 'vitest';
import { mapDocumentSurfaceToAgentSource } from '../../src/shared/navigation/appDocumentSurface';

describe('appDocumentSurface', () => {
  it('maps mobile primary entry to chatbot-mobile', () => {
    expect(mapDocumentSurfaceToAgentSource('mobile')).toBe('chatbot-mobile');
    expect(mapDocumentSurfaceToAgentSource('chatbot')).toBe('chatbot-mobile');
  });

  it('maps hosted web entry documents to chatbot-web', () => {
    expect(mapDocumentSurfaceToAgentSource('welcome')).toBe('chatbot-web');
    expect(mapDocumentSurfaceToAgentSource('dashboard')).toBe('chatbot-web');
    expect(mapDocumentSurfaceToAgentSource('integrations')).toBe('chatbot-web');
    expect(mapDocumentSurfaceToAgentSource('help')).toBe('chatbot-web');
  });

  it('treats missing/empty as chatbot-mobile; other strings as chatbot-web', () => {
    expect(mapDocumentSurfaceToAgentSource(undefined)).toBe('chatbot-mobile');
    expect(mapDocumentSurfaceToAgentSource('')).toBe('chatbot-mobile');
    expect(mapDocumentSurfaceToAgentSource('other')).toBe('chatbot-web');
  });
});
