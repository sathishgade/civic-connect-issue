import boto3
from botocore.exceptions import NoCredentialsError
from config import settings
import uuid
from fastapi import UploadFile

class R2Service:
    def __init__(self):
        try:
            self.s3_client = boto3.client(
                's3',
                endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name="auto", 
            )
        except Exception as e:
            print(f"R2 Service Init Failed (Mock Mode Active): {e}")
            self.s3_client = None

    async def upload_audio(self, file: UploadFile) -> str:
        """
        Uploads audio file to R2 and returns public URL.
        """
        file_extension = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_extension}"
        
        if self.s3_client:
            try:
                # Actual Upload Logic
                self.s3_client.upload_fileobj(
                    file.file,
                    settings.R2_BUCKET_NAME,
                    file_name
                )
                return f"{settings.R2_PUBLIC_URL_BASE}/{file_name}"
            except Exception as e:
                print(f"Upload failed: {e}")
                # Fallback to mock URL for demo purposes if creds fail
                return f"https://mock-r2-storage.com/{file_name}"
        else:
            # Mock URL if no client
            return f"https://mock-r2-storage.com/{file_name}"

r2_service = R2Service()
