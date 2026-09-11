import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

/**
 * The package ships two entry points built as separate bundles, so the module-level
 * registration maps used to exist once per bundle: a kind registered through the client
 * entry was unknown to the server data validator (use-form-definition-dev#9). Custom
 * registrations now live on `globalThis` under a `Symbol.for` key. A fresh module graph
 * (what a second bundle is, at runtime) must see what the first one registered.
 */
describe('registrations shared across library copies', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('a kind registered in one module graph validates in another', async () => {
    const first = await import('../../core/schema/field-generators');
    first.registerFieldType('csv-list', {
      generator: () => z.string().transform((v) => v.split(',').map((s) => s.trim())),
      defaultValue: '',
    });

    vi.resetModules();
    const second = await import('../../core/schema/field-generators');
    const secondDefaults = await import('../../core/default-values');
    expect(second).not.toBe(first);

    const schema = second.getFieldSchemaGenerator('csv-list')({ type: 'csv-list' });
    expect(schema.parse('a, b')).toEqual(['a', 'b']);
    expect(secondDefaults.getDefaultValueForField({ type: 'csv-list' })).toBe('');
  });

  it('the server entry sees a kind registered through the client entry', async () => {
    const client = await import('../../index');
    client.registerFieldType('visibility-shared', { valueType: 'boolean' });

    vi.resetModules();
    const server = await import('../../server');
    const validate = server.generateDataValidator({ isPublic: { type: 'visibility-shared' } });
    const data = new FormData();
    data.set('isPublic', 'on');
    const result = validate(data);
    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ isPublic: true });
  });

  it('a registration overrides a built-in kind of the same name, everywhere', async () => {
    const first = await import('../../core/schema/field-generators');
    first.registerFieldSchemaGenerator('textarea', () => z.string().max(3, { message: 'short' }));

    vi.resetModules();
    const second = await import('../../core/schema/schema-builder');
    const result = second.generateSchema({ note: { type: 'textarea' } }).safeParse({ note: 'too long' });
    expect(result.success).toBe(false);

    // Leave the built-in as we found it for the other suites.
    delete (globalThis as any)[Symbol.for('use-form-definition:field-schema-generators')].textarea;
  });

  it('a pattern registered in one module graph validates in another, and registering it again is a no-op', async () => {
    const first = await import('../../validation/patterns');
    first.registerPattern('shared-letters', { pattern: /^[a-z]+$/, message: 'letters only' });

    vi.resetModules();
    const second = await import('../../validation/patterns');
    expect(second.getPattern('shared-letters')?.message).toBe('letters only');
    expect(second.getAvailablePatterns()).toContain('shared-letters');

    // The store outlives a hot reload and is shared by both entry points, so the same
    // registration running again must not throw; a different one under the name must.
    expect(() =>
      second.registerPattern('shared-letters', { pattern: /^[a-z]+$/, message: 'letters only' })
    ).not.toThrow();
    expect(() =>
      second.registerPattern('shared-letters', { pattern: /^[a-z]+$/, message: 'other' })
    ).toThrow('already registered');

    const generators = await import('../../core/schema/field-generators');
    const schema = generators.getFieldSchemaGenerator('text')({ type: 'text', validation: { pattern: 'shared-letters' } });
    expect(schema.safeParse('abc').success).toBe(true);
    expect(schema.safeParse('123').success).toBe(false);
  });

  it('derive transforms and mirrors are shared the same way', async () => {
    const first = await import('../../core/derive');
    first.registerDeriveTransform('shout', (v) => String(v).toUpperCase());
    const firstMirror = await import('../../core/mirror');
    firstMirror.registerFieldTypeMirror('shout', (value) => `shout:${String(value)}`);

    vi.resetModules();
    const second = await import('../../core/derive');
    expect(second.resolveDeriveTransform({ type: 'shout' })('hi')).toBe('HI');
    const secondMirror = await import('../../core/mirror');
    expect(secondMirror.mirrorWireValues('shout', 'x')).toEqual(['shout:x']);
  });
});
