"""
models.py — Pydantic request and response models.
These serve as the first validation layer (fast-fail, good error messages).
Postgres domains/constraints are the second authoritative layer.
"""
from __future__ import annotations
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


# ─── Enums (mirroring Postgres types) ────────────────────────────────────────

class UserRole(str, Enum):
    user = "user"
    admin = "admin"


class ListingType(str, Enum):
    sale = "sale"
    rent = "rent"


class ListingStatus(str, Enum):
    pending_approval = "pending_approval"
    available        = "available"
    sold             = "sold"
    rented           = "rented"
    removed          = "removed"


class TxnStatus(str, Enum):
    pending    = "pending"
    completed  = "completed"
    cancelled  = "cancelled"
    disputed   = "disputed"


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:    EmailStr
    password: str = Field(min_length=8, max_length=128)
    role:     UserRole = UserRole.user


class RegisterResponse(BaseModel):
    user_id: str


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      str
    role:         str
    is_verified:  bool


# ─── Listings ─────────────────────────────────────────────────────────────────

class CreateListingRequest(BaseModel):
    isbn:          str = Field(pattern=r"^\d{13}$")
    title:         str
    author:        str
    genre_id:      Optional[int] = Field(default=None, ge=1)
    condition_id:  int = Field(ge=1)
    type:          ListingType
    price:         Optional[Decimal] = Field(default=None, ge=0)
    daily_rent_fee: Optional[Decimal] = Field(default=None, ge=0)
    max_lend_days: Optional[int]      = Field(default=None, ge=1)


class CreateListingResponse(BaseModel):
    listing_id: str


class EditListingRequest(BaseModel):
    condition_id:  int = Field(ge=1)
    type:          ListingType
    price:         Optional[Decimal] = Field(default=None, ge=0)
    daily_rent_fee: Optional[Decimal] = Field(default=None, ge=0)
    max_lend_days: Optional[int]      = Field(default=None, ge=1)


class ListingDetail(BaseModel):
    listing_id:    str
    isbn:          str
    title:         str
    author:        str
    genre:         Optional[str]
    condition:     Optional[str]
    condition_rank: Optional[int]
    type:          str
    price:         Optional[Decimal]
    daily_rent_fee: Optional[Decimal]
    max_lend_days: Optional[int]
    seller_email:  Optional[str]
    seller_id:     Optional[str]
    created_at:    Optional[str]
    status:        Optional[str]


# ─── Transactions ─────────────────────────────────────────────────────────────

class PurchaseResponse(BaseModel):
    txn_id: str


class BorrowResponse(BaseModel):
    record_id: str


class ReturnResponse(BaseModel):
    late_fee_charged: Decimal


# ─── Reviews ─────────────────────────────────────────────────────────────────

class AddReviewRequest(BaseModel):
    listing_id: str
    rating:  int = Field(ge=1, le=5)
    comment: Optional[str] = None


class AddReviewResponse(BaseModel):
    review_id: str


# ─── Wishlist ─────────────────────────────────────────────────────────────────

class WishlistRequest(BaseModel):
    listing_id: str


class CartRequest(BaseModel):
    listing_id: str


# ─── Wallet ───────────────────────────────────────────────────────────────────

class TopupRequest(BaseModel):
    amount: Decimal = Field(gt=0)


class TopupResponse(BaseModel):
    new_balance: Decimal


# ─── Admin ────────────────────────────────────────────────────────────────────

class VerifyUserRequest(BaseModel):
    target_user_id: str


class RemoveListingRequest(BaseModel):
    listing_id: str

class RemoveUserRequest(BaseModel):
    target_user_id: str


class AdminEditListingRequest(BaseModel):
    isbn: str = Field(pattern=r"^\d{13}$")
    title: str
    author: str


# ─── Profile ──────────────────────────────────────────────────────────────────

class ProfileResponse(BaseModel):
    user_id: str
    email: EmailStr
    role: str
    is_verified: bool
    wallet_balance: Decimal
    created_at: str

class WishlistItem(BaseModel):
    listing_id: str
    isbn: str
    title: str
    author: str
    genre: str
    status: str
    price: Optional[Decimal] = None
    daily_rent_fee: Optional[Decimal] = None
    type: str
    added_at: str

class CartItem(BaseModel):
    listing_id: str
    isbn: str
    title: str
    author: str
    genre: str
    status: str
    price: Optional[Decimal] = None
    daily_rent_fee: Optional[Decimal] = None
    type: str
    added_at: str

class SaleTransactionItem(BaseModel):
    txn_id: str
    listing_id: str
    title: str
    amount: Decimal
    status: str
    created_at: str

class LendingRecordItem(BaseModel):
    record_id: str
    listing_id: str
    title: str
    borrowed_at: str
    due_at: str
    returned_at: Optional[str]
    late_fee_charged: Decimal
