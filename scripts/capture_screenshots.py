import asyncio
import json
import os
import subprocess
import time
import urllib.request
import websockets
import base64

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUTPUT_DIR = "/Users/kundan/Downloads/ORBITGUARD/docs/screenshots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

async def capture_views():
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--window-size=1920,1080",
        "--hide-scrollbars",
        "http://localhost:5173/"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    try:
        for _ in range(30):
            try:
                with urllib.request.urlopen("http://127.0.0.1:9222/json") as response:
                    targets = json.loads(response.read().decode())
                    if targets:
                        break
            except Exception:
                await asyncio.sleep(0.5)
        else:
            print("Failed to connect to Chrome")
            return

        page_target = next((t for t in targets if t.get("type") == "page"), targets[0])
        ws_url = page_target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
            msg_id = 1
            async def send_cmd(method, params=None):
                nonlocal msg_id
                cmd = {"id": msg_id, "method": method, "params": params or {}}
                msg_id += 1
                await ws.send(json.dumps(cmd))
                while True:
                    res = json.loads(await ws.recv())
                    if res.get("id") == cmd["id"]:
                        return res.get("result", {})

            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")
            await send_cmd("DOM.enable")

            print("Waiting for page load...")
            await asyncio.sleep(4)

            # 1. Capture 3D Space View
            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(f"{OUTPUT_DIR}/01_space_view_3d.png", "wb") as f:
                f.write(base64.b64decode(res["data"]))

            # 2. Switch to Conjunctions Tab
            print("Clicking Conjunctions Tab...")
            await send_cmd("Runtime.evaluate", {
                "expression": """
                const buttons = Array.from(document.querySelectorAll('header button, nav button, button'));
                const conjBtn = buttons.find(b => b.textContent.includes('Conjunctions'));
                if (conjBtn) conjBtn.click();
                """
            })
            await asyncio.sleep(2)

            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(f"{OUTPUT_DIR}/02_conjunctions_table.png", "wb") as f:
                f.write(base64.b64decode(res["data"]))

            # 3. Click DETAILS button on first row
            print("Clicking DETAILS button on first conjunction row...")
            await send_cmd("Runtime.evaluate", {
                "expression": """
                const buttons = Array.from(document.querySelectorAll('button'));
                const detailsBtn = buttons.find(b => b.textContent.includes('DETAILS') || b.textContent.includes('Details'));
                if (detailsBtn) detailsBtn.click();
                """
            })
            await asyncio.sleep(2)

            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(f"{OUTPUT_DIR}/03_conjunction_modal.png", "wb") as f:
                f.write(base64.b64decode(res["data"]))

            print("Captured successfully!")

    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(capture_views())
