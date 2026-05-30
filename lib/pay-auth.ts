import { createClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { toStableUuid } from "@/lib/stable-id";

export async function getPayUser(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return { supabase, user };
  }

  const cookieStore = await cookies();
  const wechatUserId = cookieStore.get("zishoo_user_id")?.value;

  if (wechatUserId) {
    return {
      supabase,
      user: {
        id: toStableUuid(wechatUserId),
        email: undefined,
      },
    };
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return { supabase, user: null };
  }

  const {
    data: { user: tokenUser },
  } = await supabase.auth.getUser(token);

  return { supabase, user: tokenUser };
}
