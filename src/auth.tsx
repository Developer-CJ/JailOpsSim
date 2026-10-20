import { useState } from "react";
import { Building2, LockKeyhole, ShieldCheck } from "lucide-react";

export function SignIn({
  onLogin,
  configured,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  configured: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <span className="auth-logo">
          <Building2 size={29} />
          JailOpsSim
        </span>
        <div>
          <span className="eyebrow">
            CONNECTED CORRECTIONS · SIMULATION SUITE
          </span>
          <h1>
            One facility.
            <br />
            Every system.
            <br />
            <span>Working together.</span>
          </h1>
          <p>
            A shared workspace for fictional corrections operations, resident
            care, and control-room training.
          </p>
        </div>
        <span className="auth-assurance">
          <ShieldCheck size={17} />
          Fictional operations. Persistent server data.
        </span>
      </section>
      <section className="auth-form-area">
        <form
          className="auth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await onLogin(username, password);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Sign-in failed.");
              setPassword("");
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="auth-lock">
            <LockKeyhole size={25} />
          </span>
          <div className="eyebrow">YOUR OPERATIONS WORKSPACE</div>
          <h2>Welcome back.</h2>
          <p>Sign in with an account created on your server.</p>
          {!configured && (
            <div className="info-strip">
              No account is configured yet. Run windows/Install.ps1 on the
              server to create your administrator account.
            </div>
          )}
          <label className="field">
            <span>Username</span>
            <input
              autoFocus
              autoComplete="username"
              required
              maxLength={40}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!configured || busy}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!configured || busy}
            />
          </label>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          <button
            className="button primary auth-submit"
            type="submit"
            disabled={!configured || busy}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="auth-caption">
            Accounts and simulation data are stored on your server. Sessions
            expire after eight hours.
          </div>
        </form>
      </section>
    </main>
  );
}
