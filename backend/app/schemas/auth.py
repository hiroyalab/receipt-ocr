from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)


class UserOut(BaseModel):
    user_id: str
    username: str


class LoginResponse(BaseModel):
    user: UserOut
    token: str
