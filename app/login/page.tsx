import PhoneLoginForm from "@/components/PhoneLoginForm";

function getSafeNextUrl(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/courses";
  }

  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;

  return <PhoneLoginForm nextUrl={getSafeNextUrl(params.next)} />;
}
