import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import { generateDataValidator } from '../../core/schema/data-validator';
import type { FormDefinition, FormActionResult } from '../../core/types';

/**
 * Sections with value mirrors, end to end, against the case the concept exists for: a
 * form split across tabs where only the active tab renders controls. The inactive tab's
 * fields render as hidden value mirrors, so the DOM's FormData is complete by
 * construction - per field, natively encoded, on both submit paths.
 */

const useFormDefinition = createFormDefinitionHook({});

const profileDefinition: FormDefinition = {
  name: { type: 'text', validation: { required: true } },
  nickname: { type: 'text' },
  bio: { type: 'text' },
  handle: { type: 'text', validation: { required: true } },
  subscribed: { type: 'checkbox' },
};

type Action = (prev: FormActionResult | null, fd: FormData) => Promise<FormActionResult>;

function TabbedProfileForm({ serverAction }: { serverAction: Action }) {
  const { RenderedForm, RenderedSection, RenderedField } = useFormDefinition(
    profileDefinition,
    { serverAction }
  );
  const [tab, setTab] = useState<'one' | 'two'>('one');

  return (
    <RenderedForm currentSection={tab}>
      <button type="button" onClick={() => setTab('one')}>
        Tab one
      </button>
      <button type="button" onClick={() => setTab('two')}>
        Tab two
      </button>
      <RenderedSection name="one">
        <RenderedField name="name" />
        <RenderedField name="nickname" />
      </RenderedSection>
      <RenderedSection name="two">
        <RenderedField name="bio" />
        <RenderedField name="handle" />
        <RenderedField name="subscribed" />
      </RenderedSection>
      <button type="submit">Submit</button>
    </RenderedForm>
  );
}

const field = (container: HTMLElement, name: string) =>
  container.querySelector(
    `input[name="${name}"]:not([data-ufd-mirror])`
  ) as HTMLInputElement;

const mirrors = (container: HTMLElement, name: string) =>
  Array.from(
    container.querySelectorAll(`input[name="${name}"][data-ufd-mirror]`)
  ) as HTMLInputElement[];

/**
 * Fill both tabs (checking the checkbox), end on tab one, submit. Tens of keystrokes
 * through userEvent: the tests that run this carry a 20s timeout for loaded machines.
 */
async function submitAcrossBothTabs() {
  const user = userEvent.setup();
  const received: FormData[] = [];
  const serverAction: Action = vi.fn(async (_prev, formData) => {
    received.push(formData);
    return { success: true };
  });

  const { container } = render(<TabbedProfileForm serverAction={serverAction} />);

  await user.type(field(container, 'name'), 'Astrid');
  await user.type(field(container, 'nickname'), 'Assi');

  await user.click(screen.getByRole('button', { name: 'Tab two' }));
  await user.type(field(container, 'bio'), 'Cartographer');
  await user.type(field(container, 'handle'), 'astrid');
  await user.click(container.querySelector('input[type="checkbox"]')!);

  await user.click(screen.getByRole('button', { name: 'Tab one' }));
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  await waitFor(() => expect(received.length).toBe(1));
  return { formData: received[0], container };
}

