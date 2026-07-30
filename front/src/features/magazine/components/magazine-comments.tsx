import SectionHeader from "@/components/layout/section-header";
import { Avatar } from "@/components/ui/avatar";
import { listMagazineComments } from "../services/comments.server";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

/** Read-only magazine comment list. A failed fetch does not break the article. */
export async function MagazineComments({ postId }: Readonly<{ postId: number }>) {
  let comments: Awaited<ReturnType<typeof listMagazineComments>> = [];
  let didFailToLoad = false;
  try {
    comments = await listMagazineComments({ postId });
  } catch {
    didFailToLoad = true;
  }

  return (
    <section aria-label="نظرات کاربران">
      <SectionHeader title="آخرین نظرات کاربران" subtitle={comments.length ? `${comments.length.toLocaleString("fa-IR")} نظر ثبت شده` : "بدون نظر"} />
      <div className="p-16">
        {didFailToLoad ? <p className="px-16 py-48 text-center font-sans text-label-14 text-surface-neutral-mid-emphasis">دریافت نظرات با مشکل روبه‌رو شد. لطفاً دوباره تلاش کنید.</p>
          : comments.length === 0 ? <p className="px-16 py-48 text-center font-sans text-label-14 text-surface-neutral-mid-emphasis">تاکنون نظری ثبت نشده است.</p>
            : <ul className="m-0 grid list-none gap-16 p-0">
              {comments.map((comment) => <li className="border-b border-border-low-emphasis p-16 last:border-b-0 [direction:rtl]" key={comment.id}>
                <div className="flex items-center gap-8">
                  <Avatar alt={comment.author} size="md" src={comment.avatarUrl} />
                  <div><div className="font-sans text-label-14 font-bold text-surface-neutral-high-emphasis">{comment.author}</div><div className="font-sans text-label-12 text-surface-neutral-low-emphasis">{formatDate(comment.createdAt)}</div></div>
                </div>
                <p className="mt-16 whitespace-pre-wrap font-sans text-label-14 text-surface-neutral-mid-emphasis">{comment.content}</p>
              </li>)}
            </ul>}
      </div>
    </section>
  );
}
