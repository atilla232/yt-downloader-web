export default async function handler(req, res) {
  // Hanya menerima HTTP Method POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { url, format, quality } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL YouTube wajib diisi!" });
  }

  // Daftar endpoint API cadangan jika salah satu sedang sibuk/maintenance
  const apiInstances = [
    "https://api.cobalt.tools/api/json",
    "https://cobalt.api.scouts.cc/api/json",
  ];

  // Menyusun payload sesuai permintaan pengguna
  const payload = {
    url: url,
    videoQuality: quality || "720",
    downloadMode: format === "mp3" ? "audio" : "auto",
    audioFormat: "mp3",
    filenamePattern: "basic",
  };

  let lastError = null;

  // Mencoba melakukan request ke instance API
  for (const instance of apiInstances) {
    try {
      const response = await fetch(instance, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastError = errData.text || `HTTP Error ${response.status}`;
        continue;
      }

      const data = await response.json();

      // Respon berupa direct stream URL
      if (data.status === "stream" || data.status === "redirect") {
        return res.status(200).json({
          success: true,
          downloadUrl: data.url,
          filename: data.filename || "download",
        });
      } else if (data.status === "picker" && data.picker?.length > 0) {
        return res.status(200).json({
          success: true,
          downloadUrl: data.picker[0].url,
          filename: data.filename || "download",
        });
      } else if (data.status === "error") {
        lastError = data.text || "Gagal memproses video.";
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(500).json({
    error:
      lastError ||
      "Server gagal memproses video. Pastikan URL benar atau coba beberapa saat lagi.",
  });
}
