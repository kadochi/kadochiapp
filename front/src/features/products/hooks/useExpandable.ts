import { useEffect, useRef, useState, type RefObject } from "react";

export type UseExpandableResult<T extends HTMLElement> = {
  contentRef: RefObject<T | null>;
  isExpanded: boolean;
  canExpand: boolean;
  toggle: () => void;
};

/** Tracks whether clamped content overflows and exposes a toggle to expand it. */
export function useExpandable<T extends HTMLElement>(): UseExpandableResult<T> {
  const contentRef = useRef<T>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || isExpanded) return;
    const measure = () => setCanExpand((prev) => prev || element.scrollHeight > element.clientHeight + 4);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isExpanded]);

  return { contentRef, isExpanded, canExpand, toggle: () => setIsExpanded((prev) => !prev) };
}
