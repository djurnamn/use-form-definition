import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  patterns,
  createPatternValidation,
  applyPatternValidation,
  registerPattern,
  getAvailablePatterns,
  getPattern,
  validatePattern,
} from '../../validation/patterns';

describe('Pattern Validation Rules', () => {
  describe('patterns object', () => {
    it('should contain all expected pattern definitions', () => {
      expect(patterns.email).toBeDefined();
      expect(patterns.url).toBeDefined();
      expect(patterns.phone).toBeDefined();
      expect(patterns.slug).toBeDefined();
      expect(patterns.username).toBeDefined();
      expect(patterns.alphanumeric).toBeDefined();
      expect(patterns.numeric).toBeDefined();
      expect(patterns.alpha).toBeDefined();
      expect(patterns.postalCode).toBeDefined();
      expect(patterns.hexColor).toBeDefined();
    });

    it('should have pattern and message for each definition', () => {
      Object.values(patterns).forEach(pattern => {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.message).toBe('string');
        expect(pattern.message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('email pattern validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first+last@subdomain.example.org',
        'test123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(patterns.email.pattern.test(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(patterns.email.pattern.test(email)).toBe(false);
      });
    });
  });

  describe('URL pattern validation', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://subdomain.example.org',
        'https://example.com/path/to/resource',
        'https://example.com:8080/path?query=value'
      ];

      validUrls.forEach(url => {
        expect(patterns.url.pattern.test(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'example.com',
        'https://',
        ''
      ];

      invalidUrls.forEach(url => {
        expect(patterns.url.pattern.test(url)).toBe(false);
      });
    });
  });

  describe('phone pattern validation', () => {
    it('should validate international phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '+12345678901',
        '+441234567890'
      ];

      validPhones.forEach(phone => {
        expect(patterns.phone.pattern.test(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '+0123456789', // Starts with 0
        'phone-number',
        '',
        '+', // Just plus sign
        '1234567890123456789' // Too long (over 16 total)
      ];

      invalidPhones.forEach(phone => {
        expect(patterns.phone.pattern.test(phone)).toBe(false);
      });
    });
  });

  describe('createPatternValidation', () => {
    it('should create pattern validation rule with RegExp', () => {
      const pattern = /^test$/;
      const validation = createPatternValidation(pattern, 'Must match test');
      
      expect(validation.pattern).toBe(pattern);
      expect(validation.message).toBe('Must match test');
    });

    it('should create pattern validation rule with string reference', () => {
      const validation = createPatternValidation('email', 'Must be valid email');
      
      expect(validation.pattern).toBe(patterns.email.pattern);
      expect(validation.message).toBe('Must be valid email');
    });
  });

  describe('applyPatternValidation', () => {
    it('should apply RegExp pattern to schema', () => {
      const schema = z.string();
      const validation = { value: /^test$/, message: 'Must be test' };
      const validatedSchema = applyPatternValidation(schema, validation);
      
      expect(() => validatedSchema.parse('test')).not.toThrow();
      expect(() => validatedSchema.parse('invalid')).toThrow();
    });

    it('should apply named pattern to schema', () => {
      const schema = z.string();
      const validation = { value: 'email', message: 'Must be valid email' };
      const validatedSchema = applyPatternValidation(schema, validation);
      
      expect(() => validatedSchema.parse('test@example.com')).not.toThrow();
      expect(() => validatedSchema.parse('invalid-email')).toThrow();
    });
  });

  describe('pattern registry', () => {
    beforeEach(() => {
      // Clean up any test patterns (custom registrations live on the shared store)
      delete (globalThis as any)[Symbol.for('use-form-definition:patterns')]?.testPattern;
    });

    describe('registerPattern', () => {
      it('should register new pattern', () => {
        const pattern = /^custom$/;
        registerPattern('testPattern', {
          pattern,
          message: 'Must be custom',
          description: 'Test pattern'
        });
        
        expect(getPattern('testPattern')).toBeDefined();
        expect(getPattern('testPattern')?.pattern).toBe(pattern);
        expect(getPattern('testPattern')?.message).toBe('Must be custom');
        expect(getAvailablePatterns()).toContain('testPattern');
      });

      it('should throw error for duplicate pattern name', () => {
        const uniqueName = 'duplicateTestPattern' + Date.now();
        registerPattern(uniqueName, {
          pattern: /^test1$/,
          message: 'Test 1'
        });
        
        expect(() => {
          registerPattern(uniqueName, {
            pattern: /^test2$/,
            message: 'Test 2'
          });
        }).toThrow(`Pattern "${uniqueName}" is already registered`);
      });
    });

    describe('getAvailablePatterns', () => {
      it('should return list of available pattern names', () => {
        const patterns = getAvailablePatterns();
        expect(patterns).toContain('email');
        expect(patterns).toContain('url');
        expect(patterns).toContain('phone');
        expect(Array.isArray(patterns)).toBe(true);
      });
    });

    describe('getPattern', () => {
      it('should return pattern definition for valid name', () => {
        const emailPattern = getPattern('email');
        expect(emailPattern).toBeDefined();
        expect(emailPattern?.pattern).toBeInstanceOf(RegExp);
        expect(typeof emailPattern?.message).toBe('string');
      });

      it('should return undefined for invalid pattern name', () => {
        const invalidPattern = getPattern('nonexistent');
        expect(invalidPattern).toBeUndefined();
      });
    });

    describe('validatePattern', () => {
      it('should validate value against named pattern', () => {
        expect(validatePattern('test@example.com', 'email')).toBe(true);
        expect(validatePattern('invalid-email', 'email')).toBe(false);
      });

      it('should return false for invalid pattern name', () => {
        expect(validatePattern('test', 'nonexistent')).toBe(false);
      });
    });
  });

  describe('specific pattern validations', () => {
    describe('slug pattern', () => {
      it('should validate URL-friendly slugs', () => {
        const validSlugs = [
          'hello-world',
          'my-blog-post',
          'article-123',
          'simple-slug'
        ];

        validSlugs.forEach(slug => {
          expect(patterns.slug.pattern.test(slug)).toBe(true);
        });
      });

      it('should reject invalid slugs', () => {
        const invalidSlugs = [
          'Hello World', // Spaces
          'slug_with_underscores',
          'slug with spaces',
          'UPPERCASE-SLUG',
          '-leading-dash',
          'trailing-dash-',
          ''
        ];

        invalidSlugs.forEach(slug => {
          expect(patterns.slug.pattern.test(slug)).toBe(false);
        });
      });
    });

    describe('alphanumeric pattern', () => {
      it('should validate alphanumeric strings', () => {
        const validStrings = ['abc123', 'TEST456', 'Hello123'];
        validStrings.forEach(str => {
          expect(patterns.alphanumeric.pattern.test(str)).toBe(true);
        });
      });

      it('should reject non-alphanumeric strings', () => {
        const invalidStrings = ['hello-world', 'test_123', 'hello world!', ''];
        invalidStrings.forEach(str => {
          expect(patterns.alphanumeric.pattern.test(str)).toBe(false);
        });
      });
    });

    describe('hex color pattern', () => {
      it('should validate hex color codes', () => {
        const validColors = ['#ff0000', '#FF0000', '#f0f', '#F0F', '#123456'];
        validColors.forEach(color => {
          expect(patterns.hexColor.pattern.test(color)).toBe(true);
        });
      });

      it('should reject invalid hex colors', () => {
        const invalidColors = ['ff0000', '#gg0000', '#12345', '#1234567', ''];
        invalidColors.forEach(color => {
          expect(patterns.hexColor.pattern.test(color)).toBe(false);
        });
      });
    });
  });
});