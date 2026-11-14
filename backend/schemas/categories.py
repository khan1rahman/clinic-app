from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category_name: str
    description: str | None = None


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category_name: str | None = None
    description: str | None = None