import { useState } from 'react';
import { useFormDefinition } from '@/lib/form';
import { registrationFormDefinition } from '@/forms';

type FormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  newsletter?: boolean;
};

export function RegisterPage() {
  const { RenderedForm } = useFormDefinition(registrationFormDefinition);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  const handleSubmit = (data: FormData) => {
    console.log('Registration form submitted:', data);
    // In a real app, you'd never log passwords!
    setSubmittedData({ ...data, password: '********', confirmPassword: '********' });
  };

  if (submittedData) {
    return (
      <>
        <h1>Registration Form</h1>
        <p><strong>Account created successfully!</strong></p>
        <details>
          <summary>Submitted data</summary>
          <pre>{JSON.stringify(submittedData, null, 2)}</pre>
        </details>
        <p>
          <button type="button" onClick={() => setSubmittedData(null)}>
            Register another account
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Registration Form</h1>
      <p>
        Demonstrates <code>matchValue</code> validation (password confirmation)
        and <code>mustBeTrue</code> validation (terms checkbox).
      </p>

      <RenderedForm onSubmit={handleSubmit} />
    </>
  );
}
