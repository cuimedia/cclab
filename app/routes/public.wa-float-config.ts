import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    return json({ error: "missing shop parameter" }, { status: 400 });
  }

  try {
    const row = await prisma.waFloatConfig.findUnique({ where: { shop } });
    const cfg = (row?.config as unknown) || {};
    return json(cfg, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("public wa-float-config error", err);
    return json(
      { error: "unexpected error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
