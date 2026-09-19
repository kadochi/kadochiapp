import { describe, expect, it } from "vitest";

import {
  giftFinderCityOptions,
  giftFinderDeliveryOptions,
  giftFinderPriceOptions,
  giftFinderProductPath,
  giftFinderQuickStarts,
  giftFinderRecipientExperience,
  giftFinderReducer,
  initialGiftFinderState,
  type GiftFinderCategoryOption,
  type GiftFinderRecipientOption,
  type GiftFinderTagOption,
} from "./gift-finder-flow";

const recipient: GiftFinderTagOption = {
  id: "woman",
  label: "زن جوان",
  tagSlugs: ["woman"],
};

const occasion: GiftFinderTagOption = {
  id: "birthday",
  label: "جشن تولد",
  tagSlugs: ["birthday", "woman"],
};

const category: GiftFinderCategoryOption = {
  id: "flower",
  label: "گل",
  slug: "flower",
};

const today = giftFinderDeliveryOptions[0];
const tomorrow = giftFinderDeliveryOptions[1];
const flexibleDelivery = giftFinderDeliveryOptions[2];
const midRange = giftFinderPriceOptions[1];
const tehran = giftFinderCityOptions[0];

const recipientAudienceOptions: GiftFinderRecipientOption[] = [
  { ageBand: "child", gender: "female", id: "girl-kid", label: "دختر بچه", tagSlugs: ["girl-kid"] },
  { ageBand: "child", gender: "male", id: "boy-kid", label: "پسر بچه", tagSlugs: ["boy-kid"] },
  { ageBand: "teen", gender: "female", id: "girl-teen", label: "دختر نوجوان", tagSlugs: ["girl-teen"] },
  { ageBand: "teen", gender: "male", id: "boy-teen", label: "پسر نوجوان", tagSlugs: ["boy-teen"] },
  { ageBand: "young-adult", gender: "female", id: "woman", label: "زن جوان", tagSlugs: ["woman"] },
  { ageBand: "young-adult", gender: "male", id: "man", label: "مرد جوان", tagSlugs: ["man"] },
  { ageBand: "adult", gender: "female", id: "adult-woman", label: "زن بزرگسال", tagSlugs: ["adult-woman"] },
  { ageBand: "adult", gender: "male", id: "adult-man", label: "مرد بزرگسال", tagSlugs: ["adult-man"] },
];

function occasionFor(id: string, tagSlugs = [id]): GiftFinderTagOption {
  return { id, label: id, tagSlugs };
}

function guidedState() {
  return giftFinderReducer(initialGiftFinderState, {
    type: "apply-quick-start",
    suggestion: {
      emoji: "🎁",
      id: "guided",
      label: "با چند سؤال راهنمایی‌ام کن",
    },
  });
}

function completedState() {
  const withOccasion = giftFinderReducer(guidedState(), {
    type: "select-occasion",
    option: occasion,
  });
  const withDelivery = giftFinderReducer(withOccasion, {
    type: "select-delivery",
    option: flexibleDelivery,
  });
  const withRecipient = giftFinderReducer(withDelivery, {
    type: "select-recipient",
    option: recipient,
  });
  return giftFinderReducer(withRecipient, {
    type: "select-price",
    option: midRange,
  });
}

