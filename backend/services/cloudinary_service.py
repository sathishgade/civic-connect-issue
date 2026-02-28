import cloudinary
import cloudinary.uploader
from config import settings
from fastapi import UploadFile
import io

class CloudinaryService:
    def __init__(self):
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )

    async def upload_image(self, file: UploadFile) -> str:
        """
        Uploads an image to Cloudinary and returns the URL.
        Includes automatic compression and optimization.
        """
        try:
            # Read file content
            content = await file.read()
            
            # Reset file pointer for any subsequent reads if necessary
            await file.seek(0)

            # Upload to Cloudinary with optimization
            # 'auto' for fetch_format and quality ensures compression
            upload_result = cloudinary.uploader.upload(
                content,
                folder="civic-connect/complaints",
                resource_type="image",
                fetch_format="auto",
                quality="auto"
            )
            
            return upload_result.get("secure_url")
        except Exception as e:
            print(f"Cloudinary Upload Failed: {e}")
            raise e

cloudinary_service = CloudinaryService()
