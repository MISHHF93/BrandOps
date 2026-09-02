import { useEffect, useState } from 'react';
import {
  clearAgentBridgeReceiver,
  configureAgentBridgeReceiver,
  getAgentBridgeAllowedActors,
  hasAgentBridgeSharedSecret
} from '../../services/agent/bridgeSecretAccess';
import { MobileTabSection } from './mobileTabPrimitives';
import { toneSubtleClass } from '../../shared/ui/tone';

const parseActorIds = (value: string) =>
  value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export function SettingsAgentBridgeReceiverPanel({
  btnFocus,
  disabled
}: {
  btnFocus: string;
  disabled: boolean;
}) {
  const [secret, setSecret] = useState('');
  const [secretConfigured, setSecretConfigured] = useState<boolean | null>(null);
  const [telegramActorIds, setTelegramActorIds] = useState('');
  const [whatsappActorIds, setWhatsappActorIds] = useState('');
  const [busy, setBusy] = useState<'save' | 'clear' | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; message: string } | null>(
    null
  );

  const refresh = async () => {
    const [hasSecret, actors] = await Promise.all([
      hasAgentBridgeSharedSecret(),
      getAgentBridgeAllowedActors()
    ]);
    setSecretConfigured(hasSecret);
    setTelegramActorIds(actors.telegram.join('\n'));
    setWhatsappActorIds(actors.whatsapp.join('\n'));
  };

  useEffect(() => {
    let active = true;
    void Promise.all([hasAgentBridgeSharedSecret(), getAgentBridgeAllowedActors()]).then(
      ([hasSecret, actors]) => {
        if (!active) return;
        setSecretConfigured(hasSecret);
        setTelegramActorIds(actors.telegram.join('\n'));
        setWhatsappActorIds(actors.whatsapp.join('\n'));
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const actionDisabled = disabled || busy !== null;
  const fieldClass = `w-full rounded-lg border border-border/70 bg-bgElevated/90 px-2.5 py-2 text-base text-text placeholder:text-textMuted focus:border-borderStrong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${btnFocus}`;

  const save = async () => {
    if (actionDisabled) return;
    setBusy('save');
    setStatus(null);
    try {
      await configureAgentBridgeReceiver({
        ...(secret.trim() ? { sharedSecret: secret.trim() } : {}),
        telegramActorIds: parseActorIds(telegramActorIds),
        whatsappActorIds: parseActorIds(whatsappActorIds)
      });
      setSecret('');
      await refresh();
      setStatus({
        tone: 'success',
        message: 'Receiver trust and actor allowlist saved on this device.'
      });
    } catch (error) {
      setStatus({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Could not save bridge receiver access.'
      });
    } finally {
      setBusy(null);
    }
  };

  const clear = async () => {
    if (actionDisabled) return;
    setBusy('clear');
    setStatus(null);
    try {
      await clearAgentBridgeReceiver();
      setSecret('');
      await refresh();
      setStatus({ tone: 'success', message: 'Receiver trust and actor allowlist removed.' });
    } catch (error) {
      setStatus({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Could not clear bridge receiver access.'
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <MobileTabSection
      id="settings-agent-bridge-receiver"
      title="Webhook receiver trust"
      description="Configure the trust key and allowed Telegram or WhatsApp actor IDs for workspace commands."
    >
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-meta text-textMuted sm:col-span-2">
          Bridge shared secret {secretConfigured ? '(configured; leave blank to keep)' : ''}
          <input
            type="password"
            value={secret}
            disabled={actionDisabled}
            onChange={(event) => setSecret(event.target.value)}
            placeholder={secretConfigured ? '••••••••' : 'At least 24 characters'}
            className={fieldClass}
            autoComplete="new-password"
          />
        </label>
        <label className="text-meta text-textMuted">
          Allowed Telegram actor IDs
          <textarea
            value={telegramActorIds}
            disabled={actionDisabled}
            onChange={(event) => setTelegramActorIds(event.target.value)}
            placeholder="123456789"
            rows={3}
            className={fieldClass}
            spellCheck={false}
          />
        </label>
        <label className="text-meta text-textMuted">
          Allowed WhatsApp actor IDs
          <textarea
            value={whatsappActorIds}
            disabled={actionDisabled}
            onChange={(event) => setWhatsappActorIds(event.target.value)}
            placeholder="15551234567"
            rows={3}
            className={fieldClass}
            spellCheck={false}
          />
        </label>
      </div>
      <p className="mt-2 text-fine leading-snug text-textSoft">
        This enables receiver-side verification only. You still need a deployed HTTPS endpoint that
        delivers signed messages to the app; the local script is a protocol test and does not
        provide that transport or send replies to the messaging provider.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={actionDisabled}
          onClick={() => void save()}
          className={`rounded-lg border border-borderStrong bg-surfaceActive px-3 py-2 text-xs font-semibold text-text disabled:opacity-50 ${btnFocus}`}
        >
          {busy === 'save' ? 'Saving…' : 'Save receiver trust'}
        </button>
        <button
          type="button"
          disabled={actionDisabled || !secretConfigured}
          onClick={() => void clear()}
          className={`rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger disabled:opacity-50 ${btnFocus}`}
        >
          {busy === 'clear' ? 'Removing…' : 'Disable receiver'}
        </button>
      </div>
      {status ? (
        <p
          className={`mt-2 rounded border px-2 py-1.5 text-meta ${
            // Byte-identical to the panel beside it, and to the shared subtle
            // weight — consolidating these three is provably no visual change.
            toneSubtleClass(status.tone)
          }`}
          role={status.tone === 'danger' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      ) : null}
    </MobileTabSection>
  );
}
