type ProfileCompletionCustomer = {
  phone: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
};

export type ProfileCompletionLevel = "newcomer" | "regular" | "pro";

export type RegularUserMissionState = {
  hasAddress: boolean;
  hasFavorite: boolean;
  hasWishlist: boolean;
  hasPersonalProfile: boolean;
};

export type ProfileCompletionTask = {
  id: "phone" | "name" | "birthDate" | "gender" | "address" | "favorite" | "wishlist" | "personalProfile";
  label: string;
  complete: boolean;
  href?: string;
};

export type ProfileCompletion = {
  level: ProfileCompletionLevel;
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
  tasks: readonly ProfileCompletionTask[];
};

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

const emptyRegularMissions: RegularUserMissionState = {
  hasAddress: false,
  hasFavorite: false,
  hasWishlist: false,
  hasPersonalProfile: false,
};

function summary(level: ProfileCompletionLevel, tasks: readonly ProfileCompletionTask[]): ProfileCompletion {
  const completedCount = tasks.filter((task) => task.complete).length;
  const totalCount = tasks.length;

  return {
    level,
    completedCount,
    totalCount,
    percentage: Math.round((completedCount / totalCount) * 100),
    isComplete: level === "pro",
    tasks,
  };
}

/** Resolves the active mission group from details that already exist in the account. */
export function getProfileCompletion(customer: ProfileCompletionCustomer, regularMissions: RegularUserMissionState = emptyRegularMissions): ProfileCompletion {
  const profileTasks = [
    { id: "phone", label: "وارد کردن شماره موبایل", complete: hasText(customer.phone) },
    { id: "name", label: "وارد کردن نام و نام خانوادگی", complete: hasText(customer.firstName) && hasText(customer.lastName), href: "/profile/info" },
    { id: "birthDate", label: "وارد کردن تاریخ تولد", complete: hasText(customer.birthDate), href: "/profile/info" },
    { id: "gender", label: "انتخاب جنسیت", complete: hasText(customer.gender), href: "/profile/info" },
  ] as const satisfies readonly ProfileCompletionTask[];

  if (profileTasks.some((task) => !task.complete)) return summary("newcomer", profileTasks);

  const regularTasks = [
    { id: "address", label: "افزودن آدرس گیرنده", complete: regularMissions.hasAddress, href: "/profile/addresses" },
    { id: "favorite", label: "افزودن حداقل یک محصول به مورد علاقه‌ها", complete: regularMissions.hasFavorite, href: "/profile/favorites" },
    { id: "wishlist", label: "افزودن حداقل یک محصول به لیست آرزوها", complete: regularMissions.hasWishlist, href: "/profile/wishlist" },
    { id: "personalProfile", label: "راه‌اندازی صفحه پروفایل شخصی", complete: regularMissions.hasPersonalProfile, href: "/profile/personal-profile" },
  ] as const satisfies readonly ProfileCompletionTask[];

  return summary(regularTasks.every((task) => task.complete) ? "pro" : "regular", regularTasks);
}
