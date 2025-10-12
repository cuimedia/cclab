// app/routes/app.settings.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useMemo, useState, type ChangeEvent } from "react";
import {
  Banner,
  Button,
  Card,
  Checkbox,
  FormLayout,
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
    const payload = await r.json();
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
    const payload = await domainResp.json();
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
    const cfg = {
      number: String(form.get("number") || "").replace(/\D/g, ""),
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

    return redirect("/app/settings?saved=1");
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
  const formattedUpdatedAt = formatDateTime(updatedAt);
  const defaults = {
    bg_color: "#25D366",
    icon_color: "#ffffff",
  } as const;

  const initialValues = {
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
  };

  const [formState, setFormState] = useState(initialValues);

  const handleColorInput =
    (field: "bg_color" | "icon_color") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const hex = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: hex }));
    };

  const updateField =
    (field: keyof typeof initialValues) => (value: string) =>
      setFormState((prev) => ({ ...prev, [field]: value }));

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

  return (
    <Page title="WhatsApp 浮窗设置">
      <Layout>
        <Layout.Section>
          {saved && (
            <Banner status="success" title="设置已保存">
              已根据最新配置更新浮窗
              {formattedUpdatedAt ? `（保存时间：${formattedUpdatedAt}）` : "。"}
            </Banner>
          )}
          <Card sectioned>
            <Form method="post">
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="WhatsApp 号码（E.164 纯数字，不带+）"
                    name="number"
                    value={formState.number}
                    onChange={updateField("number")}
                    autoComplete="tel"
                    requiredIndicator
                  />
                  <Select
                    label="按钮位置"
                    name="position"
                    options={[
                      { label: "右下", value: "right" },
                      { label: "左下", value: "left" },
                    ]}
                    value={formState.position}
                    onChange={updateField("position")}
                  />
                </FormLayout.Group>

                <TextField
                  label="预填消息"
                  name="message"
                  value={formState.message}
                  onChange={updateField("message")}
                  multiline={4}
                />

                <FormLayout.Group>
                  <Select
                    label="尺寸"
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
                    label="横向偏移 X"
                    name="offset_x"
                    type="number"
                    min={0}
                    max={80}
                    value={formState.offset_x}
                    onChange={updateField("offset_x")}
                  />
                  <TextField
                    label="纵向偏移 Y"
                    name="offset_y"
                    type="number"
                    min={0}
                    max={120}
                    value={formState.offset_y}
                    onChange={updateField("offset_y")}
                  />
                </FormLayout.Group>

                <FormLayout.Group>
                  <TextField
                    label="背景色"
                    name="bg_color"
                    value={formState.bg_color}
                    onChange={updateField("bg_color")}
                    autoComplete="off"
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "24px" }}>
                    <input
                      type="color"
                      value={formState.bg_color}
                      onChange={handleColorInput("bg_color")}
                      style={{ width: 40, height: 32, border: "none", background: "transparent", cursor: "pointer" }}
                    />
                  </div>
                </FormLayout.Group>

                <FormLayout.Group>
                  <TextField
                    label="图标色"
                    name="icon_color"
                    value={formState.icon_color}
                    onChange={updateField("icon_color")}
                    autoComplete="off"
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "24px" }}>
                    <input
                      type="color"
                      value={formState.icon_color}
                      onChange={handleColorInput("icon_color")}
                      style={{ width: 40, height: 32, border: "none", background: "transparent", cursor: "pointer" }}
                    />
                  </div>
                </FormLayout.Group>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "start" }}>
                  <div />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "24px",
                      borderLeft: "1px solid var(--p-color-border, rgba(0, 0, 0, 0.1))",
                      paddingLeft: "24px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <Text as="span" variant="bodyMd" tone="subdued">
                        浮窗预览
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
                    </div>
                    <Button onClick={resetColors} plain>
                      恢复默认颜色
                    </Button>
                  </div>
                </div>

                <FormLayout.Group>
                  <Checkbox
                    label="新窗口打开"
                    name="open_in_new"
                    checked={formState.open_in_new}
                    onChange={updateCheckbox("open_in_new")}
                  />
                  <Checkbox
                    label="在移动端显示"
                    name="show_on_mobile"
                    checked={formState.show_on_mobile}
                    onChange={updateCheckbox("show_on_mobile")}
                  />
                  <Checkbox
                    label="在桌面端显示"
                    name="show_on_desktop"
                    checked={formState.show_on_desktop}
                    onChange={updateCheckbox("show_on_desktop")}
                  />
                </FormLayout.Group>

                <FormLayout.Group>
                  <Checkbox
                    label="全站显示"
                    name="show_everywhere"
                    checked={formState.show_everywhere}
                    onChange={updateCheckbox("show_everywhere")}
                  />
                  <Checkbox
                    label="首页"
                    name="show_on_home"
                    checked={formState.show_on_home}
                    onChange={updateCheckbox("show_on_home")}
                    disabled={formState.show_everywhere}
                  />
                  <Checkbox
                    label="商品页"
                    name="show_on_product"
                    checked={formState.show_on_product}
                    onChange={updateCheckbox("show_on_product")}
                    disabled={formState.show_everywhere}
                  />
                  <Checkbox
                    label="集合页"
                    name="show_on_collection"
                    checked={formState.show_on_collection}
                    onChange={updateCheckbox("show_on_collection")}
                    disabled={formState.show_everywhere}
                  />
                  <Checkbox
                    label="博文页"
                    name="show_on_article"
                    checked={formState.show_on_article}
                    onChange={updateCheckbox("show_on_article")}
                    disabled={formState.show_everywhere}
                  />
                  <Checkbox
                    label="购物车页"
                    name="show_on_cart"
                    checked={formState.show_on_cart}
                    onChange={updateCheckbox("show_on_cart")}
                    disabled={formState.show_everywhere}
                  />
                </FormLayout.Group>

                <Button submit primary>
                  保存设置
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
