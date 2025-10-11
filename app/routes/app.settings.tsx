// app/routes/app.settings.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useState, type ChangeEvent } from "react";
import {
  Banner,
  Button,
  Card,
  Checkbox,
  FormLayout,
  Layout,
  Page,
  Select,
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
    return json({ cfg, shop, saved });
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
    const cfg = {
      number: String(form.get("number") || "").replace(/\D/g, ""),
      message: String(form.get("message") || ""),
      position: form.get("position") === "left" ? "left" : "right",
      offset_x: Number(form.get("offset_x") || 24),
      offset_y: Number(form.get("offset_y") || 24),
      size: Number(form.get("size") || 56),
      bg_color: String(form.get("bg_color") || "#25D366"),
      icon_color: String(form.get("icon_color") || "#ffffff"),
      open_in_new: form.get("open_in_new") === "on",
      show_on_mobile: form.get("show_on_mobile") !== null,
      show_on_desktop: form.get("show_on_desktop") !== null,
      show_everywhere: form.get("show_everywhere") !== null,
      show_on_home: form.get("show_on_home") !== null,
      show_on_product: form.get("show_on_product") !== null,
      show_on_collection: form.get("show_on_collection") !== null,
      show_on_article: form.get("show_on_article") !== null,
      show_on_cart: form.get("show_on_cart") !== null,
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

export default function Settings() {
  const { cfg, saved } = useLoaderData<typeof loader>();
  const initialValues = {
    number: cfg.number || "",
    message: cfg.message || "Hello, I need some help with my order.",
    position: cfg.position || "right",
    size: String(cfg.size || 56),
    offset_x: String(cfg.offset_x ?? 24),
    offset_y: String(cfg.offset_y ?? 24),
    bg_color: cfg.bg_color || "#25D366",
    icon_color: cfg.icon_color || "#ffffff",
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

  const handleColorInput = (field: "bg_color" | "icon_color") => (event: ChangeEvent<HTMLInputElement>) => {
    const hex = event.target.value;
    setFormState((prev) => ({ ...prev, [field]: hex }));
  };

  const updateField =
    (field: keyof typeof initialValues) => (value: string) =>
      setFormState((prev) => ({ ...prev, [field]: value }));

  const updateCheckbox =
    (field: keyof typeof initialValues) => (value: boolean) =>
      setFormState((prev) => ({ ...prev, [field]: value }));

  return (
    <Page title="WhatsApp 浮窗设置">
      <Layout>
        <Layout.Section>
          {saved && (
            <Banner status="success" title="设置已保存">
              已根据最新配置更新浮窗。
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
