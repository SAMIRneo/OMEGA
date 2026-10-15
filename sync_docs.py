"""Archive the official documentation index and its pages with source URLs."""
import concurrent.futures
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).parent / "docs" / "official"
INDEX = "https://hyperliquid.gitbook.io/hyperliquid-docs/llms.txt"

def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")

def page(url):
    relative = url.split("/hyperliquid-docs/", 1)[1]
    target = ROOT / relative
    try:
        content = fetch(url)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("Source: " + url + "\n\n" + content, encoding="utf-8")
        return {"url": url, "ok": True}
    except Exception as error:
        return {"url": url, "ok": False, "error": type(error).__name__}

if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    index = fetch(INDEX)
    (ROOT / "llms.txt").write_text(index, encoding="utf-8")
    urls = sorted(set(re.findall(r"https://hyperliquid\.gitbook\.io/hyperliquid-docs/[^\s)]+\.md", index)))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(page, urls))
    (ROOT / "manifest.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Archived: {sum(x['ok'] for x in results)}/{len(results)} pages")
