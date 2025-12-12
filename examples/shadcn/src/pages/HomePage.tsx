import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function HomePage() {
  return (
    <div className="container mx-auto max-w-2xl py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            shadcn/ui Example
          </h1>
          <p className="mt-2 text-muted-foreground">
            Demonstrating use-form-definition with shadcn/ui components.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold">Why use-form-definition?</h2>
          <p className="mt-2 text-muted-foreground">
            shadcn/ui provides beautiful components, but form composition can be
            verbose. use-form-definition simplifies this by generating forms
            from definitions.
          </p>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 text-sm">
              <div className="font-medium">Aspect</div>
              <div className="font-medium">Manual shadcn</div>
              <div className="font-medium">use-form-definition</div>

              <div className="col-span-3 border-t" />

              <div>Schema</div>
              <div className="text-muted-foreground">Manual Zod schema</div>
              <div className="text-muted-foreground">
                Generated from definition
              </div>

              <div>Field rendering</div>
              <div className="text-muted-foreground">
                <code className="text-xs">
                  FormField + FormItem + FormLabel + FormControl + FormMessage
                </code>
              </div>
              <div className="text-muted-foreground">
                <code className="text-xs">
                  {'<RenderedField name="..." />'}
                </code>
              </div>

              <div>Server validation</div>
              <div className="text-muted-foreground">Roll your own</div>
              <div className="text-muted-foreground">
                <code className="text-xs">generateDataValidator()</code>
              </div>

              <div>Conditional validation</div>
              <div className="text-muted-foreground">Manual Zod refinements</div>
              <div className="text-muted-foreground">
                <code className="text-xs">requiredWhen</code> in definition
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Example Forms</h2>
          <div className="flex gap-4">
            <Button asChild>
              <Link to="/user">User Registration Form</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
