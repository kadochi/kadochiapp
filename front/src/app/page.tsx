"use client";

import { useState } from "react";
import { Button } from "../components/ui/button";

const items = ["Buttons", "Inputs", "Selection", "Feedback"];

function ArrowUpRight() {
  return <svg className="size-4 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>;
}

function Plus() {
  return <svg className="size-4 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

export default function HomePage() {
  const [activeSection, setActiveSection] = useState("Buttons");
  const [activeVariant, setActiveVariant] = useState("Primary");
  const [subscribed, setSubscribed] = useState(true);

  return (
    <main className="min-h-screen bg-surface-soft font-sans text-text-primary">
      <header className="sticky top-0 z-10 flex h-[76px] items-center gap-6 border-b border-border-low-emphasis bg-surface-soft/95 px-6 backdrop-blur md:px-12">
        <a href="#top" aria-label="Kadochi design system home" className="flex items-center gap-2 font-serif text-2xl font-bold tracking-[-.08em]">
          <span className="grid size-[23px] -rotate-[18deg] place-items-center rounded-full bg-primary"><span className="size-2 translate-x-0.5 -translate-y-0.5 rounded-full bg-surface-soft" /></span>
          kadochi<span className="text-primary">.</span>
        </a>
        <p className="mx-auto hidden items-center gap-2 text-label-12 text-surface-neutral-low-emphasis sm:flex"><span className="size-1.5 rounded-full bg-success" /> Design system <span className="border-l border-border-low-emphasis pl-2">v2.4.0</span></p>
        <a href="#buttons" className="flex items-center gap-2 text-label-14 no-underline">Documentation <ArrowUpRight /></a>
      </header>

      <div id="top" className="mx-auto grid max-w-[1440px] lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-76px)] border-r border-border-low-emphasis px-7 py-12 lg:block">
          <p className="mb-3 text-label-10 font-bold tracking-[.13em] text-surface-neutral-low-emphasis">FOUNDATIONS</p>
          {["Overview", "Color", "Typography", "Spacing"].map((item, index) => <button key={item} type="button" className={`flex w-full justify-between rounded-xs px-2.5 py-2.5 text-left text-label-14 ${index === 0 ? "bg-surface-dim text-text-primary" : "text-surface-neutral-mid-emphasis hover:bg-surface-dim"}`}>{item}<span className="text-label-10 text-surface-neutral-low-emphasis">0{index + 1}</span></button>)}
          <p className="mb-3 mt-9 text-label-10 font-bold tracking-[.13em] text-surface-neutral-low-emphasis">COMPONENTS</p>
          {items.map((item, index) => <button key={item} type="button" onClick={() => setActiveSection(item)} className={`flex w-full justify-between rounded-xs px-2.5 py-2.5 text-left text-label-14 ${activeSection === item ? "bg-surface-dim text-text-primary" : "text-surface-neutral-mid-emphasis hover:bg-surface-dim"}`}>{item}<span className="text-label-10 text-surface-neutral-low-emphasis">0{index + 5}</span></button>)}
          <div className="mt-20 border-t border-border-low-emphasis pt-5 text-body-12 leading-5 text-surface-neutral-mid-emphasis"><span className="text-title-16 text-primary">✦</span><p className="mt-2 max-w-32">Built to make every interaction feel considered.</p></div>
        </aside>

        <section className="min-w-0 px-6 py-8 md:px-14 md:py-10">
          <div className="flex items-center gap-2 text-label-12 text-surface-neutral-low-emphasis"><span>System</span><i className="size-[3px] rounded-full bg-surface-neutral-low-emphasis" /><span>Components</span><i className="size-[3px] rounded-full bg-surface-neutral-low-emphasis" /><strong className="font-regular text-text-primary">{activeSection}</strong></div>
          <section className="flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between md:py-16">
            <div><p className="mb-4 text-label-10 font-bold tracking-[.15em] text-primary">DESIGN SYSTEM / 2024</p><h1 className="max-w-175 text-[clamp(2.7rem,5.1vw,4.5rem)] leading-[1.04] tracking-[-.07em]">Components that<br /><em className="font-serif font-normal tracking-[-.055em] text-primary">feel like Kadochi.</em></h1></div>
            <p className="max-w-56 text-body-14 leading-6 text-surface-neutral-mid-emphasis">A precise, warm system for crafting the little moments that make giving more meaningful.</p>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="relative min-h-52 overflow-hidden rounded-l bg-[#f1ead7] p-6"><span className="text-label-10 font-bold tracking-[.15em] text-primary">TOKENS</span><strong className="mt-5 block font-serif text-6xl font-normal leading-none">48</strong><p className="mt-3 text-body-12 text-surface-neutral-mid-emphasis">Core design tokens</p><span className="absolute bottom-6 right-6 flex items-end gap-1"><i className="h-2.5 w-1.5 rounded-full bg-[#c9bd9b]" /><i className="h-4 w-1.5 rounded-full bg-[#c9bd9b]" /><i className="h-6 w-1.5 rounded-full bg-[#c9bd9b]" /><i className="h-8 w-1.5 rounded-full bg-[#c9bd9b]" /></span></div>
            <div className="relative min-h-52 overflow-hidden rounded-l bg-secondary-container p-6"><span className="text-label-10 font-bold tracking-[.15em] text-secondary">COMPONENTS</span><strong className="mt-5 block font-serif text-6xl font-normal leading-none">18</strong><p className="mt-3 text-body-12 text-surface-neutral-mid-emphasis">Built for everyday joy</p><span className="absolute bottom-7 right-6 flex items-center gap-2"><i className="size-7 rounded-full bg-secondary/45" /><i className="size-5 rounded-xxs bg-secondary/45" /><i className="size-3 rotate-45 bg-secondary/45" /></span></div>
            <div className="relative min-h-52 overflow-hidden rounded-l bg-primary p-6 text-on-primary"><span className="text-label-10 font-bold tracking-[.15em] text-primary-container">PHILOSOPHY</span><p className="mt-6 max-w-67 font-serif text-[25px] leading-[1.22]">“Simple enough to disappear. Warm enough to remember.”</p><span className="absolute bottom-6 right-6 grid size-10 place-items-center rounded-full border border-on-primary/45"><ArrowUpRight /></span></div>
          </section>

          <section id="buttons" className="pt-18">
            <div className="mb-5 flex items-end justify-between gap-5"><div className="grid grid-cols-[35px_auto] gap-x-3"><span className="row-span-2 pt-2 text-label-12 text-surface-neutral-low-emphasis">01</span><h2 className="font-serif text-[29px] leading-8 tracking-[-.04em]">Buttons</h2><p className="mt-1 text-body-12 text-surface-neutral-mid-emphasis">Actions with a clear sense of purpose.</p></div><span className="hidden text-label-12 text-surface-neutral-low-emphasis sm:block">5 variants · 3 sizes</span></div>
            <div className="rounded-l border border-border-low-emphasis bg-surface-background px-4 pt-5 md:px-6">
              <div className="flex items-start justify-between gap-4"><p className="pt-2 text-label-10 font-bold tracking-[.13em] text-surface-neutral-low-emphasis">VARIANTS</p><div className="flex flex-wrap justify-end gap-1 rounded-xs bg-surface p-1">{["Primary", "Secondary", "Tonal", "Outline"].map(item => <button key={item} type="button" onClick={() => setActiveVariant(item)} aria-pressed={activeVariant === item} className={`rounded-xxs px-2.5 py-1.5 text-label-12 ${activeVariant === item ? "bg-surface-background text-text-primary shadow-sm" : "text-surface-neutral-mid-emphasis"}`}>{item}</button>)}</div></div>
              <div className="flex flex-wrap items-center gap-3 py-12"><Button variant="primary-filled" size="large">Send a gift <ArrowUpRight /></Button><Button variant="secondary-filled" size="large">Save for later</Button><Button variant="primary-tonal" size="large"><Plus /> Add to list</Button><Button variant="tertiary-outline" size="large">Learn more</Button></div>
              <div className="flex h-12 items-center justify-between border-t border-border-low-emphasis text-label-10 text-surface-neutral-low-emphasis"><span>Primary / Large</span><code className="hidden font-mono sm:block">&lt;Button variant=&quot;primary-filled&quot; /&gt;</code></div>
            </div>
          </section>

          <section className="grid gap-10 pt-18 md:grid-cols-2 md:gap-12">
            <div><div className="mb-5 grid grid-cols-[35px_auto] gap-x-3"><span className="row-span-2 pt-2 text-label-12 text-surface-neutral-low-emphasis">02</span><h2 className="font-serif text-[29px] leading-8 tracking-[-.04em]">Selection</h2><p className="mt-1 text-body-12 text-surface-neutral-mid-emphasis">Small decisions, beautifully clear.</p></div><div className="border-t border-border-low-emphasis pt-5"><button type="button" onClick={() => setSubscribed(!subscribed)} aria-pressed={subscribed} className="flex items-start gap-3 text-left"><span className={`grid size-[18px] shrink-0 place-items-center rounded-xxs border text-label-12 text-on-primary ${subscribed ? "border-primary bg-primary" : "border-border-high-emphasis"}`}>{subscribed ? "✓" : ""}</span><span><strong className="block text-label-14 font-regular">Keep me in the loop</strong><small className="mt-1 block text-label-12 text-surface-neutral-mid-emphasis">Occasional notes worth opening</small></span></button><div className="mt-6 flex flex-wrap items-center gap-2 text-label-12"><i className="size-[15px] rounded-full border-4 border-primary" /><span className="mr-4">Send now</span><i className="size-[15px] rounded-full border border-border-high-emphasis" /><span>Schedule for later</span></div></div></div>
            <div><div className="mb-5 grid grid-cols-[35px_auto] gap-x-3"><span className="row-span-2 pt-2 text-label-12 text-surface-neutral-low-emphasis">03</span><h2 className="font-serif text-[29px] leading-8 tracking-[-.04em]">Feedback</h2><p className="mt-1 text-body-12 text-surface-neutral-mid-emphasis">Helpful, never in the way.</p></div><div className="flex items-start gap-3 rounded-m bg-success-container p-4"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-label-12 text-on-success">✓</span><div><strong className="text-label-14 font-regular">Added to your gift list</strong><p className="mt-1 text-label-12 text-on-success-container">It&apos;s ready whenever you are.</p></div><button type="button" aria-label="Dismiss notification" className="ml-auto text-title-18 leading-none text-on-success-container">×</button></div></div>
          </section>
        </section>
      </div>
    </main>
  );
}
