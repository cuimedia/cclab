import { createCookie, json } from "@remix-run/node";
import { Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

const hostCookie = createCookie("shopify_app_host", {
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
});

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const rawCookie = request.headers.get("Cookie");
  const persistedHost = rawCookie ? await hostCookie.parse(rawCookie) : null;
  const hostFromUrl = url.searchParams.get("host");
  const host = hostFromUrl || persistedHost || "";

  let responseInit;
  if (hostFromUrl && hostFromUrl !== persistedHost) {
    responseInit = {
      headers: {
        "Set-Cookie": await hostCookie.serialize(hostFromUrl),
      },
    };
  }

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "", host }, responseInit);
};

export default function App() {
  const { apiKey, host } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} host={host}>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
