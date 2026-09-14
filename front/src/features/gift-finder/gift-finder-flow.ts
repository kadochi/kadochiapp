export type GiftFinderOption = {
  id: string;
  imageUrl?: string;
  label: string;
  description?: string;
};

export type GiftFinderTagOption = GiftFinderOption & { tagSlugs: string[] };
export type GiftFinderCategoryOption = GiftFinderOption & { slug: string };

export type GiftFinderFilters = {
  deliveryTime?: "today" | "tomorrow";
  maxPrice?: string;
  minPrice?: string;
};

export type GiftFinderFilterOption = GiftFinderOption & {
  filters: GiftFinderFilters;
};

export type GiftFinderCityOption = GiftFinderOption;

/** The audience facets attached to the existing recipient tags. */
export type GiftFinderRecipientGender = "female" | "male" | "any";
export type GiftFinderRecipientAgeBand = "child" | "teen" | "young-adult" | "adult";
export type GiftFinderRecipientOption = GiftFinderTagOption & {
  gender: GiftFinderRecipientGender;
  ageBand: GiftFinderRecipientAgeBand;
};

export type GiftFinderRecipientExperience = {
  inferredGender?: Exclude<GiftFinderRecipientGender, "any">;
  options: GiftFinderRecipientOption[];
  question: string;
};

export type GiftFinderAnswers = {
  occasion?: GiftFinderTagOption;
  delivery?: GiftFinderFilterOption;
  recipient?: GiftFinderTagOption;
  price?: GiftFinderFilterOption;
  city?: GiftFinderCityOption;
  /** Optional context supplied by a category-based quick start; it is not a question step. */
  category?: GiftFinderCategoryOption;
};

export type GiftFinderQuickStart = GiftFinderOption & {
  answers?: GiftFinderAnswers;
  emoji: string;
  prefilledStep?: 0 | 1 | 2 | 3;
};

export type GiftFinderQuickStartSelection = Pick<
  GiftFinderQuickStart,
  "emoji" | "id" | "label" | "prefilledStep"
>;

export type GiftFinderState = {
  /** Zero through four are questions; five is the completed summary. */
  currentStep: number;
  answers: GiftFinderAnswers;
  quickStart?: GiftFinderQuickStartSelection;
  stage: "quick-start" | "questions";
};

export type GiftFinderAction =
  | { type: "select-occasion"; option: GiftFinderTagOption }
  | { type: "select-delivery"; option: GiftFinderFilterOption }
  | { type: "select-recipient"; option: GiftFinderTagOption }
  | { type: "select-price"; option: GiftFinderFilterOption }
  | { type: "select-city"; option: GiftFinderCityOption }
  | { type: "apply-quick-start"; suggestion: GiftFinderQuickStart }
  | { type: "edit"; step: number }
  | { type: "previous" }
  | { type: "restart" };

export const giftFinderDeliveryOptions: readonly GiftFinderFilterOption[] = [
  {
    filters: { deliveryTime: "today" },
    id: "today",
    label: "امروز",
  },
  {
    filters: { deliveryTime: "tomorrow" },
    id: "tomorrow",
    label: "فردا",
  },
  {
    filters: {},
    id: "flexible",
    label: "فرقی ندارد",
  },
];

export const giftFinderPriceOptions: readonly GiftFinderFilterOption[] = [
  {
    filters: { maxPrice: "1000000" },
    id: "under-one-million",
    label: "تا ۱ میلیون تومان",
  },
  {
    filters: { maxPrice: "3000000", minPrice: "1000000" },
    id: "one-to-three-million",
    label: "۱ تا ۳ میلیون تومان",
  },
  {
    filters: { maxPrice: "5000000", minPrice: "3000000" },
    id: "three-to-five-million",
    label: "۳ تا ۵ میلیون تومان",
  },
  {
    filters: { minPrice: "5000000" },
    id: "over-five-million",
    label: "بیشتر از ۵ میلیون تومان",
  },
  {
    filters: {},
    id: "flexible",
    label: "بودجه‌ام انعطاف‌پذیر است",
  },
];

/** Tehran is the only available city today; this list can expand without changing the flow. */
export const giftFinderCityOptions: readonly GiftFinderCityOption[] = [
  {
    id: "tehran",
    label: "تهران",
  },
];

type OccasionRecipientRule = {
  ageBands: readonly GiftFinderRecipientAgeBand[];
  gender?: Exclude<GiftFinderRecipientGender, "any">;
  id: string;
  /** Matches stable option IDs, taxonomy slugs, and Persian labels from structured occasion data. */
  matchTerms: readonly string[];
  question?: string;
};

