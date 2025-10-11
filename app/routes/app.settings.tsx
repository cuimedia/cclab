// app/routes/app.settings.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
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
    return json({ cfg, shop });
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
  const { cfg } = useLoaderData<typeof loader>();
  return (
    <div style={{padding:"16px", maxWidth: 780}}>
      <h1 style={{fontSize: 22, marginBottom: 12}}>WhatsApp 浮窗设置</h1>
      <Form method="post">
        <fieldset style={{border:"1px solid #eee", padding:12, marginBottom:12}}>
          <legend>基本</legend>
          <label>WhatsApp 号码（E.164 纯数字，不带+）
            <input name="number" defaultValue={cfg.number || ""} required
                   style={{width:"100%", padding:8, marginTop:4}} />
          </label>
          <label style={{display:"block", marginTop:12}}>预填消息
            <textarea name="message" rows={3}
              defaultValue={cfg.message || "Hello, I need some help with my order."}
              style={{width:"100%", padding:8, marginTop:4}}/>
          </label>
        </fieldset>

        <fieldset style={{border:"1px solid #eee", padding:12, marginBottom:12}}>
          <legend>外观与位置</legend>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <label>位置
              <select name="position" defaultValue={cfg.position || "right"}
                      style={{width:"100%", padding:8, marginTop:4}}>
                <option value="right">右下</option>
                <option value="left">左下</option>
              </select>
            </label>
            <label>尺寸(px)
              <select name="size" defaultValue={String(cfg.size || 56)}
                      style={{width:"100%", padding:8, marginTop:4}}>
                <option value="48">48</option><option value="56">56</option><option value="64">64</option>
              </select>
            </label>
            <label>横向偏移 X
              <input type="number" name="offset_x" min={0} max={80}
                     defaultValue={cfg.offset_x ?? 24}
                     style={{width:"100%", padding:8, marginTop:4}}/>
            </label>
            <label>纵向偏移 Y
              <input type="number" name="offset_y" min={0} max={100}
                     defaultValue={cfg.offset_y ?? 24}
                     style={{width:"100%", padding:8, marginTop:4}}/>
            </label>
            <label>背景色（#HEX）
              <input name="bg_color" defaultValue={cfg.bg_color || "#25D366"}
                     style={{width:"100%", padding:8, marginTop:4}}/>
            </label>
            <label>图标色（#HEX）
              <input name="icon_color" defaultValue={cfg.icon_color || "#ffffff"}
                     style={{width:"100%", padding:8, marginTop:4}}/>
            </label>
          </div>
        </fieldset>

        <fieldset style={{border:"1px solid #eee", padding:12, marginBottom:12}}>
          <legend>行为</legend>
          <label><input type="checkbox" name="open_in_new" defaultChecked={cfg.open_in_new ?? true}/> 新窗口打开</label><br/>
          <label><input type="checkbox" name="show_on_mobile" defaultChecked={cfg.show_on_mobile ?? true}/> 在移动端显示</label><br/>
          <label><input type="checkbox" name="show_on_desktop" defaultChecked={cfg.show_on_desktop ?? true}/> 在桌面端显示</label>
        </fieldset>

        <fieldset style={{border:"1px solid #eee", padding:12, marginBottom:12}}>
          <legend>显示页面</legend>
          <label><input type="checkbox" name="show_everywhere" defaultChecked={cfg.show_everywhere ?? true}/> 全站显示</label><br/>
          <label><input type="checkbox" name="show_on_home" defaultChecked={cfg.show_on_home ?? true}/> 首页</label><br/>
          <label><input type="checkbox" name="show_on_product" defaultChecked={cfg.show_on_product ?? true}/> 商品页</label><br/>
          <label><input type="checkbox" name="show_on_collection" defaultChecked={cfg.show_on_collection ?? true}/> 集合页</label><br/>
          <label><input type="checkbox" name="show_on_article" defaultChecked={cfg.show_on_article ?? false}/> 博文页</label><br/>
          <label><input type="checkbox" name="show_on_cart" defaultChecked={cfg.show_on_cart ?? true}/> 购物车页</label>
        </fieldset>

        <button type="submit" style={{padding:"10px 16px"}}>保存设置</button>
        <p style={{marginTop:10,color:"#666"}}>提示：主题编辑器只需开启 App embed；其余设置都在此页面管理。</p>
      </Form>
    </div>
  );
}
