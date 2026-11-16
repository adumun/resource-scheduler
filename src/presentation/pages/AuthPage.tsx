import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/presentation/store/authStore";
import { Button, Input, Field, FieldError } from "@/presentation/components/ui";
import { CalendarRange } from "lucide-react";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const ok =
      mode === "login"
        ? await login({ email, password })
        : await register({ name, email, password, confirmPassword: confirm });
    if (ok) navigate("/schedules");
  };

  const isRegister = mode === "register";

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-brand-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg">
            <CalendarRange className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Resource Scheduler</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isRegister ? "Create your account" : "Sign in to your account"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {isRegister ? (
              <Field label="Name" htmlFor="name" required>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </Field>
            ) : null}
            <Field label="Email" htmlFor="email" required>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} required />
            </Field>
            {isRegister ? (
              <Field label="Confirm password" htmlFor="confirm" required>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
              </Field>
            ) : null}
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
                <ul className="list-disc space-y-0.5 pl-4">
                  {error.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Button type="submit" loading={loading} fullWidth>
              {isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-center dark:border-teal-900 dark:bg-teal-900/20">
            <p className="text-xs text-teal-900 dark:text-teal-100">Esta autenticación es solo una simulación local, no una cuenta segura.</p>
            <Link to="/demo" className="mt-2 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
              Explorar sin crear cuenta
            </Link>
          </div>
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                No account?{" "}
                <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                  Register
                </Link>
              </>
            )}
          </p>
          <p className="mt-3 text-center text-xs text-slate-400">
            Local-only authentication. Data stays in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}

export { FieldError };
