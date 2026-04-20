import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CalendarRange,
  Cpu,
  KanbanSquare,
  Layers2,
  ListChecks,
  ListTree,
  Map as MapIcon,
  Plug2
} from 'lucide-react';
import { BrandVaultPanel } from '../../modules/brandVault/BrandVaultPanel';
import { ContentLibraryPanel } from '../../modules/contentLibrary/ContentLibraryPanel';
import { OutreachWorkspacePanel } from '../../modules/outreachWorkspace/OutreachWorkspacePanel';
import { PublishingQueuePanel } from '../../modules/publishingQueue/PublishingQueuePanel';
import { PipelineCrmPanel } from '../../modules/pipelineCrm/PipelineCrmPanel';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { CurrentSectionBar, InlineAlert } from '../../shared/ui/components';
import { RightPillNavDock } from '../../shared/ui/components/navigation/RightPillNavDock';
import {
  CockpitOperatingBoard,
  CockpitSettingsQuickPanel,
  CockpitSurfaceOverlay,
  CollapsibleSection,
  DashboardAuthGate,
  DashboardSystemsLean,
  CockpitPulseStrip,
  ExecutionHeatMeter,
  MissionMapOverview,
  StatCard
} from './components';
import type { ExecutionHeatItem } from './executionHeatModel';
import {
  followUpHeatAndFactors,
  managerialNotificationFactors,
  outreachHeatAndFactors,
  pipelineHeatAndFactors,
  publishHeatAndFactors,
  technicalNotificationFactors
} from './executionHeatModel';
import { KnowledgeCenterBody } from '../../shared/help/KnowledgeCenterBody';
import { useBrandOpsStore } from '../../state/useBrandOpsStore';
import { scheduler } from '../../services/scheduling/scheduler';
import { localIntelligence } from '../../services/intelligence/localIntelligence';
import { dailyNotificationCenter } from '../../services/intelligence/dailyNotificationCenter';
import { operatorCadenceFlow } from '../../services/intelligence/operatorCadenceFlow';
import { applyDocumentTheme } from '../../shared/ui/theme';
import { getPrimaryIdentityLabel } from '../../shared/identity/primaryIdentityLabel';
import { isPreviewCockpitUngated } from '../../shared/config/previewDeployment';
import { canAccessApp } from '../../shared/identity/sessionAccess';
import {
  canonicalizeDashboardSectionId,
  flattenedNavigationItems,
  isDashboardSectionId,
  observedSectionIds,
  resolveInitialDashboardSection,
  type DashboardNavItem,
  type DashboardSectionId
} from '../../shared/config/dashboardNavigation';
import { QUERY } from '../../shared/navigation/extensionLinks';
import { openExtensionSurface } from '../../shared/navigation/openExtensionSurface';
import { CockpitNavItemIcon } from '../../shared/ui/icons/cockpitNavIcons';
import { CockpitOnboardingOverlay } from '../../shared/onboarding/CockpitOnboardingOverlay';
import { useFocusTrap } from '../../shared/ui/components/utils/focusTrap';
import {
  computeOverviewHealthMetrics,
  severityClasses,
  severityLabel
} from './dashboardHealth';

const ONBOARDING_KEY = 'brandops:onboarding-complete';
const PROFILE_SETUP_KEY = 'brandops:profile-setup-complete';
/** One-time read for installs that only had the pre-rename key; migrated on first check. */
const PROFILE_SETUP_KEY_LEGACY = 'operatoros:profile-setup-complete';

const markProfileSetupComplete = () => {
  localStorage.setItem(PROFILE_SETUP_KEY, 'yes');
  localStorage.removeItem(PROFILE_SETUP_KEY_LEGACY);
};

const isProfileSetupComplete = (): boolean => {
  if (localStorage.getItem(PROFILE_SETUP_KEY) === 'yes') return true;
  if (localStorage.getItem(PROFILE_SETUP_KEY_LEGACY) === 'yes') {
    localStorage.setItem(PROFILE_SETUP_KEY, 'yes');
    localStorage.removeItem(PROFILE_SETUP_KEY_LEGACY);
    return true;
  }
  return false;
};

interface ProfileDraft {
  operatorName: string;
  positioning: string;
  primaryOffer: string;
  voiceGuide: string;
  focusMetric: string;
}

interface ResumeArtifactGroup {
  title: string;
  items: string[];
}

const scrollToSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const formatHour = (value: number) => {
  const totalMinutes = Math.round((((value % 24) + 24) % 24) * 60);
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const base = hours % 12 === 0 ? 12 : hours % 12;
  return `${base}:${`${minutes}`.padStart(2, '0')} ${suffix}`;
};

