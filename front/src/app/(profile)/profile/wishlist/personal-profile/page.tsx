import { redirect } from "next/navigation";

/** Preserves older shared links after moving the settings out of Wishlist. */
export default function Page() {
  redirect("/profile/personal-profile");
}
