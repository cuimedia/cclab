// app/routes/app.settings.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { ContextualSaveBar as ContextualSaveBarActions } from "@shopify/app-bridge/actions";
import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent } from "react";
import {
  Banner,
  Box,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineGrid,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    const url = new URL(request.url);
    const r = await admin.graphql(`
      #graphql
      query ShopDomain {
        shop {
          myshopifyDomain
        }
      }
    `);
    const payload: any = await r.json();
    if (payload.errors?.length) {
      console.error("loader shop query errors", JSON.stringify(payload.errors, null, 2));
      throw new Error(payload.errors.map((e: any) => e.message).join("; "));
    }
    const shop = payload.data?.shop?.myshopifyDomain as string | undefined;
    if (!shop) {
      throw new Error("loader: missing shop domain in GraphQL response");
    }

    const row = await prisma.waFloatConfig.findUnique({ where: { shop } });
    let cfg: any = {};
    try { cfg = (row?.config as any) || {}; } catch {}
    const saved = url.searchParams.get("saved") === "1";
    return json({ cfg, shop, saved, updatedAt: row?.updatedAt?.toISOString() ?? null });
  } catch (err) {
    console.error("settings loader error", err);
    throw err;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    const domainResp = await admin.graphql(`
      #graphql
      query ShopDomain {
        shop {
          myshopifyDomain
        }
      }
    `);
    const payload: any = await domainResp.json();
    if (payload.errors?.length) {
      console.error("action shop query errors", JSON.stringify(payload.errors, null, 2));
      throw new Error(payload.errors.map((e: any) => e.message).join("; "));
    }
    const shop = payload.data?.shop?.myshopifyDomain as string | undefined;
    if (!shop) {
      throw new Error("action: missing shop domain in GraphQL response");
    }

    const form = await request.formData();
    const has = (name: string) => form.has(name);
    const rawNumber = String(form.get("number") || "");
    const digitsOnly = rawNumber.replace(/\D/g, "");
    const errors: Record<string, string> = {};

    if (digitsOnly.length < 6 || digitsOnly.length > 15) {
      errors.number = "Enter 6 to 15 digits (numbers only, without +).";
    }

    if (Object.keys(errors).length > 0) {
      return json({ errors, values: { number: digitsOnly } }, { status: 400 });
    }

    const cfg = {
      number: digitsOnly,
      message: String(form.get("message") || ""),
      position: form.get("position") === "left" ? "left" : "right",
      offset_x: Number(form.get("offset_x") || 24),
      offset_y: Number(form.get("offset_y") || 24),
      size: Number(form.get("size") || 56),
      bg_color: String(form.get("bg_color") || "#25D366"),
      icon_color: String(form.get("icon_color") || "#ffffff"),
      open_in_new: has("open_in_new"),
      show_on_mobile: has("show_on_mobile"),
      show_on_desktop: has("show_on_desktop"),
      show_everywhere: has("show_everywhere"),
      show_on_home: has("show_on_home"),
      show_on_product: has("show_on_product"),
      show_on_collection: has("show_on_collection"),
      show_on_article: has("show_on_article"),
      show_on_cart: has("show_on_cart"),
    } as any;

    await prisma.waFloatConfig.upsert({
      where: { shop },
      create: { shop, config: cfg },
      update: { config: cfg },
    });

    return redirect("/app?saved=1");
  } catch (err) {
    console.error("settings action error", err);
    throw err;
  }
}

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export default function Settings() {
  const { cfg, saved, updatedAt } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const app = useAppBridge();
  const formRef = useRef<HTMLFormElement>(null);
  const contextualSaveBarRef = useRef<ReturnType<typeof ContextualSaveBarActions.create> | null>(null);
  const unsubscribeSaveRef = useRef<(() => void) | null>(null);
  const unsubscribeDiscardRef = useRef<(() => void) | null>(null);
  const isSubmitting = navigation.state === "submitting";
  const formattedUpdatedAt = formatDateTime(updatedAt);
  const defaults = {
    bg_color: "#25D366",
    icon_color: "#ffffff",
  } as const;

  const cfgKey = useMemo(() => JSON.stringify(cfg ?? {}), [cfg]);
  const initialValues = useMemo(
    () => ({
      number: cfg.number || "",
      message: cfg.message || "Hello, I need some help with my order.",
      position: cfg.position || "right",
      size: String(cfg.size || 56),
      offset_x: String(cfg.offset_x ?? 24),
      offset_y: String(cfg.offset_y ?? 24),
      bg_color: cfg.bg_color || defaults.bg_color,
      icon_color: cfg.icon_color || defaults.icon_color,
      open_in_new: cfg.open_in_new ?? true,
      show_on_mobile: cfg.show_on_mobile ?? true,
      show_on_desktop: cfg.show_on_desktop ?? true,
      show_everywhere: cfg.show_everywhere ?? true,
      show_on_home: cfg.show_on_home ?? true,
      show_on_product: cfg.show_on_product ?? true,
      show_on_collection: cfg.show_on_collection ?? true,
      show_on_article: cfg.show_on_article ?? false,
      show_on_cart: cfg.show_on_cart ?? true,
    }),
    [cfgKey],
  );

  const [formState, setFormState] = useState(initialValues);
  const serializedInitial = useMemo(() => JSON.stringify(initialValues), [initialValues]);
  const serializedCurrent = useMemo(() => JSON.stringify(formState), [formState]);
  const isDirty = serializedInitial !== serializedCurrent;

  const handleColorInput =
    (field: "bg_color" | "icon_color") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const hex = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: hex }));
    };

  const updateField =
    (field: keyof typeof initialValues) => (value: string) =>
      setFormState((prev) => {
        if (field === "number") {
          const sanitized = value.replace(/\D/g, "").slice(0, 15);
          return { ...prev, number: sanitized };
        }
        return { ...prev, [field]: value };
      });

  const updateCheckbox =
    (field: keyof typeof initialValues) => (value: boolean) =>
      setFormState((prev) => ({ ...prev, [field]: value }));

  const resetColors = () => {
    setFormState((prev) => ({
      ...prev,
      bg_color: defaults.bg_color,
      icon_color: defaults.icon_color,
    }));
  };

  const previewSizePx = useMemo(() => Number(formState.size) || 56, [formState.size]);
  const clientApp = useMemo(() => {
    const maybeApp = app as any;
    return maybeApp?.app || maybeApp || null;
  }, [app]);

  const canUseContextualSaveBar = useMemo(() => {
    if (typeof window === "undefined") return false;
    // 在 Shopify Admin 的 iframe 中，并且 App Bridge 可用时启用 SaveBar
    const isEmbedded = window.top !== window.self;
    const hasBridge = !!clientApp && typeof (clientApp as any).dispatch === "function";
    return isEmbedded && hasBridge;
  }, [clientApp]);
  const showContextualSaveBar = canUseContextualSaveBar && (isDirty || isSubmitting);

  useEffect(() => {
    if (actionData?.values) {
      setFormState((prev) => ({ ...prev, ...actionData.values }));
    }
  }, [actionData]);

  useEffect(() => {
    setFormState(initialValues);
  }, [serializedInitial, initialValues]);

  const handleDiscard = useCallback(() => {
    setFormState(initialValues);
  }, [initialValues]);

  const handleSave = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  useEffect(() => {
    if (!canUseContextualSaveBar || !clientApp) return;

    const contextualSaveBar = ContextualSaveBarActions.create(clientApp, { fullWidth: true });
    contextualSaveBarRef.current = contextualSaveBar;

    return () => {
      contextualSaveBar.dispatch(ContextualSaveBarActions.Action.HIDE);
      contextualSaveBarRef.current = null;
      unsubscribeSaveRef.current?.();
      unsubscribeSaveRef.current = null;
      unsubscribeDiscardRef.current?.();
      unsubscribeDiscardRef.current = null;
    };
  }, [clientApp, canUseContextualSaveBar]);

  useEffect(() => {
    if (!canUseContextualSaveBar) return;

    const contextualSaveBar = contextualSaveBarRef.current;
    if (!contextualSaveBar) return;

    contextualSaveBar.set({
      saveAction: {
        loading: isSubmitting,
        disabled: !isDirty,
      },
      discardAction: {
        disabled: !isDirty || isSubmitting,
      },
    });

    const shouldShow = isDirty || isSubmitting;
    contextualSaveBar.dispatch(
      shouldShow
        ? ContextualSaveBarActions.Action.SHOW
        : ContextualSaveBarActions.Action.HIDE,
    );
    // Re-bind events when dependencies change
    unsubscribeSaveRef.current?.();
    unsubscribeSaveRef.current = contextualSaveBar.subscribe(
      ContextualSaveBarActions.Action.SAVE,
      handleSave,
    ) as unknown as (() => void) | null;
    unsubscribeDiscardRef.current?.();
    unsubscribeDiscardRef.current = contextualSaveBar.subscribe(
      ContextualSaveBarActions.Action.DISCARD,
      handleDiscard,
    ) as unknown as (() => void) | null;
  }, [canUseContextualSaveBar, handleDiscard, handleSave, isDirty, isSubmitting]);

  const pagePrimaryAction = useMemo(
    () => ({
      content: "Save",
      onAction: handleSave,
      loading: isSubmitting,
      disabled: !isDirty,
    }),
    [handleSave, isDirty, isSubmitting],
  );

  const pageSecondaryActions = useMemo(
    () => [
      {
        content: "Discard changes",
        onAction: handleDiscard,
        disabled: !isDirty || isSubmitting,
      },
    ],
    [handleDiscard, isDirty, isSubmitting],
  );

  const pageActionProps = showContextualSaveBar
    ? {}
    : {
        primaryAction: pagePrimaryAction,
        secondaryActions: pageSecondaryActions,
      };

  const devFlags = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = app as any;
    const candidate = raw?.dispatch ? raw : raw?.app;
    const flags = {
      isEmbedded: window.top !== window.self,
      hasApp: !!app,
      hasDispatchOnApp: typeof raw?.dispatch === "function",
      hasDispatchOnAppApp: typeof raw?.app?.dispatch === "function",
      usingClientApp: !!candidate,
      canUseContextualSaveBar,
      showContextualSaveBar,
      isDirty,
      isSubmitting,
    };
    // 始终在控制台打印，便于排查（带明确前缀）
    // eslint-disable-next-line no-console
    console.debug("[wa-float:settings SaveBar flags]", flags);
    return flags;
  }, [app, canUseContextualSaveBar, showContextualSaveBar, isDirty, isSubmitting]);

  const [showDebug, setShowDebug] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const force = params.get("debug") === "1";
    const shouldShow = (process.env.NODE_ENV !== "production") || force;
    setShowDebug(shouldShow);
  }, []);

  useEffect(() => {
    if (!devFlags) return;
    // eslint-disable-next-line no-console
    console.log("[wa-float:settings SaveBar flags]", devFlags);
  }, [devFlags]);

  return (
    <Page title="WhatsApp Float Settings" {...pageActionProps}>
      {showDebug && devFlags && (
        <div style={{ marginBottom: "8px" }}>
          <Banner tone="info" title="Debug: SaveBar flags">
            <div style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
              {JSON.stringify(devFlags)}
            </div>
          </Banner>
        </div>
      )}
      <Layout>
        <Layout.Section>
          {saved && (
            <div style={{ marginBottom: "16px" }}>
              <Banner tone="success" title="Settings saved">
                Floating button updated with your latest settings
                {formattedUpdatedAt ? ` (Saved at: ${formattedUpdatedAt})` : "."}
              </Banner>
            </div>
          )}
          <Card>
            <Form method="post" ref={formRef}>
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="WhatsApp number (E.164 digits only, no +)"
                    name="number"
                    value={formState.number}
                    onChange={updateField("number")}
                    autoComplete="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    helpText="Enter your full international number (6??5 digits, digits only)."
                    error={actionData?.errors?.number}
                    requiredIndicator
                  />
                  <Select
                    label="Button position"
                    name="position"
                    options={[
                      { label: "Bottom right", value: "right" },
                      { label: "Bottom left", value: "left" },
                    ]}
                    value={formState.position}
                    onChange={updateField("position")}
                  />
                </FormLayout.Group>

                <TextField
                  label="Preset message"
                  name="message"
                  value={formState.message}
                  onChange={updateField("message")}
                  multiline={4}
                  autoComplete="off"
                />

                <FormLayout.Group>
                  <Select
                    label="Button size"
                    name="size"
                    options={[
                      { label: "48 px", value: "48" },
                      { label: "56 px", value: "56" },
                      { label: "64 px", value: "64" },
                    ]}
                    value={formState.size}
                    onChange={updateField("size")}
                  />
                  <TextField
                    label="Horizontal offset X"
                    name="offset_x"
                    type="number"
                    min={0}
                    max={80}
                    value={formState.offset_x}
                    onChange={updateField("offset_x")}
                    autoComplete="off"
                  />
                  <TextField
                    label="Vertical offset Y"
                    name="offset_y"
                    type="number"
                    min={0}
                    max={120}
                    value={formState.offset_y}
                    onChange={updateField("offset_y")}
                    autoComplete="off"
                  />
                </FormLayout.Group>

                <InlineGrid columns={{ xs: "1fr", md: "1fr 1fr" }} gap="400" alignItems="start">
                  <Box>
                    <FormLayout>
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <Box>
                          <label htmlFor="bg_color" style={{ display: "block", marginBottom: "4px", color: "var(--p-color-text)" }}>
                            Background color
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="color"
                              value={formState.bg_color}
                              onChange={handleColorInput("bg_color")}
                              style={{ width: 32, height: 32, border: "none", borderRadius: "9999px", background: "transparent", cursor: "pointer" }}
                            />
                            <div style={{ flex: "1 1 auto" }}>
                              <TextField
                                id="bg_color"
                                label=""
                                labelHidden
                                name="bg_color"
                                value={formState.bg_color}
                                onChange={updateField("bg_color")}
                                autoComplete="off"
                              />
                            </div>
                          </div>
                        </Box>

                        <Box>
                          <label htmlFor="icon_color" style={{ display: "block", marginBottom: "4px", color: "var(--p-color-text)" }}>
                            Icon color
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="color"
                              value={formState.icon_color}
                              onChange={handleColorInput("icon_color")}
                              style={{ width: 32, height: 32, border: "none", borderRadius: "9999px", background: "transparent", cursor: "pointer" }}
                            />
                            <div style={{ flex: "1 1 auto" }}>
                              <TextField
                                id="icon_color"
                                label=""
                                labelHidden
                                name="icon_color"
                                value={formState.icon_color}
                                onChange={updateField("icon_color")}
                                autoComplete="off"
                              />
                            </div>
                          </div>
                        </Box>
                      </div>
                    </FormLayout>
                  </Box>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
                    <Text as="span" variant="bodyMd" tone="subdued">
                      Button preview
                    </Text>
                    <div
                      aria-hidden="true"
                      style={{
                        width: previewSizePx,
                        height: previewSizePx,
                        borderRadius: "9999px",
                        background: formState.bg_color || defaults.bg_color,
                        display: "grid",
                        placeItems: "center",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
                      }}
                    >
                      <svg
                        viewBox="0 0 448 512"
                        width={Math.floor((previewSizePx || 56) * 0.7)}
                        height={Math.floor((previewSizePx || 56) * 0.7)}
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          fill={formState.icon_color || defaults.icon_color}
                          d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
                        />
                      </svg>
                    </div>
                    <Button onClick={resetColors} variant="plain">
                      Reset to defaults
                    </Button>
                  </div>
                </InlineGrid>

                <FormLayout.Group>
                  <Checkbox
                    label="Open in a new window"
                    name="open_in_new"
                    checked={formState.open_in_new}
                    onChange={updateCheckbox("open_in_new")}
                  />
                  <Checkbox
                    label="Show on mobile"
                    name="show_on_mobile"
                    checked={formState.show_on_mobile}
                    onChange={updateCheckbox("show_on_mobile")}
                  />
                  <Checkbox
                    label="Show on desktop"
                    name="show_on_desktop"
                    checked={formState.show_on_desktop}
                    onChange={updateCheckbox("show_on_desktop")}
                  />
                </FormLayout.Group>

                <FormLayout.Group>
                  <Checkbox
                    label="Show on all pages"
                    name="show_everywhere"
                    checked={formState.show_everywhere}
                    onChange={updateCheckbox("show_everywhere")}
                  />
                  <Checkbox
                    label="Home page"
                    name="show_on_home"
                    checked={formState.show_on_home}
                    onChange={updateCheckbox("show_on_home")}
                    disabled={formState.show_everywhere}
                  />
                  <Checkbox
                    label="Product pages"
                    name="show_on_product"
                    checked={formState.show_on_product}
                    onChange={updateCheckbox("show_on_product")}
                    disabled={formState.show_everywhere}
                  />
                  <Checkbox
                    label="Collection pages"
                    name="show_on_collection"
                    checked={formState.show_on_collection}
                    onChange={updateCheckbox("show_on_collection")}
                    disabled={formState.show_everywhere}
                  />
                  <Checkbox
                    label="Blog posts"
                    name="show_on_article"
                    checked={formState.show_on_article}
                    onChange={updateCheckbox("show_on_article")}
                    disabled={formState.show_everywhere}
                  />
                  <Checkbox
                    label="Cart page"
                    name="show_on_cart"
                    checked={formState.show_on_cart}
                    onChange={updateCheckbox("show_on_cart")}
                    disabled={formState.show_everywhere}
                  />
                </FormLayout.Group>

              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}








