import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition } from '../../core/types';

/**
 * A field-level `name` override has never worked (docs/follow-ups.md section 1) and is
 * deprecated ahead of removal. The JSDoc says so; the development warning is what makes
 * the breakage visible at runtime, where it otherwise reads as a server bug.
 */

const useFormDefinition = createFormDefinitionHook({});

function Probe({ definition }: { definition: FormDefinition }) {
  const { RenderedForm } = useFormDefinition(definition, {});
  return <RenderedForm />;
}

const nameWarnings = (warn: { mock: { calls: unknown[][] } }) =>
  warn.mock.calls.filter(([message]) => String(message).includes('`name` different'));

describe('the deprecated field-level name override', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns in development, naming the offending field', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Probe definition={{ email: { type: 'text', name: 'contactEmail' } }} />
    );

    const warnings = nameWarnings(warn);
    expect(warnings).toHaveLength(1);
    expect(String(warnings[0][0])).toContain('`email`');
  });

  it('stays quiet when name matches the key or is omitted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Probe
        definition={{
          email: { type: 'text', name: 'email' },
          plain: { type: 'text' },
        }}
      />
    );

    expect(nameWarnings(warn)).toHaveLength(0);
  });
});
