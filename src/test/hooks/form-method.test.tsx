import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition, FormActionResult } from '../../core/types';

/**
 * The rendered `<form>`'s `method`.
 *
 * A client-only form (wired with `onSubmit`, no server action) gets no `action`, so before
 * React hydrates the browser's default method applies to a native submit. That default is
 * GET, which serializes every field into the URL - a credential leak for any sign-in or
 * password-reset form, reaching browser history, the `Referer` header and access logs.
 * Client-only forms therefore default to POST, with `method="get"` available for the forms
 * where a query string is the point.
 */

const useFormDefinition = createFormDefinitionHook({});

const signInDefinition: FormDefinition = {
  email: { type: 'email', validation: { required: true } },
  password: { type: 'password', validation: { required: true } },
};

function ClientOnlyForm({ method }: { method?: 'get' | 'post' }) {
  const { RenderedForm } = useFormDefinition(signInDefinition);
  return <RenderedForm onSubmit={() => {}} method={method} />;
}

function ServerActionForm({ method }: { method?: 'get' | 'post' }) {
  const serverAction = async (): Promise<FormActionResult> => ({ success: true });
  const { RenderedForm } = useFormDefinition(signInDefinition, { serverAction });
  return <RenderedForm method={method} />;
}

const formIn = (container: HTMLElement): HTMLFormElement => {
  const form = container.querySelector('form');
  if (!form) throw new Error('no form rendered');
  return form;
};

describe('rendered form method', () => {
  it('defaults a client-only form to POST, so a pre-hydration submit cannot put fields in the URL', () => {
    const { container } = render(<ClientOnlyForm />);
    // getAttribute, not `.method`: the DOM property normalizes an absent attribute to "get",
    // which would make the assertion pass even if nothing were emitted.
    expect(formIn(container).getAttribute('method')).toBe('post');
  });

  it('lets a form opt into GET, for search and filter forms', () => {
    const { container } = render(<ClientOnlyForm method="get" />);
    expect(formIn(container).getAttribute('method')).toBe('get');
  });

  it('leaves a server-action form alone, so React keeps owning its POST endpoint', () => {
    const { container } = render(<ServerActionForm />);
    const form = formIn(container);
    // React renders its own action wiring here; the library must not emit a competing method.
    expect(form.getAttribute('method')).not.toBe('get');
  });

  it('ignores an explicit method on a server-action form rather than breaking its action', () => {
    const { container } = render(<ServerActionForm method="get" />);
    expect(formIn(container).getAttribute('method')).not.toBe('get');
  });
});
