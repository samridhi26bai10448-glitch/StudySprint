
from datetime import date
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from typing import Literal

import models
from database import Base, engine
from dependencies import get_db
from security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="StudySprint API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

bearer_scheme = HTTPBearer()


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=1000)
    priority: Literal["Low", "Medium", "High"] = "Medium"
    due_date: date | None = None


class TaskPriorityUpdate(BaseModel):
    priority: Literal["Low", "Medium", "High"]


class TaskDateUpdate(BaseModel):
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=1000)
    priority: Literal["Low", "Medium", "High"]
    due_date: date | None = None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired login token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (Exception,):
        raise unauthorized

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if user is None:
        raise unauthorized

    return user


@app.get("/")
def home():
    return {
        "message": "Welcome to StudySprint!",
        "status": "Backend is running"
    }


@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = models.User(
        email=str(user_data.email).lower(),
        hashed_password=hash_password(user_data.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Account created successfully", "user_id": user.id}


@app.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    email = str(user_data.email).lower()

    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if user is None or not verify_password(
        user_data.password, user.hashed_password
    ):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
    }


@app.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}


@app.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = task_data.title.strip()

    if not title:
        raise HTTPException(status_code=422, detail="Task title cannot be empty")

    task = models.Task(
        title=title,
        description=task_data.description,
        completed=0,
        priority=task_data.priority,
        due_date=task_data.due_date,
        user_id=current_user.id,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "completed": bool(task.completed),
        "priority": task.priority,
        "due_date": task.due_date,
    }


@app.get("/tasks")
def list_tasks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tasks = (
        db.query(models.Task)
        .filter(models.Task.user_id == current_user.id)
        .all()
    )

    return [
        {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "completed": bool(task.completed),
            "priority": task.priority,
            "due_date": task.due_date,
        }
        for task in tasks
    ]


@app.patch("/tasks/{task_id}/complete")
def complete_task(
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(models.Task)
        .filter(
            models.Task.id == task_id,
            models.Task.user_id == current_user.id,
        )
        .first()
    )

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    task.completed = 0 if task.completed else 1

    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "completed": bool(task.completed),
        "priority": task.priority,
        "due_date": task.due_date,
    }


@app.patch("/tasks/{task_id}/priority")
def update_task_priority(
    task_id: int,
    priority_data: TaskPriorityUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(models.Task)
        .filter(
            models.Task.id == task_id,
            models.Task.user_id == current_user.id,
        )
        .first()
    )

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    task.priority = priority_data.priority

    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "priority": task.priority,
        "message": "Task priority updated successfully",
    }


@app.patch("/tasks/{task_id}/date")
def update_task_date(
    task_id: int,
    date_data: TaskDateUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(models.Task)
        .filter(
            models.Task.id == task_id,
            models.Task.user_id == current_user.id,
        )
        .first()
    )

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    task.due_date = date_data.due_date

    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "due_date": task.due_date,
        "message": "Task date updated successfully",
    }


@app.patch("/tasks/{task_id}")
def edit_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(models.Task)
        .filter(
            models.Task.id == task_id,
            models.Task.user_id == current_user.id,
        )
        .first()
    )

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    title = task_data.title.strip()

    if not title:
        raise HTTPException(status_code=422, detail="Task title cannot be empty")

    task.title = title
    task.description = task_data.description
    task.priority = task_data.priority
    task.due_date = task_data.due_date

    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "completed": bool(task.completed),
        "priority": task.priority,
        "due_date": task.due_date,
        "message": "Task updated successfully",
    }


@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(models.Task)
        .filter(
            models.Task.id == task_id,
            models.Task.user_id == current_user.id,
        )
        .first()
    )

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted successfully"}
