import { useState } from 'react';
import { useFormDefinition } from '@/lib/form';
import { contactFormDefinition } from '@/forms';

type FormData = {
  name: string;
  email: string;
  subject: string;
  customSubject?: string;
  message: string;
  newsletter?: boolean;
};

export function ContactPage() {
  const { RenderedForm } = useFormDefinition(contactFormDefinition);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  const handleSubmit = (data: FormData) => {
    console.log('Contact form submitted:', data);
    setSubmittedData(data);
  };

  if (submittedData) {
    return (
      <>
        <h1>Contact Form</h1>
        <p><strong>Thank you for your message!</strong></p>
        <details>
          <summary>Submitted data</summary>
          <pre>{JSON.stringify(submittedData, null, 2)}</pre>
        </details>
        <p>
          <button type="button" onClick={() => setSubmittedData(null)}>
            Send another message
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Contact Form</h1>
      <p>
        Demonstrates conditional validation with <code>requiredWhen</code>.
        Select "Other" as the subject to see the custom subject field become required.
      </p>

      <RenderedForm onSubmit={handleSubmit} />
    </>
  );
}