describe('sections with value mirrors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the whole form from a partial DOM - the inactive tab rides as mirrors', async () => {
    const { formData } = await submitAcrossBothTabs();

    const validated = generateDataValidator(profileDefinition)(formData);
    expect(validated.success).toBe(true);
    if (!validated.success) return;
    expect(validated.data).toMatchObject({
      name: 'Astrid',
      nickname: 'Assi',
      bio: 'Cartographer',
      handle: 'astrid',
      subscribed: true,
    });
  }, 20000);

  it('mirrors are per-field native entries, marked and hidden', async () => {
    const { container } = await submitAcrossBothTabs();

    // Back on tab one: tab two's fields exist only as mirrors.
    expect(field(container, 'bio')).toBeNull();
    const bioMirrors = mirrors(container, 'bio');
    expect(bioMirrors).toHaveLength(1);
    expect(bioMirrors[0].type).toBe('hidden');
    expect(bioMirrors[0].value).toBe('Cartographer');
  }, 20000);

  it('mirrors a checked checkbox as the presence pair and an unchecked one as ""', async () => {
    const { container } = await submitAcrossBothTabs();

    // Checked on tab two, now mirrored from tab one: "", "on" - last-wins parses true.
    expect(mirrors(container, 'subscribed').map((input) => input.value)).toEqual([
      '',
      'on',
    ]);

    // Uncheck it and come back: presence stays, value says false.
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Tab two' }));
    await user.click(container.querySelector('input[type="checkbox"]')!);
    await user.click(screen.getByRole('button', { name: 'Tab one' }));

    expect(mirrors(container, 'subscribed').map((input) => input.value)).toEqual(['']);
  }, 20000);

  it('renders every section as controls when no currentSection is given', () => {
    function AllVisible() {
      const { RenderedForm, RenderedSection, RenderedField } = useFormDefinition(
        profileDefinition,
        {}
      );
      return (
        <RenderedForm>
          <RenderedSection name="one">
            <RenderedField name="name" />
          </RenderedSection>
          <RenderedSection name="two">
            <RenderedField name="bio" />
          </RenderedSection>
        </RenderedForm>
      );
    }
    const { container } = render(<AllVisible />);

    expect(field(container, 'name')).not.toBeNull();
    expect(field(container, 'bio')).not.toBeNull();
    expect(container.querySelectorAll('[data-ufd-mirror]')).toHaveLength(0);
  });

  it('always renders content outside any section', async () => {
    function WithChrome() {
      const { RenderedForm, RenderedSection, RenderedField } = useFormDefinition(
        profileDefinition,
        {}
      );
      return (
        <RenderedForm currentSection="one">
          <RenderedSection name="one">
            <RenderedField name="name" />
          </RenderedSection>
          <RenderedSection name="two">
            <RenderedField name="bio" />
          </RenderedSection>
          <RenderedField name="nickname" />
        </RenderedForm>
      );
    }
    const { container } = render(<WithChrome />);

    expect(field(container, 'name')).not.toBeNull();
    expect(field(container, 'nickname')).not.toBeNull();
    expect(field(container, 'bio')).toBeNull();
    expect(mirrors(container, 'bio')).toHaveLength(1);
  });

  it('warns in development when currentSection matches no section, and mirrors everything', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    function Typoed() {
      const { RenderedForm, RenderedSection, RenderedField } = useFormDefinition(
        profileDefinition,
        {}
      );
      return (
        <RenderedForm currentSection="lorre">
          <RenderedSection name="one">
            <RenderedField name="name" />
          </RenderedSection>
        </RenderedForm>
      );
    }
    const { container } = render(<Typoed />);

    expect(field(container, 'name')).toBeNull();
    expect(mirrors(container, 'name')).toHaveLength(1);
    const warnings = warn.mock.calls.filter(([message]) =>
      String(message).includes('matches no section')
    );
    expect(warnings).toHaveLength(1);
  });

  it('keeps a mirror live when deriveFrom writes into it from another section', async () => {
    const derivedDefinition: FormDefinition = {
      name: { type: 'text', validation: { required: true } },
      slug: { type: 'text', deriveFrom: 'name' },
    };
    function DerivedAcrossSections() {
      const { RenderedForm, RenderedSection, RenderedField } = useFormDefinition(
        derivedDefinition,
        {}
      );
      return (
        <RenderedForm currentSection="main">
          <RenderedSection name="main">
            <RenderedField name="name" />
          </RenderedSection>
          <RenderedSection name="meta">
            <RenderedField name="slug" />
          </RenderedSection>
        </RenderedForm>
      );
    }
    const user = userEvent.setup();
    const { container } = render(<DerivedAcrossSections />);

    await user.type(field(container, 'name'), 'Iron Pact');

    // The default text-kind transform is identity; what is under test is that the WRITE
    // reaches a field whose control never mounted - the mirror's Controller keeps it live.
    await waitFor(() =>
      expect(mirrors(container, 'slug')[0]?.value).toBe('Iron Pact')
    );
  });
});
