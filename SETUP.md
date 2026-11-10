# MG_V2RAY — setup and launch

The static mobile-first website uses Supabase for private data and administrator authentication.

## Already configured
- Supabase project: atrwhvyhopifugphfcpe
- Tables: v2ray_entries and orders
- Row Level Security: only mahdim495mk@gmail.com can manage configurations and read orders
- Private Storage bucket: v2ray-files (20 MB limit)
- Public order submission; no public order reads
- Edge Function source: supabase/functions/notify-order/index.ts

The browser uses only the Supabase publishable key. Never put a secret/service-role key in this repository.

## 1. Create the administrator login
In Supabase Dashboard → Authentication → Users → Add user:
1. Create mahdim495mk@gmail.com.
2. Set a strong password and confirm the email.
3. Turn off public sign-ups in Authentication settings if enabled. This website has no sign-up page, and database policies independently restrict management to this exact email.

## 2. Enable order email notifications
Orders are saved in Supabase even before email is configured. To send an email automatically:
1. Create an account and API key at https://resend.com/api-keys.
2. Supabase Dashboard → Edge Functions → Secrets; add RESEND_API_KEY with that API key.
3. Deploy the function named notify-order from this repository (or run: supabase functions deploy notify-order --no-verify-jwt).
4. The starter sender is onboarding@resend.dev. Resend's test sender can only deliver to the account's verified recipient. For production, verify your own domain in Resend and change the from field in the function.

The function only sends one notification per existing order. If the email key is missing, the order is still saved and remains visible in the private admin dashboard.

## 3. Publish with GitHub Pages
Open repository Settings → Pages → Build and deployment → Source → GitHub Actions. The included workflow deploys the site whenever you push to main. Your Pages URL appears in the workflow deployment environment.

## 4. Use the website
- Public site: https://MOGHIMI-IR.github.io/MG_V2RAY/ after Pages is enabled and the workflow succeeds.
- Admin login: append #admin to the site URL.
- Add a text configuration by pasting its contents; add a file by selecting it in the same form.
- Toggle visibility, edit, or delete configurations from the dashboard.
- Customer requests appear in the private orders table.

## Notes
- Published configuration text and active file downloads are intentionally public. Do not publish private credentials or configs meant for a single customer.
- File objects stay in a private Storage bucket and are delivered through short-lived signed download links.
- The price is displayed as 210,000 toman for one month, unlimited. Fulfillment and payment are manual.
- The card number is publicly shown with a copy button.

## 5. Supabase Auth redirect URL (for password recovery)

After GitHub Pages is enabled, open Authentication → URL Configuration:
- Set the Site URL to `https://moghimi-ir.github.io/MG_V2RAY/`.
- Add `https://moghimi-ir.github.io/MG_V2RAY/**` to the Additional Redirect URLs.

Normal password login works without this redirect setting; it is needed for the forgot-password link.
