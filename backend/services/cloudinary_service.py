import anyio
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
        Includes automatic compression and optimization in a non-blocking thread.
        """
        try:
            content = await file.read()
            await file.seek(0)

            # run_sync ensures this CPU/IO bound sync call doesn't block the event loop
            upload_result = await anyio.to_thread.run_sync(
                lambda: cloudinary.uploader.upload(
                    content,
                    folder="civic-connect/complaints",
                    resource_type="image",
                    fetch_format="auto",
                    quality="auto"
                )
            )
            
            return upload_result.get("secure_url")
        except Exception as e:
            print(f"Cloudinary Upload Failed: {e}")
            raise e

cloudinary_service = CloudinaryService()
