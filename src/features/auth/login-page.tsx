import { useMemo, useState, type FormEvent } from 'react';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  completePasswordReset,
  login,
  requestPasswordReset,
} from './api';
import { isAuthenticated, saveAuthSession } from './auth-store';
import { routes } from '../../lib/constants/routes';

type AuthMode = 'login' | 'reset-request' | 'reset-complete';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const resetToken = searchParams.get('token')?.trim() ?? '';
  const initialMode: AuthMode =
    location.pathname === routes.passwordReset
      ? resetToken
        ? 'reset-complete'
        : 'reset-request'
      : 'login';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const returnTo = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    return state?.from?.pathname || routes.dashboard;
  }, [location.state]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const session = await login({
        email: email.trim(),
        password,
      });
      saveAuthSession(session);
      navigate(returnTo, { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Login failed.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      await requestPasswordReset({ email: email.trim() });
      setSuccessMessage(
        'If that email is on an active account, a reset link has been sent.',
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Unable to request a password reset.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (resetToken.length < 32 || resetToken.length > 256) {
      setErrorMessage('This password reset link is invalid or incomplete.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await completePasswordReset({
        token: resetToken,
        password: newPassword,
      });
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Your password has been reset. You can sign in now.');
      setMode('login');
      navigate(routes.login, { replace: true });
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Unable to reset your password.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage('');
    setSuccessMessage('');
  }

  if (isAuthenticated()) {
    return <Navigate to={routes.dashboard} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">NVentory Boss</h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'login' && 'Sign in to access the operations console.'}
            {mode === 'reset-request' &&
              'Request a link to reset your password.'}
            {mode === 'reset-complete' && 'Choose a new account password.'}
          </p>
        </div>

        {mode === 'login' && (
          <form className="space-y-4" onSubmit={handleLogin}>
            <EmailField email={email} setEmail={setEmail} />

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                maxLength={128}
                required
              />
            </div>

            <MessageBox error={errorMessage} success={successMessage} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            <button
              type="button"
              className="w-full text-sm font-medium text-slate-700 transition hover:text-slate-950"
              onClick={() => switchMode('reset-request')}
            >
              Forgot your password?
            </button>
          </form>
        )}

        {mode === 'reset-request' && (
          <form className="space-y-4" onSubmit={handleResetRequest}>
            <EmailField email={email} setEmail={setEmail} />

            <MessageBox error={errorMessage} success={successMessage} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
            </button>

            <Link
              to={routes.login}
              className="block text-center text-sm font-medium text-slate-700 transition hover:text-slate-950"
              onClick={() => switchMode('login')}
            >
              Back to sign in
            </Link>
          </form>
        )}

        {mode === 'reset-complete' && (
          <form className="space-y-4" onSubmit={handleResetComplete}>
            <div>
              <label
                htmlFor="new-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </div>

            <MessageBox error={errorMessage} success={successMessage} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Resetting password...' : 'Reset password'}
            </button>

            <Link
              to={routes.login}
              className="block text-center text-sm font-medium text-slate-700 transition hover:text-slate-950"
              onClick={() => switchMode('login')}
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

type EmailFieldProps = {
  email: string;
  setEmail: (email: string) => void;
};

function EmailField({ email, setEmail }: EmailFieldProps) {
  return (
    <div>
      <label
        htmlFor="email"
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        Email
      </label>
      <input
        id="email"
        type="email"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
    </div>
  );
}

type MessageBoxProps = {
  error: string;
  success: string;
};

function MessageBox({ error, success }: MessageBoxProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {success}
      </div>
    );
  }

  return null;
}
