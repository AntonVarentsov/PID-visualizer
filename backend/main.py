from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend import models
from backend.database import engine
from backend.routers import include_all_routers


def create_app() -> FastAPI:
    """Application factory."""
    models.Base.metadata.create_all(bind=engine, checkfirst=True)

    app = FastAPI()

    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    include_all_routers(app)

    return app


app = create_app()
