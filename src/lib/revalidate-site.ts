import { revalidatePath } from "next/cache";

export function revalidateHome() {
  revalidatePath("/");
}

export function revalidateLayout() {
  revalidatePath("/", "layout");
}

export function revalidatePlayers() {
  revalidatePath("/players");
}

export function revalidateAccount() {
  revalidatePath("/me");
}

export function revalidateAuthPages() {
  revalidatePath("/login");
  revalidatePath("/register");
}

export function revalidateAdminUsers() {
  revalidatePath("/admin/users");
}

export function revalidateEvents(eventId?: string) {
  revalidatePath("/events");
  revalidatePath("/admin/events");
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/admin/events/${eventId}`);
  }
}

export function revalidateArticles(articleId?: string) {
  revalidatePath("/articles");
  revalidatePath("/admin/articles");
  if (articleId) {
    revalidatePath(`/articles/${articleId}`);
    revalidatePath(`/admin/articles/${articleId}`);
  }
}

export function revalidatePublishedContent() {
  revalidateHome();
  revalidatePlayers();
}

export function revalidateAdminOAuth() {
  revalidatePath("/admin/oauth");
}

export function revalidateAdminAi() {
  revalidatePath("/admin/ai");
}

export function revalidateAdminUpdates() {
  revalidatePath("/admin/updates");
}
