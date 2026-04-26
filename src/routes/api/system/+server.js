import { json } from '@sveltejs/kit';
import si from 'systeminformation';

export async function GET() {
    try {
        // Run system polls in parallel for speed
        const [cpu, mem, os, currentLoad, fsSize, network] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.osInfo(),
            si.currentLoad(),
            si.fsSize(),
            si.networkStats()
        ]);

        return json({
            cpu: {
                manufacturer: cpu.manufacturer,
                brand: cpu.brand,
                cores: cpu.cores,
                load: currentLoad.currentLoad.toFixed(1)
            },
            memory: {
                total: (mem.total / 1024 / 1024 / 1024).toFixed(1),
                used: (mem.active / 1024 / 1024 / 1024).toFixed(1),
                free: (mem.available / 1024 / 1024 / 1024).toFixed(1),
                percent: ((mem.active / mem.total) * 100).toFixed(1)
            },
            storage: fsSize.map(disk => ({
                mount: disk.mount,
                size: (disk.size / 1024 / 1024 / 1024).toFixed(1),
                used: (disk.used / 1024 / 1024 / 1024).toFixed(1),
                percent: disk.use.toFixed(1)
            })),
            network: network.length > 0 ? {
                rx_sec: (network[0].rx_sec / 1024 / 1024).toFixed(2), // MB/s
                tx_sec: (network[0].tx_sec / 1024 / 1024).toFixed(2)  // MB/s
            } : null,
            os: {
                platform: os.platform,
                distro: os.distro,
                uptime: (si.time().uptime / 3600).toFixed(1) // Hours
            }
        });
    } catch (e) {
        console.error("System poll error", e);
        return json({ error: "Failed to read system status" }, { status: 500 });
    }
}
