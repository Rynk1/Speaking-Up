import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { Badge, Button, Card, ConsoleLayout, EmptyState, InlineAlert, StatCard, StatusBadge, Td, Th, WorkflowStepper, SlaMeter, toneClasses } from '../src/components/ui';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { MemoryRouter } from 'react-router-dom';
import {
  evaluateSla,
  getInboxStateMeta,
  getModerationMeta,
  getPriorityMeta,
  getRoleMeta,
  getJobMeta,
  getDelegationMeta,
  getAbuseReportMeta,
  INBOX_WORKFLOW_STAGES
} from '../src/utils/status';

describe('Console design system primitives', () => {
  it('renders a button with loading state and accessibility attributes', () => {
    const html = renderToStaticMarkup(React.createElement(Button, { variant: 'primary', loading: true }, 'Save'));
    expect(html).toContain('disabled');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('animate-spin');
  });

  it('renders an icon button with an accessible label', () => {
    const html = renderToStaticMarkup(
      React.createElement(Button, { variant: 'danger', size: 'xs', 'aria-label': 'Remove report' }, 'Remove')
    );
    expect(html).toContain('aria-label="Remove report"');
    expect(html).toContain('bg-red-600');
  });

  it('maps every status tone to a defined class set', () => {
    for (const tone of Object.keys(toneClasses)) {
      expect(toneClasses[tone as keyof typeof toneClasses]).toMatch(/border-/);
    }
  });

  it('renders a StatusBadge from a StatusMeta with the mapped tone', () => {
    const html = renderToStaticMarkup(React.createElement(StatusBadge, { meta: getModerationMeta('removed') }));
    expect(html).toContain('Removed');
    expect(html).toContain('text-red-300');
  });

  it('renders cards, stat cards, alerts and empty states without throwing', () => {
    expect(renderToStaticMarkup(React.createElement(Card, null, 'body'))).toContain('body');
    expect(renderToStaticMarkup(React.createElement(StatCard, { label: 'Users', value: 42, tone: 'warning' }))).toContain('42');
    expect(renderToStaticMarkup(React.createElement(InlineAlert, { tone: 'danger', title: 'Oops', children: 'detail' }))).toContain('role="alert"');
    expect(renderToStaticMarkup(React.createElement(EmptyState, { title: 'Nothing here' }))).toContain('Nothing here');
    expect(renderToStaticMarkup(React.createElement(Badge, { tone: 'info', children: 'Email' }))).toContain('Email');
    expect(renderToStaticMarkup(React.createElement('table', null, React.createElement('thead', null, React.createElement('tr', null, React.createElement(Th, { align: 'right' }, 'Actions')))))).toContain('text-right');
    expect(renderToStaticMarkup(React.createElement('table', null, React.createElement('tbody', null, React.createElement('tr', null, React.createElement(Td, null, 'cell')))))).toContain('cell');
  });

  it('renders the workflow stepper with the active stage marked as the current step', () => {
    const html = renderToStaticMarkup(React.createElement(WorkflowStepper, { currentState: 'UNDER_REVIEW' }));
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('New');
    expect(html).toContain('Resolved');
  });

  it('renders an SLA meter that flags a breach', () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const html = renderToStaticMarkup(React.createElement(SlaMeter, { dueAt: past }));
    expect(html).toContain('overdue');
    expect(html).toContain('text-red-400');
  });
});

describe('Status source of truth', () => {
  it('gives every workflow stage a label and a rank', () => {
    for (const stage of INBOX_WORKFLOW_STAGES) {
      const meta = getInboxStateMeta(stage);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(typeof meta.rank).toBe('number');
    }
  });

  it('falls back gracefully for unknown statuses', () => {
    expect(getModerationMeta('some_new_state').label).toBe('Some New State');
    expect(getPriorityMeta(undefined).label).toBe('Routine');
    expect(getRoleMeta('ADMIN').tone).toBe('danger');
    expect(getJobMeta('FAILED').tone).toBe('danger');
    expect(getDelegationMeta('PENDING').tone).toBe('warning');
    expect(getAbuseReportMeta('RESOLVED').tone).toBe('success');
  });

  it('classifies SLA windows into on-track, at-risk, due-soon and breached', () => {
    const now = Date.now();
    const iso = (ms: number) => new Date(now + ms).toISOString();
    const created = iso(-1 * 60 * 60 * 1000);

    expect(evaluateSla(iso(10 * 60 * 60 * 1000), created).state).toBe('on-track');
    expect(evaluateSla(iso(30 * 60 * 1000), created).state).toBe('at-risk');
    expect(evaluateSla(iso(10 * 60 * 1000), created).state).toBe('due-soon');
    expect(evaluateSla(iso(-60 * 1000), created).state).toBe('breached');
    expect(evaluateSla(null, created).state).toBe('none');
  });
});

describe('ConsoleLayout shell', () => {
  it('renders grouped sections, brand, header and the active label in the breadcrumb', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConsoleLayout<'overview' | 'inbox'>, {
        brandTitle: 'STATE DESK PORTAL',
        brandSubtitle: 'Coordination Console',
        sections: [
          { label: 'Operations', items: [{ id: 'overview' as const, label: 'Overview', icon: React.createElement('span', null, 'o') }] },
          { label: 'Work', items: [{ id: 'inbox' as const, label: 'Inbox', icon: React.createElement('span', null, 'i'), badge: 4 }] }
        ],
        activeTab: 'inbox',
        onTabChange: () => {},
        headerTitle: 'Work Inbox',
        children: React.createElement('div', null, 'console-body')
      })
    );
    expect(html).toContain('STATE DESK PORTAL');
    expect(html).toContain('Operations');
    expect(html).toContain('Work Inbox');
    expect(html).toContain('Inbox');
    expect(html).toContain('console-body');
    expect(html).toContain('aria-current="page"');
  });

  it('falls back to a flat items list when no sections are given', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConsoleLayout<'only'>, {
        brandTitle: 'PRESS DESK',
        brandSubtitle: 'Wire',
        items: [{ id: 'only' as const, label: 'Only Tab', icon: React.createElement('span', null, 'x') }],
        activeTab: 'only',
        onTabChange: () => {},
        headerTitle: 'Only',
        children: null
      })
    );
    expect(html).toContain('Only Tab');
  });
});

describe('ProtectedRoute auth gating', () => {
  const element = React.createElement('div', null, 'secret-console');

  it('holds the route (no redirect) while the session is still being validated', () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null,
        React.createElement(ProtectedRoute, { userRole: 'citizen', isAuthLoading: true, allowedRoles: ['institution_rep', 'admin'], children: element })
      )
    );
    expect(html).toContain('Verifying access');
    expect(html).not.toContain('secret-console');
  });

  it('renders the guarded content once loading settles for an allowed role', () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null,
        React.createElement(ProtectedRoute, { userRole: 'institution_rep', isAuthLoading: false, allowedRoles: ['institution_rep', 'admin'], children: element })
      )
    );
    expect(html).toContain('secret-console');
  });
});
