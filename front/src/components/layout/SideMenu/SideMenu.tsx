"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const LazySideMenu = dynamic(() => import("./SideMenuInner"), {
  ssr: false,
  loading: () => null,
});

export default function SideMenuWrapper(props: any) {
  const [mounted, setMounted] = useState(false);

  if (!props.isOpen && !mounted) return null;
  if (props.isOpen && !mounted) setMounted(true);

  return <LazySideMenu {...props} />;
}
