import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

function adminRedirect(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

function errorRedirect(request: Request, message: string) {
  return adminRedirect(request, `/admin?error=${encodeURIComponent(message)}`);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthed())) {
    return adminRedirect(request, "/admin/login");
  }

  try {
    const formData = await request.formData();
    const id = String(formData.get("id") || "");
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const price = Number(formData.get("price"));

    if (!id || !title || !Number.isFinite(price) || price < 0) {
      return errorRedirect(request, "课程信息不完整或价格不正确");
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("courses")
      .update({ title, description, price })
      .eq("id", id);

    if (error) {
      return errorRedirect(request, error.message);
    }

    revalidatePath("/admin");
    revalidatePath("/api/miniprogram/courses");
    return adminRedirect(request, "/admin?saved=course");
  } catch (error) {
    return errorRedirect(request, error instanceof Error ? error.message : "保存课程失败");
  }
}
