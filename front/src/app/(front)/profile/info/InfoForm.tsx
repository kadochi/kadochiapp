"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button/Button";
import { useSession } from "@/domains/auth/session-context";
import s from "./info.module.css";

/** Client Component: User info form with refreshSession sync */
export default function InfoForm({
  initialFirstName,
  initialLastName,
  phoneValue,
  initialEmail,
}: {
  initialFirstName: string;
  initialLastName: string;
  phoneValue: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [submitting, setSubmitting] = useState(false);

  async function postProfileData() {
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phoneValue.trim(),
      ...(initialEmail ? { email: initialEmail.trim() } : {}),
    };

    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify(payload),
      credentials: "same-origin",
      cache: "no-store",
    });

    return res;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await postProfileData();
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        const msg = data?.message || data?.error || `HTTP ${res.status}`;
        console.error("[profile/update] failed =>", msg);
        alert(`خطا در ثبت اطلاعات.\n${msg}`);
        return setSubmitting(false);
      }

      await refreshSession();
      router.replace("/profile");
    } catch (err) {
      console.error("[profile/info] update failed", err);
      alert("خطا در برقراری ارتباط.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <div className={s.field}>
        <label className={s.label} htmlFor="first_name">
          نام
        </label>
        <input
          id="first_name"
          className={s.input}
          name="first_name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="last_name">
          نام خانوادگی
        </label>
        <input
          id="last_name"
          className={s.input}
          name="last_name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="phone_view">
          شماره موبایل
        </label>
        <input
          id="phone_view"
          className={`${s.input} ${s.readonly}`}
          defaultValue={phoneValue}
          disabled
          readOnly
        />
      </div>

      <div className={s.ctaBar}>
        <Button
          as="button"
          /* variant props of your Button (new API) */
          type="primary"
          style="filled"
          size="large"
          className={s.ctaBtn}
          loading={submitting}
          disabled={submitting}
          aria-busy={submitting || undefined}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            // Mimic HTML submit (since `type` prop is used for variant)
            const form = e.currentTarget.closest(
              "form"
            ) as HTMLFormElement | null;
            form?.requestSubmit();
          }}
        >
          ثبت اطلاعات
        </Button>
      </div>
    </form>
  );
}
