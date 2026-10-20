export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ status: false, message: "Method not allowed." });
  }

  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  const apiKey = process.env.JAKY_API_KEY;
  if (!dashboardPassword || !apiKey) {
    return res.status(503).json({ status: false, message: "Server belum dikonfigurasi. Atur DASHBOARD_PASSWORD dan JAKY_API_KEY di Vercel." });
  }

  const suppliedPassword = req.headers["x-dashboard-password"];
  if (typeof suppliedPassword !== "string" || suppliedPassword.length > 256 || suppliedPassword !== dashboardPassword) {
    return res.status(401).json({ status: false, message: "Akses workspace ditolak." });
  }

  // Intentionally limited to one account per request; no bulk-account generation.
  const count = Number(req.body?.count ?? 1);
  if (count !== 1) {
    return res.status(400).json({ status: false, message: "Jumlah per permintaan dibatasi satu akun." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110000);
  try {
    const upstream = await fetch("https://api.jaky.dev/v1/wink/create-account?count=1", {
      method: "GET",
      headers: {
        "x-jaky-key": apiKey,
        "User-Agent": "WinkStudio/1.0 (authorized API client)",
        "Accept": "application/json"
      },
      signal: controller.signal
    });

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = upstream.status === 401 ? 502 : upstream.status === 429 ? 429 : 502;
      const message = upstream.status === 401
        ? "API menolak kredensial. Periksa JAKY_API_KEY."
        : upstream.status === 429
          ? "Batas request API tercapai. Coba lagi nanti."
          : "Layanan API mengembalikan error.";
      return res.status(status).json({ status: false, message, upstreamStatus: upstream.status });
    }
    if (payload?.status !== true || !Array.isArray(payload?.result?.accounts)) {
      return res.status(502).json({ status: false, message: payload?.msg || "Format respons API tidak sesuai." });
    }
    return res.status(200).json(payload);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({
      status: false,
      message: timedOut ? "API timeout. Coba lagi nanti." : "Tidak dapat menghubungi layanan API."
    });
  } finally {
    clearTimeout(timeout);
  }
}
