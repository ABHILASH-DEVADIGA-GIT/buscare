from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_, or_
from sqlalchemy.orm import selectinload
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
from datetime import datetime, timezone, timedelta
import uuid
from typing import List, Optional
import base64

from models import *
from auth import hash_password, verify_password, create_access_token, get_current_user
from database_mysql import (
    get_db, init_db, close_db,
    Client, User, Bus, ChecklistQuestion, Inspection, InspectionDetail,
    Feedback, Alert, Collection, ExpenseMaster, Expense, NotificationLog, AlertConfiguration
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="BusCare API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Helper function to convert SQLAlchemy model to dict
def model_to_dict(obj):
    if obj is None:
        return None
    result = {}
    for column in obj.__table__.columns:
        value = getattr(obj, column.name)
        if isinstance(value, datetime):
            result[column.name] = value.isoformat()
        else:
            result[column.name] = value
    return result

# Helper function to calculate alert status
def calculate_alert_status(expiry_date, alert_days: int = 7):
    now = datetime.now(timezone.utc)
    if isinstance(expiry_date, str):
        expiry_date = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
    if expiry_date.tzinfo is None:
        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
    
    days_remaining = (expiry_date - now).days
    
    if days_remaining < 0:
        return AlertStatus.EXPIRED, days_remaining
    elif days_remaining <= alert_days:
        return AlertStatus.UPCOMING, days_remaining
    else:
        return AlertStatus.VALID, days_remaining

# ============ AUTH ROUTES ============
@api_router.post("/auth/register")
async def register_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(and_(User.email == user.email, User.client_id == user.client_id))
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = User(
        user_id=str(uuid.uuid4()),
        email=user.email,
        password=hash_password(user.password),
        name=user.name,
        role=user.role,
        client_id=user.client_id,
        active=user.active,
        preferred_language="EN",
        created_date=datetime.now(timezone.utc)
    )
    
    db.add(new_user)
    await db.commit()
    
    return {"success": True, "message": "User registered successfully"}

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(and_(User.email == login_req.email, User.client_id == login_req.client_id))
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    result = await db.execute(select(Client).where(Client.client_id == login_req.client_id))
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if not client.active:
        raise HTTPException(status_code=403, detail="Client is inactive. Please contact support.")
    
    token_data = {
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
        "client_id": user.client_id
    }
    token = create_access_token(token_data)
    
    user_response = UserResponse(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        role=user.role,
        client_id=user.client_id,
        active=user.active,
        preferred_language=user.preferred_language,
        created_date=user.created_date
    )
    
    client_response = ClientConfig(
        client_id=client.client_id,
        company_name=client.company_name,
        logo=client.logo,
        theme_color=client.theme_color,
        alert_days=client.alert_days,
        created_date=client.created_date
    )
    
    return LoginResponse(token=token, user=user_response, client=client_response)

@api_router.get("/clients")
async def get_clients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client))
    clients = result.scalars().all()
    return {"success": True, "data": [model_to_dict(c) for c in clients]}

