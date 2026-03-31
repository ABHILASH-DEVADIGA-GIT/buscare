from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, Text, Enum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
import enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MySQL connection
MYSQL_URL = os.environ.get('MYSQL_URL', 'mysql://4EQYUkSgFFfYG8z.root:gVhGvvHTHMDmJ1Jp@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/buscare')

MYSQL_URL_SYNC = os.environ.get('MYSQL_URL_SYNC', 'mysql://4EQYUkSgFFfYG8z.root:gVhGvvHTHMDmJ1Jp@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/buscare')

# Async engine for FastAPI
# async_engine = create_async_engine(MYSQL_URL, echo=False, pool_pre_ping=True)
# AsyncSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine for migrations
# sync_engine = create_engine(MYSQL_URL_SYNC, echo=False)
# SessionLocal = sessionmaker(bind=sync_engine)

# --- UPDATED ENGINES ---

# 1. Async engine for FastAPI (using aiomysql)
async_engine = create_async_engine(
    MYSQL_URL, 
    echo=False, 
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "ssl": {
            "ca": "/etc/ssl/certs/ca-certificates.crt" # Required for Render/Linux
        }
    }
)
AsyncSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# 2. Sync engine for migrations (using pymysql)
sync_engine = create_engine(
    MYSQL_URL_SYNC, 
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "ssl": {
            "ca": "/etc/ssl/certs/ca-certificates.crt"
        }
    }
)
SessionLocal = sessionmaker(bind=sync_engine)

Base = declarative_base()

