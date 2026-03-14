from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum

class InspectionStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    FIXED = "FIXED"

class QuestionType(str, Enum):
    PASS_FAIL = "PASS_FAIL"
    NUMERIC = "NUMERIC"
    TEXT = "TEXT"
    ODO = "ODO"

class AlertType(str, Enum):
    INSURANCE = "INSURANCE"
    PERMIT = "PERMIT"
    FITNESS = "FITNESS"
    POLLUTION = "POLLUTION"
    OIL_CHANGE = "OIL_CHANGE"
    CUSTOM = "CUSTOM"

class AlertStatus(str, Enum):
    EXPIRED = "EXPIRED"
    UPCOMING = "UPCOMING"
    VALID = "VALID"

class FeedbackStatus(str, Enum):
    NEW = "NEW"
    REVIEWED = "REVIEWED"
    RESOLVED = "RESOLVED"

class UserRole(str, Enum):
    DRIVER = "DRIVER"
    SUPERVISOR = "SUPERVISOR"
    MECHANIC = "MECHANIC"
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    PLATFORM_ADMIN = "PLATFORM_ADMIN"

# Request/Response Models
class ClientConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    client_id: str
    company_name: str
    logo: Optional[str] = None
    theme_color: Optional[str] = "#1E3A8A"
    email_smtp: Optional[dict] = None
    whatsapp_api: Optional[dict] = None
    alert_days: Optional[int] = 7
    created_date: Optional[datetime] = None

class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole
    client_id: str
    active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    preferred_language: Optional[str] = "EN"
    created_date: Optional[datetime] = None

class LoginRequest(BaseModel):
    email: str
    password: str
    client_id: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    client: ClientConfig

class BusBase(BaseModel):
    bus_number: str
    registration_number: str
    model: Optional[str] = None
    capacity: Optional[int] = None
    client_id: str
    active: bool = True

class BusResponse(BusBase):
    model_config = ConfigDict(extra="ignore")
    bus_id: str
    created_date: Optional[datetime] = None

class ChecklistQuestion(BaseModel):
    question_id: str
    question_text: str
    question_type: QuestionType
    order: int
    client_id: str

class ChecklistQuestionCreate(BaseModel):
    question_id: Optional[str] = None
    question_text: str
    question_type: QuestionType
    order: int
    client_id: str

class InspectionDetailCreate(BaseModel):
    question_id: str
    question_text: str
    question_type: QuestionType
    answer: str
    comment: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None

class InspectionCreate(BaseModel):
    bus_id: str
    driver_id: str
    details: List[InspectionDetailCreate]
    client_id: str

class InspectionDetail(BaseModel):
    model_config = ConfigDict(extra="ignore")
    detail_id: str
    question_id: str
    question_text: str
    question_type: QuestionType
    answer: str
    comment: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    status: str = "PENDING"
    fixed_by: Optional[str] = None
    fixed_date: Optional[datetime] = None
    fix_notes: Optional[str] = None

class InspectionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    inspection_id: str
    bus_id: str
    bus_number: str
    driver_id: str
    driver_name: str
    inspection_date: datetime
    inspection_status: InspectionStatus
    assigned_mechanic: Optional[str] = None
    mechanic_name: Optional[str] = None
    assigned_date: Optional[datetime] = None
    resolved_date: Optional[datetime] = None
    verified_date: Optional[datetime] = None
    details: List[InspectionDetail] = []
    client_id: str

class AssignMechanicRequest(BaseModel):
    inspection_id: str
    mechanic_id: str
    assigned_by: str

class FixDetailRequest(BaseModel):
    inspection_id: str
    detail_id: str
    fix_notes: str
    fixed_by: str

class QuickFixRequest(BaseModel):
    inspection_id: str
    fix_notes: str
    fixed_by: str

class VerifyInspectionRequest(BaseModel):
    inspection_id: str
    action: Literal["VERIFY", "REASSIGN"]
    verified_by: str
    notes: Optional[str] = None

class FeedbackCreate(BaseModel):
    bus_id: str
    client_id: str
    description: str
    image_url: Optional[str] = None
    want_update: bool = False
    email: Optional[str] = None

class FeedbackResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    feedback_id: str
    bus_id: str
    bus_number: str
    client_id: str
    description: str
    image_url: Optional[str] = None
    status: FeedbackStatus
    want_update: bool
    email: Optional[str] = None
    created_date: datetime
    resolved_date: Optional[datetime] = None
    resolved_by: Optional[str] = None

class ResolveFeedbackRequest(BaseModel):
    feedback_id: str
    resolved_by: str
    notes: Optional[str] = None

class AlertBase(BaseModel):
    bus_id: str
    alert_type: AlertType
    alert_name: str
    expiry_date: datetime
    client_id: str
    notes: Optional[str] = None
    attachment_url: Optional[str] = None

class AlertResponse(AlertBase):
    model_config = ConfigDict(extra="ignore")
    alert_id: str
    status: AlertStatus
    days_remaining: Optional[int] = None
    created_date: Optional[datetime] = None

class UpdateAlertRequest(BaseModel):
    alert_id: str
    new_expiry_date: datetime
    notes: Optional[str] = None
    attachment_url: Optional[str] = None
    updated_by: str

class CollectionCreate(BaseModel):
    date: str
    bus_id: str
    collected_amount: float
    notes: Optional[str] = None
    client_id: str
    created_by: str

class CollectionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    collection_id: str
    date: str
    bus_id: str
    bus_number: str
    collected_amount: float
    notes: Optional[str] = None
    client_id: str
    created_by: str
    created_date: datetime

class ExpenseMasterCreate(BaseModel):
    expense_name: str
    client_id: str
    created_by: str

class ExpenseMasterResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    expense_id: str
    expense_name: str
    client_id: str
    active_flag: bool
    created_date: datetime

class ExpenseCreate(BaseModel):
    date: str
    bus_id: str
    expense_id: Optional[str] = None
    custom_name: Optional[str] = None
    amount: float
    notes: Optional[str] = None
    save_to_master: bool = False
    client_id: str
    created_by: str

class ExpenseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    expense_entry_id: str
    date: str
    bus_id: str
    bus_number: str
    expense_name: str
    amount: float
    notes: Optional[str] = None
    client_id: str
    created_by: str
    created_date: datetime

class ProfitResponse(BaseModel):
    bus_id: str
    bus_number: str
    total_collection: float
    total_expense: float
    net_profit: float
    status: str

class DashboardMetrics(BaseModel):
    total_buses: int
    daily_inspections: int
    failed_inspections: int
    most_problematic_bus: Optional[str] = None
    feedback_resolution_rate: float
    total_collection: float
    total_expense: float
    net_profit: float

class AddProblemRequest(BaseModel):
    bus_id: str
    problem_description: str
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    client_id: str
    reported_by: str

class ClientCreate(BaseModel):
    company_name: str
    logo: Optional[str] = None
    theme_color: Optional[str] = "#1E3A8A"
    alert_days: Optional[int] = 7
    created_by: str

class ClientUpdate(BaseModel):
    client_id: str
    company_name: Optional[str] = None
    logo: Optional[str] = None
    theme_color: Optional[str] = None
    alert_days: Optional[int] = None
    active: Optional[bool] = None

class UserCreateByAdmin(BaseModel):
    email: str
    name: str
    password: str
    role: UserRole
    client_id: str
    created_by: str
    preferred_language: Optional[str] = "EN"



# Platform Admin Configuration Models
class InspectionQuestionConfig(BaseModel):
    question_id: Optional[str] = None
    client_id: str
    question_text: str
    input_type: str  # NUMBER, PASS_FAIL, TEXT, YES_NO
    is_critical: bool = False
    is_active: bool = True
    order_num: int = 1

class ExpenseCategoryConfig(BaseModel):
    expense_id: Optional[str] = None
    client_id: str
    expense_name: str
    is_active: bool = True

class AlertConfig(BaseModel):
    alert_config_id: Optional[str] = None
    client_id: str
    alert_name: str
    trigger_condition: str
    is_active: bool = True

