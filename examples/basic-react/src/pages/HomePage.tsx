import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <>
      <h1>use-form-definition</h1>
      <p>Basic React Example</p>

      <p>
        This example demonstrates the core features of <code>use-form-definition</code> using
        the library's built-in unstyled components.
      </p>

      <h2>Example Forms</h2>

      <nav>
        <ul>
          <li>
            <Link to="/contact">Contact Form</Link>
            {' '}- Conditional visibility with <code>form.watch()</code> and conditional validation with <code>requiredWhen</code>
          </li>
          <li>
            <Link to="/register">Registration Form</Link>
            {' '}- Password matching (<code>matchValue</code>) and terms checkbox (<code>mustBeTrue</code>)
          </li>
          <li>
            <Link to="/order">Order Form</Link>
            {' '}- Repeater fields with <code>minRows</code>/<code>maxRows</code> validation
          </li>
        </ul>
      </nav>

      <h2>Features Demonstrated</h2>
      <ul>
        <li>Built-in unstyled components (TextInput, Select, Textarea, Checkbox, Repeater)</li>
        <li>Basic validation (required, minLength, maxLength, min, max)</li>
        <li>Pattern validation (email, username)</li>
        <li>Conditional visibility (<code>form.watch()</code> with manual <code>RenderedField</code>)</li>
        <li>Conditional validation (<code>requiredWhen</code>)</li>
        <li>Password matching (<code>matchValue</code>)</li>
        <li>Checkbox validation (<code>mustBeTrue</code>)</li>
        <li>Repeater fields with add/remove functionality</li>
      </ul>
    </>
  );
}