describe("gift finder flow", () => {
  it("starts with quick preferences before the five-step flow", () => {
    expect(initialGiftFinderState).toEqual({
      currentStep: 0,
      answers: {},
      stage: "quick-start",
    });
    expect(guidedState()).toMatchObject({ currentStep: 0, stage: "questions" });
  });

  it("asks occasion, delivery, recipient, and price in order", () => {
    const withOccasion = giftFinderReducer(guidedState(), {
      type: "select-occasion",
      option: occasion,
    });
    const withDelivery = giftFinderReducer(withOccasion, {
      type: "select-delivery",
      option: today,
    });
    const withRecipient = giftFinderReducer(withDelivery, {
      type: "select-recipient",
      option: recipient,
    });

    expect(withOccasion.currentStep).toBe(1);
    expect(withDelivery.currentStep).toBe(2);
    expect(withRecipient.currentStep).toBe(3);
    expect(completedState().currentStep).toBe(5);
    expect(completedState().answers.city).toBe(tehran);
  });

  it("uses the three supported delivery-time choices", () => {
    expect(giftFinderDeliveryOptions).toEqual([
      { filters: { deliveryTime: "today" }, id: "today", label: "امروز" },
      { filters: { deliveryTime: "tomorrow" }, id: "tomorrow", label: "فردا" },
      { filters: {}, id: "flexible", label: "فرقی ندارد" },
    ]);
    expect(tomorrow.filters.deliveryTime).toBe("tomorrow");
  });

  it("prefills a structured delivery option and skips that question", () => {
    const deliveryStart = giftFinderReducer(initialGiftFinderState, {
      type: "apply-quick-start",
      suggestion: {
        answers: { delivery: today },
        emoji: "🚚",
        id: "delivery-today",
        label: "تحویل برای امروز می‌خوام",
        prefilledStep: 1,
      },
    });
    const withOccasion = giftFinderReducer(deliveryStart, {
      type: "select-occasion",
      option: occasion,
    });

    expect(withOccasion.currentStep).toBe(2);
    expect(withOccasion.answers.delivery).toBe(today);
  });

  it("keeps a broad category only as optional quick-start context", () => {
    const flowerStart = giftFinderReducer(initialGiftFinderState, {
      type: "apply-quick-start",
      suggestion: {
        answers: { category },
        emoji: "🌷",
        id: "flowers",
        label: "دنبال گل می‌گردم",
      },
    });

    expect(flowerStart.currentStep).toBe(0);
    expect(flowerStart.answers.category).toBe(category);
  });

  it("clears later manual answers when an earlier answer is edited", () => {
    const edited = giftFinderReducer(completedState(), { type: "edit", step: 1 });

    expect(edited.currentStep).toBe(1);
    expect(edited.answers).toEqual({ occasion });
    expect(edited.quickStart?.id).toBe("guided");
  });

  it("retains an independent quick-start answer while editing another step", () => {
    const priceStart = giftFinderReducer(initialGiftFinderState, {
      type: "apply-quick-start",
      suggestion: {
        answers: { price: midRange },
        emoji: "💳",
        id: "budget-one-to-three",
        label: "بودجه‌ام ۱ تا ۳ میلیون تومنه",
        prefilledStep: 3,
      },
    });
    const edited = giftFinderReducer(priceStart, { type: "edit", step: 0 });

    expect(edited.answers).toEqual({ price: midRange });
    expect(edited.quickStart?.id).toBe("budget-one-to-three");
  });

  it("removes quick context when its prefilled answer is explicitly edited", () => {
    const birthdayStart = giftFinderReducer(initialGiftFinderState, {
      type: "apply-quick-start",
      suggestion: {
        answers: { occasion },
        emoji: "🎂",
        id: "birthday",
        label: "برای تولد کادو می‌خوام",
        prefilledStep: 0,
      },
    });
    const edited = giftFinderReducer(birthdayStart, { type: "edit", step: 0 });

    expect(edited.answers).toEqual({});
    expect(edited.quickStart).toBeUndefined();
  });

  it("restarts at quick preferences without retaining selections", () => {
    expect(giftFinderReducer(completedState(), { type: "restart" })).toEqual(
      initialGiftFinderState,
    );
  });

  it("builds the existing catalog URL without requiring a category", () => {
    expect(
      giftFinderProductPath({
        occasion,
        delivery: today,
        recipient,
        price: midRange,
        city: tehran,
      }),
    ).toBe(
      "/products?tag=woman%2Cbirthday&min_price=1000000&max_price=3000000&delivery=today",
    );
    expect(
      giftFinderProductPath({
        occasion,
        delivery: today,
        recipient,
        price: midRange,
        city: tehran,
        category,
      }),
    ).toContain("category=flower");
    expect(
      giftFinderProductPath({
        occasion,
        delivery: tomorrow,
        recipient,
        price: midRange,
        city: tehran,
      }),
    ).toContain("delivery=tomorrow");
  });

  it("builds occasion and category shortcuts only from available options", () => {
    const suggestions = giftFinderQuickStarts({
      categoryOptions: [category],
      occasionOptions: [occasion],
    });

    expect(suggestions.map((item) => item.id)).toEqual([
      "delivery-today",
      "budget-one-to-three",
      "birthday",
      "flowers",
      "affordable",
      "premium",
      "guided",
    ]);
    expect(suggestions.find((item) => item.id === "birthday")?.answers).toEqual({ occasion });
    expect(suggestions.find((item) => item.id === "flowers")?.answers).toEqual({ category });
  });

  it("limits romantic occasions to adult recipient age bands", () => {
    const romantic = giftFinderRecipientExperience(recipientAudienceOptions, occasionFor("valentine"));

    expect(romantic.options.map((option) => option.ageBand)).toEqual([
      "young-adult", "young-adult", "adult", "adult",
    ]);
  });

  it("infers a parent recipient gender while retaining only the matching adult ages", () => {
    const mothersDay = giftFinderRecipientExperience(recipientAudienceOptions, occasionFor("motherday"));
    const fathersDay = giftFinderRecipientExperience(recipientAudienceOptions, occasionFor("fatherday"));

    expect(mothersDay.inferredGender).toBe("female");
    expect(mothersDay.question).toBe("سن گیرنده را انتخاب کنید.");
    expect(mothersDay.options.map((option) => option.id)).toEqual(["woman", "adult-woman"]);
    expect(fathersDay.inferredGender).toBe("male");
    expect(fathersDay.options.map((option) => option.id)).toEqual(["man", "adult-man"]);
  });

  it("uses child-only gender choices for a child birthday", () => {
    const experience = giftFinderRecipientExperience(
      recipientAudienceOptions,
      occasionFor("child-birthday"),
    );

    expect(experience.options.map((option) => option.id)).toEqual([
      "girl-kid",
      "boy-kid",
      "girl-teen",
      "boy-teen",
    ]);
  });

  it("keeps graduation from offering very young child options", () => {
    const experience = giftFinderRecipientExperience(recipientAudienceOptions, occasionFor("graduation"));

    expect(experience.options.map((option) => option.ageBand)).toEqual([
      "teen", "teen", "young-adult", "young-adult", "adult", "adult",
    ]);
  });

});
