import { bffJson } from "@/lib/http/browser";
import { createMagazineCommentInputSchema, magazineCommentSubmissionSchema } from "../schema/comments";

/** Submits a magazine comment through the same-origin BFF. */
export function createMagazineComment(postId: number, content: string) {
  const payload = createMagazineCommentInputSchema.parse({ postId, content });
  return bffJson(
    `/api/magazine/${payload.postId}/comments`,
    { method: "POST", body: JSON.stringify({ content: payload.content }) },
    (value) => magazineCommentSubmissionSchema.parse(value),
  );
}
