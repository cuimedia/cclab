import { json } from "@remix-run/node";
import prisma from "../db.server";
import { apiVersion } from "../shopify.server";

export const loader = async ({ request }) => {
  const t0 = Date.now();
  const checks = {};
  const keys = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET",
    "SHOPIFY_APP_URL",
    "DATABASE_URL",
    "NODE_ENV",
  ];
  const envMinimal = Object.fromEntries(
    keys.map((k) => [k, process.env[k] ? "set" : "missing"]),
  );

  const scopesRaw = process.env.SCOPES || "";
  const scopesParsed = scopesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.prisma = "ok";
  } catch (e) {
    checks.prisma = { error: e?.message || String(e) };
  }

  const durationMs = Date.now() - t0;
  const ok = checks.prisma === "ok" && Object.values(envMinimal).every((v) => v !== "missing");

  // By default, expose only minimal info. If a HEALTHZ_KEY is set and provided via ?key=, return extended details.
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const allowed = process.env.HEALTHZ_KEY && key === process.env.HEALTHZ_KEY;

  if (!allowed) {
    return json({ ok, durationMs, apiVersion, now: new Date().toISOString() });
  }
  return json({ ok, durationMs, apiVersion, env: envMinimal, scopes: { raw: scopesRaw || null, parsed: scopesParsed }, checks, now: new Date().toISOString() });
};
