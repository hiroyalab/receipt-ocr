from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, health, ocr, receipts, summary


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="家計簿アプリ API",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(ocr.router)
app.include_router(receipts.router)
app.include_router(summary.router)
