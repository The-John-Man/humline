import {
  ClerkProvider,
  SignIn,
  SignUp,
  UserProfile,
  useAuth,
  useClerk,
  useUser,
} from '@clerk/react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { AudioLines } from 'lucide-react';
import App from './App';
import { Library } from './cloud/Library';
import { CloudStudio } from './cloud/CloudStudio';
import { DeleteAccount } from './cloud/DeleteAccount';
import { clearDrafts } from './cloud/client';
import './styles/accounts.css';

function Brand() {
  return (
    <Link className="brand" to="/">
      <AudioLines />
      <span>
        humline<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
function Welcome() {
  return (
    <>
      <header className="account-header">
        <Brand />
        <Link to="/sign-in">Sign in</Link>
      </header>
      <main className="welcome-page">
        <p className="eyebrow">FROM A LITTLE HUM TO SOMETHING YOURS</p>
        <h1>
          Hum a melody.
          <br />
          Make it yours.
        </h1>
        <p>
          Record an idea, shape the notes, and carry it into your music.
          <br />
          Your private library keeps your melodies ready for next time.
        </p>
        <div className="account-actions">
          <Link className="primary account-link" to="/sign-up">
            Create account
          </Link>
          <Link to="/demo">Try the synthetic demo →</Link>
        </div>
        <div className="account-card">
          <h2>Capture. Refine. Create.</h2>
          <p>Record or import → Convert to notes → Edit and listen → Export MIDI.</p>
          <p>
            Your audio is processed on your device. Account features require a configured cloud
            service.
          </p>
        </div>
      </main>
    </>
  );
}
function safeInternalPath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/melodies';
}
function AuthPage({ signUp = false }: { signUp?: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [params] = useSearchParams();
  const redirectUrl = safeInternalPath(params.get('redirect_url'));
  if (isLoaded && isSignedIn) return <Navigate to={redirectUrl} replace />;
  return (
    <>
      <header className="account-header">
        <Brand />
        <Link to="/">Back to home</Link>
      </header>
      <main className="auth-page">
        <section>
          <p className="eyebrow">A HOME FOR YOUR NEXT IDEA</p>
          <h1>
            Hum a melody.
            <br />
            Make it yours.
          </h1>
          <p>Save your notes. Pick them up on another device.</p>
          <Link to="/demo">Try the synthetic demo</Link>
        </section>
        <section aria-label={signUp ? 'Create your account' : 'Sign in'}>
          {signUp ? (
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              forceRedirectUrl={redirectUrl}
              fallbackRedirectUrl="/melodies"
            />
          ) : (
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              forceRedirectUrl={redirectUrl}
              fallbackRedirectUrl="/melodies"
            />
          )}
        </section>
      </main>
    </>
  );
}
function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, sessionId } = useAuth();
  const location = useLocation();
  if (!isLoaded)
    return (
      <main className="account-page" role="status">
        Checking your session…
      </main>
    );
  if (!isSignedIn) {
    const destination = encodeURIComponent(location.pathname + location.search);
    return <Navigate replace to={`/sign-in?redirect_url=${destination}`} />;
  }
  return <div key={`${userId}:${sessionId}`}>{children}</div>;
}
function AccountHeader() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [error, setError] = useState('');
  return (
    <>
      <header className="account-header">
        <Brand />
        <nav className="account-actions">
          <Link to="/melodies">My melodies</Link>
          <Link to="/account">{user?.firstName || 'Account'}</Link>
          <button
            onClick={() => {
              try {
                clearDrafts(user!.id);
              } catch {
                /* Sign-out still works if storage is unavailable. */
              }
              void signOut({ redirectUrl: '/' }).catch(() =>
                setError('Could not sign out. Please retry.'),
              );
            }}
          >
            Sign out
          </button>
        </nav>
      </header>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
function SignedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/sign-in/*" element={<AuthPage />} />
      <Route path="/sign-up/*" element={<AuthPage signUp />} />
      <Route
        path="/melodies"
        element={
          <Protected>
            <AccountHeader />
            <Library />
          </Protected>
        }
      />
      <Route
        path="/studio/:id"
        element={
          <Protected>
            <CloudStudio />
          </Protected>
        }
      />
      <Route
        path="/account/*"
        element={
          <Protected>
            <AccountHeader />
            <main className="account-page">
              <h1>Your account</h1>
              <p>
                Manage your profile, email, connected accounts, and security settings. Use the
                Humline deletion section below when you want cloud melodies removed immediately with
                your account.
              </p>
              <UserProfile routing="path" path="/account" />
              <DeleteAccount />
            </main>
          </Protected>
        }
      />
      <Route
        path="*"
        element={
          <main className="account-page">
            <h1>Page not found</h1>
            <Link to="/">Back to Humline</Link>
          </main>
        }
      />
    </Routes>
  );
}
export default function Root() {
  const navigate = useNavigate(),
    location = useLocation();
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  // The demo is deliberately public and does not load an account session or private drafts.
  if (location.pathname === '/demo')
    return (
      <>
        <div className="cloud-toolbar">
          <Link to="/">← Home</Link>
          <strong>Local demo</strong>
          <span>Save JSON to keep your work. Sign in for a cloud library.</span>
          <Link to="/sign-in">Sign in</Link>
        </div>
        <App storageKey="humline.demo.v1" />
      </>
    );
  if (!key)
    return location.pathname === '/' ? (
      <Welcome />
    ) : (
      <main className="account-page">
        <Brand />
        <h1>Accounts aren't configured yet</h1>
        <p>
          This build needs its Clerk publishable key and a connected library API before sign-in is
          available.
        </p>
        <Link to="/demo">Open the local demo</Link>
      </main>
    );
  return (
    <ClerkProvider
      publishableKey={key}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/melodies"
      signUpFallbackRedirectUrl="/melodies"
      allowedRedirectOrigins={[window.location.origin]}
      appearance={{
        variables: {
          colorPrimary: '#75e1c1',
          colorBackground: '#151c2d',
          colorForeground: '#f1f4fc',
          colorInput: '#0d1422',
          colorInputForeground: '#f1f4fc',
        },
      }}
    >
      <ProviderStatus />
      <SignedRoutes />
    </ClerkProvider>
  );
}
function ProviderStatus() {
  const { isLoaded } = useAuth();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, []);
  return !isLoaded && slow ? (
    <p role="alert" className="account-card">
      Account services are taking longer than expected. Check your connection and{' '}
      <button onClick={() => location.reload()}>Retry</button>, or{' '}
      <Link to="/demo">use the local demo</Link>.
    </p>
  ) : null;
}
