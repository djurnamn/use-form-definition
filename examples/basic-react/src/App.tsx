import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HomePage, ContactPage, RegisterPage, OrderPage } from '@/pages';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <>
      <header>
        <nav>
          {!isHome && <Link to="/">← Back to examples</Link>}
        </nav>
      </header>
      <main>{children}</main>
      <hr />
      <footer>
        <p>
          <a
            href="https://github.com/djurnamn/use-form-definition"
            target="_blank"
            rel="noopener noreferrer"
          >
            use-form-definition
          </a>
          {' '}- Definition-driven forms for React
        </p>
      </footer>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/order" element={<OrderPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
