module.exports = async (req, res) => {
    // Header CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Tangani preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        // Parsing body dengan aman (mencegah error jika body berupa string)
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                body = {};
            }
        }
        body = body || {};

        const { url, format, quality } = body;

        if (!url) {
            return res.status(400).json({ error: 'URL YouTube wajib diisi!' });
        }

        // Daftar server instance Cobalt cadangan
        const apiInstances = [
            'https://cobalt.stream/api/json',
            'https://co.wuk.sh/api/json',
            'https://api.cobalt.tools/api/json'
        ];

        const payload = {
            url: url,
            videoQuality: quality || '720',
            downloadMode: format === 'mp3' ? 'audio' : 'auto',
            audioFormat: 'mp3',
            filenamePattern: 'basic'
        };

        let lastError = 'Semua server API sibuk. Coba beberapa saat lagi.';

        for (const endpoint of apiInstances) {
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

                if (!response.ok) {
                    continue;
                }

                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    continue;
                }

                const data = await response.json();

                if (data.status === 'stream' || data.status === 'redirect') {
                    return res.status(200).json({ success: true, downloadUrl: data.url });
                } else if (data.status === 'picker' && data.picker && data.picker.length > 0) {
                    return res.status(200).json({ success: true, downloadUrl: data.picker[0].url });
                } else if (data.url) {
                    return res.status(200).json({ success: true, downloadUrl: data.url });
                } else if (data.text) {
                    lastError = data.text;
                }
            } catch (err) {
                lastError = err.message;
            }
        }

        return res.status(400).json({ error: lastError });

    } catch (globalError) {
        // Tangkap semua error internal agar Vercel tidak merespon dengan 500
        console.error('Vercel Function Error:', globalError);
        return res.status(200).json({ 
            error: `Terjadi kesalahan pada server function: ${globalError.message}` 
        });
    }
};
