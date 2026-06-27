"""
Cloudinary upload utility.
Uploads brochures (PDF) and images to Cloudinary CDN.
Separate folder: real-estate-assets/
"""
import os
import cloudinary
import cloudinary.uploader


def _configure():
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_KEY"),
        api_secret=os.getenv("CLOUDINARY_SECRET_KEY"),
        secure=True
    )


def upload_file_to_cloudinary(
    file_path: str,
    public_id: str,
    resource_type: str = "auto",
    folder: str = "real-estate-assets"
) -> str:
    """
    Upload a file to Cloudinary and return its secure URL.
    resource_type: 'image', 'raw' (for PDF), or 'auto'
    """
    _configure()
    result = cloudinary.uploader.upload(
        file_path,
        public_id=public_id,
        folder=folder,
        resource_type=resource_type,
        overwrite=True,
        use_filename=True,
        unique_filename=False,
    )
    return result["secure_url"]


def is_cloudinary_configured() -> bool:
    return all([
        os.getenv("CLOUDINARY_CLOUD_NAME"),
        os.getenv("CLOUDINARY_KEY"),
        os.getenv("CLOUDINARY_SECRET_KEY"),
    ])