# ============ USER LANGUAGE PREFERENCE ============
@api_router.put("/users/language")
async def update_user_language(
    language: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if language not in ["EN", "KN"]:
        raise HTTPException(status_code=400, detail="Invalid language. Use EN or KN")
    
    await db.execute(
        update(User).where(User.user_id == current_user["user_id"]).values(preferred_language=language)
    )
    await db.commit()
    
    return {"success": True, "message": "Language preference updated"}

@api_router.get("/users/me")
async def get_current_user_details(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.user_id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "success": True,
        "data": {
            "user_id": user.user_id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "client_id": user.client_id,
            "preferred_language": user.preferred_language or "EN"
        }
    }

# ============ BUS ROUTES ============
@api_router.post("/buses")
async def create_bus(bus: BusBase, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Platform Admin can create buses for any client, others only for their own client
    if current_user["role"] != "PLATFORM_ADMIN" and bus.client_id != current_user["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify the client exists
    result = await db.execute(select(Client).where(Client.client_id == bus.client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    new_bus = Bus(
        bus_id=str(uuid.uuid4()),
        bus_number=bus.bus_number,
        registration_number=bus.registration_number,
        model=bus.model,
        capacity=bus.capacity,
        client_id=bus.client_id,
        active=bus.active,
        created_date=datetime.now(timezone.utc),
        created_by=current_user["user_id"]
    )
    
    db.add(new_bus)
    await db.commit()
    
    return {"success": True, "message": "Bus created", "data": model_to_dict(new_bus)}

@api_router.get("/buses")
async def get_buses(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Bus).where(and_(Bus.client_id == current_user["client_id"], Bus.active == True))
    )
    buses = result.scalars().all()
    return {"success": True, "data": [model_to_dict(b) for b in buses]}

# ============ CHECKLIST ROUTES ============
@api_router.post("/checklist")
async def create_checklist_question(
    question: ChecklistQuestionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if question.client_id != current_user["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_question = ChecklistQuestion(
        question_id=question.question_id or str(uuid.uuid4()),
        question_text=question.question_text,
        question_type=question.question_type,
        order_num=question.order,
        client_id=question.client_id,
        created_date=datetime.now(timezone.utc),
        created_by=current_user["user_id"]
    )
    
    db.add(new_question)
    await db.commit()
    
    return {"success": True, "message": "Question created"}

@api_router.get("/checklist")
async def get_checklist(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistQuestion)
        .where(ChecklistQuestion.client_id == current_user["client_id"])
        .order_by(ChecklistQuestion.order_num)
    )
    questions = result.scalars().all()
    return {"success": True, "data": [model_to_dict(q) for q in questions]}

# ============ INSPECTION ROUTES ============
@api_router.post("/inspections")
async def create_inspection(
    inspection: InspectionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if inspection.client_id != current_user["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    failed_count = 0
    for detail in inspection.details:
        if detail.answer == "Fail" and detail.question_type != QuestionType.ODO:
            failed_count += 1
            if not detail.image_url or not detail.comment:
                raise HTTPException(status_code=400, detail="Failed items require image and comment")
    
    inspection_status = InspectionStatus.FAILED if failed_count > 0 else InspectionStatus.PASSED
    
    result = await db.execute(select(Bus).where(Bus.bus_id == inspection.bus_id))
    bus = result.scalar_one_or_none()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    
    result = await db.execute(select(User).where(User.user_id == inspection.driver_id))
    driver = result.scalar_one_or_none()
    
    inspection_id = str(uuid.uuid4())
    inspection_date = datetime.now(timezone.utc)
    
    new_inspection = Inspection(
        inspection_id=inspection_id,
        bus_id=inspection.bus_id,
        bus_number=bus.bus_number,
        driver_id=inspection.driver_id,
        driver_name=driver.name if driver else "Unknown",
        inspection_date=inspection_date,
        inspection_status=inspection_status,
        client_id=inspection.client_id,
        created_date=inspection_date
    )
    
    db.add(new_inspection)
    
    for detail in inspection.details:
        detail_status = "FAILED" if detail.answer == "Fail" and detail.question_type != QuestionType.ODO else "PASSED"
        new_detail = InspectionDetail(
            detail_id=str(uuid.uuid4()),
            inspection_id=inspection_id,
            question_id=detail.question_id,
            question_text=detail.question_text,
            question_type=detail.question_type,
            answer=detail.answer,
            comment=detail.comment,
            image_url=detail.image_url,
            audio_url=detail.audio_url,
            video_url=detail.video_url,
            status=detail_status,
            created_date=inspection_date
        )
        db.add(new_detail)
    
    await db.commit()
    
    return {"success": True, "message": "Inspection submitted", "data": {"inspection_id": inspection_id}}

@api_router.get("/inspections")
async def get_inspections(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Inspection).where(Inspection.client_id == current_user["client_id"])
    
    if status:
        query = query.where(Inspection.inspection_status == status)
    
    if current_user["role"] == "MECHANIC":
        query = query.where(Inspection.assigned_mechanic == current_user["user_id"])
    
    query = query.order_by(Inspection.inspection_date.desc())
    
    result = await db.execute(query)
    inspections = result.scalars().all()
    
    inspection_list = []
    for insp in inspections:
        insp_dict = model_to_dict(insp)
        
        details_result = await db.execute(
            select(InspectionDetail).where(InspectionDetail.inspection_id == insp.inspection_id)
        )
        details = details_result.scalars().all()
        insp_dict["details"] = [model_to_dict(d) for d in details]
        
        inspection_list.append(insp_dict)
    
    return {"success": True, "data": inspection_list}

@api_router.get("/inspections/{inspection_id}")
async def get_inspection_by_id(
    inspection_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Inspection).where(
            and_(Inspection.inspection_id == inspection_id, Inspection.client_id == current_user["client_id"])
        )
    )
    inspection = result.scalar_one_or_none()
    
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    insp_dict = model_to_dict(inspection)
    
    details_result = await db.execute(
        select(InspectionDetail).where(InspectionDetail.inspection_id == inspection_id)
    )
    details = details_result.scalars().all()
    insp_dict["details"] = [model_to_dict(d) for d in details]
    
    return {"success": True, "data": insp_dict}

# ============ MECHANIC ASSIGNMENT ============
@api_router.post("/inspections/assign-mechanic")
async def assign_mechanic(
    request: AssignMechanicRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] not in ["SUPERVISOR", "OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(
        select(Inspection).where(
            and_(Inspection.inspection_id == request.inspection_id, Inspection.client_id == current_user["client_id"])
        )
    )
    inspection = result.scalar_one_or_none()
    
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    if inspection.inspection_status == InspectionStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Cannot assign mechanic to resolved inspection")
    
    result = await db.execute(
        select(User).where(
            and_(User.user_id == request.mechanic_id, User.role == "MECHANIC", User.client_id == current_user["client_id"])
        )
    )
    mechanic = result.scalar_one_or_none()
    
    if not mechanic:
        raise HTTPException(status_code=404, detail="Mechanic not found")
    
    await db.execute(
        update(Inspection)
        .where(Inspection.inspection_id == request.inspection_id)
        .values(
            assigned_mechanic=request.mechanic_id,
            mechanic_name=mechanic.name,
            assigned_date=datetime.now(timezone.utc),
            assigned_by=request.assigned_by,
            inspection_status=InspectionStatus.ASSIGNED
        )
    )
    await db.commit()
    
    return {"success": True, "message": "Mechanic assigned successfully"}

@api_router.get("/mechanics")
async def get_mechanics(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            and_(User.client_id == current_user["client_id"], User.role == "MECHANIC", User.active == True)
        )
    )
    mechanics = result.scalars().all()
    return {"success": True, "data": [
        {"user_id": m.user_id, "email": m.email, "name": m.name, "role": m.role, "client_id": m.client_id}
        for m in mechanics
    ]}

# ============ ISSUE FIX ============
@api_router.post("/inspections/fix-detail")
async def fix_detail(
    request: FixDetailRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Inspection).where(
            and_(Inspection.inspection_id == request.inspection_id, Inspection.client_id == current_user["client_id"])
        )
    )
    inspection = result.scalar_one_or_none()
    
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    result = await db.execute(
        select(InspectionDetail).where(
            and_(InspectionDetail.detail_id == request.detail_id, InspectionDetail.inspection_id == request.inspection_id)
        )
    )
    detail = result.scalar_one_or_none()
    
    if not detail:
        raise HTTPException(status_code=404, detail="Detail not found")
    
    if detail.status == "FIXED":
        raise HTTPException(status_code=400, detail="Issue already fixed")
    
    await db.execute(
        update(InspectionDetail)
        .where(InspectionDetail.detail_id == request.detail_id)
        .values(
            status="FIXED",
            fixed_by=request.fixed_by,
            fixed_date=datetime.now(timezone.utc),
            fix_notes=request.fix_notes
        )
    )
    
    result = await db.execute(
        select(func.count(InspectionDetail.detail_id))
        .where(
            and_(
                InspectionDetail.inspection_id == request.inspection_id,
                InspectionDetail.answer == "Fail",
                InspectionDetail.question_type != "ODO",
                InspectionDetail.status != "FIXED"
            )
        )
    )
    remaining_failed = result.scalar()
    
    if remaining_failed == 0:
        await db.execute(
            update(Inspection)
            .where(Inspection.inspection_id == request.inspection_id)
            .values(
                inspection_status=InspectionStatus.RESOLVED,
                resolved_date=datetime.now(timezone.utc),
                resolved_by=request.fixed_by
            )
        )
    else:
        await db.execute(
            update(Inspection)
            .where(Inspection.inspection_id == request.inspection_id)
            .values(inspection_status=InspectionStatus.IN_PROGRESS)
        )
    
    await db.commit()
    
    return {"success": True, "message": "Issue fixed successfully"}

@api_router.post("/inspections/quick-fix")
async def quick_fix_inspection(
    request: QuickFixRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Inspection).where(
            and_(Inspection.inspection_id == request.inspection_id, Inspection.client_id == current_user["client_id"])
        )
    )
    inspection = result.scalar_one_or_none()
    
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    await db.execute(
        update(InspectionDetail)
        .where(
            and_(
                InspectionDetail.inspection_id == request.inspection_id,
                InspectionDetail.answer == "Fail",
                InspectionDetail.question_type != "ODO",
                InspectionDetail.status != "FIXED"
            )
        )
        .values(
            status="FIXED",
            fixed_by=request.fixed_by,
            fixed_date=datetime.now(timezone.utc),
            fix_notes=request.fix_notes
        )
    )
    
    await db.execute(
        update(Inspection)
        .where(Inspection.inspection_id == request.inspection_id)
        .values(
            inspection_status=InspectionStatus.RESOLVED,
            resolved_date=datetime.now(timezone.utc),
            resolved_by=request.fixed_by
        )
    )
    
    await db.commit()
    
    return {"success": True, "message": "All issues fixed successfully"}

# ============ SUPERVISOR VERIFICATION ============
@api_router.post("/inspections/verify")
async def verify_inspection(
    request: VerifyInspectionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] not in ["SUPERVISOR", "OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(
        select(Inspection).where(
            and_(Inspection.inspection_id == request.inspection_id, Inspection.client_id == current_user["client_id"])
        )
    )
    inspection = result.scalar_one_or_none()
    
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    if request.action == "VERIFY":
        await db.execute(
            update(Inspection)
            .where(Inspection.inspection_id == request.inspection_id)
            .values(
                inspection_status=InspectionStatus.FIXED,
                verified_date=datetime.now(timezone.utc),
                verified_by=request.verified_by
            )
        )
        message = "Inspection verified successfully"
    else:
        await db.execute(
            update(InspectionDetail)
            .where(and_(InspectionDetail.inspection_id == request.inspection_id, InspectionDetail.status == "FIXED"))
            .values(status="ASSIGNED")
        )
        
        await db.execute(
            update(Inspection)
            .where(Inspection.inspection_id == request.inspection_id)
            .values(inspection_status=InspectionStatus.ASSIGNED)
        )
        message = "Inspection reassigned to mechanic"
    
    await db.commit()
    
    return {"success": True, "message": message}

# ============ FEEDBACK ROUTES ============
@api_router.post("/feedback")
async def create_feedback(feedback: FeedbackCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bus).where(Bus.bus_id == feedback.bus_id))
    bus = result.scalar_one_or_none()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    
    if feedback.want_update and not feedback.email:
        raise HTTPException(status_code=400, detail="Email required for updates")
    
    new_feedback = Feedback(
        feedback_id=str(uuid.uuid4()),
        bus_id=feedback.bus_id,
        bus_number=bus.bus_number,
        client_id=feedback.client_id,
        description=feedback.description,
        image_url=feedback.image_url,
        status=FeedbackStatus.NEW,
        want_update=feedback.want_update,
        email=feedback.email,
        created_date=datetime.now(timezone.utc)
    )
    
    db.add(new_feedback)
    await db.commit()
    
    return {"success": True, "message": "Feedback submitted successfully"}

@api_router.get("/feedback")
async def get_feedback(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Feedback)
        .where(Feedback.client_id == current_user["client_id"])
        .order_by(Feedback.created_date.desc())
    )
    feedback_list = result.scalars().all()
    
    return {"success": True, "data": [model_to_dict(f) for f in feedback_list]}

