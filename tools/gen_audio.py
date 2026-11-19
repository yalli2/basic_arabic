"""Generate native-style Arabic audio (Microsoft Edge neural voices) for every
clip listed in audio/manifest.json. Runs in GitHub Actions; safe to re-run —
only missing clips are generated and clips no longer in the manifest are removed."""
import asyncio, json, os, sys
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, "audio")
RATE = "-8%"

async def one(sem, h, item, stats):
    path = os.path.join(AUD, h + ".mp3")
    if os.path.exists(path) and os.path.getsize(path) > 500:
        stats["skip"] += 1; return
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(item["t"], item["v"], rate=RATE).save(path)
                if os.path.getsize(path) > 500:
                    stats["ok"] += 1; return
            except Exception as e:
                err = e
            await asyncio.sleep(2 + attempt * 3)
        stats["fail"] += 1
        if os.path.exists(path): os.remove(path)
        print("FAILED", h, item["t"], file=sys.stderr)

async def main():
    man = json.load(open(os.path.join(AUD, "manifest.json"), encoding="utf-8"))
    for f in os.listdir(AUD):
        if f.endswith(".mp3") and f[:-4] not in man:
            os.remove(os.path.join(AUD, f))
    sem = asyncio.Semaphore(6)
    stats = {"ok": 0, "skip": 0, "fail": 0}
    await asyncio.gather(*(one(sem, h, it, stats) for h, it in man.items()))
    print(stats)

asyncio.run(main())
