"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, setAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function loginAdminAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const ok = await setAdminSession(password);

  if (!ok) {
    redirect("/admin/login?error=1");
  }

  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function updateCourseAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price"));

  if (!id || !title || !Number.isFinite(price) || price < 0) {
    redirect("/admin?error=course");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("courses")
    .update({
      title,
      description,
      price,
    })
    .eq("id", id);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/api/miniprogram/courses");
  redirect("/admin?saved=course");
}
