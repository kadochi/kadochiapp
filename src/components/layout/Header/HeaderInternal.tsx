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
    <header className={s.root}>
      <a
        href={backUrl || "#"}
        className={s.back}
        aria-label="بازگشت"
        onClick={(e) => {
          e.preventDefault();
          if (backUrl) {
            router.push(backUrl);
          } else if (typeof history !== "undefined") {
            history.back();
          }
        }}
      >
        <Image
          src="/icons/arrow-right.svg"
          alt=""
          width={24}
          height={24}
          className={s.icon}
          aria-hidden
        />
      </a>

      {pageTitle ? <h1 className={s.title}>{pageTitle}</h1> : null}

      <div className={s.logoWrap}>
        <Link href="/" aria-label="صفحه اصلی">
          <Image
            src="/images/logo.svg"
            alt="Kadochi"
            width={56}
            height={56}
            className={s.logo}
            priority
          />
        </Link>
      </div>
    </header>
  );
}