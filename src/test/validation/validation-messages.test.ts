import { describe, it, expect } from 'vitest';
import { createMessage, getValidationRule } from '../../core/validation';
import {
  defaultValidationMessages,
  translateValidationMessage,
} from '../../core/validation-messages';

const decode = (message: string): [string, Record<string, unknown>] =>
  JSON.parse(message);

describe('getValidationRule message encoding', () => {
  describe('value-aware string validators', () => {
    it('threads the constraint value into contains/startsWith/endsWith messages', () => {
      expect(decode(getValidationRule('foo', 'contains').message)).toEqual([
        'contains',
        { value: 'foo' },
      ]);
      expect(decode(getValidationRule('http://', 'startsWith').message)).toEqual([
        'startsWith',
        { value: 'http://' },
      ]);
      expect(decode(getValidationRule('.com', 'endsWith').message)).toEqual([
        'endsWith',
        { value: '.com' },
      ]);
    });

    it('still returns the raw value alongside the message', () => {
      const rule = getValidationRule('foo', 'contains');
      expect(rule.value).toBe('foo');
    });

    it('honours an explicit message object over the value default', () => {
      const rule = getValidationRule(
        { value: 'foo', message: { key: 'mustContainFoo', options: { value: 'foo' } } },
        'contains'
      );
      expect(decode(rule.message)).toEqual([
        'mustContainFoo',
        { value: 'foo' },
      ]);
    });
  });

  describe('count-aware validators are unchanged', () => {
    it('threads count into minLength/maxLength messages', () => {
      expect(decode(getValidationRule(5, 'minLength').message)).toEqual([
        'minLength',
        { count: 5 },
      ]);
    });
  });

  describe('self-contained boolean validators', () => {
    it('emit the bare key (no useful options) for noWhitespace/uppercase/lowercase', () => {
      expect(decode(getValidationRule(true, 'noWhitespace').message)).toEqual([
        'noWhitespace',
        {},
      ]);
      expect(decode(getValidationRule(true, 'uppercase').message)).toEqual([
        'uppercase',
        {},
      ]);
      expect(decode(getValidationRule(true, 'lowercase').message)).toEqual([
        'lowercase',
        {},
      ]);
    });
  });
});

describe('defaultValidationMessages for string validators', () => {
  it('renders the constraint value in contains/startsWith/endsWith', () => {
    expect(translateValidationMessage('contains', { value: 'foo' })).toBe(
      'Must contain "foo"'
    );
    expect(translateValidationMessage('startsWith', { value: 'http://' })).toBe(
      'Must start with "http://"'
    );
    expect(translateValidationMessage('endsWith', { value: '.com' })).toBe(
      'Must end with ".com"'
    );
  });

  it('provides static messages for noWhitespace/uppercase/lowercase', () => {
    expect(translateValidationMessage('noWhitespace')).toBe('Cannot contain spaces');
    expect(translateValidationMessage('uppercase')).toBe('Must be uppercase');
    expect(translateValidationMessage('lowercase')).toBe('Must be lowercase');
  });

  it('no longer falls back to a humanized key for these types', () => {
    // Before: missing entries humanized "contains" -> "Contains" (useless).
    expect(defaultValidationMessages.contains).toBeDefined();
    expect(translateValidationMessage('contains', { value: 'x' })).not.toBe(
      'Contains'
    );
  });
});

describe('end-to-end message contract via createMessage', () => {
  it('contains produces a decodable, translatable message', () => {
    const message = createMessage('contains', { value: 'foo' });
    const [key, options] = decode(message);
    expect(translateValidationMessage(key, options)).toBe('Must contain "foo"');
  });
});
