# Wink Studio — Create Wink

Website dashboard hitam-putih responsif untuk fitur **Create Wink saja**. Dibuat untuk deploy ke Vercel tanpa build step.

## Deploy ke Vercel

1. Upload folder ini ke repository GitHub, lalu import repository tersebut di Vercel.
2. Di **Project → Settings → Environment Variables**, tambahkan:
   - `DASHBOARD_PASSWORD` — password privat untuk membuka dashboard.
   - `JAKY_API_KEY` — API key yang sah dan memang kamu berwenang gunakan.
3. Redeploy project setelah menambahkan environment variables.
4. Buka domain Vercel dan masukkan `DASHBOARD_PASSWORD` ketika diminta.

## Cara kerja

- Frontend mengirim `POST /api/create-wink`.
- Fungsi server Vercel memvalidasi password dan meneruskan request ke endpoint Create Wink yang terdapat pada source yang diberikan.
- API key hanya ada di environment server, tidak ditanam ke HTML/JavaScript frontend.
- Satu request dibatasi **maksimal satu akun**; fitur bulk generation tidak disertakan.
- Hasil menampilkan email, password, token, UID, credits, dan metadata user yang dikembalikan API.

## Catatan penting

- Pastikan penggunaan endpoint dan API key sesuai izin serta ketentuan penyedia API.
- Jangan pernah memasukkan API key ke `app.js`, `index.html`, atau repository.
- `DASHBOARD_PASSWORD` adalah gerbang akses sederhana, bukan sistem akun multi-user. Batasi akses repository dan deployment.
- Riwayat aktivitas hanya tersimpan selama halaman masih terbuka; tidak disimpan ke database.
- Jika API mengubah skema respons atau membutuhkan header tambahan, sesuaikan `api/create-wink.js`.
- Tidak ada endpoint HD/upscale dalam proyek ini.
