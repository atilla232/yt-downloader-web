module.exports = async (req, res) => {
    // Header CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handling preflight request dari browser
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method !== 'POST') {
            return res.status(200).json({ success: false, error: 'Method Not Allowed' });
        }

        // Handling parsing body secara aman
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { body = {}; }
        }
        body = body || {};

        const { url, format, quality } = body;

        if (!url) {
            return res.status(200).json({ success: false, error: 'URL YouTube wajib diisi!' });
        }

        // Endpoint cluster API Cobalt terbaru
        const apiEndpoints = [
            'https://api.cobalt.tools/',
            'https://cobalt.stream/',
            'https://co.wuk.sh/'
        ];

        const payload = {
            url: url,
            videoQuality: quality || '720',
            downloadMode: format === 'mp3' ? 'audio' : 'auto',
            audioFormat: 'mp3',
            filenamePattern: 'basic'
        };

        let lastErrorMessage = 'Gagal memproses video. Pastikan link video publik dan valid.';

        for (const endpoint of apiEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) continue;

                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) continue;

                const data = await response.json();

                if (data.status === 'stream' || data.status === 'redirect') {
                    return res.status(200).json({ success: true, downloadUrl: data.url });
                } else if (data.status === 'picker' && data.picker && data.picker.length > 0) {
                    return res.status(200).json({ success: true, downloadUrl: data.picker[0].url });
                } else if (data.url) {
                    return res.status(200).json({ success: true, downloadUrl: data.url });
                } else if (data.text) {
                    lastErrorMessage = data.text;
                }
            } catch (err) {
                lastErrorMessage = err.message;
            }
        }

        return res.status(200).json({ success: false, error: lastErrorMessage });

    } catch (globalError) {
        return res.status(200).json({ success: false, error: globalError.message });
    }
};
