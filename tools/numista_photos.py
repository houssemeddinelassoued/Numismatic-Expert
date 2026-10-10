"""Fetch Numista catalogue thumbnails for the types in a Numista collection export (official API v3),
then pack them into WebP sprite sheets plus an index for the Cabinet Numismatique page.

Usage:
  python -I numista_photos.py fetch  <export.csv> <cache_dir> <key_file> [--max N]
  python -I numista_photos.py build  <export.csv> <cache_dir> <out_dir>

The API key is read from <key_file> and never written anywhere else.
Personal project use only (Numista API licence, section 8.4). Attribution is kept in the index.
"""
import csv, io, json, os, re, sys, time, threading
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

API = "https://api.numista.com/v3/types/{}"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
SERIES = {"n": (180, 100), "c": (160, 160)}   # banknotes: wide cells; coins and others: square cells
COLS, ROWS = 8, 8


def read_types(csv_path):
    types = {}
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            n = re.sub(r"\D", "", row.get("N# number (with link)", "") or row.get("N# number", ""))
            if not n:
                continue
            comp, typ = (row.get("Composition") or "").lower(), (row.get("Type") or "").lower()
            note = bool(re.search(r"paper|polymer|cotton|plastic", comp) or re.search(r"banknote|note|voucher|cheque|certificate|coupon", typ))
            types.setdefault(n, "n" if note else "c")
    return types


def http_get(url, headers, timeout=30):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def fetch(csv_path, cache, key_file, max_n=None):
    key = open(key_file, encoding="utf-8").read().strip()
    types = read_types(csv_path)
    os.makedirs(os.path.join(cache, "types"), exist_ok=True)
    os.makedirs(os.path.join(cache, "img"), exist_ok=True)
    todo = [n for n in types if not os.path.exists(os.path.join(cache, "types", n + ".json"))]
    if max_n:
        todo = todo[:max_n]
    print(f"{len(types)} types, {len(types) - len(todo)} already cached, {len(todo)} API requests to make", flush=True)
    lock = threading.Lock()
    streak429 = 0
    for i, n in enumerate(todo, 1):
        for attempt in range(4):
            try:
                status, body = http_get(API.format(n), {"Numista-API-Key": key, "User-Agent": "CabinetNumismatique/1.0 (personal project)"})
                data = json.loads(body)
                keep = {"id": data.get("id"), "title": data.get("title"), "category": data.get("category")}
                for side in ("obverse", "reverse"):
                    s = data.get(side) or {}
                    keep[side] = {k: s.get(k) for k in ("picture", "thumbnail", "picture_copyright", "picture_copyright_url", "picture_license_name", "picture_license_url")}
                with open(os.path.join(cache, "types", n + ".json"), "w", encoding="utf-8") as f:
                    json.dump(keep, f, ensure_ascii=False)
                streak429 = 0
                break
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    with open(os.path.join(cache, "types", n + ".json"), "w", encoding="utf-8") as f:
                        json.dump({"id": n, "missing": True}, f)
                    break
                if e.code in (401, 403):
                    print(f"STOP: HTTP {e.code} on N# {n}: API key refused", flush=True); return
                if e.code == 429:
                    streak429 += 1
                    if streak429 >= 12:
                        print(f"STOP: repeated HTTP 429 at N# {n}: rate limit or monthly quota reached; rerun later to resume", flush=True); return
                    time.sleep(10 * (attempt + 1)); continue
                time.sleep(2 + attempt * 3)
            except Exception:
                time.sleep(2 + attempt * 3)
        if i % 100 == 0:
            print(f"  types {i}/{len(todo)}", flush=True)
        time.sleep(0.25)

    jobs = []
    for n in types:
        p = os.path.join(cache, "types", n + ".json")
        if not os.path.exists(p):
            continue
        t = json.load(open(p, encoding="utf-8"))
        for side, tag in (("obverse", "o"), ("reverse", "r")):
            s = t.get(side) or {}
            url = s.get("thumbnail") or s.get("picture")
            dest = os.path.join(cache, "img", f"{n}-{tag}.jpg")
            if url and not os.path.exists(dest):
                jobs.append((url, dest))
    print(f"{len(jobs)} images to download", flush=True)
    cnt = [0]; fails = []

    def get_img(job):
        url, dest = job
        try:
            status, body = http_get(url, {"User-Agent": UA, "Accept": "image/avif,image/webp,image/*,*/*;q=0.8"})
            im = Image.open(io.BytesIO(body)).convert("RGBA")
            im.thumbnail((360, 360))
            im.convert("RGB").save(dest, "JPEG", quality=90)
        except Exception as e:
            fails.append((url, str(e)[:80]))
        with lock:
            cnt[0] += 1
            if cnt[0] % 200 == 0:
                print(f"  images {cnt[0]}/{len(jobs)}", flush=True)

    with ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(get_img, jobs))
    print(f"done; {len(fails)} image failures", flush=True)
    for f in fails[:10]:
        print("  fail", f, flush=True)


