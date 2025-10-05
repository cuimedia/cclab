import { json } from "@remix-run/node";
import prisma from "../db.server";
import { apiVersion } from "../shopify.server";

export const loader = async () => {
  const t0 = Date.now();
  const checks = {};
  const keys = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET",
    "SHOPIFY_APP_URL",
    "DATABASE_URL",
    "NODE_ENV",
  ];
  const env = Object.fromEntries(
    keys.map((k) => [k, process.env[k] ? (k.includes("SECRET") ? "set" : process.env[k]) : "missing"]),
  );

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.prisma = "ok";
  } catch (e) {
    checks.prisma = { error: e?.message || String(e) };
  }

  const durationMs = Date.now() - t0;
  const ok = checks.prisma === "ok" && Object.values(env).every((v) => v !== "missing");
  return json({ ok, durationMs, apiVersion, env, checks, now: new Date().toISOString() });
};

