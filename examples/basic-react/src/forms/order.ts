import { FormDefinition } from 'use-form-definition';

/**
 * Plant nursery order form definition
 *
 * Demonstrates:
 * - Repeater fields for order items
 * - minRows/maxRows validation
 * - Nested field definitions within repeater
 * - Number validation (min, max)
 */
export const orderFormDefinition: FormDefinition = {
  customerName: {
    type: 'text',
    label: 'Your name',
    validation: {
      required: true,
      minLength: 2,
    },
  },
  customerEmail: {
    type: 'email',
    label: 'Email',
    validation: {
      required: true,
      pattern: 'email',
    },
  },
  items: {
    type: 'repeater',
    label: 'Plants',
    fields: {
      product: {
        type: 'select',
        label: 'Plant',
        placeholder: 'Pick a plant...',
        options: [
          { value: 'pothos', label: 'Golden pothos - $15' },
          { value: 'snake-plant', label: 'Snake plant - $22' },
          { value: 'monstera', label: 'Monstera deliciosa - $38' },
          { value: 'fiddle-leaf-fig', label: 'Fiddle-leaf fig - $55' },
        ],
        validation: {
          required: true,
        },
      },
      quantity: {
        type: 'number',
        label: 'Quantity',
        defaultValue: 1,
        validation: {
          required: true,
          min: 1,
          max: 100,
        },
      },
      notes: {
        type: 'text',
        label: 'Notes (pot colour, etc.)',
        // Optional field, no validation
      },
    },
    validation: {
      minRows: 1,
      maxRows: 10,
    },
  },
  shippingAddress: {
    type: 'textarea',
    label: 'Delivery address',
    validation: {
      required: true,
      minLength: 10,
    },
  },
  priority: {
    type: 'select',
    label: 'Delivery speed',
    options: [
      { value: 'standard', label: 'Standard (5-7 days)' },
      { value: 'express', label: 'Express (2-3 days)' },
      { value: 'overnight', label: 'Next day' },
    ],
    defaultValue: 'standard',
    validation: {
      required: true,
    },
  },
  giftWrap: {
    type: 'checkbox',
    inlineLabel: 'Include a plant care card',
  },
};
