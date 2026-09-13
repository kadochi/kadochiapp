"use client";

import { MapPin, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";

import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Select } from "@/components/ui/select";
import {
  giftFinderCityOptions,
  giftFinderDeliveryOptions,
  giftFinderPriceOptions,
  giftFinderProductPath,
  giftFinderQuickStarts,
  giftFinderReducer,
  initialGiftFinderState,
  type GiftFinderAnswers,
  type GiftFinderCategoryOption,
  type GiftFinderFilterOption,
  type GiftFinderOption,
  type GiftFinderQuickStart,
  type GiftFinderTagOption,
} from "@/features/gift-finder/gift-finder-flow";
import { cn } from "@/lib/utils";

import styles from "./gift-finder.module.css";

const TYPING_DELAY_MS = 2000;

type GiftFinderProps = {
  recipientOptions: GiftFinderTagOption[];
  occasionOptions: GiftFinderTagOption[];
  categoryOptions: GiftFinderCategoryOption[];
};

const steps = [
  {
    empty: "در حال حاضر گزینه‌ای برای مناسبت وجود ندارد.",
    id: "occasion",
    label: "مناسبت",
    question: "برای چه مناسبتی کادو می‌دهید؟",
  },
  {
    empty: "در حال حاضر گزینه‌ای برای زمان تحویل وجود ندارد.",
    id: "delivery",
    label: "زمان تحویل",
    question: "کادو را چه زمانی می‌خواهید تحویل بگیرید؟",
  },
  {
    empty: "در حال حاضر گزینه‌ای برای گیرنده وجود ندارد.",
    id: "recipient",
    label: "گیرنده",
    question: "کادو برای چه کسی است؟",
  },
  {
    empty: "در حال حاضر بازه قیمتی‌ای برای انتخاب وجود ندارد.",
    id: "price",
    label: "بازه قیمت",
    question: "چه بازه قیمتی‌ای برای کادو در نظر دارید؟",
  },
  {
    empty: "در حال حاضر شهری برای ارسال وجود ندارد.",
    id: "city",
    label: "شهر تحویل",
    question: "کادو به کدام شهر ارسال می‌شود؟",
  },
] as const;

function answerAt(answers: GiftFinderAnswers, step: number) {
  if (step === 0) return answers.occasion;
  if (step === 1) return answers.delivery;
  if (step === 2) return answers.recipient;
  if (step === 3) return answers.price;
  return answers.city;
}