const recipientRules: readonly OccasionRecipientRule[] = [
  {
    ageBands: ["child", "teen"],
    id: "child-birthday",
    matchTerms: ["child-birthday", "تولد کودک"],
    question: "کادوی کودک برای چه کسی است؟",
  },
  {
    ageBands: ["young-adult", "adult"],
    id: "parents",
    matchTerms: ["parents", "روز مادر یا روز پدر"],
  },
  {
    ageBands: ["young-adult", "adult"],
    gender: "female",
    id: "mothers-day",
    matchTerms: ["motherday", "mother-day", "روز مادر"],
    question: "سن گیرنده را انتخاب کنید.",
  },
  {
    ageBands: ["young-adult", "adult"],
    gender: "male",
    id: "fathers-day",
    matchTerms: ["fatherday", "father-day", "روز پدر"],
    question: "سن گیرنده را انتخاب کنید.",
  },
  {
    ageBands: ["young-adult", "adult"],
    id: "romantic-adult",
    matchTerms: ["valentine", "anniversary", "ولنتاین", "عشق", "سالگرد"],
  },
  {
    ageBands: ["teen", "young-adult", "adult"],
    id: "graduation",
    matchTerms: ["graduation", "فارغ التحصیلی", "شروع مسیر جدید"],
  },
];

const defaultRecipientRule: OccasionRecipientRule = {
  ageBands: ["child", "teen", "young-adult", "adult"],
  id: "default",
  matchTerms: [],
};

