import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.text();
  // 这里做验签（可用微信官方 Node SDK）
  // 解析成功后：
  const data = JSON.parse(body);
  const out_trade_no = data.out_trade_no;
  const openid = data.payer.openid;

  // 把课程标记为已购买
  await supabase.from("user_courses").insert({
    user_id: openid,
    course_id: out_trade_no,
  });

  return new Response(JSON.stringify({ code: "SUCCESS" }));
}