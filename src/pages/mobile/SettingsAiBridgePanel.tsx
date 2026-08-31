import { useEffect, useState } from 'react';
import type { AiBridgeSettings, AppSettings } from '../../types/domain';
import { hasOpenAiCompatibleApiKey } from '../../services/ai/aiSecretsAccess';
import { MobileTabSection } from './mobileTabPrimitives';

export interface AiBridgeConfigurationInput {
  adapterMode: AppSettings['aiAdapterMode'];
  bridge: AiBridgeSettings;
  /** Blank/omitted keeps the device-local key already on file. */
  apiKey?: string;
}

export function SettingsAiBridgePanel({
  bridge,
  adapterMode,
  btnFocus,
  disabled,
  onSave,
  onClearApiKey,
  onTestConnection
}: {
  bridge: AiBridgeSettings;
  adapterMode: AppSettings['aiAdapterMode'];
  btnFocus: string;
  disabled: boolean;
  onSave: (input: AiBridgeConfigurationInput) => Promise<void>;
  onClearApiKey: () => Promise<void>;
  onTestConnection: () => Promise<string>;
}) {
  const [mode, setMode] = useState<AppSettings['aiAdapterMode']>(adapterMode);
  const [inferenceBaseUrl, setInferenceBaseUrl] = useState(bridge.inferenceBaseUrl);
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState(bridge.embeddingBaseUrl);
  const [chatModelId, setChatModelId] = useState(bridge.chatModelId);
  const [embeddingModelId, setEmbeddingModelId] = useState(bridge.embeddingModelId);
  const [apiKey, setApiKey] = useState('');
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null);
  const [busyAction, setBusyAction] = useState<'save' | 'clear' | 'test' | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; message: string } | null>(
    null
  );

  useEffect(() => {
    setMode(adapterMode);
    setInferenceBaseUrl(bridge.inferenceBaseUrl);
    setEmbeddingBaseUrl(bridge.embeddingBaseUrl);
    setChatModelId(bridge.chatModelId);
    setEmbeddingModelId(bridge.embeddingModelId);
  }, [adapterMode, bridge]);

  useEffect(() => {
    let active = true;
    void hasOpenAiCompatibleApiKey().then((configured) => {
      if (active) setKeyConfigured(configured);
    });
    return () => {
      active = false;
    };
  }, []);

  const fieldClass = `w-full rounded-lg border border-border/70 bg-bgElevated/90 px-2.5 py-2 text-base text-text placeholder:text-textMuted focus:border-borderStrong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${btnFocus}`;
  const actionDisabled = disabled || busyAction !== null;

  const save = async () => {
    if (actionDisabled) return;
    setBusyAction('save');
    setStatus(null);
    try {
      await onSave({
        adapterMode: mode,
        bridge: {
          inferenceBaseUrl: inferenceBaseUrl.trim(),
          embeddingBaseUrl: embeddingBaseUrl.trim(),
          chatModelId: chatModelId.trim(),
          embeddingModelId: embeddingModelId.trim()
        },
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {})
      });
      setApiKey('');
      setKeyConfigured(await hasOpenAiCompatibleApiKey());
      setStatus({ tone: 'success', message: 'Hosted AI settings saved on this device.' });
    } catch (error) {
      setStatus({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Could not save hosted AI settings.'
      });
    } finally {
      setBusyAction(null);
    }
  };

  const clearKey = async () => {
    if (actionDisabled) return;
    setBusyAction('clear');
    setStatus(null);
    try {
      await onClearApiKey();
      setApiKey('');
      setKeyConfigured(false);
      setStatus({ tone: 'success', message: 'Device-local API key removed.' });
    } catch (error) {
      setStatus({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Could not remove the API key.'
      });
    } finally {
      setBusyAction(null);
    }
  };

  const testConnection = async () => {
    if (actionDisabled) return;
    setBusyAction('test');
    setStatus(null);
    try {
      const message = await onTestConnection();
      setStatus({ tone: 'success', message });
    } catch (error) {
      setStatus({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Hosted AI connection test failed.'
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <MobileTabSection
      id="settings-ai-bridge"
      title="Hosted AI"
      description="Configure the endpoint the Assistant uses for hosted Ask. The API key is stored separately from workspace JSON and bound to the endpoint origins you approve here."
    >
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-meta text-textMuted">
          Adapter mode
          <select
            value={mode}
            disabled={actionDisabled}
            onChange={(event) => setMode(event.target.value as AppSettings['aiAdapterMode'])}
            className={fieldClass}
          >
            <option value="disabled">Disabled</option>
            <option value="local-only">Local only</option>
            <option value="external-opt-in">Hosted (explicit opt-in)</option>
          </select>
        </label>
        <label className="text-meta text-textMuted">
          Chat model ID
          <input
            value={chatModelId}
            disabled={actionDisabled}
            onChange={(event) => setChatModelId(event.target.value)}
            className={fieldClass}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="text-meta text-textMuted sm:col-span-2">
          Inference base URL
          <input
            type="url"
            value={inferenceBaseUrl}
            disabled={actionDisabled}
            onChange={(event) => setInferenceBaseUrl(event.target.value)}
            placeholder="https://api.openai.com/v1"
            className={fieldClass}
            spellCheck={false}
            autoComplete="url"
          />
        </label>
        <label className="text-meta text-textMuted sm:col-span-2">
          Embeddings base URL (optional; defaults to inference URL)
          <input
            type="url"
            value={embeddingBaseUrl}
            disabled={actionDisabled}
            onChange={(event) => setEmbeddingBaseUrl(event.target.value)}
            placeholder="Use inference base URL"
            className={fieldClass}
            spellCheck={false}
            autoComplete="url"
          />
        </label>
        <label className="text-meta text-textMuted">
          Embedding model ID
          <input
            value={embeddingModelId}
            disabled={actionDisabled}
            onChange={(event) => setEmbeddingModelId(event.target.value)}
            className={fieldClass}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="text-meta text-textMuted">
          API key {keyConfigured ? '(configured; leave blank to keep)' : ''}
          <input
            type="password"
            value={apiKey}
            disabled={actionDisabled}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={keyConfigured ? '••••••••' : 'Required for hosted mode'}
            className={fieldClass}
            autoComplete="new-password"
          />
        </label>
      </div>

      <p className="mt-2 text-fine leading-snug text-textSoft">
        Device-local browser/WebView storage is not a native keychain. Use a restricted key; for a
        multi-user production service, route requests through a server-side gateway instead.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={actionDisabled}
          onClick={() => void save()}
          className={`rounded-lg border border-borderStrong bg-surfaceActive px-3 py-2 text-xs font-semibold text-text disabled:opacity-50 ${btnFocus}`}
        >
          {busyAction === 'save' ? 'Saving…' : 'Save bridge'}
        </button>
        <button
          type="button"
          disabled={actionDisabled || mode !== 'external-opt-in' || !keyConfigured}
          onClick={() => void testConnection()}
          className={`rounded-lg border border-border px-3 py-2 text-xs text-text disabled:opacity-50 ${btnFocus}`}
        >
          {busyAction === 'test' ? 'Testing…' : 'Test connection'}
        </button>
        <button
          type="button"
          disabled={actionDisabled || !keyConfigured}
          onClick={() => void clearKey()}
          className={`rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger disabled:opacity-50 ${btnFocus}`}
        >
          {busyAction === 'clear' ? 'Removing…' : 'Remove API key'}
        </button>
      </div>
      {status ? (
        <p
          className={`mt-2 rounded border px-2 py-1.5 text-meta ${
            status.tone === 'success'
              ? 'border-success/35 bg-successSoft/10 text-success'
              : 'border-danger/35 bg-dangerSoft/10 text-danger'
          }`}
          role={status.tone === 'danger' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      ) : null}
    </MobileTabSection>
  );
}
