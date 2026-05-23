"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import s from "./HeaderInternal.module.css";

type Props = {
  title?: string;
  backUrl?: string;
};

export default function HeaderInternal({ title, backUrl }: Props) {
  const [pageTitle, setPageTitle] = useState<string | undefined>(title);
  const router = useRouter();

  useEffect(() => {
    if (title === undefined && typeof document !== "undefined") {
      setPageTitle(document.title || undefined);
    } else {
      setPageTitle(title);
    }
  }, [title]);

  return (
    <header className={s.root} dir="rtl" aria-label="سربرگ داخلی">
      <a
        href={backUrl || "#"}
        className={s.back}
        aria-label="بازگشت"
        onClick={(e) => {
          e.preventDefault();
          if (backUrl) router.push(backUrl);
          else if (typeof history !== "undefined") history.back();
        }}
      >
        <Image
          src="/icons/arrow-right.svg"
          alt=""
          width={32}
          height={32}
          className={s.icon}
          aria-hidden
          priority={false}
        />
      </a>

      {pageTitle ? <h1 className={s.title}>{pageTitle}</h1> : null}

      <div className={s.logoWrap}>
        <Link href="/" aria-label="صفحه اصلی" className={s.logoLink}>
          <Image
            src="/images/logo.svg"
            alt="Kadochi"
            width={60}
            height={56}
            className={s.logo}
          />
        </Link>
      </div>
    </header>
  );
}
