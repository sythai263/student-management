"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OtpCodeInput } from "@/components/ui/otp-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { logout } from "@lib/actions";
import { createSupabaseBrowserClient } from "@lib/supabase/client";

/**
 * TOTP challenge shown when a session is aal1 but the account has a
 * verified MFA factor. Verifying upgrades the session to aal2.
 */
export function MfaChallengeForm() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        setFactorId(
          data?.totp.find((f) => f.status === "verified")?.id ?? null,
        );
      });
  }, []);

  function verifyCode(fullCode: string) {
    if (!factorId) {
      toast.error("Không tìm thấy thiết bị MFA — hãy đăng nhập lại");
      return;
    }
    if (busy) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challenge) {
        toast.error("Không tạo được yêu cầu xác thực — thử lại");
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: fullCode,
      });
      if (verifyError) {
        toast.error("Mã không đúng — thử lại");
        return;
      }
      router.replace("/");
    })().finally(() => setBusy(false));
  }

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    verifyCode(code);
  }

  function onOtpChange(value: string) {
    setCode(value);
    if (value.length === 6 && !busy) verifyCode(value);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Xác thực 2 lớp</CardTitle>
        <CardDescription>
          Nhập mã 6 số từ app xác thực để tiếp tục.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Mã xác nhận</Label>
            <OtpCodeInput value={code} onChange={onOtpChange} autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Đang xác thực..." : "Xác nhận"}
          </Button>
        </form>
        <form action={logout} className="mt-2">
          <Button type="submit" variant="link" className="w-full">
            Đăng xuất
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
