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

// Custom runtime props our registered field components accept (see lib/form.ts).
// Passing this as the second type argument makes `helpText` typed on RenderedField.
type FieldExtras = { helpText?: string };

export function ContactPage() {
  const { form, Form, RenderedField, Actions } = useFormDefinition<
    typeof contactFormDefinition,
    FieldExtras
  >(contactFormDefinition);
  const subject = form.watch('subject');
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  const onSubmit = (data: FormData) => {
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
        Demonstrates conditional visibility and conditional validation.
        Select "Other" as the subject to reveal the "Please specify" field;
        once visible it's also required (via <code>requiredWhen</code>).
      </p>

      <Form onSubmit={form.handleSubmit(onSubmit)}>
        {/* `helpText` is a typed forwarded extra (FieldExtras). A typo or a
            non-string value here would be a compile error. */}
        <RenderedField name="name" helpText="As it appears on your account." />
        <RenderedField name="email" helpText="We'll only use this to reply." />
        <RenderedField name="subject" />
        {subject === 'other' && <RenderedField name="customSubject" />}
        <RenderedField name="message" />
        <RenderedField name="newsletter" />
        <Actions />
      </Form>
    </>
  );
}
