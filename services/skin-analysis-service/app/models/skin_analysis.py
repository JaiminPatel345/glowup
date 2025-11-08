from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any, Annotated
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_schema(cls.validate)

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema


class SkinIssue(BaseModel):
    id: str = Field(..., description="Unique identifier for the issue")
    name: str = Field(..., description="Name of the skin issue")
    description: str = Field(..., description="Detailed description of the issue")
    severity: str = Field(..., description="Severity level: low, medium, high")
    causes: List[str] = Field(default_factory=list, description="List of possible causes")
    highlighted_image_url: Optional[str] = Field(None, description="URL to highlighted image")
    confidence: float = Field(..., ge=0.0, le=1.0, description="AI confidence score")


class AnalysisMetadata(BaseModel):
    model_version: str = Field(..., description="Version of the AI model used")
    processing_time: float = Field(..., description="Time taken for analysis in seconds")
    image_quality: float = Field(..., ge=0.0, le=1.0, description="Quality score of input image")


class SkinAnalysisResult(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str = Field(..., description="ID of the user who requested analysis")
    image_url: str = Field(..., description="URL to the original image")
    skin_type: str = Field(..., description="Detected skin type")
    issues: List[SkinIssue] = Field(default_factory=list, description="List of detected issues")
    analysis_metadata: AnalysisMetadata = Field(..., description="Analysis metadata")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")


class SkinAnalysisRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user requesting analysis")


class SkinAnalysisResponse(BaseModel):
    skin_type: str = Field(..., description="Detected skin type")
    issues: List[SkinIssue] = Field(default_factory=list, description="List of detected issues")
    analysis_id: str = Field(..., description="ID of the analysis result")


class ProductInfo(BaseModel):
    id: str = Field(..., description="Product ID")
    name: str = Field(..., description="Product name")
    brand: str = Field(..., description="Brand name")
    price: float = Field(..., ge=0, description="Product price")
    rating: float = Field(..., ge=0, le=5, description="Product rating")
    image_url: str = Field(..., description="Product image URL")
    is_ayurvedic: bool = Field(..., description="Whether product is ayurvedic")
    ingredients: List[str] = Field(default_factory=list, description="List of ingredients")


class ProductRecommendations(BaseModel):
    issue_id: str = Field(..., description="ID of the skin issue")
    all_products: List[ProductInfo] = Field(default_factory=list, description="All recommended products")
    ayurvedic_products: List[ProductInfo] = Field(default_factory=list, description="Ayurvedic products only")
    non_ayurvedic_products: List[ProductInfo] = Field(default_factory=list, description="Non-ayurvedic products only")


class ProductRecommendationDocument(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    issue_id: str = Field(..., description="ID of the skin issue")
    products: List[ProductInfo] = Field(default_factory=list, description="All products for this issue")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")