from datetime import datetime, timezone
import re
from typing import Any
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.community_group import CommunityGroup, CommunityGroupMembership
from app.models.community_post import CommunityPost
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/v1/community", tags=["Community"])


class CommunityPostCreate(BaseModel):
    groupName: str = Field(default="Community", max_length=120)
    postType: str = Field(default="general", max_length=32)
    title: str | None = Field(default=None, max_length=200)
    content: str = Field(min_length=1, max_length=5000)
    routeInfo: dict[str, Any] | None = None


class CommunityGroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=1000)
    category: Literal["commute", "campus", "office", "city", "eco"] = "city"


def serialize_post(post: CommunityPost, user: User) -> dict:
    created_at = post.created_at or datetime.now(timezone.utc)
    return {
        "id": str(post.id),
        "userId": user.id,
        "authorName": user.full_name or user.email,
        "authorAvatar": user.profile_photo_url,
        "isVerified": bool(user.is_verified),
        "role": user.role or "Member",
        "createdAt": created_at.isoformat(),
        "groupName": post.group_name,
        "postType": post.post_type,
        "title": post.title,
        "content": post.content,
        "routeInfo": post.route_info,
        "likes": 0,
        "commentsCount": 0,
        "shares": 0,
        "hasLiked": False,
        "hasSaved": False,
        "comments": [],
    }


@router.get("/posts")
def get_community_posts(
    category: str | None = None,
    search: str | None = Query(default=None, max_length=200),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    query = db.query(CommunityPost, User).join(User, User.id == CommunityPost.user_id)
    if category == "nearby":
        query = query.filter(CommunityPost.route_info.isnot(None))
    if category == "my_groups":
        group_names = (
            db.query(CommunityGroup.name)
            .join(CommunityGroupMembership, CommunityGroupMembership.group_id == CommunityGroup.id)
            .filter(CommunityGroupMembership.user_id == _current_user.id)
        )
        query = query.filter(CommunityPost.group_name.in_(group_names))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            CommunityPost.title.ilike(term)
            | CommunityPost.content.ilike(term)
            | CommunityPost.group_name.ilike(term)
        )
    rows = query.order_by(CommunityPost.created_at.desc()).all()
    return [serialize_post(post, user) for post, user in rows]


@router.get("/groups")
def get_community_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(CommunityGroup, func.count(CommunityGroupMembership.id))
        .outerjoin(CommunityGroupMembership, CommunityGroupMembership.group_id == CommunityGroup.id)
        .group_by(CommunityGroup.id)
        .order_by(CommunityGroup.name)
        .all()
    )
    joined_ids = {
        row[0]
        for row in db.query(CommunityGroupMembership.group_id)
        .filter(CommunityGroupMembership.user_id == current_user.id)
        .all()
    }
    return [
        {
            "id": str(group.id),
            "name": group.name,
            "slug": group.slug,
            "description": group.description,
            "category": group.category,
            "memberCount": count,
            "isJoined": group.id in joined_ids,
        }
        for group, count in rows
    ]


@router.post("/groups", status_code=status.HTTP_201_CREATED)
def create_community_group(
    payload: CommunityGroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create community groups")

    name = payload.name.strip()
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not name or not slug:
        raise HTTPException(status_code=422, detail="Enter a valid group name")
    if db.query(CommunityGroup.id).filter(CommunityGroup.name.ilike(name)).first():
        raise HTTPException(status_code=409, detail="A group with this name already exists")
    if db.query(CommunityGroup.id).filter(CommunityGroup.slug == slug).first():
        raise HTTPException(status_code=409, detail="A group with a similar name already exists")

    group = CommunityGroup(
        name=name,
        slug=slug,
        description=payload.description.strip(),
        category=payload.category,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return {
        "id": str(group.id),
        "name": group.name,
        "slug": group.slug,
        "description": group.description,
        "category": group.category,
        "memberCount": 0,
        "isJoined": False,
    }


@router.post("/groups/{group_id}/join")
def join_community_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(CommunityGroup).filter(CommunityGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Community group not found")
    membership = db.query(CommunityGroupMembership).filter_by(group_id=group_id, user_id=current_user.id).first()
    if not membership:
        db.add(CommunityGroupMembership(group_id=group_id, user_id=current_user.id))
        db.commit()
    return {"success": True}


@router.delete("/groups/{group_id}/join")
def leave_community_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = db.query(CommunityGroupMembership).filter_by(group_id=group_id, user_id=current_user.id).first()
    if membership:
        db.delete(membership)
        db.commit()
    return {"success": True}


@router.post("/posts", status_code=201)
def create_community_post(
    payload: CommunityPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.content.strip():
        raise HTTPException(status_code=422, detail="Post content cannot be blank")
    if payload.groupName != "Community" and not db.query(CommunityGroup.id).filter(CommunityGroup.name == payload.groupName).first():
        raise HTTPException(status_code=422, detail="Select an existing community group")
    post = CommunityPost(
        user_id=current_user.id,
        group_name=payload.groupName.strip() or "Community",
        post_type=payload.postType,
        title=payload.title.strip() if payload.title else None,
        content=payload.content.strip(),
        route_info=payload.routeInfo,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return serialize_post(post, current_user)