@api_router.post("/feedback/resolve")
async def resolve_feedback(
    request: ResolveFeedbackRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] not in ["SUPERVISOR", "OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(
        select(Feedback).where(
            and_(Feedback.feedback_id == request.feedback_id, Feedback.client_id == current_user["client_id"])
        )
    )
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    await db.execute(
        update(Feedback)
        .where(Feedback.feedback_id == request.feedback_id)
        .values(
            status=FeedbackStatus.RESOLVED,
            resolved_date=datetime.now(timezone.utc),
            resolved_by=request.resolved_by,
            resolution_notes=request.notes
        )
    )
    await db.commit()
    
    return {"success": True, "message": "Feedback resolved successfully"}

# ============ ALERT ROUTES ============
@api_router.post("/alerts")
async def create_alert(
    alert: AlertBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if alert.client_id != current_user["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(select(Client).where(Client.client_id == alert.client_id))
    client = result.scalar_one_or_none()
    alert_days = client.alert_days if client else 7
    
    status, days_remaining = calculate_alert_status(alert.expiry_date, alert_days)
    
    expiry_date = alert.expiry_date
    if isinstance(expiry_date, str):
        expiry_date = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
    
    new_alert = Alert(
        alert_id=str(uuid.uuid4()),
        bus_id=alert.bus_id,
        alert_type=alert.alert_type,
        alert_name=alert.alert_name,
        expiry_date=expiry_date,
        client_id=alert.client_id,
        status=status,
        days_remaining=days_remaining,
        notes=alert.notes,
        attachment_url=alert.attachment_url,
        created_date=datetime.now(timezone.utc),
        created_by=current_user["user_id"]
    )
    
    db.add(new_alert)
    await db.commit()
    
    return {"success": True, "message": "Alert created successfully"}

@api_router.get("/alerts")
async def get_alerts(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Client).where(Client.client_id == current_user["client_id"]))
    client = result.scalar_one_or_none()
    alert_days = client.alert_days if client else 7
    
    result = await db.execute(
        select(Alert).where(Alert.client_id == current_user["client_id"])
    )
    alerts = result.scalars().all()
    
    alert_list = []
    for alert in alerts:
        alert_dict = model_to_dict(alert)
        status, days_remaining = calculate_alert_status(alert.expiry_date, alert_days)
        alert_dict["status"] = status
        alert_dict["days_remaining"] = days_remaining
        
        if status_filter and alert_dict["status"] != status_filter:
            continue
        
        alert_list.append(alert_dict)
    
    return {"success": True, "data": alert_list}

@api_router.post("/alerts/update")
async def update_alert(
    request: UpdateAlertRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] not in ["SUPERVISOR", "OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(
        select(Alert).where(
            and_(Alert.alert_id == request.alert_id, Alert.client_id == current_user["client_id"])
        )
    )
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    result = await db.execute(select(Client).where(Client.client_id == current_user["client_id"]))
    client = result.scalar_one_or_none()
    alert_days = client.alert_days if client else 7
    
    status, days_remaining = calculate_alert_status(request.new_expiry_date, alert_days)
    
    update_values = {
        "expiry_date": request.new_expiry_date,
        "status": status,
        "days_remaining": days_remaining,
        "updated_date": datetime.now(timezone.utc),
        "updated_by": request.updated_by
    }
    
    if request.notes:
        update_values["notes"] = request.notes
    if request.attachment_url:
        update_values["attachment_url"] = request.attachment_url
    
    await db.execute(
        update(Alert).where(Alert.alert_id == request.alert_id).values(**update_values)
    )
    await db.commit()
    
    return {"success": True, "message": "Alert updated successfully"}

# ============ COLLECTION ROUTES ============
@api_router.post("/collections")
async def create_collection(
    collection: CollectionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if collection.client_id != current_user["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    collection_date = datetime.strptime(collection.date, "%Y-%m-%d")
    if collection_date > datetime.now():
        raise HTTPException(status_code=400, detail="Date cannot be in future")
    
    if collection.collected_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    result = await db.execute(select(Bus).where(Bus.bus_id == collection.bus_id))
    bus = result.scalar_one_or_none()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    
    new_collection = Collection(
        collection_id=str(uuid.uuid4()),
        date=collection.date,
        bus_id=collection.bus_id,
        bus_number=bus.bus_number,
        collected_amount=collection.collected_amount,
        notes=collection.notes,
        client_id=collection.client_id,
        created_by=collection.created_by,
        created_date=datetime.now(timezone.utc)
    )
    
    db.add(new_collection)
    await db.commit()
    
    return {"success": True, "message": "Collection added successfully"}

@api_router.get("/collections")
async def get_collections(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    bus_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Collection).where(Collection.client_id == current_user["client_id"])
    
    if start_date and end_date:
        query = query.where(and_(Collection.date >= start_date, Collection.date <= end_date))
    
    if bus_id:
        query = query.where(Collection.bus_id == bus_id)
    
    query = query.order_by(Collection.date.desc())
    
    result = await db.execute(query)
    collections = result.scalars().all()
    
    return {"success": True, "data": [model_to_dict(c) for c in collections]}

# ============ EXPENSE ROUTES ============
@api_router.post("/expense-master")
async def create_expense_master(
    expense: ExpenseMasterCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if expense.client_id != current_user["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_expense = ExpenseMaster(
        expense_id=str(uuid.uuid4()),
        expense_name=expense.expense_name,
        client_id=expense.client_id,
        active_flag=True,
        created_date=datetime.now(timezone.utc),
        created_by=expense.created_by
    )
    
    db.add(new_expense)
    await db.commit()
    
    return {"success": True, "message": "Expense type added", "data": {"expense_id": new_expense.expense_id}}

@api_router.get("/expense-master")
async def get_expense_master(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExpenseMaster).where(
            and_(ExpenseMaster.client_id == current_user["client_id"], ExpenseMaster.active_flag == True)
        )
    )
    expenses = result.scalars().all()
    
    return {"success": True, "data": [model_to_dict(e) for e in expenses]}

@api_router.post("/expenses")
async def create_expense(
    expense: ExpenseCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if expense.client_id != current_user["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    expense_date = datetime.strptime(expense.date, "%Y-%m-%d")
    if expense_date > datetime.now():
        raise HTTPException(status_code=400, detail="Date cannot be in future")
    
    if expense.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    result = await db.execute(select(Bus).where(Bus.bus_id == expense.bus_id))
    bus = result.scalar_one_or_none()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    
    expense_name = expense.custom_name
    if expense.expense_id:
        result = await db.execute(select(ExpenseMaster).where(ExpenseMaster.expense_id == expense.expense_id))
        expense_master = result.scalar_one_or_none()
        expense_name = expense_master.expense_name if expense_master else "Unknown"
    
    if expense.save_to_master and expense.custom_name:
        new_master = ExpenseMaster(
            expense_id=str(uuid.uuid4()),
            expense_name=expense.custom_name,
            client_id=expense.client_id,
            active_flag=True,
            created_date=datetime.now(timezone.utc),
            created_by=expense.created_by
        )
        db.add(new_master)
    
    new_expense = Expense(
        expense_entry_id=str(uuid.uuid4()),
        date=expense.date,
        bus_id=expense.bus_id,
        bus_number=bus.bus_number,
        expense_id=expense.expense_id,
        expense_name=expense_name,
        amount=expense.amount,
        notes=expense.notes,
        client_id=expense.client_id,
        created_by=expense.created_by,
        created_date=datetime.now(timezone.utc)
    )
    
    db.add(new_expense)
    await db.commit()
    
    return {"success": True, "message": "Expense added successfully"}

@api_router.get("/expenses")
async def get_expenses(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    bus_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Expense).where(Expense.client_id == current_user["client_id"])
    
    if start_date and end_date:
        query = query.where(and_(Expense.date >= start_date, Expense.date <= end_date))
    
    if bus_id:
        query = query.where(Expense.bus_id == bus_id)
    
    query = query.order_by(Expense.date.desc())
    
    result = await db.execute(query)
    expenses = result.scalars().all()
    
    return {"success": True, "data": [model_to_dict(e) for e in expenses]}

# ============ PROFIT CALCULATION ============
@api_router.get("/profit/bus-wise")
async def get_bus_wise_profit(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Bus).where(and_(Bus.client_id == current_user["client_id"], Bus.active == True))
    )
    buses = result.scalars().all()
    
    profit_list = []
    
    for bus in buses:
        collection_query = select(func.sum(Collection.collected_amount)).where(
            and_(Collection.client_id == current_user["client_id"], Collection.bus_id == bus.bus_id)
        )
        expense_query = select(func.sum(Expense.amount)).where(
            and_(Expense.client_id == current_user["client_id"], Expense.bus_id == bus.bus_id)
        )
        
        if start_date and end_date:
            collection_query = collection_query.where(and_(Collection.date >= start_date, Collection.date <= end_date))
            expense_query = expense_query.where(and_(Expense.date >= start_date, Expense.date <= end_date))
        
        collection_result = await db.execute(collection_query)
        total_collection = collection_result.scalar() or 0
        
        expense_result = await db.execute(expense_query)
        total_expense = expense_result.scalar() or 0
        
        net_profit = total_collection - total_expense
        status = "Profit" if net_profit > 0 else "Loss" if net_profit < 0 else "Break Even"
        
        profit_list.append({
            "bus_id": bus.bus_id,
            "bus_number": bus.bus_number,
            "total_collection": total_collection,
            "total_expense": total_expense,
            "net_profit": net_profit,
            "status": status
        })
    
    return {"success": True, "data": profit_list}

# ============ DASHBOARD ROUTES ============
@api_router.get("/dashboard/metrics")
async def get_dashboard_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    bus_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    client_id = current_user["client_id"]
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_str = today.strftime("%Y-%m-%d")
    
    filter_start = start_date if start_date else today_str
    filter_end = end_date if end_date else today_str
    
    # Total buses
    result = await db.execute(
        select(func.count(Bus.bus_id)).where(and_(Bus.client_id == client_id, Bus.active == True))
    )
    total_buses = result.scalar() or 0
    
    # Date range for inspections
    start_datetime = datetime.strptime(filter_start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_datetime = datetime.strptime(filter_end, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    
    # Daily inspections
    inspection_query = select(func.count(Inspection.inspection_id)).where(
        and_(
            Inspection.client_id == client_id,
            Inspection.inspection_date >= start_datetime,
            Inspection.inspection_date <= end_datetime
        )
    )
    if bus_id and bus_id != 'all':
        inspection_query = inspection_query.where(Inspection.bus_id == bus_id)
    
    result = await db.execute(inspection_query)
    daily_inspections = result.scalar() or 0
    
    # Failed inspections
    failed_query = select(func.count(Inspection.inspection_id)).where(
        and_(
            Inspection.client_id == client_id,
            Inspection.inspection_status == InspectionStatus.FAILED,
            Inspection.inspection_date >= start_datetime,
            Inspection.inspection_date <= end_datetime
        )
    )
    if bus_id and bus_id != 'all':
        failed_query = failed_query.where(Inspection.bus_id == bus_id)
    
    result = await db.execute(failed_query)
    failed_inspections = result.scalar() or 0
    
    # Most problematic bus
    problematic_query = (
        select(Inspection.bus_number, func.count(Inspection.inspection_id).label('count'))
        .where(
            and_(
                Inspection.client_id == client_id,
                Inspection.inspection_status == InspectionStatus.FAILED,
                Inspection.inspection_date >= start_datetime,
                Inspection.inspection_date <= end_datetime
            )
        )
        .group_by(Inspection.bus_number)
        .order_by(func.count(Inspection.inspection_id).desc())
        .limit(1)
    )
    result = await db.execute(problematic_query)
    problematic = result.first()
    most_problematic_bus = problematic[0] if problematic else None
    
    # Feedback resolution rate
    result = await db.execute(
        select(func.count(Feedback.feedback_id)).where(Feedback.client_id == client_id)
    )
    total_feedback = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(Feedback.feedback_id)).where(
            and_(Feedback.client_id == client_id, Feedback.status == FeedbackStatus.RESOLVED)
        )
    )
    resolved_feedback = result.scalar() or 0
    
    feedback_resolution_rate = (resolved_feedback / total_feedback * 100) if total_feedback > 0 else 0
    
    # Financial metrics
    collection_query = select(func.sum(Collection.collected_amount)).where(
        and_(
            Collection.client_id == client_id,
            Collection.date >= filter_start,
            Collection.date <= filter_end
        )
    )
    expense_query = select(func.sum(Expense.amount)).where(
        and_(
            Expense.client_id == client_id,
            Expense.date >= filter_start,
            Expense.date <= filter_end
        )
    )
    
    if bus_id and bus_id != 'all':
        collection_query = collection_query.where(Collection.bus_id == bus_id)
        expense_query = expense_query.where(Expense.bus_id == bus_id)
    
    result = await db.execute(collection_query)
    total_collection = result.scalar() or 0
    
    result = await db.execute(expense_query)
    total_expense = result.scalar() or 0
    
    net_profit = total_collection - total_expense
    
    return {
        "success": True,
        "data": {
            "total_buses": total_buses,
            "daily_inspections": daily_inspections,
            "failed_inspections": failed_inspections,
            "most_problematic_bus": most_problematic_bus,
            "feedback_resolution_rate": round(feedback_resolution_rate, 2),
            "total_collection": total_collection,
            "total_expense": total_expense,
            "net_profit": net_profit,
            "filter_period": f"{filter_start} to {filter_end}"
        }
    }

# ============ IMAGE UPLOAD ============
@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_image}"
    
    return {"success": True, "data": {"url": data_url}}

# ============ ADD CUSTOM PROBLEM ============
@api_router.post("/inspections/add-problem")
async def add_problem(
    request: AddProblemRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if request.client_id != current_user["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(select(Bus).where(Bus.bus_id == request.bus_id))
    bus = result.scalar_one_or_none()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    
    inspection_id = str(uuid.uuid4())
    inspection_date = datetime.now(timezone.utc)
    
    # Get user name
    result = await db.execute(select(User).where(User.user_id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    
    new_inspection = Inspection(
        inspection_id=inspection_id,
        bus_id=request.bus_id,
        bus_number=bus.bus_number,
        driver_id=request.reported_by,
        driver_name=user.name if user else "Unknown",
        inspection_date=inspection_date,
        inspection_status=InspectionStatus.FAILED,
        client_id=request.client_id,
        is_custom_problem=True,
        created_date=inspection_date
    )
    
    db.add(new_inspection)
    
    new_detail = InspectionDetail(
        detail_id=str(uuid.uuid4()),
        inspection_id=inspection_id,
        question_id=str(uuid.uuid4()),
        question_text="Custom Problem",
        question_type="TEXT",
        answer="Fail",
        comment=request.problem_description,
        image_url=request.image_url,
        audio_url=request.audio_url,
        video_url=request.video_url,
        status="FAILED",
        created_date=inspection_date
    )
    
    db.add(new_detail)
    await db.commit()
    
    return {"success": True, "message": "Problem added successfully", "data": {"inspection_id": inspection_id}}

# ============ CLIENT MANAGEMENT (PLATFORM ADMIN) ============
@api_router.post("/clients")
async def create_client(
    client: ClientCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_client = Client(
        client_id=str(uuid.uuid4()),
        company_name=client.company_name,
        logo=client.logo,
        theme_color=client.theme_color,
        alert_days=client.alert_days,
        active=True,
        created_date=datetime.now(timezone.utc)
    )
    
    db.add(new_client)
    await db.commit()
    
    return {"success": True, "message": "Client created", "data": model_to_dict(new_client)}

@api_router.get("/clients/all")
async def get_all_clients(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(select(Client))
    clients = result.scalars().all()
    return {"success": True, "data": [model_to_dict(c) for c in clients]}

@api_router.put("/clients")
async def update_client(
    request: ClientUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_values = {"updated_date": datetime.now(timezone.utc)}
    if request.company_name is not None:
        update_values["company_name"] = request.company_name
    if request.logo is not None:  # Allow empty string to clear logo
        update_values["logo"] = request.logo
    if request.theme_color is not None:
        update_values["theme_color"] = request.theme_color
    if request.alert_days is not None:
        update_values["alert_days"] = request.alert_days
    if request.active is not None:
        update_values["active"] = request.active
    
    await db.execute(
        update(Client).where(Client.client_id == request.client_id).values(**update_values)
    )
    await db.commit()
    
    return {"success": True, "message": "Client updated"}

# ============ USER MANAGEMENT (PLATFORM ADMIN) ============
@api_router.post("/users/create")
async def create_user_by_admin(
    user: UserCreateByAdmin,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(
        select(User).where(and_(User.email == user.email, User.client_id == user.client_id))
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = User(
        user_id=str(uuid.uuid4()),
        email=user.email,
        password=hash_password(user.password),
        name=user.name,
        role=user.role,
        client_id=user.client_id,
        active=True,
        preferred_language=user.preferred_language if hasattr(user, 'preferred_language') else "EN",
        created_date=datetime.now(timezone.utc)
    )
    
    db.add(new_user)
    await db.commit()
    
    return {"success": True, "message": "User created successfully"}

@api_router.get("/users/all")
async def get_all_users(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(select(User))
    users = result.scalars().all()
    return {"success": True, "data": [
        {k: v for k, v in model_to_dict(u).items() if k != 'password'}
        for u in users
    ]}

@api_router.put("/users/{user_id}")
async def update_user_by_admin(
    user_id: str,
    name: Optional[str] = None,
    email: Optional[str] = None,
    role: Optional[str] = None,
    active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find the user
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_values = {}
    if name is not None:
        update_values["name"] = name
    if email is not None:
        update_values["email"] = email
    if role is not None:
        update_values["role"] = role
    if active is not None:
        update_values["active"] = active
    
    if update_values:
        await db.execute(
            update(User).where(User.user_id == user_id).values(**update_values)
        )
        await db.commit()
    
    return {"success": True, "message": "User updated successfully"}

@api_router.put("/users/{user_id}/password")
async def change_user_password(
    user_id: str,
    new_password: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Platform Admin can change any user's password
    # Regular users can only change their own password
    if current_user["role"] != "PLATFORM_ADMIN" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find the user
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    hashed_password = hash_password(new_password)
    await db.execute(
        update(User).where(User.user_id == user_id).values(password=hashed_password)
    )
    await db.commit()
    
    return {"success": True, "message": "Password changed successfully"}

@api_router.get("/buses/all")
async def get_all_buses_by_client(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(select(Bus))
    buses = result.scalars().all()
    return {"success": True, "data": [model_to_dict(b) for b in buses]}

# ============ PLATFORM ADMIN CONFIGURATION APIs ============

# Inspection Questions Configuration
@api_router.get("/config/inspection-questions")
async def get_inspection_questions_config(
    client_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = select(ChecklistQuestion)
    if client_id:
        query = query.where(ChecklistQuestion.client_id == client_id)
    query = query.order_by(ChecklistQuestion.client_id, ChecklistQuestion.order_num)
    
    result = await db.execute(query)
    questions = result.scalars().all()
    return {"success": True, "data": [model_to_dict(q) for q in questions]}

@api_router.post("/config/inspection-questions")
async def create_inspection_question_config(
    question: InspectionQuestionConfig,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_question = ChecklistQuestion(
        question_id=str(uuid.uuid4()),
        question_text=question.question_text,
        question_type=question.input_type,
        order_num=question.order_num,
        is_critical=question.is_critical,
        is_active=question.is_active,
        client_id=question.client_id,
        created_date=datetime.now(timezone.utc),
        created_by=current_user["user_id"]
    )
    
    db.add(new_question)
    await db.commit()
    
    return {"success": True, "message": "Inspection question added", "data": model_to_dict(new_question)}

@api_router.put("/config/inspection-questions")
async def update_inspection_question_config(
    question: InspectionQuestionConfig,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not question.question_id:
        raise HTTPException(status_code=400, detail="Question ID required")
    
    await db.execute(
        update(ChecklistQuestion)
        .where(ChecklistQuestion.question_id == question.question_id)
        .values(
            question_text=question.question_text,
            question_type=question.input_type,
            order_num=question.order_num,
            is_critical=question.is_critical,
            is_active=question.is_active
        )
    )
    await db.commit()
    
    return {"success": True, "message": "Inspection question updated"}

@api_router.delete("/config/inspection-questions/{question_id}")
async def delete_inspection_question_config(
    question_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.execute(delete(ChecklistQuestion).where(ChecklistQuestion.question_id == question_id))
    await db.commit()
    
    return {"success": True, "message": "Inspection question deleted"}

# Expense Categories Configuration
@api_router.get("/config/expense-categories")
async def get_expense_categories_config(
    client_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = select(ExpenseMaster)
    if client_id:
        query = query.where(ExpenseMaster.client_id == client_id)
    
    result = await db.execute(query)
    expenses = result.scalars().all()
    return {"success": True, "data": [model_to_dict(e) for e in expenses]}

@api_router.post("/config/expense-categories")
async def create_expense_category_config(
    expense: ExpenseCategoryConfig,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check for duplicate
    result = await db.execute(
        select(ExpenseMaster).where(
            and_(ExpenseMaster.expense_name == expense.expense_name, ExpenseMaster.client_id == expense.client_id)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Expense category already exists for this client")
    
    new_expense = ExpenseMaster(
        expense_id=str(uuid.uuid4()),
        expense_name=expense.expense_name,
        client_id=expense.client_id,
        active_flag=expense.is_active,
        created_date=datetime.now(timezone.utc),
        created_by=current_user["user_id"]
    )
    
    db.add(new_expense)
    await db.commit()
    
    return {"success": True, "message": "Expense category added", "data": model_to_dict(new_expense)}

@api_router.put("/config/expense-categories")
async def update_expense_category_config(
    expense: ExpenseCategoryConfig,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not expense.expense_id:
        raise HTTPException(status_code=400, detail="Expense ID required")
    
    await db.execute(
        update(ExpenseMaster)
        .where(ExpenseMaster.expense_id == expense.expense_id)
        .values(
            expense_name=expense.expense_name,
            active_flag=expense.is_active
        )
    )
    await db.commit()
    
    return {"success": True, "message": "Expense category updated"}

# Alert Configuration
@api_router.get("/config/alerts")
async def get_alert_configs(
    client_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = select(AlertConfiguration)
    if client_id:
        query = query.where(AlertConfiguration.client_id == client_id)
    
    result = await db.execute(query)
    alerts = result.scalars().all()
    return {"success": True, "data": [model_to_dict(a) for a in alerts]}

@api_router.post("/config/alerts")
async def create_alert_config(
    alert: AlertConfig,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_alert = AlertConfiguration(
        alert_config_id=str(uuid.uuid4()),
        client_id=alert.client_id,
        alert_name=alert.alert_name,
        trigger_condition=alert.trigger_condition,
        is_active=alert.is_active,
        created_date=datetime.now(timezone.utc),
        created_by=current_user["user_id"]
    )
    
    db.add(new_alert)
    await db.commit()
    
    return {"success": True, "message": "Alert configuration added", "data": model_to_dict(new_alert)}

@api_router.put("/config/alerts")
async def update_alert_config(
    alert: AlertConfig,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not alert.alert_config_id:
        raise HTTPException(status_code=400, detail="Alert config ID required")
    
    await db.execute(
        update(AlertConfiguration)
        .where(AlertConfiguration.alert_config_id == alert.alert_config_id)
        .values(
            alert_name=alert.alert_name,
            trigger_condition=alert.trigger_condition,
            is_active=alert.is_active
        )
    )
    await db.commit()
    
    return {"success": True, "message": "Alert configuration updated"}

@api_router.delete("/config/alerts/{alert_config_id}")
async def delete_alert_config(
    alert_config_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "PLATFORM_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.execute(delete(AlertConfiguration).where(AlertConfiguration.alert_config_id == alert_config_id))
    await db.commit()
    
    return {"success": True, "message": "Alert configuration deleted"}

# ============ SEED DATA ============
@api_router.post("/seed")
async def seed_data(db: AsyncSession = Depends(get_db)):
    # Check if demo client exists
    result = await db.execute(select(Client).where(Client.client_id == "demo-client-001"))
    existing_client = result.scalar_one_or_none()
    
    if not existing_client:
        demo_client = Client(
            client_id="demo-client-001",
            company_name="Demo Transport Company",
            theme_color="#1E3A8A",
            alert_days=7,
            active=True,
            created_date=datetime.now(timezone.utc)
        )
        db.add(demo_client)
    
    # Create demo users
    users_data = [
        ("platform@admin.com", "platform123", "Platform Admin", "PLATFORM_ADMIN"),
        ("admin@demo.com", "admin123", "Admin User", "ADMIN"),
        ("supervisor@demo.com", "super123", "Supervisor User", "SUPERVISOR"),
        ("driver@demo.com", "driver123", "Driver One", "DRIVER"),
        ("mechanic@demo.com", "mech123", "Mechanic One", "MECHANIC"),
    ]
    
    for email, password, name, role in users_data:
        result = await db.execute(
            select(User).where(and_(User.email == email, User.client_id == "demo-client-001"))
        )
        if not result.scalar_one_or_none():
            new_user = User(
                user_id=str(uuid.uuid4()),
                email=email,
                password=hash_password(password),
                name=name,
                role=role,
                client_id="demo-client-001",
                active=True,
                preferred_language="EN",
                created_date=datetime.now(timezone.utc)
            )
            db.add(new_user)
    
    # Create demo buses
    buses_data = [
        ("TN-01-AB-1234", "TN01AB1234", "Ashok Leyland", 50),
        ("TN-01-CD-5678", "TN01CD5678", "Tata Motors", 45),
    ]
    
    for bus_number, reg_number, model, capacity in buses_data:
        result = await db.execute(
            select(Bus).where(and_(Bus.bus_number == bus_number, Bus.client_id == "demo-client-001"))
        )
        if not result.scalar_one_or_none():
            new_bus = Bus(
                bus_id=str(uuid.uuid4()),
                bus_number=bus_number,
                registration_number=reg_number,
                model=model,
                capacity=capacity,
                client_id="demo-client-001",
                active=True,
                created_date=datetime.now(timezone.utc)
            )
            db.add(new_bus)
    
    # Create checklist questions
    questions_data = [
        ("Check tire pressure", "PASS_FAIL", 1, True),
        ("Check engine oil level", "PASS_FAIL", 2, False),
        ("Check brake condition", "PASS_FAIL", 3, True),
        ("Odometer reading", "NUMBER", 4, False),
        ("Fuel level (%)", "NUMBER", 5, False),
    ]
    
    for question_text, question_type, order, is_critical in questions_data:
        result = await db.execute(
            select(ChecklistQuestion).where(
                and_(ChecklistQuestion.question_text == question_text, ChecklistQuestion.client_id == "demo-client-001")
            )
        )
        if not result.scalar_one_or_none():
            new_question = ChecklistQuestion(
                question_id=str(uuid.uuid4()),
                question_text=question_text,
                question_type=question_type,
                order_num=order,
                is_critical=is_critical,
                is_active=True,
                client_id="demo-client-001",
                created_date=datetime.now(timezone.utc)
            )
            db.add(new_question)
    
    # Create expense master
    expense_types = ["Fuel", "Toll", "Driver Salary", "Cleaning", "Maintenance", "Parking"]
    for exp_name in expense_types:
        result = await db.execute(
            select(ExpenseMaster).where(
                and_(ExpenseMaster.expense_name == exp_name, ExpenseMaster.client_id == "demo-client-001")
            )
        )
        if not result.scalar_one_or_none():
            new_expense = ExpenseMaster(
                expense_id=str(uuid.uuid4()),
                expense_name=exp_name,
                client_id="demo-client-001",
                active_flag=True,
                created_date=datetime.now(timezone.utc)
            )
            db.add(new_expense)
    
    await db.commit()
    
    return {"success": True, "message": "Demo data seeded successfully"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": "mysql"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await init_db()
    logger.info("MySQL Database initialized")

@app.on_event("shutdown")
async def shutdown_event():
    await close_db()
    logger.info("Database connection closed")
