"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/** 6-digit numeric OTP input — shared by email login and MFA flows. */
export function OtpCodeInput({ value, onChange, autoFocus }: OtpCodeInputProps) {
  return (
    <InputOTP
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      autoComplete="one-time-code"
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      containerClassName="justify-center"
    >
      <InputOTPGroup className="w-full *:flex-1">
        {Array.from({ length: 6 }, (_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
