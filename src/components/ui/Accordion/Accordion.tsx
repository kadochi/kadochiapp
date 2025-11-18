"use client";

import { useState } from "react";
import s from "./Accordion.module.css";

type Item = { q: string; a: string };

export default function Accordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className={s.wrap}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className={s.item}>
            <button
              type="button"
              className={s.question}
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className={s.qText}>{item.q}</span>
              <span className={s.icon}>{isOpen ? "−" : "+"}</span>
            </button>

            {isOpen && <div className={s.answer}>{item.a}</div>}
          </div>
        );
      })}
    </div>
  );
}
