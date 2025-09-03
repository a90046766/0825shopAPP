-- Seed CMS contents for public website homepage and store hero
do $$ begin
  -- Clean previous banners for deterministic seed
  delete from public.site_banners where slot in ('home-hero','home-scroller','store-hero');

  -- Home hero
  insert into public.site_banners(slot, title, subtitle, image_url, href, sort_order, active)
  values
    ('home-hero', '日式洗濯・專業到你家', '冷氣深層清洗｜居家清潔｜家電購買｜二手服務', 'https://images.unsplash.com/photo-1519710884009-8243f01f6e4f?q=80&w=1600&auto=format&fit=crop', '/store', 0, true);

  -- Store hero
  insert into public.site_banners(slot, title, subtitle, image_url, href, sort_order, active)
  values
    ('store-hero', '立即線上預約與選購', '透明價格・官方直營・服務保固', 'https://images.unsplash.com/photo-1516383607781-913a19294fd1?q=80&w=1600&auto=format&fit=crop', '/store', 0, true);

  -- Horizontal scroller banners on home page
  insert into public.site_banners(slot, title, subtitle, image_url, href, sort_order, active) values
    ('home-scroller', '日式洗濯｜冷氣深層清洗', '高壓深洗・藥水防護・完整覆蓋保護', null, '/services/cleaning', 1, true),
    ('home-scroller', '居家清潔｜安心到家', '裝修後/定期清潔・到府服務', null, '/services/home', 2, true),
    ('home-scroller', '家電購買｜嚴選品牌', '到府安裝・原廠保固', null, '/appliances', 3, true),
    ('home-scroller', '二手家電｜嚴修認證', '唯一件・來源透明・功能保固', null, '/used', 4, true);

  -- Home sections (page '/')
  delete from public.site_sections where page = '/';
  insert into public.site_sections(page, kind, title, content, image_url, sort_order, active) values
    ('/', 'content', '為什麼選擇「日式洗濯」？', '我們堅持「確實、乾淨、透明」。全流程拍照存證、雙簽名結案、服務有保固。', null, 0, true),
    ('/', 'content', '我們的優勢', '專業技師到府、標準化流程、藥水分區與防護覆蓋，保護您的居家環境。', null, 1, true),
    ('/', 'steps', '服務流程', '1. 線上預約 2. 客服確認 3. 到府服務 4. 雙方簽名 5. 服務保固', null, 2, true),
    ('/', 'content', '安心保固', '完成服務後提供保固期內的問題協助，滿意是我們的承諾。', null, 3, true);

  -- Default site settings (editable later in CMS)
  insert into public.site_settings(id, brand_color, phone, email, line_url)
  values ('default', '#7C3AED', '0912-345-678', 'service@example.com', 'https://line.me/R/ti/p/@yourline')
  on conflict (id) do update set
    brand_color = excluded.brand_color,
    phone = excluded.phone,
    email = excluded.email,
    line_url = excluded.line_url,
    updated_at = now();
end $$;


