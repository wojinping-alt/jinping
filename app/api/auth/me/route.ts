import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return NextResponse.json({
      loggedIn: true,
      id: user.id,
      name: user.email,
      provider: "supabase",
    });
  }

  const cookieStore = await cookies();
  const userId =
    cookieStore.get("zishoo_user_id")?.value ||
    cookieStore.get("zishoo_user_id_client")?.value;
  const encodedName = cookieStore.get("zishoo_user_name")?.value;

  return NextResponse.json({
    loggedIn: !!userId,
    id: userId,
    name: encodedName ? decodeURIComponent(encodedName) : undefined,
    provider: userId ? "wechat" : undefined,
  });
}