# Enums
class InspectionStatusEnum(str, enum.Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    FIXED = "FIXED"

class QuestionTypeEnum(str, enum.Enum):
    PASS_FAIL = "PASS_FAIL"
    NUMERIC = "NUMERIC"
    TEXT = "TEXT"
    ODO = "ODO"

class AlertTypeEnum(str, enum.Enum):
    INSURANCE = "INSURANCE"
    PERMIT = "PERMIT"
    FITNESS = "FITNESS"
    POLLUTION = "POLLUTION"
    OIL_CHANGE = "OIL_CHANGE"
    CUSTOM = "CUSTOM"

class AlertStatusEnum(str, enum.Enum):
    EXPIRED = "EXPIRED"
    UPCOMING = "UPCOMING"
    VALID = "VALID"

class FeedbackStatusEnum(str, enum.Enum):
    NEW = "NEW"
    REVIEWED = "REVIEWED"
    RESOLVED = "RESOLVED"

class UserRoleEnum(str, enum.Enum):
    DRIVER = "DRIVER"
    SUPERVISOR = "SUPERVISOR"
    MECHANIC = "MECHANIC"
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    PLATFORM_ADMIN = "PLATFORM_ADMIN"

class LanguageEnum(str, enum.Enum):
    EN = "EN"
    KN = "KN"

# SQLAlchemy Models
class Client(Base):
    __tablename__ = 'clients'
    
    client_id = Column(String(36), primary_key=True)
    company_name = Column(String(255), nullable=False)
    logo = Column(Text, nullable=True)
    theme_color = Column(String(20), default="#1E3A8A")
    alert_days = Column(Integer, default=7)
    active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_date = Column(DateTime, nullable=True)
    
    # Relationships
    users = relationship("User", back_populates="client")
    buses = relationship("Bus", back_populates="client")

class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(String(36), primary_key=True)
    email = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    active = Column(Boolean, default=True)
    preferred_language = Column(String(5), default="EN")
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    client = relationship("Client", back_populates="users")

class Bus(Base):
    __tablename__ = 'buses'
    
    bus_id = Column(String(36), primary_key=True)
    bus_number = Column(String(50), nullable=False)
    registration_number = Column(String(50), nullable=False)
    model = Column(String(100), nullable=True)
    capacity = Column(Integer, nullable=True)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(String(36), nullable=True)
    
    # Relationships
    client = relationship("Client", back_populates="buses")

class ChecklistQuestion(Base):
    __tablename__ = 'checklist_questions'
    
    question_id = Column(String(36), primary_key=True)
    question_text = Column(String(500), nullable=False)
    question_type = Column(String(20), nullable=False)  # NUMBER, PASS_FAIL, TEXT, YES_NO
    order_num = Column(Integer, default=1)
    is_critical = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(String(36), nullable=True)

class Inspection(Base):
    __tablename__ = 'inspections'
    
    inspection_id = Column(String(36), primary_key=True)
    bus_id = Column(String(36), ForeignKey('buses.bus_id'), nullable=False)
    bus_number = Column(String(50), nullable=False)
    driver_id = Column(String(36), nullable=False)
    driver_name = Column(String(255), nullable=False)
    inspection_date = Column(DateTime, nullable=False)
    inspection_status = Column(String(20), default="PASSED")
    assigned_mechanic = Column(String(36), nullable=True)
    mechanic_name = Column(String(255), nullable=True)
    assigned_date = Column(DateTime, nullable=True)
    assigned_by = Column(String(36), nullable=True)
    resolved_date = Column(DateTime, nullable=True)
    resolved_by = Column(String(36), nullable=True)
    verified_date = Column(DateTime, nullable=True)
    verified_by = Column(String(36), nullable=True)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    is_custom_problem = Column(Boolean, default=False)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    details = relationship("InspectionDetail", back_populates="inspection")

class InspectionDetail(Base):
    __tablename__ = 'inspection_details'
    
    detail_id = Column(String(36), primary_key=True)
    inspection_id = Column(String(36), ForeignKey('inspections.inspection_id'), nullable=False)
    question_id = Column(String(36), nullable=False)
    question_text = Column(String(500), nullable=False)
    question_type = Column(String(20), nullable=False)
    answer = Column(String(255), nullable=False)
    comment = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    audio_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    status = Column(String(20), default="PENDING")
    fixed_by = Column(String(36), nullable=True)
    fixed_date = Column(DateTime, nullable=True)
    fix_notes = Column(Text, nullable=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    inspection = relationship("Inspection", back_populates="details")

class Feedback(Base):
    __tablename__ = 'feedback'
    
    feedback_id = Column(String(36), primary_key=True)
    bus_id = Column(String(36), ForeignKey('buses.bus_id'), nullable=False)
    bus_number = Column(String(50), nullable=False)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    status = Column(String(20), default="NEW")
    want_update = Column(Boolean, default=False)
    email = Column(String(255), nullable=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_date = Column(DateTime, nullable=True)
    resolved_by = Column(String(36), nullable=True)
    resolution_notes = Column(Text, nullable=True)

class Alert(Base):
    __tablename__ = 'alerts'
    
    alert_id = Column(String(36), primary_key=True)
    bus_id = Column(String(36), ForeignKey('buses.bus_id'), nullable=False)
    alert_type = Column(String(20), nullable=False)
    alert_name = Column(String(255), nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    status = Column(String(20), default="VALID")
    days_remaining = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    attachment_url = Column(Text, nullable=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(String(36), nullable=True)
    updated_date = Column(DateTime, nullable=True)
    updated_by = Column(String(36), nullable=True)

class Collection(Base):
    __tablename__ = 'collections'
    
    collection_id = Column(String(36), primary_key=True)
    date = Column(String(10), nullable=False)
    bus_id = Column(String(36), ForeignKey('buses.bus_id'), nullable=False)
    bus_number = Column(String(50), nullable=False)
    collected_amount = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    created_by = Column(String(36), nullable=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ExpenseMaster(Base):
    __tablename__ = 'expense_master'
    
    expense_id = Column(String(36), primary_key=True)
    expense_name = Column(String(255), nullable=False)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    active_flag = Column(Boolean, default=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(String(36), nullable=True)

class Expense(Base):
    __tablename__ = 'expenses'
    
    expense_entry_id = Column(String(36), primary_key=True)
    date = Column(String(10), nullable=False)
    bus_id = Column(String(36), ForeignKey('buses.bus_id'), nullable=False)
    bus_number = Column(String(50), nullable=False)
    expense_id = Column(String(36), nullable=True)
    expense_name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    created_by = Column(String(36), nullable=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class NotificationLog(Base):
    __tablename__ = 'notification_logs'
    
    log_id = Column(String(36), primary_key=True)
    notification_type = Column(String(50), nullable=False)
    recipient = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String(20), default="PENDING")
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AlertConfiguration(Base):
    __tablename__ = 'alert_configurations'
    
    alert_config_id = Column(String(36), primary_key=True)
    client_id = Column(String(36), ForeignKey('clients.client_id'), nullable=False)
    alert_name = Column(String(255), nullable=False)
    trigger_condition = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(String(36), nullable=True)

# Database initialization
def init_db_sync():
    """Create all tables synchronously"""
    Base.metadata.create_all(sync_engine)

async def get_db():
    """Dependency for getting async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    """Initialize database - create tables"""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def close_db():
    """Close database connections"""
    await async_engine.dispose()
