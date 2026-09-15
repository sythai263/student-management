"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      if (mode === "password") {
        const result = await login({ email, password });
        if (!result.success) setError(result.error ?? "Đăng nhập thất bại");
      } else if (!otpSent) {
        const result = await sendLoginOtp({ email });
        if (!result.success) setError(result.error);
        else setOtpSent(true);
      } else {
        const result = await verifyLoginOtp({ email, token: code });
        if (!result.success) setError(result.error);
      }
    });
  }

  function switchMode() {
    setMode(mode === "password" ? "otp" : "password");
    setOtpSent(false);
    setError(null);
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
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
            )
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
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
                  setError(null);
                }}
              >
                Đổi email
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline disabled:opacity-50"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const result = await sendLoginOtp({ email });
                    if (!result.success) setError(result.error);
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
