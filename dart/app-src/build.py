"""Build DART from the app sources.

apps.html      the test platform (browser storage or the claude.ai test database)
dist/live.html the live build on the real DART database, when SUPABASE_URL and
               SUPABASE_ANON_KEY are set and the Supabase library is in vendor/
"""
import json, os, pathlib
here = pathlib.Path(__file__).resolve().parent
parts = ["core.js", "i18n.js", "it.js", "customer.js", "site.js", "courier.js", "admin.js", "live.js", "boot.js"]
js = "(function () {\n" + "\n".join((here / p).read_text() for p in parts) + "\n})();"
shell = (here / "shell.html").read_text()
out = shell.replace("/*SCRIPT*/", js)
(here.parent / "apps.html").write_text(out)
print("apps.html", len(out), "bytes")

url, key, lib = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_ANON_KEY"), here / "vendor" / "supabase.js"
if url and key and lib.exists():
    # The anon key is the public key apps ship with; access is enforced by the database rules.
    cfg = "window.DART_LIVE = " + json.dumps({"url": url, "key": key}) + ";"
    # Inlined, the library can't work out its own address; it only needs it for an optional extra file.
    libjs = lib.read_text().replace('if(!e)throw new Error("Automatic publicPath is not supported in this browser");', 'if(!e)e="./";').replace("</script", "<\\/script")
    live = shell.replace("/*SCRIPT*/", libjs + "\n" + cfg + "\n" + js)
    dist = here.parent / "dist"; dist.mkdir(exist_ok=True)
    (dist / "live.html").write_text(live)
    print("dist/live.html", len(live), "bytes")
