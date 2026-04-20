import { useMemo, useState } from 'react';
import {
  Activity,
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  CircleAlert,
  Copy,
  Edit3,
  FileText,
  Inbox,
  Plus,
  Search,
  Sparkles,
  Workflow
} from 'lucide-react';
import {
  ActivityItem,
  AppShell,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  ContactCard,
  ContentItemCard,
  Divider,
  Drawer,
  EmptyState,
  IconButton,
  InlineAlert,
  Input,
  LoadingSkeleton,
  Modal,
  OpportunityCard,
  PageHeader,
  Panel,
  PipelineColumn,
  QuickActionTile,
  ReminderItem,
  ScheduledTaskRow,
  SectionHeader,
  Select,
  Spinner,
  StatCard,
  Switch,
  Tabs,
  Textarea,
  Toast,
  ToastViewport
} from '../../shared/ui/components';

type DemoTab = 'overview' | 'workflow' | 'feedback';

export function ComponentLibraryShowcase() {
  const [activeTab, setActiveTab] = useState<DemoTab>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [switchEnabled, setSwitchEnabled] = useState(true);
  const [checkEnabled, setCheckEnabled] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [notes, setNotes] = useState('Capture execution notes and operator context.');
  const [statusFilter, setStatusFilter] = useState('all');

  const toasts = useMemo(
    () => [
      { id: 'save', title: 'Workspace saved', message: 'All local changes were persisted.', tone: 'success' as const },
      { id: 'copy', title: 'Copied to clipboard', message: 'Draft block is ready to paste.', tone: 'info' as const }
    ],
    []
  );

  return (
    <section className="bo-card space-y-4">
      <SectionHeader
        title="Component Library Preview"
        helperText="Reusable operator-grade components using semantic BrandOps tokens."
        icon={<Sparkles size={18} strokeWidth={2} />}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
              Open Drawer
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
              Open Modal
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              Open Confirm
            </Button>
          </div>
        }
      />

      <AppShell className="bg-signal-grid">
        <PageHeader
          title="BrandOps UI Composition"
          description="Compact, keyboard-accessible, semantic-token components for premium daily execution flows."
          actions={
            <>
              <Button variant="primary" size="sm">
                Primary action
              </Button>
              <Button variant="ghost" size="sm">
                Secondary action
              </Button>
            </>
          }
        />

        <div className="mt-4">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as DemoTab)}
            items={[
              { key: 'overview', label: 'Today' },
              { key: 'workflow', label: 'Workflow' },
              { key: 'feedback', label: 'Feedback' }
            ]}
          />
        </div>

        {activeTab === 'overview' ? (
          <div
            role="tabpanel"
            id="tabpanel-overview"
            aria-labelledby="tab-overview"
            className="mt-4 space-y-4"
          >
            <Panel
              title="Primitives"
              description="Foundational controls with consistent states and semantic styling."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  leadingIcon={<Search size={14} />}
                  placeholder="Search drafts, contacts, and tasks"
                />
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  options={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'ready', label: 'Ready' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'blocked', label: 'Blocked' }
                  ]}
                />
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  footer={
                    <div className="flex items-center justify-between">
                      <span>Local notes only</span>
                      <span>{notes.length} chars</span>
                    </div>
                  }
                  className="md:col-span-2"
                />
                <Checkbox
                  id="library-checkbox"
                  label="Enable quick copy actions"
                  description="Show copy shortcuts in workflow rows."
                  checked={checkEnabled}
                  onChange={(event) => setCheckEnabled(event.target.checked)}
                />
                <Switch
                  label="Enable smart reminders"
                  description="Keep scheduling deterministic and local."
                  checked={switchEnabled}
                  onCheckedChange={setSwitchEnabled}
                />
              </div>

              <Divider />

              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">neutral</Badge>
                <Badge tone="primary">primary</Badge>
                <Badge tone="success">success</Badge>
                <Badge tone="warning">warning</Badge>
                <Badge tone="danger">danger</Badge>
                <Badge tone="info">info</Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="secondary">
                  Secondary
                </Button>
                <Button size="sm" variant="outline">
                  Outline
                </Button>
                <Button size="sm" variant="ghost">
                  Ghost
                </Button>
                <Button size="sm" variant="success">
                  Success
                </Button>
                <Button size="sm" variant="danger">
                  Danger
                </Button>
                <IconButton icon={<Copy size={14} />} label="Copy" tooltip="Copy block" />
                <IconButton icon={<Edit3 size={14} />} label="Edit" tooltip="Edit block" />
              </div>
            </Panel>

            <div className="grid gap-3 md:grid-cols-3">
              <StatCard label="Posts in queue" value={12} delta="+2 today" deltaTone="success" icon={<FileText size={14} />} />
              <StatCard label="Open opportunities" value={7} delta="2 due soon" deltaTone="warning" icon={<BriefcaseBusiness size={14} />} />
              <StatCard label="Follow-up debt" value={3} delta="Needs action" deltaTone="danger" icon={<BellRing size={14} />} />
            </div>

            <Card title="Empty state pattern" subtitle="Use clear one-line guidance + one strong action.">
              <EmptyState
                icon={<Inbox size={18} />}
                title="No outreach drafts yet"
                description="Capture one draft and keep your operator cadence consistent."
                actionLabel="Create first draft"
                onAction={() => setModalOpen(true)}
              />
            </Card>
          </div>
        ) : null}

        {activeTab === 'workflow' ? (
          <div
            role="tabpanel"
            id="tabpanel-workflow"
            aria-labelledby="tab-workflow"
            className="mt-4 space-y-4"
          >
            <SectionHeader
              title="Workflow surfaces"
              helperText="Cards, rows, columns, and tiles that support daily execution."
              icon={<Workflow size={18} strokeWidth={2} />}
              count={9}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <QuickActionTile
                icon={<Sparkles size={14} />}
                title="Draft LinkedIn post"
                description="Capture one insight, turn into post-ready block, and queue it."
                onClick={() => setModalOpen(true)}
              />
              <QuickActionTile
                icon={<CalendarClock size={14} />}
                title="Plan posting window"
                description="Set due time, reminder, and completion state in one place."
                onClick={() => setDrawerOpen(true)}
              />
            </div>

            <ActivityItem
              icon={<Activity size={12} />}
              markerTone="info"
              title="Outreach status updated"
              detail="Morgan Lee moved to replied and next call is scheduled."
              meta="3 minutes ago"
              linkedEntity={<Badge tone="primary">Opportunity #27</Badge>}
            />

            <ContentItemCard
              contentType="Post Draft"
              title="How technical founders build trust in public"
              preview="Trust compounds when operators share execution artifacts, not abstract promises. Show your process, show your tradeoffs, and show your outcomes."
              tags={['branding', 'technical', 'outreach']}
              status="ready"
              statusTone="success"
              updatedAt="Today 8:40 AM"
            />

            <ScheduledTaskRow
              title="Publish system architecture post"
              dueAt="Today 4:30 PM"
              linkedEntity="Content item · architecture post"
              status="due-soon"
              statusTone="warning"
              reminderState="set for 30m before"
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <PipelineColumn stageTitle="Discovery" count={2} onAdd={() => setDrawerOpen(true)}>
                <OpportunityCard
                  title="SignalForge AI hardening sprint"
                  companyOrContact="SignalForge · Morgan Lee"
                  type="consulting"
                  stage="discovery"
                  stageTone="primary"
                  nextAction="Send scoped architecture memo"
                  dueDate="Tue 10:00 AM"
                  linkedOutreachCount={2}
                />
              </PipelineColumn>

              <div className="space-y-3">
                <ContactCard
                  name="Morgan Lee"
                  role="CTO"
                  company="SignalForge"
                  source="LinkedIn"
                  followUpStatus="Follow-up due tomorrow"
                  followUpTone="warning"
                  notesPreview="Prefers concise decision memos and architecture call before budget sign-off."
                />
                <ReminderItem
                  title="Send follow-up recap"
                  dueTime="Tomorrow 9:00 AM"
                  type="outreach"
                  urgency="medium"
                />
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'feedback' ? (
          <div
            role="tabpanel"
            id="tabpanel-feedback"
            aria-labelledby="tab-feedback"
            className="mt-4 space-y-4"
          >
            <InlineAlert
              tone="info"
              title="Scheduler reliability note"
              message="Reminders are local and deterministic while the browser is running. Missed tasks are surfaced in the next session."
            />
            <InlineAlert
              tone="warning"
              title="Import validation required"
              message="Malformed JSON snapshots are rejected with recovery guidance."
              actionLabel="Review format"
              onAction={() => setModalOpen(true)}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Card title="Loading skeleton">
                <div className="space-y-2">
                  <LoadingSkeleton className="h-5 w-3/4" />
                  <LoadingSkeleton className="h-4 w-full" />
                  <LoadingSkeleton className="h-4 w-5/6" />
                </div>
              </Card>
              <Card title="Spinner">
                <div className="flex items-center gap-3">
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                </div>
              </Card>
              <Card title="Status markers">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success">Saved</Badge>
                  <Badge tone="warning">Pending</Badge>
                  <Badge tone="danger">Blocked</Badge>
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </AppShell>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Edit opportunity"
        description="Drawer is preferred for record editing workflows."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDrawerOpen(false)}>Save changes</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input leadingIcon={<BriefcaseBusiness size={14} />} defaultValue="SignalForge hardening sprint" />
          <Select
            defaultValue="discovery"
            options={[
              { value: 'prospect', label: 'Prospect' },
              { value: 'discovery', label: 'Discovery' },
              { value: 'proposal', label: 'Proposal' }
            ]}
          />
          <Textarea
            defaultValue="Draft architecture memo and align technical scope."
            footer={<span>Private operator notes</span>}
          />
        </div>
      </Drawer>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create task template"
        description="Use modals for focused, short interactions."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Create template</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input leadingIcon={<Plus size={14} />} placeholder="Template title" />
          <Textarea placeholder="Describe what this template should do..." />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Archive this record?"
        description="This action removes it from active workflows. You can still restore it later."
        confirmLabel="Archive"
        cancelLabel="Keep active"
        tone="danger"
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
        details={
          <div className="inline-flex items-center gap-1 text-meta">
            <CircleAlert size={13} />
            This operation is intentional and reversible.
          </div>
        }
      />

      <ToastViewport>
        {toasts.map((toast) => (
          <Toast key={toast.id} title={toast.title} message={toast.message} tone={toast.tone} />
        ))}
      </ToastViewport>
    </section>
  );
}
