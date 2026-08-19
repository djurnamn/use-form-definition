import { describe, it, expect } from 'vitest';
import { extractSubmittedValues } from '../../server';

/**
 * What an action should echo back as `FormActionResult.values`.
 *
 * This is not cosmetic: `useFormDefinition` spreads `values` over the generated defaults to
 * seed `useForm()` on a no-JS validation-error round trip, so anything echoed lands in the
 * form model. React's `$ACTION*` bookkeeping rides every no-JS submit.
 */
describe('extractSubmittedValues', () => {
  function post(entries: Record<string, string>) {
    const formData = new FormData();
    for (const [name, value] of Object.entries(entries)) formData.set(name, value);
    return formData;
  }

  it('returns the form’s own fields untouched', () => {
    expect(extractSubmittedValues(post({ name: 'Astrid', nickname: '' }))).toEqual({
      name: 'Astrid',
      nickname: '',
    });
  });

  it('drops React’s progressive-enhancement bookkeeping', () => {
    const formData = post({
      $ACTION_REF_1: '',
      '$ACTION_1:0': '["$@1"]',
      $ACTION_KEY: 'k1234',
      name: 'Astrid',
    });

    expect(extractSubmittedValues(formData)).toEqual({ name: 'Astrid' });
  });

  it('keeps a field whose name merely resembles the reserved ones', () => {
    // The guard is a `$ACTION` prefix - a field called `action` or `transaction` is an
    // ordinary field.
    const formData = post({ action: 'archive', transaction: '42', name: 'Astrid' });

    expect(extractSubmittedValues(formData)).toEqual({
      action: 'archive',
      transaction: '42',
      name: 'Astrid',
    });
  });

  it('returns an empty object for a post that was nothing but bookkeeping', () => {
    expect(extractSubmittedValues(post({ $ACTION_KEY: 'k1234' }))).toEqual({});
  });
});
