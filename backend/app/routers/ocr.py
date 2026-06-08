from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.dependencies import get_current_user
from app.models.user import User
from app.services.ocr_service import analyze_image

router = APIRouter(tags=["ocr"])


@router.post("/ocr")
async def analyze_receipt(
    file: UploadFile = File(...),
    username: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="画像ファイルを送信してください")

    file_bytes = await file.read()
    try:
        return await analyze_image(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
