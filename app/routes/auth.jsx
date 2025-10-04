// Ensure /auth (no suffix) starts the OAuth flow in production too
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

