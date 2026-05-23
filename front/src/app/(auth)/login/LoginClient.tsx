// src/app/auth/login/LoginClient.tsx
"use client";

import { useState } from "react";
import SigninInner from "./SigninInner";
import OtpInner from "./OtpInner";

export default function LoginClient() {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  return sent ? (
    <OtpInner phone={phone} onBack={() => setSent(false)} />
  ) : (
    <SigninInner
      initialPhone={phone}
      onSubmit={(p) => {
        setPhone(p);
        setSent(true);
      }}
    />
  );
}
