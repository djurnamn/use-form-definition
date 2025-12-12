import { Link } from 'react-router-dom';
import { useFormDefinition } from '@/lib/form';
import { userFormDefinition } from '@/forms/user';
import { Button } from '@/components/ui/button';

export function UserPage() {
  const { RenderedForm } = useFormDefinition(userFormDefinition);

  const handleSubmit = (data: Record<string, unknown>) => {
    console.log('Form submitted:', data);
    alert('Form submitted! Check the console for data.');
  };

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              User Registration
            </h1>
            <p className="mt-2 text-muted-foreground">
              Create a new user account with validation.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <RenderedForm onSubmit={handleSubmit} />
        </div>

        <div className="rounded-lg border bg-muted/50 p-6">
          <h2 className="text-lg font-semibold">What this form demonstrates</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Layout control:</strong> First/Last name are side-by-side
              using layout: {'{ half: true }'}
            </li>
            <li>
              <strong>Pattern validation:</strong> Email uses pattern:
              &apos;email&apos;, username uses pattern: &apos;username&apos;
            </li>
            <li>
              <strong>Password matching:</strong> Confirm password uses
              matchValue: &apos;password&apos;
            </li>
            <li>
              <strong>Checkbox validation:</strong> Terms checkbox uses
              mustBeTrue: true
            </li>
            <li>
              <strong>Auto-layout:</strong> RenderedForm handles grid layout
              automatically
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
