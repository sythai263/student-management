"use client";

import { useRef, useState, useTransition, type SubmitEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { OtpCodeInput } from "../ui/otp-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { toast } from "sonner";
import { login, sendLoginOtp, verifyLoginOtp } from "@lib/actions";
import { FEATURE_FLAGS } from "@constants";

type LoginMode = "password" | "otp";

export function LoginForm() {
  const canPassword = FEATURE_FLAGS.PASSWORD_LOGIN;
  const canOtp = FEATURE_FLAGS.EMAIL_OTP_LOGIN;

  const [mode, setMode] = useState<LoginMode>(canOtp ? "otp" : "password");
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  // Turnstile CAPTCHA — tokens are single-use, reset after each attempt.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaRef = useRef<TurnstileInstance>(null);
  const [captchaToken, setCaptchaToken] = useState<string>();

  function resetCaptcha() {
    captchaRef.current?.reset();
    setCaptchaToken(undefined);
  }

  function verifyCode(token: string) {
    startTransition(async () => {
      const result = await verifyLoginOtp({ email, token });
      if (!result.success) toast.error(result.error);
    });
  }

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (mode === "password") {
        const result = await login({ email, password, captchaToken });
        resetCaptcha();
        if (!result.success) toast.error(result.error ?? "Đăng nhập thất bại");
      } else if (!otpSent) {
        const result = await sendLoginOtp({ email, captchaToken });
        resetCaptcha();
        if (!result.success) {
          toast.error(result.error);
        } else {
          setOtpSent(true);
          toast.success("Đã gửi mã 6 số tới email");
        }
      } else {
        const result = await verifyLoginOtp({ email, token: code });
        if (!result.success) toast.error(result.error);
      }
    });
  }

  function onOtpChange(value: string) {
    setCode(value);
    if (value.length === 6 && !isPending) verifyCode(value);
  }

  function switchMode() {
    setMode(mode === "password" ? "otp" : "password");
    setOtpSent(false);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <CardDescription>
          {mode === "password"
            ? "Dành cho giáo viên"
            : otpSent
              ? `Đã gửi mã 6 số tới ${email} — hoặc bấm link trong email`
              : "Nhận mã đăng nhập qua email"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={mode === "otp" && otpSent}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {mode === "password" ? (
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : (
            otpSent && (
              <div className="space-y-2">
                <Label htmlFor="code">Mã xác nhận</Label>
                <OtpCodeInput value={code} onChange={onOtpChange} autoFocus />
              </div>
            )
          )}

          {siteKey && (
            <Turnstile
              ref={captchaRef}
              siteKey={siteKey}
              onSuccess={setCaptchaToken}
              onExpire={() => setCaptchaToken(undefined)}
              onError={() => setCaptchaToken(undefined)}
              options={{ refreshExpired: "auto" }}
            />
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              isPending ||
              (mode === "password" || !otpSent
                ? !!siteKey && !captchaToken
                : false)
            }
          >
            {isPending
              ? "Đang xử lý..."
              : mode === "password"
                ? "Đăng nhập"
                : otpSent
                  ? "Xác nhận"
                  : "Gửi mã đăng nhập"}
          </Button>

          {mode === "otp" && otpSent && (
            <div className="flex justify-between text-sm">
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => {
                  setOtpSent(false);
                  setCode("");
                }}
              >
                Đổi email
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline disabled:opacity-50"
                disabled={isPending || (!!siteKey && !captchaToken)}
                onClick={() =>
                  startTransition(async () => {
                    const result = await sendLoginOtp({ email, captchaToken });
                    resetCaptcha();
                    if (!result.success) {
                      toast.error(result.error);
                    } else {
                      toast.success("Đã gửi lại mã tới email");
                    }
                  })
                }
              >
                Gửi lại mã
              </button>
            </div>
          )}
        </form>

        {canPassword && canOtp && (
          <Button
            type="button"
            variant="link"
            className="mt-2 w-full"
            onClick={switchMode}
          >
            {mode === "password"
              ? "Đăng nhập bằng mã OTP"
              : "Đăng nhập bằng mật khẩu"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
