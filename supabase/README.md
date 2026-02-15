# Supabase – Megan POS

## Membuat tabel (migrasi)

### Opsi A: Supabase CLI (project sudah di-link)

```bash
npx supabase db push
```

Jika keluaran: **"Remote database is up to date"** → artinya tidak ada migrasi *pending* (semua sudah applied). Tabel seharusnya sudah ada.

### Opsi B: Supabase Dashboard (jika tabel belum ada)

1. Buka project di [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**.
2. Salin isi `supabase/migrations/20250213000000_initial_schema.sql`.
3. Paste dan **Run**.

Tabel yang terbuat:
- **Migrasi 1:** `users`, `permissions`, `roles`, `role_permissions`, `employees`
- **Migrasi 2:** `restaurant_settings`
- **Migrasi 3:** `restaurant_tables`, `menu_categories`, `menu_items`, `orders`, `order_items`, `transactions`, `inventory`

## Cek status migrasi

```bash
npx supabase migration list
```

- **Applied** = migrasi sudah jalan di remote.
- **Reverted** = bisa di-repair lalu push lagi, atau jalankan SQL manual lewat Dashboard.

## Verifikasi tabel ada

- **Dashboard** → Table Editor → pastikan ada `users`, `employees`, `roles`, `permissions`, `role_permissions`.
- Atau panggil **GET** `/api/rbac/verify` (setelah app jalan) untuk lihat counts & role definitions.
