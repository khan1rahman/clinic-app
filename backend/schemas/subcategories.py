from pydantic import BaseModel, ConfigDict


class SubcategoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category_id: int
    subcategory_name: str
    description: str | None = None


class SubcategoryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category_id: int | None = None
    subcategory_name: str | None = None
    description: str | None = None