## JetNote Pos

JetNote Pos adalah aplikasi Point of Sale untuk restoran dengan dashboard owner/staff, menu publik, dan order online. Fitur utama:
- Dashboard manajemen order, menu, meja, inventory, transaksi, billing, dan settings
- Public menu & order page berdasarkan `restaurant_slug`
- Staff login via PIN
- RBAC permission untuk staff
- Theming berbasis `restaurant_settings` (warna primary/secondary)

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Env vars

Buat file `.env.local` di root:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Payment Gateway: 'simulate' (default), 'xendit', 'midtrans'
PAYMENT_GATEWAY=simulate

# Xendit Configuration (when PAYMENT_GATEWAY=xendit)
XENDIT_API_KEY=xnd_development_dummy
XENDIT_WEBHOOK_SECRET=whsec_dummy

# Midtrans Configuration (when PAYMENT_GATEWAY=midtrans)
MIDTRANS_SERVER_KEY=SB-Mid-server-dummy
MIDTRANS_CLIENT_KEY=SB-Mid-client-dummy
MIDTRANS_IS_PRODUCTION=false

NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3) Run dev server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Public URLs

- Landing / root: `/`
- Public menu: `/{restaurant_slug}/menu`
- Public order: `/{restaurant_slug}`
- Staff login: `/{restaurant_slug}/staff-login`

`restaurant_slug` disimpan di tabel `users`.

## Theme (Primary/Secondary)

Warna tema disimpan di `restaurant_settings`:
- `primary_color`
- `secondary_color`

Aturan:
- Dashboard & public pages memakai theme berdasarkan owner/slug.
- Auth/onboarding (login/register/setup) tetap default, tidak pakai theme.

## RBAC singkat

Staff permissions dibaca dari:
- `roles`
- `role_permissions`
- `permissions`

Fallback legacy role masih disupport untuk role lama.

## Supabase & Migrations

Skema database ada di `supabase/migrations`.  
Jika ada perubahan schema, commit file migration ke git agar tim lain bisa sync.

Perintah berguna:

```bash
# Push schema (butuh Supabase CLI setup)
npm run supabase:push

# Generate types
npm run supabase:generate
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
