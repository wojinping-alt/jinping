"use client";

import { useEffect } from "react";

export default function CanonicalRedirect() {
  useEffect(() => {
    const { protocol, host, pathname, search, hash } = window.location;
    const shouldUseHttps = protocol === "http:";
    const shouldUseWww = host === "zishoo.cn";

    if (!shouldUseHttps && !shouldUseWww) return;

    const nextHost = shouldUseWww ? "www.zishoo.cn" : host;
    window.location.replace(`https://${nextHost}${pathname}${search}${hash}`);
  }, []);

  return null;
}
