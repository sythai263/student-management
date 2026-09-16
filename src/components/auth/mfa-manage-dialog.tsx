"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OtpCodeInput } from "@/components/ui/otp-input";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@lib/supabase/client";
import { TOTP_ISSUER } from "@constants";

type MfaStatus = "loading" | "enroll" | "enabled";

interface MfaManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Optional TOTP MFA manager: enrolls an authenticator app via QR code,
 * or disables MFA after re-verifying a code (unenroll requires aal2).
 */
export function MfaManageDialog({ open, onOpenChange }: MfaManageDialogProps) {
  const [status, setStatus] = useState<MfaStatus>("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // Enrolling twice with the same friendly name hits a 422
  // (mfa_factor_name_conflict) — StrictMode double-invokes effects in dev,
  // so guard against parallel runs.
  const enrollInFlight = useRef(false);

  useEffect(() => {
    if (!open) {
      // Reset for the next open — state below is re-initialised per open.
      enrollInFlight.current = false;
      return;
    }
    if (enrollInFlight.current) return;
    enrollInFlight.current = true;
    setStatus("loading");
    setLoadFailed(false);
    setCode("");

    // NOTE: no effect-cleanup/-cancelled flag here — StrictMode runs the
    // effect+cleanup immediately on mount, so cancelling in cleanup would
    // kill the ONLY run (the duplicate run is blocked by the ref above).
    // The async flow must complete on its own.
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setStatus("enabled");
        return;
      }
      // Drop leftover unverified factors before enrolling again.
      for (const f of data?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      // Unique friendly name per attempt — GoTrue rejects duplicates with
      // HTTP 422 (mfa_factor_name_conflict).
      const friendlyName = `Authenticator ${Date.now().toString(36)}`;
      const { data: enrolled, error: enrollError } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName,
          issuer: TOTP_ISSUER,
        });
      if (enrollError || !enrolled) {
        setLoadFailed(true);
        toast.error(enrollError?.message ?? "Không tạo được mã QR");
        return;
      }
      setFactorId(enrolled.id);
      setQr(enrolled.totp.qr_code);
      setSecret(enrolled.totp.secret);
      setStatus("enroll");
    })();
  }, [open]);

  function verifyCode(fullCode: string) {
    if (busy) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    (status === "enroll"
      ? enable(supabase, fullCode)
      : disable(supabase, fullCode)
    ).finally(() => setBusy(false));
  }

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    verifyCode(code);
  }

  function onOtpChange(value: string) {
    setCode(value);
    if (value.length === 6 && !busy) verifyCode(value);
  }

  async function enable(
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
    fullCode: string,
  ) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: fullCode,
    });
    if (error) {
      toast.error("Mã không đúng — thử lại");
      return;
    }
    toast.success("Đã bật MFA");
    setCode("");
    setStatus("enabled");
  }

  async function disable(
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
    fullCode: string,
  ) {
    // Unenroll requires an aal2 session — verify a fresh code first.
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      toast.error(challengeError?.message ?? "Không tạo được yêu cầu xác thực");
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
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId,
    });
    if (unenrollError) {
      toast.error(unenrollError.message);
      return;
    }
    toast.success("Đã tắt MFA");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác thực 2 lớp (MFA)</DialogTitle>
          <DialogDescription>
            Dùng app xác thực (Google Authenticator, Authy…) để bảo vệ tài
            khoản.
          </DialogDescription>
        </DialogHeader>

        {status === "loading" ? (
          loadFailed ? (
            <div className="space-y-4">
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <ListSkeleton rows={3} itemClassName="h-8" />
          )
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {status === "enroll" && (
              <>
                {/* auth-js already prefixes qr_code with the
                    `data:image/svg+xml;utf-8,` data URI — use it as-is. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt="QR code cho app xác thực"
                  className="mx-auto size-44 rounded-md bg-white p-2"
                />
                <p className="text-center text-xs text-muted-foreground">
                  Không quét được? Nhập mã:{" "}
                  <code className="font-mono text-foreground">{secret}</code>
                </p>
              </>
            )}
            {status === "enabled" && (
              <p className="flex items-center gap-2 text-sm text-green-400">
                <ShieldCheck className="size-4" /> MFA đang bật cho tài khoản
                này.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="mfa-code">
                {status === "enroll"
                  ? "Nhập mã 6 số từ app để kích hoạt"
                  : "Nhập mã 6 số để tắt MFA"}
              </Label>
              <OtpCodeInput value={code} onChange={onOtpChange} autoFocus />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                variant={status === "enabled" ? "destructive" : "default"}
                disabled={busy}
              >
                {busy
                  ? "Đang xử lý..."
                  : status === "enroll"
                    ? "Kích hoạt"
                    : "Tắt MFA"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
