// Public configuration endpoint for storefront script
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";
 
function corsForOrigin(origin?: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
  const allow = !!origin && /^https:\/\/([a-z0-9-]+\.)*myshopify\.com$/i.test(origin)
    ? origin
    : "null";
  headers["Access-Control-Allow-Origin"] = allow;
  return headers;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const origin = request.headers.get("Origin");

  // Handle preflight if needed
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsForOrigin(origin) });
  }

  if (!shop) return json({ error: "missing shop" }, { status: 400, headers: corsForOrigin(origin) });

  const row = await prisma.waFloatConfig.findUnique({ where: { shop } });
  const cfg = (row?.config as any) || null;
  if (!cfg) return json({}, { headers: corsForOrigin(origin) });

  return json(cfg, { headers: corsForOrigin(origin) });
}

