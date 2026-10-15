"""Hyperliquid research gateway. No signing or exchange actions."""
import argparse
import json
import os
import re
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

BASES = {"mainnet": "https://api.hyperliquid.xyz", "testnet": "https://api.hyperliquid-testnet.xyz"}


class Hyperliquid:
    def __init__(self, network="mainnet"):
        self.base = BASES[network]

    def info(self, body):
        request = urllib.request.Request(self.base + "/info", json.dumps(body).encode(), {"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.load(response)

    def market(self):
        book = self.info({"type": "l2Book", "coin": "ETH"})
        bids, asks = book["levels"]
        bid_size = sum(float(x["sz"]) for x in bids)
        ask_size = sum(float(x["sz"]) for x in asks)
        spread = float(asks[0]["px"]) - float(bids[0]["px"]) if bids and asks else None
        return {"receivedAt": int(time.time()*1000), "sourceTime": book["time"], "book": book,
                "spreadUsd": spread, "visibleDepthImbalance": (bid_size-ask_size)/(bid_size+ask_size) if bid_size+ask_size else None,
                "limitations": "Snapshot L2 uniquement; aucun CVD, TPO ou signal de trading déduit."}

    def candles(self, interval, count=400):
        durations = {"1m": 60000, "5m": 300000, "15m": 900000, "30m": 1800000, "1h": 3600000, "4h": 14400000, "1d": 86400000, "1w": 604800000}
        if interval not in durations:
            raise ValueError("Intervalle non pris en charge")
        now = int(time.time()*1000)
        return self.info({"type": "candleSnapshot", "req": {"coin": "ETH", "interval": interval, "startTime": now-count*durations[interval], "endTime": now}})

    def account(self, address):
        if not re.fullmatch(r"0x[0-9a-fA-F]{40}", address):
            raise ValueError("Adresse publique invalide")
        return {"perpetuals": self.info({"type": "clearinghouseState", "user": address}),
                "openOrders": self.info({"type": "openOrders", "user": address}),
                "fills": self.info({"type": "userFills", "user": address})}


def serve(client, port):
    cache = {}
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            # Local agents only. Reject browser-origin requests and DNS rebinding.
            if self.headers.get("Origin") or self.headers.get("Host") not in (f"127.0.0.1:{port}", f"localhost:{port}"):
                self.send_error(403)
                return
            routes = {"/health": lambda: {"mode": "read-only", "exchangeActions": False},
                      "/market": client.market,
                      "/account": lambda: client.account(os.environ.get("HL_ACCOUNT_ADDRESS", ""))}
            for interval in ("1m", "5m", "15m", "1h", "4h", "1d"):
                routes["/candles/"+interval] = lambda interval=interval: client.candles(interval)
            if self.path not in routes:
                self.send_error(404)
                return
            try:
                ttl = 60 if self.path.startswith("/candles") else 10
                saved = cache.get(self.path)
                if not saved or time.monotonic()-saved[0] >= ttl:
                    cache[self.path] = (time.monotonic(), routes[self.path]())
                self.respond(200, cache[self.path][1])
            except ValueError as error:
                self.respond(400, {"error": str(error)})
            except Exception:
                self.respond(502, {"error": "Service Hyperliquid indisponible; réessayer plus tard"})

        def respond(self, status, data):
            payload = json.dumps(data, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    print(f"Agent gateway: http://127.0.0.1:{port} — lecture seule", flush=True)
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["market", "account", "serve"])
    parser.add_argument("--network", choices=BASES, default="mainnet")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    client = Hyperliquid(args.network)
    if args.command == "serve":
        serve(client, args.port)
    else:
        result = client.market() if args.command == "market" else client.account(os.environ.get("HL_ACCOUNT_ADDRESS", ""))
        print(json.dumps(result, ensure_ascii=False, indent=2))
