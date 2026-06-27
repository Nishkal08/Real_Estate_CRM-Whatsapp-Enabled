"""
One-time script: Upload all local brochures/images to Cloudinary
and update pgvector KB with Cloudinary URLs.

Run: python testing/upload_to_cloudinary.py
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from utils.cloudinary_uploader import upload_file_to_cloudinary, is_cloudinary_configured
from kb.vector_store import get_vector_store
from langchain_core.documents import Document

KB_ID = "abc57a29-99f8-4891-9749-df9126f0b22d"
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'uploads')
UPLOADS_DIR = os.path.abspath(UPLOADS_DIR)

# Map: filename → (public_id, description, type, resource_type)
ASSETS = [
    ("Life_In_Blue_Brochure.pdf",     "life-in-blue-brochure",       "Life In Blue 2BHK 3BHK apartments South Bopal Ahmedabad",          "brochure", "raw"),
    ("Codename_Dear_Life.pdf",        "codename-dear-life-brochure", "Codename Dear Life luxury apartments Jagatpur Ahmedabad",           "brochure", "raw"),
    ("Reneev_Page_22_Brochure.pdf",   "reneev-page-22-brochure",    "Reneev Page 22 luxury 3BHK 4BHK apartments Shela Ahmedabad",        "brochure", "raw"),
    ("Eden.png",                      "eden-project-image",          "Eden project exterior render premium residential Ahmedabad",        "image",    "image"),
]

if not is_cloudinary_configured():
    print("[ERROR] Cloudinary not configured — check .env")
    sys.exit(1)

print(f"Uploading {len(ASSETS)} assets to Cloudinary...")
print()

vs = get_vector_store(KB_ID)
uploaded = []

for filename, public_id, description, asset_type, resource_type in ASSETS:
    filepath = os.path.join(UPLOADS_DIR, filename)
    if not os.path.exists(filepath):
        print(f"[SKIP] {filename} not found at {filepath}")
        continue

    print(f"Uploading {filename}...")
    try:
        url = upload_file_to_cloudinary(
            file_path=filepath,
            public_id=public_id,
            resource_type=resource_type,
            folder="real-estate-assets"
        )
        print(f"  ✅ Uploaded → {url}")
        uploaded.append((filename, url, description, asset_type))
    except Exception as e:
        print(f"  ❌ Failed: {e}")

print()
print(f"Adding {len(uploaded)} Cloudinary URL chunks to KB...")

docs = []
for filename, url, description, asset_type in uploaded:
    if asset_type == "brochure":
        content = f"Brochure: {url} | Description: {description}"
        metadata_section = "general"
    else:
        content = f"Image: {url} | Description: {description}"
        metadata_section = "general"

    docs.append(Document(
        page_content=content,
        metadata={"source": url, "section": metadata_section, "cdn": "cloudinary"}
    ))

if docs:
    vs.add_documents(docs)
    print(f"✅ Added {len(docs)} Cloudinary chunks to KB")
else:
    print("[WARN] No chunks added")

print()
print("Cloudinary URLs in KB:")
for filename, url, desc, t in uploaded:
    print(f"  [{t.upper()}] {url}")
    print(f"    → {desc}")
