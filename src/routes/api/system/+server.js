import { json } from '@sveltejs/kit';
import si from 'systeminformation';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

async function runCmd(cmd, fallback = '0') {
    try {
        const { stdout } = await execPromise(cmd);
        return stdout.trim() || fallback;
    } catch {
        return fallback;
    }
}

export async function GET() {
    try {
        // Run system polls in parallel for speed
        const [cpu, mem, os, currentLoad, fsSize, network, gpuLoad, gpuPower, nixPkgs] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.osInfo(),
            si.currentLoad(),
            si.fsSize(),
            si.networkStats(),
            runCmd('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', '0'),
            runCmd('nvidia-smi --query-gpu=power.draw --format=csv,noheader,nounits', '0'),
            runCmd('nix-store -qR /run/current-system/sw | wc -l', '0')
        ]);

        const rx_sec = network.filter(n => n.iface !== 'lo').reduce((acc, n) => acc + (n.rx_sec || 0), 0);
        const tx_sec = network.filter(n => n.iface !== 'lo').reduce((acc, n) => acc + (n.tx_sec || 0), 0);

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
            network: {
                rx_sec: (rx_sec / 1024 / 1024).toFixed(2), // MB/s
                tx_sec: (tx_sec / 1024 / 1024).toFixed(2)  // MB/s
            },
            os: {
                platform: os.platform,
                distro: os.distro,
                uptime: (si.time().uptime / 3600).toFixed(1) // Hours
            },
            gpu: {
                load: gpuLoad,
                power: gpuPower
            },
            nixOs: {
                packages: nixPkgs
            }
        });
    } catch (e) {
        console.error("System poll error", e);
        return json({ error: "Failed to read system status" }, { status: 500 });
    }
}
