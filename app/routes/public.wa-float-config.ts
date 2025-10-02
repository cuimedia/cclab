// app/routes/public.wa-float-config.ts
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*", // 或者严格点：`https://*.myshopify.com`
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) return json({ error: "missing shop" }, { status: 400, headers: cors() });

  // 👉 先用硬编码测试（看前端按钮能否正常出现）
  const payload = {
    enabled: true,
    phone: "447912345678",
    presetText: "Hello! I need some help.",
    position: "right",
    color: "#25D366",
  };

  return json(payload, { headers: cors() });
}

// 可选：处理 OPTIONS 预检
export function headers() { return cors(); }
