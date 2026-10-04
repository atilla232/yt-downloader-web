module.exports = async (req, res) => {
    // Set Header CORS agar tidak terblokir browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Tangani preflight request dari browser
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { url, format, quality } = req.body || {};

    if (!url) {
        return res.status(400).json({ error: 'URL YouTube wajib diisi!' });
    }

    // Daftar endpoint API eksternal cadangan
    const apiEndpoints = [
        'https://api.cobalt.tools/',
        'https://co.wuk.sh/api/json'
    ];

    const payload = {
        url: url,
        videoQuality: quality || '720',
        downloadMode: format === 'mp3' ? 'audio' : 'auto',
        audioFormat: 'mp3'
    };

    let lastError = 'Server gagal memproses permintaan unduhan.';

    for (const endpoint of apiEndpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: JSON.stringify(payload)
            });

            // Periksa apakah respon berupa JSON (mencegah error jika terkena Cloudflare HTML)
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                lastError = `API mengembalikan respon tidak valid (${response.status})`;
                continue;
            }

            const data = await response.json();

            if (data.status === 'stream' || data.status === 'redirect') {
                return res.status(200).json({
                    success: true,
                    downloadUrl: data.url
                });
            } else if (data.status === 'picker' && data.picker && data.picker.length > 0) {
                return res.status(200).json({
                    success: true,
                    downloadUrl: data.picker[0].url
                });
            } else if (data.url) {
                return res.status(200).json({
                    success: true,
                    downloadUrl: data.url
                });
            } else if (data.text) {
                lastError = data.text;
            }
        } catch (err) {
            lastError = err.message;
        }
    }

    return res.status(500).json({ error: lastError });
};
