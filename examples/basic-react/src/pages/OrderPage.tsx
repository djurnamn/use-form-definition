import { useState } from 'react';
import { useFormDefinition } from '@/lib/form';
import { orderFormDefinition } from '@/forms';

type OrderItem = {
  product: string;
  quantity: number;
  notes?: string;
};

type FormData = {
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  shippingAddress: string;
  priority: string;
  giftWrap?: boolean;
};

export function OrderPage() {
  const { RenderedForm } = useFormDefinition(orderFormDefinition);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  const handleSubmit = (data: FormData) => {
    console.log('Order form submitted:', data);
    setSubmittedData(data);
  };

  if (submittedData) {
    return (
      <>
        <h1>Order Form</h1>
        <p><strong>Order placed successfully!</strong></p>
        <details>
          <summary>Order details</summary>
          <pre>{JSON.stringify(submittedData, null, 2)}</pre>
        </details>
        <p>
          <button type="button" onClick={() => setSubmittedData(null)}>
            Place another order
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Order Form</h1>
      <p>
        Demonstrates <code>repeater</code> fields for dynamic lists with
        {' '}<code>minRows</code>/<code>maxRows</code> validation.
      </p>

      <RenderedForm onSubmit={handleSubmit} />
    </>
  );
}
