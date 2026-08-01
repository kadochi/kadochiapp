type ProfileCompletionCustomer = {
  phone: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
};

export type ProfileCompletionTask = {
  id: "phone" | "name" | "birthDate" | "gender";
  label: string;
  complete: boolean;
  href?: string;
};

export type ProfileCompletion = {
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
  tasks: readonly ProfileCompletionTask[];
};

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

/** The four profile details we ask for after a user has verified their phone. */
export function getProfileCompletion(customer: ProfileCompletionCustomer): ProfileCompletion {
  const tasks = [
    { id: "phone", label: "وارد کردن شماره موبایل", complete: hasText(customer.phone) },
    { id: "name", label: "وارد کردن نام و نام خانوادگی", complete: hasText(customer.firstName) && hasText(customer.lastName), href: "/profile/info" },
    { id: "birthDate", label: "وارد کردن تاریخ تولد", complete: hasText(customer.birthDate), href: "/profile/info" },
    { id: "gender", label: "انتخاب جنسیت", complete: hasText(customer.gender), href: "/profile/info" },
  ] as const satisfies readonly ProfileCompletionTask[];
  const completedCount = tasks.filter((task) => task.complete).length;
  const totalCount = tasks.length;

  return {
    completedCount,
    totalCount,
    percentage: Math.round((completedCount / totalCount) * 100),
    isComplete: completedCount === totalCount,
    tasks,
  };
}
