import { FormDefinition } from 'use-form-definition';

/**
 * Order form definition
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
    label: 'Customer Name',
    validation: {
      required: true,
      minLength: 2,
    },
  },
  customerEmail: {
    type: 'email',
    label: 'Customer Email',
    validation: {
      required: true,
      pattern: 'email',
    },
  },
  items: {
    type: 'repeater',
    label: 'Order Items',
    fields: {
      product: {
        type: 'select',
        label: 'Product',
        placeholder: 'Select a product...',
        options: [
          { value: 'widget-a', label: 'Widget A - $10' },
          { value: 'widget-b', label: 'Widget B - $25' },
          { value: 'gadget-x', label: 'Gadget X - $50' },
          { value: 'gadget-y', label: 'Gadget Y - $75' },
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
        label: 'Notes',
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
    label: 'Shipping Address',
    validation: {
      required: true,
      minLength: 10,
    },
  },
  priority: {
    type: 'select',
    label: 'Shipping Priority',
    options: [
      { value: 'standard', label: 'Standard (5-7 days)' },
      { value: 'express', label: 'Express (2-3 days)' },
      { value: 'overnight', label: 'Overnight' },
    ],
    defaultValue: 'standard',
    validation: {
      required: true,
    },
  },
  giftWrap: {
    type: 'checkbox',
    inlineLabel: 'Gift wrap this order',
  },
};
