"""Build dart/apps.html from the app sources: shell + core + customer + courier + admin + boot."""
import pathlib
here = pathlib.Path(__file__).resolve().parent
parts = ["core.js", "customer.js", "site.js", "courier.js", "admin.js", "boot.js"]
js = "(function () {\n" + "\n".join((here / p).read_text() for p in parts) + "\n})();"
shell = (here / "shell.html").read_text()
out = shell.replace("/*SCRIPT*/", js)
(here.parent / "apps.html").write_text(out)
print("apps.html", len(out), "bytes")
