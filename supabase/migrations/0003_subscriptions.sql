-- =============================================================
-- الخطوة 3: الاشتراكات (Paddle Billing)
-- الكتابة على هذه الجداول تتم من الخادم فقط (webhook بمفتاح service_role)
-- =============================================================

alter table public.profiles
  add column paddle_customer_id text unique;

-- اشتراكات Paddle — صف لكل اشتراك (sub_...)
create table public.subscriptions (
  id                    text primary key,              -- Paddle subscription id
  user_id               uuid not null references public.profiles(id) on delete cascade,
  customer_id           text not null,                 -- Paddle customer id (ctm_...)
  status                text not null check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled')),
  price_id              text,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false, -- إلغاء مجدول بنهاية الفترة
  canceled_at           timestamptz,
  last_event_at         timestamptz not null,          -- لتجاهل الأحداث القديمة التي تصل متأخرة
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_customer_idx on public.subscriptions (customer_id);

create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- سجل أحداث Webhook المعالَجة (منع المعالجة المكررة — Paddle قد يرسل الحدث أكثر من مرة)
create table public.paddle_events (
  event_id      text primary key,
  event_type    text not null,
  occurred_at   timestamptz not null,
  processed_at  timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
alter table public.paddle_events enable row level security;

-- المستخدم يرى اشتراكاته فقط؛ لا توجد سياسات كتابة (service_role يتجاوز RLS)
create policy "own subscriptions read" on public.subscriptions
  for select using (auth.uid() = user_id or public.is_admin());

-- لا سياسات على paddle_events: غير مرئية إلا للخادم
