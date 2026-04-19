import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { DashboardNavItem } from '../../shared/config/dashboardNavigation'
import { BrandHeader } from '../../shared/ui/BrandHeader'
import { RightPillNavDock } from '../../shared/ui/components/navigation/RightPillNavDock'
import { navigateCrownFromExtensionSurface as navigateFromDock } from '../../shared/navigation/navigateCrownFromExtensionSurface'
import { InlineAlert } from '../../shared/ui/components'
import { useBrandOpsStore } from '../../state/useBrandOpsStore'
import { applyDocumentTheme } from '../../shared/ui/theme'
import { getGithubRedirectUri } from '../../services/sync/githubIdentity'
import { getGoogleRedirectUri } from '../../services/sync/googleIdentity'
import { getLinkedInRedirectUri } from '../../services/sync/linkedinIdentity'
import {
  getEffectiveGitHubClientId,
  getEffectiveGoogleClientId,
  getEffectiveLinkedInClientId
} from '../../shared/config/oauthPublisherIds'
import { AdvancedToolsSection } from './sections/AdvancedToolsSection'
import { CoreSetupSection } from './sections/CoreSetupSection'
import { GettingStartedSection } from './sections/GettingStartedSection'
import { IntegrationsSection } from './sections/IntegrationsSection'
import { WorkspaceDataSection } from './sections/WorkspaceDataSection'

