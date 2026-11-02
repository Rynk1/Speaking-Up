import { describe, it, expect } from 'vitest';
import { camelize } from '../src/services/api';

// Coordination endpoints return raw SQLite rows (snake_case). The API client
// normalizes them to the camelCase shape the UI types and components consume.
// These tests lock that contract so a casing regression is caught immediately.
describe('Coordination API payload casing contract', () => {
  it('converts snake_case keys to camelCase recursively', () => {
    const row = {
      id: 'inb-1',
      institution_id: 'ghana-police-service',
      item_priority: 'URGENT',
      priority_score: 75,
      action_state: 'NEW',
      assigned_officer_user_id: 'user-1',
      due_at: '2026-01-01T00:00:00.000Z',
      mirror_of_item_id: null,
      escalation_level: 0,
      signal_summary_json: '{"count":2}'
    };

    const out = camelize<any>(row);
    expect(out.institutionId).toBe('ghana-police-service');
    expect(out.itemPriority).toBe('URGENT');
    expect(out.priorityScore).toBe(75);
    expect(out.actionState).toBe('NEW');
    expect(out.assignedOfficerUserId).toBe('user-1');
    expect(out.dueAt).toBe('2026-01-01T00:00:00.000Z');
    expect(out.mirrorOfItemId).toBeNull();
    expect(out.escalationLevel).toBe(0);
    expect(out.institution_id).toBeUndefined();
  });

  it('walks arrays and nested objects without touching already-camelCase keys', () => {
    const payload = {
      items: [{ post_title: 'Flooding', to_institution_name: 'NADMO' }],
      totalCount: 1,
      nextCursor: null
    };

    const out = camelize<any>(payload);
    expect(out.items[0].postTitle).toBe('Flooding');
    expect(out.items[0].toInstitutionName).toBe('NADMO');
    expect(out.totalCount).toBe(1);
    expect(out.nextCursor).toBeNull();
  });

  it('leaves primitive values and dates untouched', () => {
    expect(camelize(42)).toBe(42);
    expect(camelize('already_camel_ok')).toBe('already_camel_ok');
    const d = new Date();
    expect(camelize(d)).toBe(d);
  });
});