function LineProgress({ value }: { value: number }) {
  return (
    <ol aria-label="مراحل جستجوی کادو" className="mb-24 grid grid-cols-5 gap-6" dir="rtl">
      {steps.map((step, index) => {
        const status = index < value ? "complete" : index === value ? "current" : "upcoming";
        return (
          <li className="min-w-0" key={step.id}>
            <span
              aria-hidden
              className={cn(
                "block h-4 rounded-rounded transition-colors",
                status === "complete" && "bg-secondary",
                status === "current" && "bg-primary",
                status === "upcoming" && "bg-border-low-emphasis",
              )}
            />
            <span
              className={cn(
                "mt-6 block truncate text-center text-label-10",
                status === "current" ? "font-bold text-primary" : "text-surface-neutral-mid-emphasis",
              )}
            >
              {step.label}
              <span className="sr-only">
                {status === "complete" ? "، تکمیل‌شده" : status === "current" ? "، مرحله فعلی" : "، در انتظار"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function QuestionBubble({ id, children }: { id: string; children: string }) {
  return (
    <div
      className="ms-auto max-w-[88%] rounded-xl rounded-tl-xs border border-border-low-emphasis bg-surface-soft px-16 py-12 text-body-14 leading-[var(--text-body-14--line-height)] text-surface-neutral-high-emphasis min-[864px]:max-w-[72%]"
      id={id}
    >
      {children}
    </div>
  );
}

function TypingBubble() {
  return (
    <div
      aria-label="در حال نوشتن پاسخ"
      className="ms-auto inline-flex w-fit items-center gap-4 rounded-xl rounded-tl-xs border border-border-low-emphasis bg-surface-soft px-16 py-12"
      role="status"
    >
      <span aria-hidden className={styles.typingDots}>
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

function SelectedAnswer({
  emoji,
  option,
  onEdit,
}: {
  emoji?: string;
  option: GiftFinderOption;
  onEdit: () => void;
}) {
  return (
    <div className="me-auto flex max-w-[88%] items-center gap-8 rounded-xl rounded-tr-xs bg-secondary-container px-12 py-8 text-label-14 text-on-secondary-container min-[864px]:max-w-[72%]">
      {emoji ? <span aria-hidden>{emoji}</span> : null}
      <span>{option.label}</span>
      <button
        aria-label={`ویرایش پاسخ ${option.label}`}
        className="cursor-pointer rounded-rounded border-0 bg-surface-background px-8 py-4 text-label-12 font-bold text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        type="button"
        onClick={onEdit}
      >
        ویرایش
      </button>
    </div>
  );
}

function ChipButton({
  emoji,
  option,
  onSelect,
}: {
  emoji?: string;
  option: GiftFinderOption;
  onSelect: () => void;
}) {
  return (
    <button
      aria-label={option.description ? `${option.label}، ${option.description}` : option.label}
      className="inline-flex shrink-0 cursor-pointer border-0 bg-transparent p-0 focus-visible:rounded-rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      dir="rtl"
      type="button"
      onClick={onSelect}
    >
      <Chip
        className="h-auto min-h-40 whitespace-nowrap py-8 text-center"
        leadingIcon={emoji ? <span>{emoji}</span> : undefined}
        size="md"
      >
        {option.label}
      </Chip>
    </button>
  );
}

function QuickStartRowGroup({
  className,
  options,
  onSelect,
  rowCount,
}: {
  className: string;
  options: readonly GiftFinderQuickStart[];
  onSelect: (option: GiftFinderQuickStart) => void;
  rowCount: number;
}) {
  const rows = Array.from({ length: rowCount }, () => [] as GiftFinderQuickStart[]);
  options.forEach((option, index) => rows[index % rows.length].push(option));
  const rowStyles = [
    styles.quickStartTrackOne,
    styles.quickStartTrackTwo,
    styles.quickStartTrackThree,
    styles.quickStartTrackFour,
  ];

  return (
    <div
      aria-label="پیشنهادهای شروع سریع"
      className={className}
      role="group"
    >
      {rows.map((row, rowIndex) => (
        <div className={styles.quickStartRail} key={rowIndex}>
          <div className={cn(styles.quickStartTrack, rowStyles[rowIndex])}>
            {row.map((option) => (
              <ChipButton
                emoji={option.emoji}
                key={option.id}
                option={option}
                onSelect={() => onSelect(option)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickStartRows({
  options,
  onSelect,
}: {
  options: readonly GiftFinderQuickStart[];
  onSelect: (option: GiftFinderQuickStart) => void;
}) {
  return (
    <>
      <QuickStartRowGroup
        className="grid gap-8 min-[864px]:hidden"
        options={options}
        rowCount={4}
        onSelect={onSelect}
      />
      <QuickStartRowGroup
        className="hidden gap-8 min-[864px]:grid"
        options={options}
        rowCount={2}
        onSelect={onSelect}
      />
    </>
  );
}

function OptionChips({
  empty,
  labelledBy,
  emojiFor,
  onSelect,
  options,
}: {
  empty: string;
  labelledBy: string;
  emojiFor: (option: GiftFinderOption) => string | undefined;
  onSelect: (option: GiftFinderOption) => void;
  options: readonly GiftFinderOption[];
}) {
  if (!options.length) {
    return (
      <p className="me-auto rounded-m bg-error-container px-12 py-8 text-body-12 text-on-error-container" role="status">
        {empty}
      </p>
    );
  }

  return (
    <div aria-labelledby={labelledBy} className="flex flex-wrap justify-start gap-8 [direction:ltr]" role="group">
      {options.map((option) => (
        <ChipButton
          emoji={emojiFor(option)}
          key={option.id}
          option={option}
          onSelect={() => onSelect(option)}
        />
      ))}
    </div>
  );
}

function optionEmoji(option: GiftFinderOption, step: (typeof steps)[number]["id"]) {
  const searchable = `${option.id} ${option.label}`.toLocaleLowerCase("en-US");

  if (step === "occasion") {
    if (/birthday|تولد/.test(searchable)) return "🎂";
    if (/valentine|عشق/.test(searchable)) return "❤️";
    if (/anniv|سالگرد/.test(searchable)) return "💍";
    if (/parent|مادر|پدر/.test(searchable)) return "👪";
    if (/grad|مسیر/.test(searchable)) return "🎓";
    if (/yalda|یلدا/.test(searchable)) return "🍉";
    if (/newyear|نوروز/.test(searchable)) return "🌱";
    return "🎁";
  }

  if (step === "delivery") {
    return /today|امروز/.test(searchable) ? "🚚" : "🗓️";
  }

  if (step === "recipient") {
    if (/girl|دختر/.test(searchable)) return "👧";
    if (/woman|زن/.test(searchable)) return "👩";
    if (/boy|پسر/.test(searchable)) return "👦";
    if (/man|مرد/.test(searchable)) return "👨";
  }

  if (step === "city") return "📍";
  if (/under-one|تا ۱/.test(searchable)) return "🪙";
  if (/one-to-three|۱ تا ۳/.test(searchable)) return "💳";
  if (/over|بیشتر/.test(searchable)) return "✨";
  if (/flexible|انعطاف/.test(searchable)) return "↔️";
  return "🎁";
}

/** A route-backed, conversational finder that preserves the catalog query contract. */
export function GiftFinder({ recipientOptions, occasionOptions, categoryOptions }: Readonly<GiftFinderProps>) {
  const router = useRouter();
  const [state, dispatch] = useReducer(giftFinderReducer, initialGiftFinderState);
  const [isOpen, setIsOpen] = useState(true);
  const [isNavigating, startNavigation] = useTransition();
  const [revealedStep, setRevealedStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const optionGroups: readonly (readonly GiftFinderOption[])[] = [
    occasionOptions,
    giftFinderDeliveryOptions,
    recipientOptions,
    giftFinderPriceOptions,
    giftFinderCityOptions,
  ];
  const quickStarts = useMemo(
    () => giftFinderQuickStarts({ categoryOptions, occasionOptions }),
    [categoryOptions, occasionOptions],
  );
  const guidedStart = quickStarts.find((option) => option.id === "guided");
  const preferenceStarts = quickStarts.filter((option) => option.id !== "guided");
  const isComplete = state.stage === "questions" && state.currentStep === steps.length &&
    Boolean(state.answers.occasion && state.answers.delivery && state.answers.recipient && state.answers.price && state.answers.city);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [isTyping, revealedStep, state.stage]);

  useEffect(() => {
    if (!isTyping) return;
    const timeoutId = window.setTimeout(() => {
      setRevealedStep(state.currentStep);
      setIsTyping(false);
    }, TYPING_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isTyping, state.currentStep]);

  const closeFinder = () => {
    setIsOpen(false);
    router.push("/");
  };

  const selectOption = (step: number, option: GiftFinderOption) => {
    setRevealedStep(step);
    setIsTyping(true);
    if (step === 0) {
      dispatch({ type: "select-occasion", option: option as GiftFinderTagOption });
    } else if (step === 1) {
      dispatch({ type: "select-delivery", option: option as GiftFinderFilterOption });
    } else if (step === 2) {
      dispatch({ type: "select-recipient", option: option as GiftFinderTagOption });
    } else {
      dispatch({ type: "select-price", option: option as GiftFinderFilterOption });
    }
  };

  const applyQuickStart = (suggestion: GiftFinderQuickStart) => {
    setRevealedStep(-1);
    setIsTyping(true);
    dispatch({ type: "apply-quick-start", suggestion });
  };

  const editAnswer = (step: number) => {
    setIsTyping(false);
    setRevealedStep(step);
    dispatch({ type: "edit", step });
  };

  const restartFinder = () => {
    setIsTyping(false);
    setRevealedStep(0);
    dispatch({ type: "restart" });
  };

  const showRecommendations = () => {
    const path = giftFinderProductPath(state.answers);
    if (!path) return;
    startNavigation(() => router.push(path));
  };

  return (
    <BottomSheet open={isOpen} onOpenChange={(open) => !open && closeFinder()}>
      <BottomSheetContent
        aria-describedby="gift-finder-description"
        footer={isComplete && !isTyping ? (
          <div className="border-t border-border-low-emphasis bg-surface-background p-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))]">
            <Button
              className="w-full"
              loading={isNavigating}
              size="large"
              variant="secondary-filled"
              onClick={showRecommendations}
            >
              مشاهده پیشنهادها
            </Button>
          </div>
        ) : undefined}
        showHandle={false}
        size="md"
      >
        <BottomSheetHeader className="sticky top-0 z-10 flex-row items-center justify-between border-b border-border-low-emphasis bg-surface-background py-16">
          <div className="min-w-0">
            <BottomSheetTitle className="m-0 text-title-18 font-bold text-text-primary">
              جستجوی کادو
            </BottomSheetTitle>
            <BottomSheetDescription
              className="mt-4 text-body-14 text-text-secondary"
              id="gift-finder-description"
            >
              با چند مرحله ساده به پیشنهاد مناسب برسید
            </BottomSheetDescription>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {state.stage === "questions" ? (
              <Button
                aria-label="شروع دوباره جستجوی کادو"
                className="size-40 px-0"
                disabled={isNavigating}
                size="small"
                title="شروع دوباره"
                variant="link-ghost"
                onClick={restartFinder}
              >
                <RotateCcw aria-hidden />
              </Button>
            ) : null}
            <BottomSheetClose asChild>
              <Button
                aria-label="بستن جستجوی کادو"
                className="size-40 px-0 [--button-icon-size:24px]"
                disabled={isNavigating}
                size="small"
                title="بستن"
                variant="link-ghost"
              >
                <X aria-hidden />
              </Button>
            </BottomSheetClose>
          </div>
        </BottomSheetHeader>

        <div className="w-full [direction:rtl]">
          {state.stage === "quick-start" ? (
            <section aria-labelledby="gift-finder-quick-start-title" className="px-20 pb-32 pt-32">
              <p
                className="mx-auto max-w-[30rem] text-center text-body-14 leading-[var(--text-body-14--line-height)] text-surface-neutral-mid-emphasis"
                id="gift-finder-quick-start-title"
              >
                بر اساس اولویتتان یکی را برای شروع انتخاب کنید.
              </p>

              <div className="mt-28">
                <QuickStartRows
                  options={preferenceStarts}
                  onSelect={applyQuickStart}
                />
              </div>

              <div aria-hidden className="my-28 flex items-center gap-12 text-label-12 text-surface-neutral-low-emphasis">
                <span className="h-px flex-1 bg-border-low-emphasis" />
                <span>یا</span>
                <span className="h-px flex-1 bg-border-low-emphasis" />
              </div>

              {guidedStart ? (
                <div className="flex justify-center">
                  <ChipButton
                    emoji={guidedStart.emoji}
                    option={guidedStart}
                    onSelect={() => applyQuickStart(guidedStart)}
                  />
                </div>
              ) : null}
            </section>
          ) : (
            <div className="px-20 py-16">
              <LineProgress value={state.currentStep} />

              <section aria-label="گفت‌وگوی جستجوی کادو" className="flex flex-col gap-12">
                {state.quickStart ? (
                  <SelectedAnswer
                    emoji={state.quickStart.emoji}
                    option={state.quickStart}
                    onEdit={restartFinder}
                  />
                ) : null}

                {steps.map((step, index) => {
                  if (index > revealedStep) return null;
                  const answer = answerAt(state.answers, index);
                  if (answer && state.quickStart?.prefilledStep === index) return null;
                  const questionId = `gift-finder-question-${step.id}`;
                  const active = !isTyping && index === state.currentStep;

                  if (step.id === "city") {
                    return (
                      <Fragment key={step.id}>
                        <QuestionBubble id={questionId}>{step.question}</QuestionBubble>
                        <div className="ms-auto w-full max-w-[88%] rounded-xl rounded-tl-xs border border-border-low-emphasis bg-surface-soft p-12 min-[864px]:max-w-[72%]">
                          <Select
                            aria-label="شهر تحویل"
                            description="در حال حاضر فقط در شهر تهران امکان ارسال وجود دارد."
                            disabled
                            items={giftFinderCityOptions.map((city) => ({ label: city.label, value: city.id }))}
                            leadingIcon={<MapPin />}
                            value={state.answers.city?.id ?? giftFinderCityOptions[0].id}
                          />
                        </div>
                      </Fragment>
                    );
                  }

                  return (
                    <Fragment key={step.id}>
                      <QuestionBubble id={questionId}>{step.question}</QuestionBubble>
                      {answer ? (
                        <SelectedAnswer
                          emoji={optionEmoji(answer, step.id)}
                          option={answer}
                          onEdit={() => editAnswer(index)}
                        />
                      ) : null}
                      {active && !answer ? (
                        <div aria-live="polite">
                          <OptionChips
                            empty={step.empty}
                            emojiFor={(option) => optionEmoji(option, step.id)}
                            labelledBy={questionId}
                            options={optionGroups[index]}
                            onSelect={(option) => selectOption(index, option)}
                          />
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}

                {isTyping ? <TypingBubble /> : null}

                {isComplete && !isTyping ? (
                  <div aria-live="polite" className="ms-auto max-w-[88%] rounded-xl rounded-tl-xs bg-primary-container px-16 py-12 text-body-14 text-on-primary-container min-[864px]:max-w-[72%]">
                    عالی است؛ پیشنهادها بر اساس همین انتخاب‌ها آماده‌اند.
                  </div>
                ) : null}
                <div aria-hidden ref={conversationEndRef} />
              </section>
            </div>
          )}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
