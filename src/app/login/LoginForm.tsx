"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { sendLoginCode, signInWithGoogle, verifyLoginCode, type LoginState } from "./actions";

const RESEND_SECONDS = 60;

export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [sendState, sendAction, sending] = useActionState(sendLoginCode, { step: "email" } as LoginState);
  const [editing, setEditing] = useState(false);
  const showCode = sendState.step === "code" && !editing;

  if (showCode) {
    return <CodeStep key={sendState.sentAt} state={sendState} next={next} onChangeEmail={() => setEditing(true)} resend={sendAction} />;
  }

  return (
    <div className="space-y-5">
      <form action={(fd) => { setEditing(false); sendAction(fd); }} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="block text-sm font-semibold">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={sendState.email}
          placeholder="name@example.com"
          aria-invalid={Boolean(sendState.error)}
          aria-describedby={sendState.error ? "email-error" : undefined}
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-left outline-none transition focus:border-brand"
        />
        {sendState.error && (
          <p id="email-error" role="alert" className="text-sm text-live">
            {sendState.error}
          </p>
        )}
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-brand py-3 font-bold text-brand-fg transition hover:brightness-110 disabled:opacity-60"
        >
          {sending ? "جارٍ الإرسال…" : "أرسل رمز الدخول"}
        </button>
        <p className="text-center text-xs text-muted">بدون كلمة مرور — سنرسل رمزاً من 6 أرقام ورابطاً للدخول.</p>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            أو
            <span className="h-px flex-1 bg-border" />
          </div>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 font-semibold text-black transition hover:bg-white/90"
            >
              <GoogleIcon />
              المتابعة بحساب Google
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function CodeStep({
  state,
  next,
  onChangeEmail,
  resend,
}: {
  state: LoginState;
  next: string;
  onChangeEmail: () => void;
  resend: (fd: FormData) => void;
}) {
  const [verifyState, verifyAction, verifying] = useActionState(verifyLoginCode, state);
  const [seconds, setSeconds] = useCountdown(RESEND_SECONDS);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        أرسلنا رمزاً من 6 أرقام إلى <span dir="ltr" className="font-semibold text-fg">{state.email}</span>. أدخله هنا أو اضغط
        على الرابط في البريد.
      </p>

      <form action={verifyAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="token" className="block text-sm font-semibold">
          رمز الدخول
        </label>
        <input
          id="token"
          name="token"
          dir="ltr"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="••••••"
          aria-invalid={Boolean(verifyState.error)}
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none transition focus:border-brand"
        />
        {verifyState.error && (
          <p role="alert" className="text-sm text-live">
            {verifyState.error}
          </p>
        )}
        <button
          type="submit"
          disabled={verifying}
          className="w-full rounded-lg bg-brand py-3 font-bold text-brand-fg transition hover:brightness-110 disabled:opacity-60"
        >
          {verifying ? "جارٍ التحقق…" : "تسجيل الدخول"}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onChangeEmail} className="text-muted hover:text-fg">
          تغيير البريد
        </button>
        <form
          action={(fd) => {
            setSeconds(RESEND_SECONDS);
            resend(fd);
          }}
        >
          <input type="hidden" name="email" value={state.email} />
          <input type="hidden" name="next" value={next} />
          <button type="submit" disabled={seconds > 0} className="font-semibold text-brand disabled:text-muted">
            {seconds > 0 ? `إعادة الإرسال بعد ${seconds}ث` : "إعادة إرسال الرمز"}
          </button>
        </form>
      </div>
    </div>
  );
}

function useCountdown(initial: number): [number, (n: number) => void] {
  const [seconds, setSeconds] = useState(initial);
  const tick = useCallback(() => setSeconds((s) => s - 1), []);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(tick, 1000);
    return () => clearTimeout(id);
  }, [seconds, tick]);
  return [seconds, setSeconds];
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