function normalizedRecipientRuleValue(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function recipientRuleForOccasion(occasion?: GiftFinderTagOption) {
  if (!occasion) return defaultRecipientRule;
  const searchable = [occasion.id, occasion.label, ...occasion.tagSlugs]
    .map(normalizedRecipientRuleValue)
    .join(" ");
  return recipientRules.find((rule) => (
    rule.matchTerms.some((term) => searchable.includes(normalizedRecipientRuleValue(term)))
  )) ?? defaultRecipientRule;
}

/**
 * Produces the recipient/age options for an occasion from one policy table.
 * This keeps selection UI and recommendation constraints aligned as new
 * structured occasions become available.
 */
export function giftFinderRecipientExperience(
  recipientOptions: readonly GiftFinderRecipientOption[],
  occasion?: GiftFinderTagOption,
): GiftFinderRecipientExperience {
  const rule = recipientRuleForOccasion(occasion);
  const options = recipientOptions.filter((option) => (
    rule.ageBands.includes(option.ageBand) && (!rule.gender || option.gender === rule.gender)
  ));

  return {
    inferredGender: rule.gender,
    options,
    question: rule.question ?? "کادو برای چه کسی است؟",
  };
}

export const initialGiftFinderState: GiftFinderState = {
  currentStep: 0,
  answers: {},
  stage: "quick-start",
};

const answerKeys = ["occasion", "delivery", "recipient", "price", "city"] as const;

function withDefaultCity(answers: GiftFinderAnswers): GiftFinderAnswers {
  const hasRequiredPreferences = Boolean(
    answers.occasion && answers.delivery && answers.recipient && answers.price,
  );
  if (!hasRequiredPreferences || answers.city) return answers;
  return { ...answers, city: giftFinderCityOptions[0] };
}

function nextUnansweredStep(answers: GiftFinderAnswers) {
  const step = answerKeys.findIndex((key) => !answers[key]);
  return step === -1 ? answerKeys.length : step;
}

function editStep(state: GiftFinderState, step: number): GiftFinderState {
  if (step < 0 || step >= answerKeys.length) return state;

  const quickStartStillApplies = state.quickStart?.prefilledStep !== step;
  const answers: GiftFinderAnswers = {};

  if (state.answers.category) answers.category = state.answers.category;

  for (let index = 0; index < step; index += 1) {
    const key = answerKeys[index];
    const answer = state.answers[key];
    if (answer) Object.assign(answers, { [key]: answer });
  }

  const quickStep = state.quickStart?.prefilledStep;
  if (quickStartStillApplies && quickStep !== undefined) {
    const key = answerKeys[quickStep];
    const answer = state.answers[key];
    if (answer) Object.assign(answers, { [key]: answer });
  }

  return {
    currentStep: step,
    answers,
    quickStart: quickStartStillApplies ? state.quickStart : undefined,
    stage: "questions",
  };
}

/** Clears later manual answers while retaining independent quick-start context. */
export function giftFinderReducer(
  state: GiftFinderState,
  action: GiftFinderAction,
): GiftFinderState {
  switch (action.type) {
    case "apply-quick-start": {
      const answers = action.suggestion.answers ?? {};
      return {
        currentStep: nextUnansweredStep(answers),
        answers,
        quickStart: {
          emoji: action.suggestion.emoji,
          id: action.suggestion.id,
          label: action.suggestion.label,
          prefilledStep: action.suggestion.prefilledStep,
        },
        stage: "questions",
      };
    }
    case "select-occasion": {
      const answers = withDefaultCity({ ...state.answers, occasion: action.option });
      return { ...state, answers, currentStep: nextUnansweredStep(answers) };
    }
    case "select-delivery": {
      if (!state.answers.occasion) return state;
      const answers = withDefaultCity({ ...state.answers, delivery: action.option });
      return { ...state, answers, currentStep: nextUnansweredStep(answers) };
    }
    case "select-recipient": {
      if (!state.answers.occasion || !state.answers.delivery) return state;
      const answers = withDefaultCity({ ...state.answers, recipient: action.option });
      return { ...state, answers, currentStep: nextUnansweredStep(answers) };
    }
    case "select-price": {
      if (!state.answers.occasion || !state.answers.delivery || !state.answers.recipient) return state;
      const answers = withDefaultCity({ ...state.answers, price: action.option });
      return { ...state, answers, currentStep: nextUnansweredStep(answers) };
    }
    case "select-city": {
      if (!state.answers.occasion || !state.answers.delivery || !state.answers.recipient || !state.answers.price) return state;
      const answers = { ...state.answers, city: action.option };
      return { ...state, answers, currentStep: nextUnansweredStep(answers) };
    }
    case "edit":
      return editStep(state, action.step);
    case "previous":
      return editStep(state, state.currentStep === answerKeys.length ? state.currentStep - 2 : state.currentStep - 1);
    case "restart":
      return initialGiftFinderState;
  }
}

/** Preserves the existing category, tag, price, and delivery catalog query contract. */
export function giftFinderProductPath(answers: GiftFinderAnswers) {
  const { occasion, delivery, recipient, price, city, category } = answers;
  if (!occasion || !delivery || !recipient || !price || !city) return null;

  const tags = [...new Set([...recipient.tagSlugs, ...occasion.tagSlugs])];
  const params = new URLSearchParams();
  if (category) params.set("category", category.slug);
  if (tags.length) params.set("tag", tags.join(","));

  const filters = { ...delivery.filters, ...price.filters };
  if (filters.minPrice) params.set("min_price", filters.minPrice);
  if (filters.maxPrice) params.set("max_price", filters.maxPrice);
  if (filters.deliveryTime) params.set("delivery", filters.deliveryTime);
  return `/products?${params.toString()}`;
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

/** Builds shortcuts from the same options and URL filters used by the finder and catalog. */
export function giftFinderQuickStarts({
  categoryOptions,
  occasionOptions,
}: {
  categoryOptions: readonly GiftFinderCategoryOption[];
  occasionOptions: readonly GiftFinderTagOption[];
}): GiftFinderQuickStart[] {
  const birthday = occasionOptions.find((option) => option.id === "birthday");
  const romantic = occasionOptions.find((option) => option.id === "valentine");
  const flowers = categoryOptions.find((option) => {
    const searchable = `${normalized(option.slug)} ${normalized(option.label)}`;
    return searchable.includes("flower") || searchable.includes("گل");
  });
  const today = giftFinderDeliveryOptions.find((option) => option.id === "today");
  const affordable = giftFinderPriceOptions.find((option) => option.id === "under-one-million");
  const midRange = giftFinderPriceOptions.find((option) => option.id === "one-to-three-million");

  return [
    ...(today ? [{
      answers: { delivery: today },
      emoji: "🚚",
      id: "delivery-today",
      label: "تحویل برای امروز می‌خوام",
      prefilledStep: 1 as const,
    }] : []),
    ...(midRange ? [{
      answers: { price: midRange },
      emoji: "💳",
      id: "budget-one-to-three",
      label: "بودجه‌ام ۱ تا ۳ میلیون تومنه",
      prefilledStep: 3 as const,
    }] : []),
    ...(birthday ? [{
      answers: { occasion: birthday },
      emoji: "🎂",
      id: "birthday",
      label: "برای تولد کادو می‌خوام",
      prefilledStep: 0 as const,
    }] : []),
    ...(romantic ? [{
      answers: { occasion: romantic },
      emoji: "❤️",
      id: "romantic",
      label: "یک کادوی عاشقانه می‌خوام",
      prefilledStep: 0 as const,
    }] : []),
    ...(flowers ? [{
      answers: { category: flowers },
      emoji: "🌷",
      id: "flowers",
      label: "دنبال گل می‌گردم",
    }] : []),
    ...(affordable ? [{
      answers: { price: affordable },
      emoji: "🪙",
      id: "affordable",
      label: "اقتصادی و تا ۱ میلیون باشه",
      prefilledStep: 3 as const,
    }] : []),
    {
      answers: {
        price: {
          filters: { minPrice: "3000000" },
          id: "premium-over-three-million",
          label: "بیشتر از ۳ میلیون تومان",
        },
      },
      emoji: "✨",
      id: "premium",
      label: "یک هدیه خاص بالای ۳ میلیون می‌خوام",
      prefilledStep: 3,
    },
    {
      emoji: "🎁",
      id: "guided",
      label: "با چند سؤال راهنمایی‌ام کن",
    },
  ];
}
