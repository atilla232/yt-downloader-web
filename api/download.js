module.exports = async (req, res) => {
    // Header CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method !== 'POST') {
            return res.status(200).json({ success: false, error: 'Method Not Allowed' });
        }

        // Parsing body secara aman
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { body = {}; }
        }
        body = body || {};

        const { url, format, quality } = body;

        if (!url) {
            return res.status(200).json({ success: false, error: 'URL YouTube wajib diisi!' });
        }

        // Ekstrak Video ID
        const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        // STRATEGI 1: Cobalt API (v10 Spec)
        const cobaltInstances = [
            'https://api.cobalt.tools',
            'https://cobalt.api.scouts.cc',
            'https://co.wuk.sh'
        ];

        const cobaltPayload = {
            url: url,
            videoQuality: quality || '720',
            downloadMode: format === 'mp3' ? 'audio' : 'auto'
        };

        for (const instance of cobaltInstances) {
            try {
                const response = await fetch(instance, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: JSON.stringify(cobaltPayload)
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'stream' || data.status === 'redirect') {
                        return res.status(200).json({ success: true, downloadUrl: data.url });
                    } else if (data.status === 'picker' && data.picker && data.picker.length > 0) {
                        return res.status(200).json({ success: true, downloadUrl: data.picker[0].url });
                    } else if (data.url) {
                        return res.status(200).json({ success: true, downloadUrl: data.url });
                    }
                }
            } catch (e) {
                // Lanjut ke instance berikutnya
            }
        }

        // STRATEGI 2: Fallback ke Piped API (Jika Cobalt gagal/diblokir)
        if (videoId) {
            const pipedInstances = [
                'https://pipedapi.kavin.rocks',
                'https://api.piped.yt',
                'https://pipedapi.mha.fi'
            ];

            for (const instance of pipedInstances) {
                try {
                    const response = await fetch(`${instance}/streams/${videoId}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (format === 'mp3' && data.audioStreams && data.audioStreams.length > 0) {
                            return res.status(200).json({ success: true, downloadUrl: data.audioStreams[0].url });
                        } else if (data.videoStreams && data.videoStreams.length > 0) {
                            const stream = data.videoStreams.find(s => s.videoOnly === false) || data.videoStreams[0];
                            if (stream && stream.url) {
                                return res.status(200).json({ success: true, downloadUrl: stream.url });
                            }
                        }
                    }
                } catch (e) {
                    // Lanjut ke instance berikutnya
                }
            }
        }

        return res.status(200).json({
            success: false,
            error: 'Server API downloader sedang padat. Silakan coba link lain atau beberapa saat lagi.'
        });

    } catch (globalErr) {
        return res.status(200).json({ success: false, error: globalErr.message });
    }
};