const downloadJson = (filename: string, payload: string) => {
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const hasExtensionIdentity = () =>
  typeof chrome !== 'undefined' && Boolean(chrome.identity?.launchWebAuthFlow)

export function OptionsApp() {
  const {
    data,
    init,
    error,
    exportWorkspace,
    importWorkspace,
    resetWorkspaceToEmpty,
    updateVisualSettings,
    updateCockpitPreferences,
    setDebugMode,
    updateNotificationCenterSettings,
    updateCadenceFlowSettings,
    loading,
    setGoogleClientId,
    setGitHubClientId,
    setLinkedInClientId,
    connectGoogleIdentity,
    connectGitHubIdentity,
    connectLinkedInIdentity,
    disconnectGoogleIdentity,
    disconnectGitHubIdentity,
    disconnectLinkedInIdentity,
    setPrimaryIdentityProvider,
    applyAiWorkspaceAdjustments,
    undoLastAiWorkspaceAdjustments,
    aiSettingsLastResult,
    setTheme
  } = useBrandOpsStore()
  const [importText, setImportText] = useState('')
  const [googleClientId, setGoogleClientIdInput] = useState('')
  const [githubClientId, setGitHubClientIdInput] = useState('')
  const [linkedinClientId, setLinkedInClientIdInput] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [failureNotice, setFailureNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    setGoogleClientIdInput(data?.settings.syncHub.google.clientId ?? '')
  }, [data?.settings.syncHub.google.clientId])

  useEffect(() => {
    setGitHubClientIdInput(data?.settings.syncHub.github.clientId ?? '')
  }, [data?.settings.syncHub.github.clientId])

  useEffect(() => {
    setLinkedInClientIdInput(data?.settings.syncHub.linkedin.clientId ?? '')
  }, [data?.settings.syncHub.linkedin.clientId])

  useEffect(() => {
    if (!data?.settings.theme) return
    applyDocumentTheme(data.settings.theme, {
      visualMode: data.settings.visualMode,
      motionMode: data.settings.motionMode,
      ambientFxEnabled: data.settings.ambientFxEnabled
    })
  }, [data?.settings.ambientFxEnabled, data?.settings.motionMode, data?.settings.theme, data?.settings.visualMode])

  const handleNavSelect = useCallback((item: DashboardNavItem) => {
    navigateFromDock(item)
  }, [])

  if (error) {
    return <div className="p-4 text-sm text-danger">Settings failed to load: {error}</div>
  }

  if (!data) {
    return <div className="p-4 text-textMuted">Loading BrandOps settings…</div>
  }

  const googleSync = data.settings.syncHub.google
  const githubSync = data.settings.syncHub.github
  const linkedinSync = data.settings.syncHub.linkedin
  const notificationCenter = data.settings.notificationCenter
  const cadenceFlow = data.settings.cadenceFlow
  const googleRedirectUri = getGoogleRedirectUri()
  const githubRedirectUri = getGithubRedirectUri()
  const linkedinRedirectUri = getLinkedInRedirectUri()

  const saveGoogleClientId = async () => {
    await setGoogleClientId(googleClientId)
    setFailureNotice(null)
    setNotice(
      googleClientId.trim()
        ? 'Google OAuth client ID saved. Connect when you are ready.'
        : 'Google OAuth client ID cleared.'
    )
  }

  const saveGitHubClientId = async () => {
    await setGitHubClientId(githubClientId)
    setFailureNotice(null)
    setNotice(
      githubClientId.trim()
        ? 'GitHub OAuth client ID saved. Connect when you are ready.'
        : 'GitHub OAuth client ID cleared.'
    )
  }

  const handleGoogleConnect = async () => {
    try {
      if (!getEffectiveGoogleClientId(data)) {
        throw new Error('Add a Google OAuth client ID (Settings) or set VITE_GOOGLE_CLIENT_ID at build.')
      }
      if (!hasExtensionIdentity()) {
        throw new Error('Install the BrandOps extension to use Google OAuth.')
      }
      if (googleClientId !== googleSync.clientId) {
        await setGoogleClientId(googleClientId)
      }
      await connectGoogleIdentity()
      setFailureNotice(null)
      setNotice('Google identity connected.')
    } catch (connectError) {
      setNotice(null)
      setFailureNotice((connectError as Error).message)
    }
  }

  const handleGitHubConnect = async () => {
    try {
      if (!getEffectiveGitHubClientId(data)) {
        throw new Error('Add a GitHub OAuth App client ID (Settings) or set VITE_GITHUB_CLIENT_ID at build.')
      }
      if (!hasExtensionIdentity()) {
        throw new Error('Install the BrandOps extension to use GitHub OAuth.')
      }
      if (githubClientId !== githubSync.clientId) {
        await setGitHubClientId(githubClientId)
      }
      await connectGitHubIdentity()
      setFailureNotice(null)
      setNotice('GitHub identity connected.')
    } catch (connectError) {
      setNotice(null)
      setFailureNotice((connectError as Error).message)
    }
  }

  const handleCopyGoogleRedirect = async () => {
    const uri = googleRedirectUri
    if (!uri) return
    try {
      await navigator.clipboard.writeText(uri)
      setFailureNotice(null)
      setNotice('Google redirect URI copied to clipboard.')
    } catch (copyError) {
      setNotice(null)
      setFailureNotice(`Copy failed: ${(copyError as Error).message}`)
    }
  }

  const handleCopyGithubRedirect = async () => {
    const uri = githubRedirectUri
    if (!uri) return
    try {
      await navigator.clipboard.writeText(uri)
      setFailureNotice(null)
      setNotice('GitHub callback URL copied to clipboard.')
    } catch (copyError) {
      setNotice(null)
      setFailureNotice(`Copy failed: ${(copyError as Error).message}`)
    }
  }

  const saveLinkedInClientId = async () => {
    await setLinkedInClientId(linkedinClientId)
    setFailureNotice(null)
    setNotice(
      linkedinClientId.trim()
        ? 'LinkedIn OAuth client ID saved. Connect when you are ready.'
        : 'LinkedIn OAuth client ID cleared.'
    )
  }

  const handleLinkedInConnect = async () => {
    try {
      if (!getEffectiveLinkedInClientId(data)) {
        throw new Error('Add a LinkedIn OAuth client ID (Settings) or set VITE_LINKEDIN_CLIENT_ID at build.')
      }
      if (!hasExtensionIdentity()) {
        throw new Error('Install the BrandOps extension to use LinkedIn OAuth.')
      }

      if (linkedinClientId !== linkedinSync.clientId) {
        await setLinkedInClientId(linkedinClientId)
      }
      await connectLinkedInIdentity()
      setFailureNotice(null)
      setNotice('LinkedIn identity connected. Profile is available on the Welcome screen.')
    } catch (connectError) {
      setNotice(null)
      setFailureNotice((connectError as Error).message)
    }
  }

  const handleCopyLinkedInRedirect = async () => {
    const uri = linkedinRedirectUri
    if (!uri) return
    try {
      await navigator.clipboard.writeText(uri)
      setFailureNotice(null)
      setNotice('LinkedIn redirect URI copied to clipboard.')
    } catch (copyError) {
      setNotice(null)
      setFailureNotice(`Copy failed: ${(copyError as Error).message}`)
    }
  }

  const handleApplyAiSettings = async () => {
    try {
      setAiBusy(true)
      const result = await applyAiWorkspaceAdjustments(aiPrompt)
      if (!result) {
        throw new Error('AI adjustment returned an empty result.')
      }
      setFailureNotice(null)
      setNotice(
        `AI adjustments applied: ${result.applied.length} applied, ${result.skipped.length} skipped, ${result.failed.length} failed.`
      )
    } catch (aiError) {
      setNotice(null)
      setFailureNotice((aiError as Error).message)
    } finally {
      setAiBusy(false)
    }
  }

  const handleUndoAiSettings = async () => {
    try {
      await undoLastAiWorkspaceAdjustments()
      setFailureNotice(null)
      setNotice('Last AI adjustment was undone and workspace state was restored.')
    } catch (undoError) {
      setNotice(null)
      setFailureNotice((undoError as Error).message)
    }
  }

  const handleCopyWorkspaceJson = async () => {
    try {
      const exported = await exportWorkspace()
      await navigator.clipboard.writeText(exported)
      setFailureNotice(null)
      setNotice('Workspace JSON copied to clipboard.')
    } catch (copyError) {
      setNotice(null)
      setFailureNotice(`Copy failed: ${(copyError as Error).message}`)
    }
  }

  const handleDownloadWorkspaceJson = async () => {
    try {
      const exported = await exportWorkspace()
      downloadJson(`brandops-workspace-${new Date().toISOString().slice(0, 10)}.json`, exported)
      setFailureNotice(null)
      setNotice('Workspace JSON downloaded.')
    } catch (downloadError) {
      setNotice(null)
      setFailureNotice(`Download failed: ${(downloadError as Error).message}`)
    }
  }

  const handleImportWorkspaceJson = async () => {
    try {
      if (!importText.trim()) {
        setFailureNotice('Import text cannot be empty.')
        return
      }
      await importWorkspace(importText)
      setImportText('')
      setFailureNotice(null)
      setNotice('Workspace imported successfully.')
    } catch (importError) {
      setNotice(null)
      setFailureNotice(`Import failed: ${(importError as Error).message}`)
    }
  }

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    void file
      .text()
      .then((text) => setImportText(text))
      .catch(() => {
        setImportText('')
        setNotice(null)
        setFailureNotice('Unable to read selected file. Please select a valid JSON file.')
      })
  }

  const handleSetDebugMode = async (enabled: boolean) => {
    await setDebugMode(enabled)
    setFailureNotice(null)
    setNotice(`Debug mode ${enabled ? 'enabled' : 'disabled'}.`)
  }

  const handleResetWorkspaceToEmpty = async () => {
    const confirmed = window.confirm(
      'Reset workspace to a clean production state? This removes all local tasks, contacts, pipeline, and content and cannot be undone.'
    )
    if (!confirmed) return
    await resetWorkspaceToEmpty()
    setFailureNotice(null)
    setNotice('Workspace reset to an empty production baseline.')
  }

  return (
    <>
    <main
      className={`bo-system-screen bo-options-shell bo-retro-ambient flex min-w-0 flex-col gap-3 ${
        data.settings.visualMode === 'retroMagic' ? 'bo-retro-panel' : ''
      } ${data.settings.motionMode !== 'off' ? 'bo-retro-surface-enter' : ''}`}
    >
      <BrandHeader
        eyebrow="BrandOps"
        title="Settings"
        roleBadge="Settings"
        subtitle="Configure sync, cadence, integrations, and backups. Execution happens on the Dashboard; quick capture stays in Quick actions."
      />

      {notice ? (
        <InlineAlert
          tone="success"
          title="Settings update"
          message={notice}
        />
      ) : null}
      {failureNotice ? (
        <InlineAlert
          tone="danger"
          title="Settings action failed"
          message={failureNotice}
        />
      ) : null}

      <GettingStartedSection
        theme={data.settings.theme}
        cadenceMode={cadenceFlow.mode}
        onThemeChange={(theme) => void setTheme(theme)}
        onCadenceModeChange={(mode) => void updateCadenceFlowSettings({ mode })}
      />

      <CoreSetupSection
        data={data}
        notificationCenter={notificationCenter}
        cadenceFlow={cadenceFlow}
        onThemeChange={(theme) => void setTheme(theme)}
        onUpdateVisualSettings={updateVisualSettings}
        onUpdateCockpitPreferences={updateCockpitPreferences}
        onUpdateNotificationCenter={updateNotificationCenterSettings}
        onUpdateCadenceFlow={updateCadenceFlowSettings}
      />

      <IntegrationsSection
        primaryIdentityProvider={data.settings.primaryIdentityProvider}
        googleSync={googleSync}
        googleClientId={googleClientId}
        googleOAuthReady={Boolean(getEffectiveGoogleClientId(data))}
        googleRedirectUri={googleRedirectUri}
        githubSync={githubSync}
        githubClientId={githubClientId}
        githubOAuthReady={Boolean(getEffectiveGitHubClientId(data))}
        githubRedirectUri={githubRedirectUri}
        linkedinSync={linkedinSync}
        linkedinClientId={linkedinClientId}
        linkedinOAuthReady={Boolean(getEffectiveLinkedInClientId(data))}
        linkedinRedirectUri={linkedinRedirectUri}
        oauthRuntimeReady={hasExtensionIdentity()}
        oauthLoading={loading}
        onGoogleClientIdChange={setGoogleClientIdInput}
        onSaveGoogleClientId={saveGoogleClientId}
        onConnectGoogle={handleGoogleConnect}
        onDisconnectGoogle={disconnectGoogleIdentity}
        onCopyGoogleRedirect={handleCopyGoogleRedirect}
        onGitHubClientIdChange={setGitHubClientIdInput}
        onSaveGitHubClientId={saveGitHubClientId}
        onConnectGitHub={handleGitHubConnect}
        onDisconnectGitHub={disconnectGitHubIdentity}
        onCopyGitHubRedirect={handleCopyGithubRedirect}
        onLinkedInClientIdChange={setLinkedInClientIdInput}
        onSaveLinkedInClientId={saveLinkedInClientId}
        onConnectLinkedIn={handleLinkedInConnect}
        onDisconnectLinkedIn={disconnectLinkedInIdentity}
        onCopyLinkedInRedirect={handleCopyLinkedInRedirect}
        onPrimaryIdentityChange={setPrimaryIdentityProvider}
      />

      <WorkspaceDataSection
        importText={importText}
        fileInputRef={fileInputRef}
        onImportTextChange={setImportText}
        onCopyJson={handleCopyWorkspaceJson}
        onDownloadJson={handleDownloadWorkspaceJson}
        onImportFromText={handleImportWorkspaceJson}
        onFileSelected={handleFileSelected}
      />

      <AdvancedToolsSection
        data={data}
        aiPrompt={aiPrompt}
        aiBusy={aiBusy}
        aiSettingsLastResult={aiSettingsLastResult}
        onAiPromptChange={setAiPrompt}
        onApplyAiSettings={handleApplyAiSettings}
        onUndoAiSettings={handleUndoAiSettings}
        onSetDebugMode={handleSetDebugMode}
        onResetWorkspaceToEmpty={handleResetWorkspaceToEmpty}
      />
    </main>
    <RightPillNavDock hostSurface="options" onSelectItem={handleNavSelect} />
    </>
  )
}
