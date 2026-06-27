"use client"

import dynamic from "next/dynamic"

const NextTopLoader = dynamic(() => import("nextjs-toploader"), { ssr: false })

export default NextTopLoader
