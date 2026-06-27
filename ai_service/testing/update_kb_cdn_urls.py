"""
Update old 127.0.0.1 brochure/image URLs in KB to Cloudinary URLs.
Run once after upload_to_cloudinary.py
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from kb.vector_store import get_engine, _collection_name
from sqlalchemy import text

KB_ID = "abc57a29-99f8-4891-9749-df9126f0b22d"
COLL = _collection_name(KB_ID)

# Old local URL -> New Cloudinary URL mapping
URL_MAP = {
    "http://127.0.0.1:8000/static/uploads/Life_In_Blue_Brochure.pdf":
        "https://res.cloudinary.com/dq4rdlrmb/raw/upload/v1782573080/real-estate-assets/life-in-blue-brochure.pdf",
    "http://127.0.0.1:8000/static/uploads/Codename_Dear_Life.pdf":
        "https://res.cloudinary.com/dq4rdlrmb/raw/upload/v1782573114/real-estate-assets/codename-dear-life-brochure.pdf",
    "http://127.0.0.1:8000/static/uploads/Reneev_Page_22_Brochure.pdf":
        "https://res.cloudinary.com/dq4rdlrmb/raw/upload/v1782573116/real-estate-assets/reneev-page-22-brochure.pdf",
}

engine = get_engine()

with engine.begin() as conn:
    for old_url, new_url in URL_MAP.items():
        # Update document content — avoid :new::text (SQLAlchemy bind param conflict)
        result = conn.execute(text("""
            UPDATE langchain_pg_embedding e
            SET document = REPLACE(e.document, :old, :new_url),
                cmetadata = e.cmetadata || jsonb_build_object('source', :new_url)
            FROM langchain_pg_collection c
            WHERE c.uuid = e.collection_id
              AND c.name = :coll
              AND e.document LIKE :pattern
        """), {"old": old_url, "new_url": new_url, "coll": COLL, "pattern": f"%{old_url}%"})
        
        rows = result.rowcount
        print(f"Updated {rows} chunk(s): {old_url[-40:]} -> Cloudinary")

print("\nDone! Old local URLs replaced with Cloudinary CDN URLs in KB.")