const clampText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}.`;
};

const normalizeResumeText = (value: string) =>
  value
    .replaceAll('\0', ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const isLikelyReadableResumeText = (value: string) => {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const alphabeticTokens = value.match(/[A-Za-z]+/g) ?? [];
  if (alphabeticTokens.length < 40 || lines.length < 8) return false;

  const avgAlphabeticTokenLength =
    alphabeticTokens.reduce((sum, token) => sum + token.length, 0) /
    Math.max(1, alphabeticTokens.length);
  const longTokenRatio =
    alphabeticTokens.filter((token) => token.length >= 3).length /
    Math.max(1, alphabeticTokens.length);
  const cleanLineRatio =
    lines.filter((line) => /^[A-Za-z0-9 .,:;@&()\-+/%$|'"[\]]+$/.test(line)).length /
    Math.max(1, lines.length);

  return avgAlphabeticTokenLength >= 2.7 && longTokenRatio >= 0.34 && cleanLineRatio >= 0.34;
};

const decodePdfLiteralString = (value: string) =>
  value
    .replace(/\\([nrtbf()\\])/g, (_, token: string) => {
      switch (token) {
        case 'n':
          return '\n';
        case 'r':
          return '\r';
        case 't':
          return '\t';
        case 'b':
        case 'f':
          return ' ';
        default:
          return token;
      }
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));

const extractTextFromPdfArrayBuffer = (fileBuffer: ArrayBuffer) => {
  const raw = new TextDecoder('latin1').decode(new Uint8Array(fileBuffer));
  const literalMatches = raw.match(/\((?:\\.|[^\\()]){2,}\)/g) ?? [];
  const decoded = literalMatches
    .map((token) => decodePdfLiteralString(token.slice(1, -1)))
    .map((line) => line.replace(/[^\x20-\x7E\n]/g, ' ').trim())
    .filter((line) => line.length >= 2)
    .slice(0, 6000);

  const normalized = normalizeResumeText(decoded.join('\n'));
  if (!isLikelyReadableResumeText(normalized)) {
    throw new Error(
      'PDF text extraction quality is too low. Export your resume as DOCX (recommended) or TXT and upload again.'
    );
  }

  return normalized;
};

const extractTextFromDocxArrayBuffer = async (fileBuffer: ArrayBuffer) => {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(fileBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('text');
  if (!documentXml) {
    throw new Error('DOCX parsing failed: word/document.xml was not found.');
  }

  const xml = new DOMParser().parseFromString(documentXml, 'application/xml');
  const namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const paragraphs = Array.from(xml.getElementsByTagNameNS(namespace, 'p'))
    .map((paragraphNode) => {
      const runText = Array.from(
        paragraphNode.getElementsByTagNameNS(namespace, 't')
      )
        .map((textNode) => textNode.textContent?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
      return runText.trim();
    })
    .filter(Boolean);

  return normalizeResumeText(paragraphs.join('\n'));
};

const extractResumeTextFromFile = async (file: File) => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.docx')) {
    return extractTextFromDocxArrayBuffer(await file.arrayBuffer());
  }

  if (fileName.endsWith('.pdf')) {
    return extractTextFromPdfArrayBuffer(await file.arrayBuffer());
  }

  if (fileName.endsWith('.doc')) {
    throw new Error('Legacy .doc is not supported. Save as .docx, .txt, or .md and upload again.');
  }

  return normalizeResumeText(await file.text());
};

const extractResumeArtifactGroups = (resumeRawText: string): ResumeArtifactGroup[] => {
  const lines = resumeRawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        Boolean(line) &&
        !/^<\/?w:/i.test(line) &&
        !line.includes('<w:') &&
        !line.includes('</w:')
    );
  if (lines.length === 0) return [];

  const headingRegex =
    /^(professional summary|summary|profile|executive profile|work experience|professional experience|experience|earlier professional experience|education experience|education|certifications|skills|core expertise|technical stack|selected impact metrics|projects|languages|programming|ai\s*\/\s*machine learning|machine learning & nlp|frameworks|infrastructure|apis?\s*&\s*tools|governance & compliance expertise|finance & compliance|software engineering|entrepreneurship & strategy|cognitive & analytical skills|key contributions|advisory platforms include)$/i;

  const collectSectionLines = (heading: RegExp, maxLines = 8) => {
    const startIndex = lines.findIndex((line) => heading.test(line));
    if (startIndex === -1) return [] as string[];
    const sectionLines: string[] = [];
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (headingRegex.test(line)) break;
      if (!line) continue;
      sectionLines.push(line);
      if (sectionLines.length >= maxLines) break;
    }
    return sectionLines;
  };

  const summaryText =
    collectSectionLines(/^(professional summary|summary|profile|executive profile)$/i, 8).join(' ') ||
    lines.find((line) => line.length >= 65 && line.length <= 220 && !headingRegex.test(line)) ||
    '';

  const certifications = collectSectionLines(/^certifications$/i, 8)
    .map((line) =>
      line
        .replace(/\s+\[date\]/gi, '')
        .replace(/\s*,\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter(
      (value) =>
        /[A-Za-z0-9]/.test(value) &&
        value.length >= 3 &&
        !/[<>]/.test(value) &&
        !/^<\/?w:/i.test(value)
    );

  const skillHeadingRegex =
    /^(skills\b|core expertise|technical stack|programming|ai\s*\/\s*machine learning|machine learning & nlp|frameworks|infrastructure|apis?\s*&\s*tools)$/i;
  const skills = (() => {
    const values = new Set<string>();

    lines.forEach((line, index) => {
      if (!skillHeadingRegex.test(line)) return;

      const headingInlineValue = line.replace(/^skills\b[:\s-]*/i, '').trim();
      if (headingInlineValue && headingInlineValue.length > 1) {
        headingInlineValue
          .split(/[|,]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => values.add(item));
      }

      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const itemLine = lines[cursor];
        if (headingRegex.test(itemLine)) break;

        itemLine
          .replace(/^[-*]\s*/, '')
          .split(/[|,]/)
          .map((item) => item.trim().replace(/\s{2,}/g, ' '))
          .filter((item) => item.length >= 2)
          .forEach((item) => values.add(item));

        if (values.size >= 24) break;
      }
    });

    return Array.from(values)
      .filter((item) => item.length >= 2 && item.length <= 64 && !headingRegex.test(item))
      .slice(0, 20);
  })();

  const monthToken = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
  const dateRangeRegex = new RegExp(
    `\\b${monthToken}\\s+\\d{4}\\s*[–-]\\s*(?:Present|${monthToken}\\s+\\d{4})\\b`,
    'i'
  );
  const roleKeywordRegex =
    /(engineer|consultant|advisor|founder|trainer|manager|developer|architect|co-founder|operator|lead)/i;
  const roleAnchors = (() => {
    const anchored = new Set<string>();

    lines.forEach((line, index) => {
      if (!dateRangeRegex.test(line)) return;
      const previousLine = lines[index - 1] ?? '';
      const shouldAttachPreviousRole =
        roleKeywordRegex.test(previousLine) &&
        !dateRangeRegex.test(previousLine) &&
        previousLine.length <= 110;
      const candidate = shouldAttachPreviousRole ? `${previousLine} · ${line}` : line;
      if (candidate.length <= 170) {
        anchored.add(candidate);
      }
    });

    if (anchored.size === 0) {
      lines
        .filter(
          (line) =>
            /(present|\b20\d{2}\b|\b19\d{2}\b)/i.test(line) &&
            roleKeywordRegex.test(line) &&
            line.length <= 130
        )
        .slice(0, 6)
        .forEach((line) => anchored.add(line));
    }

    return Array.from(anchored).slice(0, 6);
  })();

  const impactMetrics = (() => {
    const explicitImpactLines = collectSectionLines(/^selected impact metrics$/i, 8).filter((line) =>
      /(\$?\d[\d,.]*\+?|[0-9]+%|\b\d+[kmb]\b)/i.test(line)
    );
    if (explicitImpactLines.length > 0) {
      return explicitImpactLines.slice(0, 5);
    }

    return lines
      .filter(
        (line) =>
          /(\$?\d[\d,.]*\+?|[0-9]+%|\b\d+[kmb]\b)/i.test(line) &&
          !headingRegex.test(line) &&
          line.length <= 150
      )
      .slice(0, 5);
  })();

  const groups: ResumeArtifactGroup[] = [];
  if (summaryText) {
    groups.push({
      title: 'Summary signal',
      items: [clampText(summaryText, 220)]
    });
  }
  if (roleAnchors.length > 0) {
    groups.push({
      title: 'Role timeline anchors',
      items: roleAnchors
    });
  }
  if (skills.length > 0) {
    groups.push({
      title: 'Skill artifacts',
      items: skills
    });
  }
  if (certifications.length > 0) {
    groups.push({
      title: 'Certification artifacts',
      items: certifications
    });
  }
  if (impactMetrics.length > 0) {
    groups.push({
      title: 'Impact metric artifacts',
      items: impactMetrics
    });
  }

  return groups;
};

const extractProfileFromResumeText = (resumeRawText: string): Partial<ProfileDraft> => {
  const lines = resumeRawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]+\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(
      (line) =>
        Boolean(line) &&
        !/^<\/?w:/i.test(line) &&
        !line.includes('<w:') &&
        !line.includes('</w:')
    );

  if (lines.length === 0) return {};

  const firstLines = lines.slice(0, 8);
  const headerName = firstLines.find(
    (line) =>
      /^[A-Za-z][A-Za-z'.-]+(?: [A-Za-z][A-Za-z'.-]+){1,3}$/.test(line) &&
      !/(resume|curriculum|vitae|summary|profile)/i.test(line)
  );
  const emailLineIndex = lines.findIndex((line) => /\b\S+@\S+\.\S+\b/.test(line));
  const preEmailName =
    emailLineIndex > 0 &&
    /^[A-Za-z][A-Za-z'.-]+(?: [A-Za-z][A-Za-z'.-]+){1,3}$/.test(lines[emailLineIndex - 1])
      ? lines[emailLineIndex - 1]
      : '';

  const roleLine = lines
    .slice(0, 56)
    .find(
      (line) =>
        /(architect|engineer|developer|consultant|founder|operator|strategist|manager|lead|designer|analyst)/i.test(
          line
        ) &&
        line.length <= 110 &&
        !/^(professional summary|summary|work experience|experience|education|skills|certifications)\b/i.test(
          line
        )
    );

  const summaryHeadingIndex = lines.findIndex((line) =>
    /^(professional summary|summary|profile|objective|about)\b/i.test(line)
  );
  const summaryBlock =
    summaryHeadingIndex >= 0
      ? lines.slice(summaryHeadingIndex + 1, summaryHeadingIndex + 5).join(' ')
      : '';
  const narrativeLine = lines.find(
    (line) =>
      line.length >= 50 &&
      line.length <= 190 &&
      /(build|deliver|lead|design|ship|improve|drive|scale|create|develop)/i.test(line)
  );
  const metricLine = lines.find(
    (line) =>
      /(%|\$|kpi|revenue|conversion|pipeline|uptime|latency|cost|delivery|retention|lead time)/i.test(line) &&
      line.length <= 130 &&
      !/\[[xyz]\]/i.test(line)
  );
  const summarySignal = (summaryBlock || narrativeLine || '').trim();
  const summaryExpertise = summarySignal.match(/expertise in ([^.]+)/i)?.[1]?.trim();
  const primaryOfferFromSummary = summaryExpertise
    ? `AI delivery across ${summaryExpertise}`
    : '';

  const resumeBlob = lines.join(' ').toLowerCase();
  const voiceHints: string[] = [];
  if (/(technical|engineering|architecture|platform|systems|automation|code)/i.test(resumeBlob)) {
    voiceHints.push('technical');
  }
  if (/(client|stakeholder|cross-functional|collaborat|partnership|mentor)/i.test(resumeBlob)) {
    voiceHints.push('collaborative');
  }
  if (/(ship|deliver|execution|launch|deadline|sprint)/i.test(resumeBlob)) {
    voiceHints.push('execution-focused');
  }

  const extracted: Partial<ProfileDraft> = {};
  if (headerName || preEmailName) {
    extracted.operatorName = clampText((headerName || preEmailName).trim(), 80);
  }
  if (primaryOfferFromSummary) {
    extracted.primaryOffer = clampText(primaryOfferFromSummary, 110);
  } else if (roleLine) {
    extracted.primaryOffer = clampText(roleLine.trim(), 110);
  }
  if (summarySignal) {
    extracted.positioning = clampText(summarySignal, 190);
  }
  if (voiceHints.length > 0) {
    extracted.voiceGuide = clampText(
      `Clear, ${voiceHints.join(', ')}, and outcome-driven.`,
      110
    );
  }
  if (metricLine) {
    extracted.focusMetric = clampText(metricLine.trim(), 110);
  } else if (summarySignal) {
    extracted.focusMetric = 'Model accuracy, operational efficiency, and high-trust AI delivery outcomes.';
  }

  return extracted;
};

export function DashboardApp() {
  const initialSectionFromLocation = resolveInitialDashboardSection();
  const {
    data,
    init,
    error,
    intelligenceRulesEpoch,
    snoozeSchedulerTask,
    completeSchedulerTask,
    exportWorkspace,
    updateBrandProfile,
    addPublishingDraft,
    addOutreachDraft,
    addNote,
    signOutSession,
    setTheme,
    updateVisualSettings,
    updateCockpitPreferences
  } = useBrandOpsStore();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cockpitOverlay, setCockpitOverlay] = useState<null | 'help' | 'settings'>(null);
  const [activeSectionId, setActiveSectionId] = useState<DashboardSectionId>(initialSectionFromLocation);
  const [activeSectionPage, setActiveSectionPage] = useState<DashboardSectionId>(initialSectionFromLocation);
  const initialScrollDoneRef = useRef(false);
  const prevCockpitLayoutRef = useRef<string | undefined>(undefined);
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [profileDraftBootstrapped, setProfileDraftBootstrapped] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    operatorName: '',
    positioning: '',
    primaryOffer: '',
    voiceGuide: '',
    focusMetric: ''
  });
  const [resumeAutofillNotice, setResumeAutofillNotice] = useState<string | null>(null);
  const [resumeAutofillError, setResumeAutofillError] = useState<string | null>(null);
  const [resumeAutofillBusy, setResumeAutofillBusy] = useState(false);
  const [profileSetupNotice, setProfileSetupNotice] = useState<string | null>(null);
  const [profileSetupError, setProfileSetupError] = useState<string | null>(null);
  const [profileSetupSaving, setProfileSetupSaving] = useState(false);
  const [resumeArtifactGroups, setResumeArtifactGroups] = useState<ResumeArtifactGroup[]>([]);
  const [resumeExtractPreview, setResumeExtractPreview] = useState('');
  const [resumeSourceFileName, setResumeSourceFileName] = useState('');
  const [navSignalActive, setNavSignalActive] = useState(false);
  const profileSetupRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const navigateToSection = useCallback((sectionId: string) => {
    if (!isDashboardSectionId(sectionId)) return;
    setActiveSectionId(sectionId);
    const unified = useBrandOpsStore.getState().data?.settings.cockpitLayout === 'unified-scroll';
    if (!unified) {
      setActiveSectionPage(sectionId);
    }
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.set(QUERY.dashboardSection, sectionId);
    window.history.pushState({ boSection: sectionId }, '', url.toString());
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToSection(sectionId));
    });
  }, []);

  const openFullSettingsWindow = useCallback(() => {
    openExtensionSurface('options');
  }, []);

  const handleCockpitNavigation = useCallback(
    (item: DashboardNavItem) => {
      if (data?.settings.motionMode === 'wild') {
        setNavSignalActive(true);
        window.setTimeout(() => setNavSignalActive(false), 340);
      }

      if (item.type === 'section') {
        navigateToSection(item.target);
        return;
      }

      if (item.target === 'help') {
        setCockpitOverlay('help');
        return;
      }
      if (item.target === 'options') {
        openExtensionSurface('options');
        return;
      }
      if (item.target === 'dashboard') {
        return;
      }

      openExtensionSurface(item.target);
    },
    [data?.settings.motionMode, navigateToSection]
  );

  useEffect(() => {
    if (!cockpitOverlay) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCockpitOverlay(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cockpitOverlay]);

  useEffect(() => {
    if (!data) return;
    const url = new URL(window.location.href);
    const overlay = url.searchParams.get(QUERY.cockpitOverlay);
    if (overlay === 'help' || overlay === 'settings') {
      setCockpitOverlay(overlay);
      url.searchParams.delete(QUERY.cockpitOverlay);
      const qs = url.searchParams.toString();
      window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`);
    }
  }, [data]);

  useEffect(() => {
    void init();
    if (isPreviewCockpitUngated()) {
      setShowOnboarding(false);
      setProfileSetupOpen(false);
      return;
    }
    let arrivedFromWelcome = false;
    try {
      arrivedFromWelcome = sessionStorage.getItem('bo:dashboard-after-welcome') === '1';
    } catch {
      arrivedFromWelcome = false;
    }
    if (arrivedFromWelcome) {
      try {
        sessionStorage.removeItem('bo:dashboard-after-welcome');
      } catch {
        // ignore
      }
      localStorage.setItem(ONBOARDING_KEY, 'yes');
      setShowOnboarding(false);
      setProfileSetupOpen(!isProfileSetupComplete());
      return;
    }
    const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === 'yes';
    setShowOnboarding(!onboardingDone);
    setProfileSetupOpen(!isProfileSetupComplete() && onboardingDone);
  }, [init]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fromHash = canonicalizeDashboardSectionId(url.hash.replace(/^#/, ''));
    if (!fromHash) return;
    url.searchParams.set(QUERY.dashboardSection, fromHash);
    url.hash = '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, []);

  useEffect(() => {
    const syncFromHistory = () => {
      const next = resolveInitialDashboardSection();
      setActiveSectionId(next);
      if (useBrandOpsStore.getState().data?.settings.cockpitLayout !== 'unified-scroll') {
        setActiveSectionPage(next);
      }
      scrollToSection(next);
    };
    window.addEventListener('popstate', syncFromHistory);
    return () => window.removeEventListener('popstate', syncFromHistory);
  }, []);

  useEffect(() => {
    if (!data?.settings.theme) return;
    applyDocumentTheme(data.settings.theme, {
      visualMode: data.settings.visualMode,
      motionMode: data.settings.motionMode,
      ambientFxEnabled: data.settings.ambientFxEnabled
    });
  }, [data?.settings.ambientFxEnabled, data?.settings.motionMode, data?.settings.theme, data?.settings.visualMode]);

  useEffect(() => {
    if (!data || profileDraftBootstrapped) return;

    setProfileDraft({
      operatorName: data.brand.operatorName ?? '',
      positioning: data.brand.positioning ?? '',
      primaryOffer: data.brand.primaryOffer ?? '',
      voiceGuide: data.brand.voiceGuide ?? '',
      focusMetric: data.brand.focusMetric ?? ''
    });
    setProfileDraftBootstrapped(true);
  }, [data, profileDraftBootstrapped]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const eventTarget = event.target as HTMLElement | null;
      const isTypingTarget =
        eventTarget instanceof HTMLInputElement ||
        eventTarget instanceof HTMLTextAreaElement ||
        eventTarget?.isContentEditable === true;
      const isMetaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (isMetaK) {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (isSlash && !isTypingTarget) {
        event.preventDefault();
        setPaletteOpen(true);
      }

      if (event.key === '1' && event.altKey) {
        navigateToSection('brand-content');
      }
      if (event.key === '2' && event.altKey) {
        navigateToSection('pipeline');
      }
      if (event.key === '3' && event.altKey) {
        navigateToSection('today');
      }
      if (event.key === '4' && event.altKey) {
        navigateToSection('connections');
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigateToSection]);

  useEffect(() => {
    if (!data || data.settings.cockpitLayout !== 'unified-scroll') return;

    const sections = observedSectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter((node): node is HTMLElement => Boolean(node));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        const id = visibleEntry?.target.id;
        if (id && isDashboardSectionId(id)) {
          setActiveSectionId(id);
        }
      },
      {
        threshold: [0.2, 0.4, 0.7],
        rootMargin: '-18% 0px -58% 0px'
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [data]);

  const derived = useMemo(() => {
    if (!data) return null;

    const overdueFollowUps = data.followUps.filter(
      (item) => !item.completed && new Date(item.dueAt).getTime() < Date.now()
    ).length;

    const weightedPipeline = data.opportunities.reduce(
      (sum, item) => sum + item.valueUsd * (item.confidence / 100),
      0
    );

    const groups = scheduler.groups(data.scheduler);
    const contentPriority = localIntelligence.contentPriority(data.contentLibrary).slice(0, 3);
    const overdueRisk = localIntelligence.overdueRisk(data).slice(0, 4);
    const outreachUrgency = localIntelligence.outreachUrgency(data.outreachDrafts).slice(0, 3);
    const pipelineHealth = localIntelligence.pipelineHealth(data.opportunities).slice(0, 3);
    const publishingRecommendations = localIntelligence.publishingRecommendations(data.publishingQueue).slice(0, 3);

    return {
      overdueFollowUps,
      weightedPipeline,
      groups,
      contentPriority,
      overdueRisk,
      outreachUrgency,
      pipelineHealth,
      publishingRecommendations
    };
  }, [data, intelligenceRulesEpoch]);

  const cockpitPulse = useMemo(() => {
    if (!data || !derived) return null;
    const publishingInPlay = data.publishingQueue.filter(
      (item) => item.status !== 'posted' && item.status !== 'skipped'
    ).length;
    const activeOutreachDrafts = data.outreachDrafts.filter((draft) => draft.status !== 'archived').length;
    return {
      urgentFollowUps: derived.overdueFollowUps,
      queueDueToday: derived.groups.today.length,
      weightedPipelineUsd: derived.weightedPipeline,
      publishingInPlay,
      activeOutreachDrafts
    };
  }, [data, derived]);

  const notificationDigest = useMemo(
    () => (data ? dailyNotificationCenter.build(data) : null),
    [data, intelligenceRulesEpoch]
  );
  const cadencePlan = useMemo(() => (data ? operatorCadenceFlow.build(data) : null), [data, intelligenceRulesEpoch]);

  useEffect(() => {
    if (useBrandOpsStore.getState().data?.settings.cockpitLayout !== 'unified-scroll') {
      initialScrollDoneRef.current = false;
    }
  }, [data?.settings.cockpitLayout]);

  useEffect(() => {
    if (!data || !derived || !notificationDigest || !cadencePlan) return;
    if (data.settings.cockpitLayout !== 'unified-scroll') return;
    if (initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    const section = resolveInitialDashboardSection();
    setActiveSectionId(section);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToSection(section));
    });
  }, [data, derived, notificationDigest, cadencePlan, data?.settings.cockpitLayout]);

  useEffect(() => {
    if (!data) return;
    const cur = data.settings.cockpitLayout;
    if (cur === 'sections' && prevCockpitLayoutRef.current === 'unified-scroll') {
      const next = resolveInitialDashboardSection();
      setActiveSectionPage(next);
      setActiveSectionId(next);
    }
    prevCockpitLayoutRef.current = cur;
  }, [data, data?.settings.cockpitLayout]);

  useFocusTrap({
    enabled: profileSetupOpen,
    containerRef: profileSetupRef,
    onEscape: () => {
      markProfileSetupComplete();
      setProfileSetupOpen(false);
    }
  });

  useFocusTrap({
    enabled: paletteOpen,
    containerRef: paletteRef,
    onEscape: () => setPaletteOpen(false)
  });

  const executionHeatItems = useMemo<ExecutionHeatItem[]>(() => {
    if (!data || !notificationDigest) return [];

    const now = Date.now();
    const hoursUntil = (iso?: string) =>
      iso ? (new Date(iso).getTime() - now) / (1000 * 60 * 60) : Number.POSITIVE_INFINITY;

    const items: ExecutionHeatItem[] = [];

    data.followUps
      .filter((task) => !task.completed)
      .forEach((task) => {
        const { heat, factors } = followUpHeatAndFactors(task.dueAt, now);
        const dueH = hoursUntil(task.dueAt);
        items.push({
          id: `heat-followup-${task.id}`,
          title: `Follow-up: ${task.reason}`,
          detail: `Due ${new Date(task.dueAt).toLocaleString()}`,
          sectionId: 'today',
          heat,
          reason: dueH <= 0 ? 'overdue' : dueH <= 24 ? 'due window' : 'upcoming',
          kind: 'followup',
          heatFactors: factors
        });
      });

    data.publishingQueue
      .filter((item) => item.status !== 'posted' && item.status !== 'skipped')
      .forEach((item) => {
        const { heat, factors } = publishHeatAndFactors(item.scheduledFor, item.reminderAt, now);
        const dueH = hoursUntil(item.scheduledFor ?? item.reminderAt);
        items.push({
          id: `heat-publish-${item.id}`,
          title: `Publish: ${item.title}`,
          detail: item.scheduledFor
            ? `Scheduled ${new Date(item.scheduledFor).toLocaleString()}`
            : 'No publish window set yet',
          sectionId: 'brand-content',
          heat,
          reason: item.scheduledFor ? (dueH <= 24 ? 'due window' : 'scheduled') : 'missing schedule',
          kind: 'publish',
          heatFactors: factors
        });
      });

    data.outreachDrafts
      .filter((draft) => draft.status !== 'archived')
      .forEach((draft) => {
        const { heat, factors } = outreachHeatAndFactors(draft.updatedAt, draft.status, now);
        items.push({
          id: `heat-outreach-${draft.id}`,
          title: `Outreach: ${draft.targetName}`,
          detail: `${draft.company} · ${draft.outreachGoal}`,
          sectionId: 'pipeline',
          heat,
          reason: draft.status === 'scheduled follow-up' ? 'follow-up due' : 'relationship momentum',
          kind: 'outreach',
          heatFactors: factors
        });
      });

    data.opportunities
      .filter((opp) => opp.status !== 'won' && opp.status !== 'lost')
      .forEach((opp) => {
        const followH = hoursUntil(opp.followUpDate);
        const { heat, factors } = pipelineHeatAndFactors(
          {
            followUpDate: opp.followUpDate,
            valueUsd: opp.valueUsd,
            confidence: opp.confidence
          },
          now
        );
        items.push({
          id: `heat-pipeline-${opp.id}`,
          title: `Pipeline: ${opp.name}`,
          detail: `${opp.company} · next: ${opp.nextAction}`,
          sectionId: 'pipeline',
          heat,
          reason: followH <= 24 ? 'next action due' : 'revenue impact',
          kind: 'pipeline',
          heatFactors: factors
        });
      });

    notificationDigest.managerialActions.forEach((action) => {
      const { heat, factors } = managerialNotificationFactors(action.severity);
      items.push({
        id: `heat-managerial-${action.id}`,
        title: action.title,
        detail: action.detail,
        sectionId: isDashboardSectionId(action.sectionId) ? action.sectionId : 'today',
        heat,
        reason: `managerial ${action.severity}`,
        kind: 'managerial',
        heatFactors: factors
      });
    });

    notificationDigest.technicalActions.forEach((action) => {
      const { heat, factors } = technicalNotificationFactors(action.severity);
      items.push({
        id: `heat-technical-${action.id}`,
        title: action.title,
        detail: action.detail,
        sectionId: isDashboardSectionId(action.sectionId) ? action.sectionId : 'today',
        heat,
        reason: `technical ${action.severity}`,
        kind: 'technical',
        heatFactors: factors
      });
    });

    return items.sort((a, b) => b.heat - a.heat);
  }, [data, notificationDigest, intelligenceRulesEpoch]);

  const executeNowItems = executionHeatItems.slice(0, 5);
  const nextUpItems = executionHeatItems.slice(5, 9);
  const overviewHealthMetrics = useMemo(() => {
    if (!data) return [];
    return computeOverviewHealthMetrics(data, executionHeatItems.map((item) => item.heat));
  }, [data, executionHeatItems]);

  const primaryIdentityLine = useMemo(() => {
    if (!data) return null;
    return getPrimaryIdentityLabel(data);
  }, [data]);
  const executionUnblockers = useMemo(() => {
    if (!notificationDigest || !cadencePlan) return [];
    return [
      ...notificationDigest.datasetActions.map((item) => ({
        id: `unblock-${item.id}`,
        title: item.title,
        detail: item.detail,
        sectionId: item.sectionId
      })),
      ...cadencePlan.edges
        .filter((edge) => edge.kind === 'artifact')
        .map((edge) => ({
          id: `edge-${edge.id}`,
          title: `${edge.from} -> ${edge.to}`,
          detail: edge.detail,
          sectionId: 'connections' as DashboardSectionId
        }))
    ].slice(0, 6);
  }, [cadencePlan, notificationDigest]);

  const activeNavItem =
    flattenedNavigationItems.find(
      (item) => item.type === 'section' && item.target === activeSectionId
    ) ?? flattenedNavigationItems[0];

  if (error) {
    return (
      <>
        <main className="bo-system-screen bo-dashboard-shell min-w-0">
          <section className="bo-card space-y-2" role="alert" aria-live="assertive">
            <h2 className="text-base font-semibold text-danger">Dashboard failed to load</h2>
            <p className="text-sm text-textMuted">{error}</p>
            <p className="text-xs text-textMuted">Try reloading this extension page from the browser extension manager.</p>
          </section>
        </main>
        <RightPillNavDock
          hostSurface="dashboard"
          activeSectionId={activeSectionId}
          onSelectItem={handleCockpitNavigation}
          closedFocusLabel={activeNavItem?.label}
        />
      </>
    );
  }

  if (!data || !derived || !notificationDigest || !cadencePlan) {
    return (
      <>
        <main className="bo-system-screen bo-dashboard-shell min-h-0 min-w-0 p-4">
          <p className="text-sm text-textMuted">Loading cockpit…</p>
        </main>
        <RightPillNavDock
          hostSurface="dashboard"
          activeSectionId={activeSectionId}
          onSelectItem={handleCockpitNavigation}
          closedFocusLabel={activeNavItem?.label}
        />
      </>
    );
  }

  if (!canAccessApp(data)) {
    return (
      <>
        <DashboardAuthGate />
        <RightPillNavDock
          hostSurface="dashboard"
          activeSectionId={activeSectionId}
          onSelectItem={handleCockpitNavigation}
          closedFocusLabel={activeNavItem?.label}
        />
      </>
    );
  }

  const unifiedScroll = data.settings.cockpitLayout === 'unified-scroll';
  const isCompact = data.settings.cockpitDensity === 'compact';
  const shouldRenderSection = (sectionId: DashboardSectionId) =>
    unifiedScroll || activeSectionPage === sectionId;

  const handleResumeUpload = async (file: File | null) => {
    if (!file) return;

    setResumeAutofillBusy(true);
    setResumeAutofillError(null);
    setResumeAutofillNotice(null);
    setResumeArtifactGroups([]);
    setResumeExtractPreview('');
    setResumeSourceFileName(file.name);

    try {
      const resumeRawText = await extractResumeTextFromFile(file);
      const normalizedLength = resumeRawText.replace(/\s+/g, '').length;
      if (normalizedLength < 80) {
        setResumeAutofillError(
          'Resume content was too short after extraction. Try TXT/MD, or export a selectable-text DOCX/PDF.'
        );
        return;
      }

      setResumeExtractPreview(clampText(resumeRawText, 2500));
      setResumeArtifactGroups(extractResumeArtifactGroups(resumeRawText));

      const extracted = extractProfileFromResumeText(resumeRawText);
      const extractedEntries = Object.entries(extracted).filter((entry) =>
        Boolean(entry[1]?.trim())
      ) as Array<[keyof ProfileDraft, string]>;
      if (extractedEntries.length === 0) {
        setResumeAutofillError('Resume parsed, but no profile fields were confidently mapped. Review extracted artifacts below.');
        return;
      }

      setProfileDraft((current) => ({
        ...current,
        ...Object.fromEntries(extractedEntries)
      }));
      setResumeAutofillNotice(
        `Autofilled ${extractedEntries.length} field${extractedEntries.length === 1 ? '' : 's'} from ${file.name}.`
      );
    } catch (error) {
      setResumeAutofillError(
        `Could not parse ${file.name}. ${error instanceof Error ? error.message : 'Unknown file error.'}`
      );
    } finally {
      setResumeAutofillBusy(false);
    }
  };

  return (
    <>
    <main
      className={`bo-system-screen bo-dashboard-shell bo-retro-ambient flex min-h-0 min-w-0 flex-1 flex-col transition-all ${
        isCompact ? 'bo-dashboard-shell--compact' : ''
      } ${
        data.settings.visualMode === 'retroMagic' ? 'bo-retro-panel' : ''
      } ${
        data.settings.motionMode !== 'off' ? 'bo-retro-surface-enter' : ''
      }`}
    >
      <div className={`bo-nav-signal ${navSignalActive ? 'bo-nav-signal--active' : ''}`} aria-hidden />
      <div className={`bo-dashboard-canvas w-full min-w-0 ${isCompact ? 'gap-2' : 'gap-3'} flex-1`}>
      <div className="flex w-full min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-6 2xl:gap-10">
        <div className="min-w-0 flex-1">
          <BrandHeader
            eyebrow="BrandOps"
            title="Cockpit"
            roleBadge="Work"
            compact={isCompact}
            subtitle={
              isCompact
                ? unifiedScroll
                  ? 'Control center · compass (Alt+M) for areas.'
                  : 'Focused view · compass (Alt+M).'
                : unifiedScroll
                  ? 'Your daily control center for tasks, pipeline, content, and integrations.'
                  : 'Focused mode: open one area at a time from the compass.'
            }
          />
        </div>
        <div className="flex min-w-0 shrink-0 flex-col gap-2 border-t border-border/60 pt-3 sm:max-w-lg xl:max-w-[min(22rem,32vw)] xl:border-t-0 xl:pt-1 xl:text-right">
          {primaryIdentityLine ? (
            <p className={`${isCompact ? 'text-[11px]' : 'text-xs'} text-textMuted`}>
              Signed in as <span className="font-medium text-text">{primaryIdentityLine}</span>
            </p>
          ) : null}
          <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${isCompact ? 'text-[11px]' : 'text-xs'} xl:justify-end`}>
            <button type="button" className="bo-link" onClick={() => void signOutSession()}>
              Sign out
            </button>
            {isCompact ? (
              <span className="text-[11px] text-textSoft">Federated session.</span>
            ) : (
              <span className="text-left text-textSoft xl:text-right">
                Ends every federated session. To remove only one provider, use Settings → Integrations.
              </span>
            )}
          </div>
        </div>
      </div>

      <CurrentSectionBar
        className="shrink-0"
        leading={
          activeNavItem ? (
            <CockpitNavItemIcon item={activeNavItem} size={20} className="text-primary/90" />
          ) : null
        }
        label={activeNavItem?.label ?? 'Today'}
        description={
          isCompact
            ? undefined
            : activeNavItem?.description ??
              (unifiedScroll
                ? 'Use the right menu to jump between major areas.'
                : 'Use the compass (Alt+M) to switch sections.')
        }
      />

      <div
        key={unifiedScroll ? 'unified' : activeSectionPage}
        className={`grid w-full min-w-0 items-start ${isCompact ? 'gap-3' : 'gap-4'} xl:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)] xl:gap-x-6 xl:gap-y-4 2xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] 2xl:gap-x-8 2xl:gap-y-5 ${data.settings.motionMode === 'off' ? '' : 'bo-retro-section-enter'}`}
      >
        <div className={`w-full min-w-0 ${isCompact ? 'space-y-2' : 'space-y-3'}`}>
        {shouldRenderSection('today') ? (
          <CockpitOperatingBoard compact={isCompact}>
          <section
            id="today-command-deck"
            className={`w-full min-w-0 rounded-xl border border-border/50 bg-surface/25 shadow-sm ring-1 ring-border/20 ${isCompact ? 'space-y-2 p-3' : 'space-y-3 p-3 sm:p-4'}`}
          >
            <header className={isCompact ? 'space-y-1' : 'space-y-1.5'}>
              <p className="bo-crown-kicker">Command deck</p>
              <h2
                className={`flex items-center gap-2 ${
                  isCompact ? 'text-base font-semibold text-text' : 'text-lg font-semibold text-text'
                }`}
              >
                <CalendarRange
                  size={isCompact ? 16 : 18}
                  strokeWidth={2}
                  className="shrink-0 text-primary/90"
                  aria-hidden
                />
                <span>
                  {isCompact
                    ? 'Today: ship output, close loops.'
                    : 'Today objective: protect momentum, ship output, close loops.'}
                </span>
              </h2>
              {isCompact ? null : (
                <p className="text-xs text-textMuted">
                  Run only the highest-leverage actions now; defer everything else into next-up windows.
                </p>
              )}
            </header>
            {cockpitPulse ? (
              <CockpitPulseStrip pulse={cockpitPulse} compact={isCompact} />
            ) : null}
            {isCompact ? (
              <p className="text-[11px] text-textMuted">
                Other areas: use the compass (right) · <kbd className="rounded border border-border px-1">Alt+M</kbd>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 text-xs">
                <button className="bo-link" onClick={() => navigateToSection('today-execution')}>
                  Open execute-now lane
                </button>
                <button className="bo-link" onClick={() => navigateToSection('pipeline')}>
                  Jump to revenue engine
                </button>
                <button className="bo-link" onClick={() => navigateToSection('brand-content')}>
                  Jump to presence engine
                </button>
              </div>
            )}
          </section>

          <CollapsibleSection
            key={`workspace-map-${isCompact ? 'c' : 'h'}`}
            defaultOpen={false}
            summaryIcon={<MapIcon size={18} strokeWidth={2} />}
            summary={<p className="text-sm font-semibold text-text">Workspace map (advanced)</p>}
          >
            <MissionMapOverview
              data={data}
              notificationDigest={notificationDigest}
              formatHour={formatHour}
              density={data.settings.cockpitDensity}
            />
          </CollapsibleSection>

      {showOnboarding ? (
        <CockpitOnboardingOverlay
          onContinue={() => {
            localStorage.setItem(ONBOARDING_KEY, 'yes');
            setShowOnboarding(false);
            if (!isProfileSetupComplete()) {
              setProfileSetupOpen(true);
            }
          }}
        />
      ) : null}

      {profileSetupOpen ? (
        <div className="bo-system-overlay fixed inset-0 z-50 flex min-h-0 items-center justify-center overflow-y-auto p-4">
          <section
            ref={profileSetupRef}
            tabIndex={-1}
            className="bo-system-sheet w-full max-w-3xl rounded-3xl border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="bo-crown-kicker">First run</p>
                <h2 className="bo-crown-title text-xl text-text">
                  Set up your profile
                </h2>
                <p className="max-w-2xl text-sm text-textMuted">
                  Set your profile once so the dashboard, execution center, and assistant prompts align with how you actually operate.
                </p>
              </div>
              <button
                className="bo-link !px-2 !py-1"
                onClick={() => {
                  markProfileSetupComplete();
                  setProfileSetupOpen(false);
                }}
              >
                Skip for now
              </button>
            </div>

            <form
              className="mt-4 grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void (async () => {
                  setProfileSetupSaving(true);
                  setProfileSetupError(null);
                  setProfileSetupNotice(null);
                  try {
                    await updateBrandProfile({
                      operatorName: profileDraft.operatorName.trim() || data.brand.operatorName,
                      positioning: profileDraft.positioning.trim() || data.brand.positioning,
                      primaryOffer: profileDraft.primaryOffer.trim() || data.brand.primaryOffer,
                      voiceGuide: profileDraft.voiceGuide.trim() || data.brand.voiceGuide,
                      focusMetric: profileDraft.focusMetric.trim() || data.brand.focusMetric
                    });
                    markProfileSetupComplete();
                    setProfileSetupNotice('Profile saved. Dashboard personalization is now active.');
                    window.setTimeout(() => {
                      setProfileSetupOpen(false);
                      setProfileSetupNotice(null);
                    }, 260);
                  } catch (submitError) {
                    setProfileSetupError(
                      submitError instanceof Error
                        ? submitError.message
                        : 'Could not save profile. Try again.'
                    );
                  } finally {
                    setProfileSetupSaving(false);
                  }
                })();
              }}
            >
              {profileSetupNotice ? (
                <InlineAlert
                  tone="success"
                  title="Profile setup saved"
                  message={profileSetupNotice}
                />
              ) : null}
              {profileSetupError ? (
                <InlineAlert
                  tone="danger"
                  title="Profile setup failed"
                  message={profileSetupError}
                />
              ) : null}
              <div className="md:col-span-2 rounded-xl border border-border bg-bg/55 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="bo-crown-kicker">Resume onboarding</p>
                  <span className="bo-pill">Autofill profile</span>
                </div>
                <p className="mt-1 text-textMuted">
                  Upload your resume to prefill profile settings. You can edit everything before saving.
                </p>
                <label className="mt-3 block">
                  <span className="text-textMuted">Resume file</span>
                  <input
                    type="file"
                    accept=".txt,.md,.rtf,.json,.pdf,.doc,.docx"
                    disabled={resumeAutofillBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      void handleResumeUpload(file);
                      event.currentTarget.value = '';
                    }}
                    className="mt-1 w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm"
                  />
                </label>
                <p className="mt-2 text-[11px] text-textSoft">
                  Best results come from TXT, MD, and DOCX. PDF extraction is supported but depends on selectable text.
                </p>
                {resumeAutofillBusy ? (
                  <p className="mt-2 rounded-lg border border-border bg-surface/55 px-2 py-1 text-[11px] text-textMuted">
                    Parsing resume and mapping profile artifacts...
                  </p>
                ) : null}
                {resumeAutofillNotice ? (
                  <p className="mt-2 rounded-lg border border-success/30 bg-successSoft/10 px-2 py-1 text-[11px] text-success">
                    {resumeAutofillNotice}
                  </p>
                ) : null}
                {resumeAutofillError ? (
                  <p className="mt-2 rounded-lg border border-danger/30 bg-dangerSoft/10 px-2 py-1 text-[11px] text-danger">
                    {resumeAutofillError}
                  </p>
                ) : null}
                {resumeArtifactGroups.length > 0 ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {resumeArtifactGroups.map((group) => (
                      <article
                        key={group.title}
                        className="rounded-lg border border-border/80 bg-bg/50 p-2"
                      >
                        <p className="text-[11px] uppercase tracking-[0.12em] text-textSoft">{group.title}</p>
                        <div className="mt-1 space-y-1">
                          {group.items.slice(0, 6).map((item, index) => (
                            <p key={`${group.title}-${index}`} className="text-[11px] text-textMuted">
                              {item}
                            </p>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
                {resumeExtractPreview ? (
                  <details className="mt-3 rounded-lg border border-border/80 bg-bg/50 p-2">
                    <summary className="cursor-pointer text-[11px] text-textMuted">
                      Parsed resume preview {resumeSourceFileName ? `(${resumeSourceFileName})` : ''}
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-textMuted">
                      {resumeExtractPreview}
                    </pre>
                  </details>
                ) : null}
              </div>

              <label className="space-y-1 text-xs">
                <span className="text-textMuted">Operator name</span>
                <input
                  value={profileDraft.operatorName}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, operatorName: event.target.value }))
                  }
                  placeholder="Your name"
                  className="w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-textMuted">Primary offer</span>
                <input
                  value={profileDraft.primaryOffer}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, primaryOffer: event.target.value }))
                  }
                  placeholder="What you sell or deliver"
                  className="w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-xs md:col-span-2">
                <span className="text-textMuted">Positioning</span>
                <input
                  value={profileDraft.positioning}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, positioning: event.target.value }))
                  }
                  placeholder="One-line positioning statement"
                  className="w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-textMuted">Voice guide</span>
                <input
                  value={profileDraft.voiceGuide}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, voiceGuide: event.target.value }))
                  }
                  placeholder="How your writing should feel"
                  className="w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-textMuted">Focus metric</span>
                <input
                  value={profileDraft.focusMetric}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, focusMetric: event.target.value }))
                  }
                  placeholder="Main metric you optimize"
                  className="w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm"
                />
              </label>

              <div className="md:col-span-2 mt-1 flex flex-wrap gap-2">
                <button type="submit" className="bo-link" disabled={profileSetupSaving}>
                  {profileSetupSaving ? 'Saving profile…' : 'Save profile and continue'}
                </button>
                <button
                  type="button"
                  className="bo-link"
                  onClick={() => openExtensionSurface('options')}
                >
                  Open Settings (sync and integrations)
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <CollapsibleSection
        key={`cockpit-metrics-${isCompact ? 'c' : 'h'}`}
        defaultOpen={false}
        summaryIcon={<Activity size={18} strokeWidth={2} />}
        summary={
          <p className="text-sm font-semibold text-text">Cockpit metrics</p>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-textMuted">
            Pulse row above is the single odometer strip. Below: health severity detail for today.
          </p>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" aria-label="Today health strip">
            {overviewHealthMetrics.map((metric) => (
              <article
                key={metric.id}
                className={`rounded-xl border p-3 text-xs ${severityClasses(metric.severity)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="uppercase tracking-[0.12em] text-current/85">{metric.label}</p>
                  <span className="bo-pill">{severityLabel(metric.severity)}</span>
                </div>
                <p className="mt-1 text-lg font-semibold text-text">{metric.value}</p>
                <p className="mt-1 text-current/85">{metric.detail}</p>
              </article>
            ))}
          </section>
        </div>
      </CollapsibleSection>

        <section className="rounded-xl border border-border/70 bg-bg/50 space-y-4 p-3 sm:p-4" id="today-execution" aria-label="Today Queue">
          <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks size={17} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />
              Today Queue
            </h2>
            <p className="text-xs text-textMuted">
              Your highest-priority actions right now, next, and blockers to clear.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="bo-pill">
              {executeNowItems.length} execute now
            </span>
            <span className="bo-pill">
              {nextUpItems.length} next up
            </span>
          </div>
        </header>

        {!data.settings.notificationCenter.enabled ? (
          <p className="rounded-xl border border-warning/30 bg-warningSoft/10 p-4 text-xs text-warning">
            Today Queue is disabled in Settings. Re-enable it to restore ranked priorities.
          </p>
        ) : null}

        <CollapsibleSection
          key={`exec-ctx-${isCompact ? 'c' : 'h'}`}
          defaultOpen={false}
          summaryIcon={<ListTree size={18} strokeWidth={2} />}
          summary={<p className="text-sm font-semibold text-text">More execution context</p>}
        >
          <div className="grid gap-3 xl:grid-cols-4">
            <StatCard
              label="Execution heat"
              value={executeNowItems[0] ? `${executeNowItems[0].heat}` : '0'}
              hint="Top priority score"
            />
            <StatCard
              label="Execute now"
              value={executeNowItems.length}
              hint="Highest urgency + impact"
            />
            <StatCard
              label="Next up"
              value={nextUpItems.length}
              hint="Upcoming work window"
            />
            <StatCard
              label="Unblockers"
              value={executionUnblockers.length}
              hint="System friction to clear"
            />
          </div>
          <article className="mt-4 rounded-xl border border-border bg-bg/40 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Execution prompt</h3>
                <p className="mt-1 text-textMuted">
                  Copy this execution-focused prompt for your preferred model, or tune it from Settings.
                </p>
              </div>
              <button
                className="bo-link"
                onClick={() =>
                  void navigator.clipboard.writeText(notificationDigest.promptPreview)
                }
              >
                Copy prompt
              </button>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-bg/70 p-3 text-[11px] text-textMuted">
              {notificationDigest.promptPreview}
            </pre>
          </article>
        </CollapsibleSection>

        <div className="grid gap-2.5 xl:grid-cols-3 2xl:grid-cols-12 2xl:gap-4">
          <article className="bo-glass-panel bo-glass-panel--muted rounded-xl border border-border bg-bg/45 p-2.5 text-xs xl:col-span-2 2xl:col-span-8">
            <h3 className="text-sm font-semibold">Execute now</h3>
            <div className="mt-3 space-y-2">
              {executeNowItems.length === 0 ? (
                <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted">
                  No urgent items. Use Next up to keep momentum.
                </p>
              ) : (
                executeNowItems.map((item) => (
                  <div
                    key={item.id}
                    className={`overflow-hidden rounded-xl border ${
                      item.heat >= 85
                        ? 'border-danger/30 bg-dangerSoft/10'
                        : item.heat >= 70
                          ? 'border-warning/30 bg-warningSoft/10'
                          : 'border-border/80 bg-bg/45'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full p-3 text-left transition-colors hover:bg-bg/55"
                      onClick={() => navigateToSection(item.sectionId)}
                    >
                      <p className="font-medium text-text">{item.title}</p>
                      <p className="mt-1 text-textMuted">{item.detail}</p>
                    </button>
                    <div className="border-t border-border/40 px-3 pb-3 pt-2">
                      <ExecutionHeatMeter item={item} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="bo-glass-panel bo-glass-panel--muted rounded-xl border border-primary/25 bg-bg/45 p-2.5 text-xs 2xl:col-span-4">
            <h3 className="text-sm font-semibold">Close loop</h3>
            <div className="mt-3 space-y-2">
              <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted">
                {notificationDigest.headline}
              </p>
              <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted">
                End-of-day review: Which one action created the most execution leverage today?
              </p>
            </div>
          </article>
        </div>

        <div className="grid gap-2.5 xl:grid-cols-3 2xl:grid-cols-12 2xl:gap-4">
          <article className="bo-glass-panel bo-glass-panel--muted rounded-xl border border-border bg-bg/40 p-2.5 text-xs xl:col-span-2 2xl:col-span-8">
            <h3 className="text-sm font-semibold">Next up</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {nextUpItems.length === 0 ? (
                <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted md:col-span-2">
                  Nothing queued in next-up window yet.
                </p>
              ) : (
                nextUpItems.map((item) => (
                  <div
                    key={item.id}
                    className={`overflow-hidden rounded-xl border ${
                      item.heat >= 85
                        ? 'border-danger/30 bg-dangerSoft/10'
                        : item.heat >= 70
                          ? 'border-warning/30 bg-warningSoft/10'
                          : 'border-border/80 bg-bg/45'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full p-3 text-left transition-colors hover:bg-bg/55"
                      onClick={() => navigateToSection(item.sectionId)}
                    >
                      <p className="font-medium text-text">{item.title}</p>
                      <p className="mt-1 text-textMuted">{item.detail}</p>
                    </button>
                    <div className="border-t border-border/40 px-3 pb-3 pt-2">
                      <ExecutionHeatMeter item={item} layout="inline" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="bo-glass-panel bo-glass-panel--muted rounded-xl border border-border bg-bg/40 p-2.5 text-xs 2xl:col-span-4">
            <h3 className="text-sm font-semibold">Unblockers</h3>
            <div className="mt-3 space-y-2">
              {executionUnblockers.length === 0 ? (
                <p className="rounded-xl border border-border/80 bg-bg/45 p-3 text-textMuted">
                  No blockers detected.
                </p>
              ) : (
                executionUnblockers.map((item) => (
                  <button
                    key={item.id}
                    className="w-full rounded-xl border border-border/80 bg-bg/45 p-3 text-left"
                    onClick={() => navigateToSection(item.sectionId)}
                  >
                    <p className="font-medium text-text">{item.title}</p>
                    <p className="mt-1 text-textMuted">{item.detail}</p>
                  </button>
                ))
              )}
            </div>
          </article>
        </div>
        </section>

      <CollapsibleSection
        key={`advanced-diag-${isCompact ? 'c' : 'h'}`}
        defaultOpen={false}
        summaryIcon={<Cpu size={18} strokeWidth={2} />}
        summary={
          <div>
            <p className="text-sm font-semibold text-text">Advanced diagnostics</p>
            <p className="mt-0.5 text-[11px] text-textMuted">
              Signals and scheduler internals for power users.
            </p>
          </div>
        }
      >
        <section className="space-y-4" aria-label="Advanced diagnostics">
          <section className="space-y-3" id="today-signals" aria-label="Signals">
            <p className="text-xs text-textMuted">
              Local heuristics for triage guidance.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
                <p className="font-medium">Leverage asset priority</p>
                {derived.contentPriority.map((item) => (
                  <p key={item.id} className="mt-1 text-textMuted">
                    {item.label} — {item.score}/100 · {item.reason}
                  </p>
                ))}
              </article>
              <article className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
                <p className="font-medium">Commitment risk</p>
                {derived.overdueRisk.map((item) => (
                  <p key={item.id} className="mt-1 text-textMuted">
                    {item.label} — {item.score}/100 · {item.reason}
                  </p>
                ))}
              </article>
            </div>
          </section>

          <section className="space-y-3" id="today-scheduler" aria-label="Scheduler">
            <p className="text-xs text-textMuted">
              Reminder coverage and due-task controls.
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
                <p className="text-textMuted uppercase tracking-[0.14em]">Due soon</p>
                <p className="mt-1 text-lg font-semibold">{derived.groups.dueSoon.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
                <p className="text-textMuted uppercase tracking-[0.14em]">Today</p>
                <p className="mt-1 text-lg font-semibold">{derived.groups.today.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
                <p className="text-textMuted uppercase tracking-[0.14em]">This week</p>
                <p className="mt-1 text-lg font-semibold">{derived.groups.thisWeek.length}</p>
              </div>
            </div>
            <div className="space-y-2">
              {[...derived.groups.dueSoon, ...derived.groups.missed].slice(0, 5).map((task) => (
                <article key={task.id} className="rounded-xl border border-border bg-bg/40 p-3 text-xs">
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-textMuted mt-1">
                    {task.sourceType.toUpperCase()} • Due {new Date(task.dueAt).toLocaleString()} • {task.status}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button className="bo-link !px-2 !py-1" onClick={() => void snoozeSchedulerTask(task.id, 15)}>
                      Snooze 15m
                    </button>
                    <button className="bo-link !px-2 !py-1" onClick={() => void completeSchedulerTask(task.id)}>
                      Complete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </CollapsibleSection>
          </CockpitOperatingBoard>
        ) : null}

      {shouldRenderSection('pipeline') ? (
        <section id="pipeline" className="space-y-3 scroll-mt-4">
          <article className="bo-card space-y-3">
            <header className="space-y-1">
              <p className="bo-crown-kicker">Revenue</p>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <KanbanSquare size={17} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />
                Pipeline and outreach
              </h2>
              <p className="text-xs text-textMuted">
                Run relationship momentum, follow-up discipline, and deal progression in one operating block.
              </p>
            </header>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                className="bo-link"
                onClick={() =>
                  void addOutreachDraft({
                    category: 'follow-up',
                    targetName: data.contacts[0]?.name ?? 'Contact',
                    company: data.contacts[0]?.company ?? 'Company',
                    role: data.contacts[0]?.role ?? 'Role',
                    messageBody: 'Quick follow-up from the cockpit.',
                    outreachGoal: 'Book next step',
                    tone: 'Clear and concise',
                    notes: 'Created from Revenue engine'
                  })
                }
              >
                New outreach
              </button>
              <button className="bo-link" onClick={() => navigateToSection('today')}>
                Review due follow-ups
              </button>
              <span className="bo-pill">
                Next move: {data.opportunities.find((item) => item.status !== 'won' && item.status !== 'lost')?.nextAction ?? 'Advance one active opportunity'}
              </span>
            </div>
          </article>
          <section id="outreach-workspace">
            <OutreachWorkspacePanel />
          </section>
          <section id="pipeline-crm">
            <PipelineCrmPanel />
          </section>
        </section>
      ) : null}

      {shouldRenderSection('brand-content') ? (
        <section id="brand-content" className="space-y-3 scroll-mt-4">
          <article className="bo-card space-y-3">
            <header className="space-y-1">
              <p className="bo-crown-kicker">Content</p>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <Layers2 size={17} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />
                Publishing, library, and brand
              </h2>
              <p className="text-xs text-textMuted">
                Publishing Queue and Content Library drive cadence; Brand Vault keeps strategic voice consistent.
              </p>
            </header>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                className="bo-link"
                onClick={() =>
                  void addPublishingDraft({
                    title: 'Cockpit ship slot',
                    body: 'Capture one insight, outcome, or launch update before it disappears.'
                  })
                }
              >
                Queue post draft
              </button>
              <button className="bo-link" onClick={() => navigateToSection('today')}>
                Return to command deck
              </button>
              <span className="bo-pill">
                Next ship: {data.publishingQueue.find((item) => item.status !== 'posted' && item.status !== 'skipped')?.title ?? 'Queue one new post'}
              </span>
            </div>
          </article>
          <section id="publishing-queue">
            <PublishingQueuePanel />
          </section>
          <section id="content-library">
            <ContentLibraryPanel />
          </section>
          <section id="brand-vault">
            <BrandVaultPanel />
          </section>
        </section>
      ) : null}

      {shouldRenderSection('connections') ? (
      <section id="connections" className="space-y-3 scroll-mt-4">
        <article className="bo-card space-y-1">
          <p className="bo-crown-kicker">Integrations</p>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Plug2 size={17} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />
            Connections and sync health
          </h2>
          <p className="text-xs text-textMuted">
            Track identity status, synced artifacts, and external source signals from one diagnostics lane.
          </p>
        </article>
        <DashboardSystemsLean data={data} />
      </section>
      ) : null}
        </div>

        <aside className="hidden min-w-0 border-border/40 xl:block xl:border-l xl:pl-5 2xl:pl-6">
          <div className="sticky top-20 space-y-2.5 2xl:top-24">
            <article className="bo-card space-y-2">
              <p className="bo-crown-kicker">Quick capture rail</p>
              <button
                className="bo-link w-full justify-center"
                onClick={() =>
                  void addOutreachDraft({
                    category: 'follow-up',
                    targetName: data.contacts[0]?.name ?? 'Contact',
                    company: data.contacts[0]?.company ?? 'Company',
                    role: data.contacts[0]?.role ?? 'Role',
                    messageBody: 'Quick follow-up from the cockpit.',
                    outreachGoal: 'Book next step',
                    tone: 'Clear and concise',
                    notes: 'Created from quick capture rail'
                  })
                }
              >
                New outreach
              </button>
              <button
                className="bo-link w-full justify-center"
                onClick={() =>
                  void addPublishingDraft({
                    title: 'Quick ship slot',
                    body: 'Capture one insight, outcome, or launch update before it disappears.'
                  })
                }
              >
                New post draft
              </button>
              <button
                className="bo-link w-full justify-center"
                onClick={() =>
                  void addNote({
                    title: 'Quick field note',
                    detail: 'Capture one operating insight before context disappears.'
                  })
                }
              >
                Add note
              </button>
              <button className="bo-link w-full justify-center" onClick={() => setPaletteOpen(true)}>
                Open command palette
              </button>
            </article>

            <article className="bo-card space-y-2 text-xs">
              <p className="bo-crown-kicker">Cadence snapshot</p>
              <p className="text-textMuted">
                Focus block:{' '}
                <span className="font-medium text-text">
                  {cadencePlan.blocks[0]?.title ?? 'No active block'}
                </span>
              </p>
              <p className="text-textMuted">
                Managerial load {notificationDigest.managerialActions.length} · Technical load{' '}
                {notificationDigest.technicalActions.length}
              </p>
              <div className="space-y-1">
                {executeNowItems.slice(0, 3).map((item) => (
                  <button
                    key={`rail-${item.id}`}
                    className={`w-full rounded-lg border px-2 py-1 text-left text-[11px] text-textMuted hover:text-text ${
                      item.heat >= 85
                        ? 'border-danger/40 bg-dangerSoft/10 hover:border-danger/60'
                        : item.heat >= 70
                          ? 'border-warning/40 bg-warningSoft/10 hover:border-warning/60'
                          : 'border-border/80 bg-bg/55 hover:border-primary/45'
                    }`}
                    onClick={() => navigateToSection(item.sectionId)}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
              <button className="bo-link w-full justify-center" onClick={() => navigateToSection('today')}>
                Open command deck
              </button>
            </article>
          </div>
        </aside>
      </div>
      </div>

      {paletteOpen ? (
        <div className="bo-system-overlay bo-system-overlay--soft fixed inset-0 z-50 flex min-h-0 items-start justify-center overflow-y-auto p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Command palette">
          <div
            ref={paletteRef}
            tabIndex={-1}
            className="bo-system-sheet bo-system-sheet--compact mx-auto my-auto w-full max-w-2xl rounded-2xl border p-3"
          >
            <p className="text-xs text-textMuted">
              Operator shortcuts · Ctrl/Cmd+K palette · Alt+M compass · Alt+1–4 area jumps · / opens palette. With
              unified scroll, the compass scrolls to anchors; in section mode it swaps the mounted area.
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <button className="bo-link" onClick={() => void addPublishingDraft({ title: 'Quick ship slot', body: 'Capture one insight, outcome, or launch update before it disappears.' })}>New publishing draft</button>
              <button className="bo-link" onClick={() => void addOutreachDraft({ category: 'follow-up', targetName: data.contacts[0]?.name ?? 'Contact', company: data.contacts[0]?.company ?? 'Company', role: data.contacts[0]?.role ?? 'Role', messageBody: 'Quick follow-up from the cockpit.', outreachGoal: 'Book next step', tone: 'Clear and concise', notes: 'Created via operator shortcuts' })}>New outreach draft</button>
              <button className="bo-link" onClick={() => void addNote({ title: 'Quick field note', detail: 'Capture one operating insight before context disappears.' })}>Add field note</button>
              <button className="bo-link" onClick={() => void (async () => { const payload = await exportWorkspace(); await navigator.clipboard.writeText(payload); })()}>Copy full workspace JSON</button>
              <button
                className="bo-link md:col-span-2"
                onClick={() => {
                  navigateToSection('connections');
                  setPaletteOpen(false);
                }}
              >
                Jump to connections
              </button>
              <button
                type="button"
                className="bo-link md:col-span-2"
                onClick={() => {
                  setCockpitOverlay('help');
                  setPaletteOpen(false);
                }}
              >
                Open Knowledge Center
              </button>
            </div>
            <button className="bo-link mt-3 w-full" onClick={() => setPaletteOpen(false)}>Close</button>
          </div>
        </div>
      ) : null}
    </main>

    <RightPillNavDock
      hostSurface="dashboard"
      activeSectionId={activeSectionId}
      onSelectItem={handleCockpitNavigation}
      closedFocusLabel={activeNavItem?.label}
    />

    {cockpitOverlay ? (
      <CockpitSurfaceOverlay
        title={cockpitOverlay === 'help' ? 'Knowledge Center' : 'Quick settings'}
        open
        onClose={() => setCockpitOverlay(null)}
      >
        {cockpitOverlay === 'help' ? (
          <KnowledgeCenterBody topicLinkMode="embedded-hash" />
        ) : (
          <CockpitSettingsQuickPanel
            data={data}
            onThemeChange={(theme) => void setTheme(theme)}
            onUpdateVisualSettings={updateVisualSettings}
            onUpdateCockpitPreferences={updateCockpitPreferences}
            onOpenFullSettings={() => {
              setCockpitOverlay(null);
              openFullSettingsWindow();
            }}
            onJumpToConnections={() => {
              setCockpitOverlay(null);
              navigateToSection('connections');
            }}
          />
        )}
      </CockpitSurfaceOverlay>
    ) : null}
    </>
  );
}
