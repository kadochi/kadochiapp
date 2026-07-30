import { revalidateTag } from "next/cache";
import { createMagazineCommentInputSchema } from "@/features/magazine/schema/comments";
import { createMagazineComment } from "@/features/magazine/services/comments.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ postId: string }> };

export async function POST(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const body: unknown = await request.json();
    const { postId } = await params;
    const input = createMagazineCommentInputSchema.parse({
      ...(typeof body === "object" && body !== null ? body : {}),
      postId,
    });
    const result = await createMagazineComment(input, id);
    revalidateTag("magazine-comments", "max");
    revalidateTag(`magazine:${input.postId}:comments`, "max");
    return jsonOk(result, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