def build(csv_path, cache, out):
    types = read_types(csv_path)
    os.makedirs(out, exist_ok=True)
    index = {"v": 1, "src": "Numista", "cols": COLS, "rows": ROWS, "series": {k: {"w": w, "h": h} for k, (w, h) in SERIES.items()}, "t": {}}
    sheets = {}  # (series, side) -> list of (n, image)

    def fit(path, w, h):
        im = Image.open(path).convert("RGBA")
        im.thumbnail((w, h), Image.LANCZOS)
        cell = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        cell.paste(im, ((w - im.width) // 2, (h - im.height) // 2))
        return cell

    ordered = sorted(types.items(), key=lambda kv: int(kv[0]))
    for n, series in ordered:
        p = os.path.join(cache, "types", n + ".json")
        if not os.path.exists(p):
            continue
        t = json.load(open(p, encoding="utf-8"))
        entry = {}
        for side, tag in (("obverse", "o"), ("reverse", "r")):
            img = os.path.join(cache, "img", f"{n}-{tag}.jpg")
            if not os.path.exists(img):
                continue
            lst = sheets.setdefault((series, tag), [])
            idx = len(lst)
            lst.append((n, img))
            s = t.get(side) or {}
            entry[tag] = [series, idx // (COLS * ROWS), idx % (COLS * ROWS)]
            if s.get("picture_copyright"):
                entry["c" + tag] = s["picture_copyright"][:80]
            if s.get("picture_license_name"):
                entry["l" + tag] = s["picture_license_name"][:40]
        if entry:
            index["t"][n] = entry
    total = 0
    for (series, tag), lst in sheets.items():
        w, h = SERIES[series]
        per = COLS * ROWS
        for sheet_no in range((len(lst) + per - 1) // per):
            canvas = Image.new("RGBA", (w * COLS, h * ROWS), (0, 0, 0, 0))
            for i, (n, img) in enumerate(lst[sheet_no * per:(sheet_no + 1) * per]):
                canvas.paste(fit(img, w, h), ((i % COLS) * w, (i // COLS) * h))
            name = f"{series}-{tag}-{sheet_no:02d}.webp"
            canvas.save(os.path.join(out, name), "WEBP", quality=80, method=6)
            total += os.path.getsize(os.path.join(out, name))
    with open(os.path.join(out, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    files = sorted(os.listdir(out))
    print(f"{len(index['t'])} types with photos; {len(files) - 1} sheets; {total / 1048576:.1f} MB sheets; index {os.path.getsize(os.path.join(out, 'index.json')) / 1024:.0f} KB")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "fetch":
        mx = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else None
        fetch(sys.argv[2], sys.argv[3], sys.argv[4], mx)
    elif cmd == "build":
        build(sys.argv[2], sys.argv[3], sys.argv[4])
