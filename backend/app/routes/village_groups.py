"""
AgroShield - Digital Village Groups System
Hyper-local farming communities based on location, crops, and soil conditions

Core Features:
- Automatic farming zone grouping (GPS + crops + soil type)
- Structured "What's Working" feed with templates
- Verified Neighbor trust system (expert badges + peer upvoting)
- Digital Demo Plot & Community Polls
- Voice-first, photo-first sharing (accessibility)
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum
import json
from pathlib import Path


router = APIRouter()


# ============================================================================
# MODELS & SCHEMAS
# ============================================================================

class SoilType(str, Enum):
    """Visual soil classification for easy farmer selection."""
    RED_CLAY = "red_clay"
    BLACK_COTTON = "black_cotton"
    BROWN_LOAM = "brown_loam"
    SANDY = "sandy"
    VOLCANIC = "volcanic"


class PostType(str, Enum):
    """Structured post categories."""
    SUCCESS_STORY = "success_story"
    QUESTION = "question"
    PROBLEM = "problem"
    TIP = "tip"
    DEMO_PLOT = "demo_plot"


class FarmerProfile(BaseModel):
    """Farmer profile for group assignment."""
    farmer_id: str
    name: str
    phone: str
    location: Dict[str, float] = Field(..., description="GPS: {lat, lon}")
    region: str = Field(..., description="e.g., Bobasi, Nyamira")
    main_crops: List[str] = Field(..., description="e.g., ['maize', 'beans']")
    soil_type: SoilType
    farm_size_acres: Optional[float] = None
    language: str = Field(default="swahili", description="swahili, english, kikuyu")
    

class VillageGroup(BaseModel):
    """Auto-generated farming zone group."""
    group_id: str
    name: str = Field(..., description="e.g., 'Bobasi - Red Soil - Maize Farmers'")
    region: str
    soil_type: SoilType
    primary_crops: List[str]
    member_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    expert_ids: List[str] = Field(default=[], description="Extension officers in group")


class GroupPost(BaseModel):
    """Structured community post."""
    post_id: str
    group_id: str
    farmer_id: str
    farmer_name: str
    post_type: PostType
    title: str
    description: Optional[str] = None
    photo_urls: List[str] = Field(default=[])
    voice_note_url: Optional[str] = None
    language: str = "swahili"
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Trust metrics
    upvotes: int = 0
    expert_verified: bool = False
    verified_by: Optional[str] = None
    helpful_count: int = 0
    
    # Engagement
    reply_count: int = 0
    view_count: int = 0


class PostReply(BaseModel):
    """Reply to a community post."""
    reply_id: str
    post_id: str
    farmer_id: str
    farmer_name: str
    content: Optional[str] = None
    photo_urls: List[str] = Field(default=[])
    voice_note_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    upvotes: int = 0
    is_expert: bool = False


class CommunityPoll(BaseModel):
    """Simple poll for group decision-making."""
    poll_id: str
    group_id: str
    farmer_id: str
    question: str
    options: List[str]
    votes: Dict[str, int] = Field(default={})  # option -> vote count
    voter_ids: List[str] = Field(default=[])  # prevent duplicate voting
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime


# ============================================================================
# GROUP ASSIGNMENT LOGIC
# ============================================================================

def calculate_farming_zone(
    location: Dict[str, float],
    crops: List[str],
    soil_type: SoilType
) -> str:
    """
    Calculate farming zone based on GPS, crops, and soil.
    
    Grouping Rules:
    1. Farmers within 5km radius
    2. Growing at least 1 common crop
    3. Same soil type (strongest indicator of growing conditions)
    
    Args:
        location: GPS coordinates {lat, lon}
        crops: List of main crops
        soil_type: Visual soil classification
        
    Returns:
        str: Farming zone identifier (e.g., "bobasi_red_maize")
    """
    # Reverse geocode to get region (simplified - use real geocoding API)
    lat, lon = location['lat'], location['lon']
    region = reverse_geocode_region(lat, lon)
    
    # Primary crop (most common)
    primary_crop = crops[0] if crops else "mixed"
    
    # Generate zone ID
    zone_id = f"{region.lower()}_{soil_type.value}_{primary_crop.lower()}"
    
    return zone_id


def reverse_geocode_region(lat: float, lon: float) -> str:
    """
    Get region name from GPS coordinates.
    
    In production, use:
    - Google Maps Geocoding API
    - OpenStreetMap Nominatim
    - Kenya County boundaries database
    
    Args:
        lat: Latitude
        lon: Longitude
        
    Returns:
        str: Region name (e.g., "Bobasi", "Nyamira")
    """
    # Simplified region mapping for Kenya (example)
    # In production, use proper geocoding API
    
    kenya_regions = {
        "bobasi": {"lat_range": (-0.68, -0.58), "lon_range": (34.75, 34.85)},
        "nyamira": {"lat_range": (-0.58, -0.48), "lon_range": (34.85, 34.95)},
        "kisii": {"lat_range": (-0.78, -0.68), "lon_range": (34.75, 34.85)},
        # Add more regions
    }
    
    for region, bounds in kenya_regions.items():
        if (bounds["lat_range"][0] <= lat <= bounds["lat_range"][1] and
            bounds["lon_range"][0] <= lon <= bounds["lon_range"][1]):
            return region.capitalize()
    
    return "Kenya"  # Default if no match


def find_or_create_group(
    farming_zone: str,
    region: str,
    soil_type: SoilType,
    crops: List[str]
) -> VillageGroup:
    """
    Find existing group or create new one for farming zone.
    
    Args:
        farming_zone: Zone identifier
        region: Region name
        soil_type: Soil classification
        crops: List of crops
        
    Returns:
        VillageGroup: Assigned group
    """
    # In production, check database for existing group
    # For now, generate group structure
    
    # Generate friendly group name
    crop_str = " & ".join(crops[:2]) if len(crops) <= 2 else crops[0]
    soil_display = soil_type.value.replace("_", " ").title()
    
    group_name = f"{region} - {soil_display} - {crop_str.title()} Farmers"
    
    group = VillageGroup(
        group_id=farming_zone,
        name=group_name,
        region=region,
        soil_type=soil_type,
        primary_crops=crops
    )
    
    return group


# ============================================================================
# API ENDPOINTS - GROUP ASSIGNMENT
# ============================================================================

@router.post("/groups/register-farmer")
async def register_farmer_to_group(profile: FarmerProfile) -> Dict:
    """
    Register farmer and automatically assign to appropriate village group.
    
    This is the core onboarding flow that ensures farmers are grouped with
    others in the same farming conditions.
    
    **Onboarding Flow:**
    1. Capture GPS location (automatic)
    2. Select main crops (dropdown)
    3. Identify soil type (visual photo selection)
    4. Auto-assign to group
    
    **Example:**
    ```
    Farmer: John Doe
    Location: Bobasi (-0.65, 34.80)
    Crops: Maize, Beans
    Soil: Red Clay
    
    → Assigned to: "Bobasi - Red Clay - Maize Farmers"
    ```
    
    Args:
        profile: Farmer profile data
        
    Returns:
        dict: Group assignment details
    """
    # Calculate farming zone
    farming_zone = calculate_farming_zone(
        profile.location,
        profile.main_crops,
        profile.soil_type
    )
    
    # Find or create group
    group = find_or_create_group(
        farming_zone,
        profile.region,
        profile.soil_type,
        profile.main_crops
    )
    
    # Save to database (in production)
    # db.add(profile)
    # db.add_to_group(profile.farmer_id, group.group_id)
    
    return {
        "success": True,
        "farmer_id": profile.farmer_id,
        "assigned_group": {
            "group_id": group.group_id,
            "name": group.name,
            "region": group.region,
            "soil_type": group.soil_type.value,
            "primary_crops": group.primary_crops,
            "member_count": group.member_count
        },
        "message": f"Welcome to {group.name}! You're now connected with {group.member_count} farmers in your area."
    }


@router.get("/groups/{group_id}/members")
async def get_group_members(group_id: str) -> Dict:
    """
    Get all members of a village group.
    
    Args:
        group_id: Group identifier
        
    Returns:
        dict: Group details and member list
    """
    # In production, fetch from database
    return {
        "group_id": group_id,
        "members": [
            {
                "farmer_id": "farmer_001",
                "name": "John Doe",
                "crops": ["maize", "beans"],
                "farm_size": 2.5,
                "joined_date": "2025-10-01"
            }
        ],
        "total_members": 1
    }


# ============================================================================
# API ENDPOINTS - STRUCTURED POSTS
# ============================================================================

@router.post("/groups/{group_id}/posts")
async def create_post(
    group_id: str,
    farmer_id: str,
    post_type: PostType,
    title: str,
    description: Optional[str] = None,
    photo: Optional[UploadFile] = File(None),
    voice_note: Optional[UploadFile] = File(None),
    language: str = "swahili"
) -> Dict:
    """
    Create structured community post with templates.
    
    **Post Templates:**
    - **Success Story**: "I tried [this] and it worked!"
    - **Question**: "How do I fix [this problem]?"
    - **Problem**: "My crops look like [photo], what's wrong?"
    - **Tip**: "Here's what worked for me..."
    
    **Voice-First, Photo-First:**
    - Farmers tap button to record voice note (no typing needed)
    - Photos automatically uploaded
    - Voice notes auto-transcribed to text (optional)
    
    Args:
        group_id: Village group ID
        farmer_id: Posting farmer ID
        post_type: success_story, question, problem, tip
        title: Post title (e.g., "My maize yield doubled!")
        description: Optional text description
        photo: Optional photo upload
        voice_note: Optional voice recording
        language: swahili, english, kikuyu
        
    Returns:
        dict: Created post details
    """
    # Generate post ID
    import uuid
    post_id = f"post_{uuid.uuid4().hex[:8]}"
    
    # Upload media (in production, use cloud storage)
    photo_urls = []
    voice_note_url = None
    
    if photo:
        # Save photo to storage
        photo_path = f"uploads/photos/{post_id}_{photo.filename}"
        # Save logic here
        photo_urls.append(photo_path)
    
    if voice_note:
        # Save voice note to storage
        voice_path = f"uploads/voice/{post_id}_{voice_note.filename}"
        # Save logic here
        voice_note_url = voice_path
    
    # Create post
    post = GroupPost(
        post_id=post_id,
        group_id=group_id,
        farmer_id=farmer_id,
        farmer_name="John Doe",  # Fetch from database
        post_type=post_type,
        title=title,
        description=description,
        photo_urls=photo_urls,
        voice_note_url=voice_note_url,
        language=language
    )
    
    # Save to database
    # db.add(post)
    
    # Notify group members (push notifications)
    # notify_group(group_id, f"New {post_type.value} from {post.farmer_name}")
    
    return {
        "success": True,
        "post_id": post.post_id,
        "post": post.dict(),
        "message": f"Your {post_type.value} has been shared with your village group!"
    }


@router.get("/groups/{group_id}/feed")
async def get_group_feed(
    group_id: str,
    filter_type: Optional[PostType] = None,
    sort_by: str = "recent"  # recent, helpful, verified
) -> Dict:
    """
    Get structured feed for village group.
    
    **Feed Organization:**
    - **Recent**: Latest posts first
    - **Most Helpful**: Highest upvotes first
    - **Expert Verified**: Verified tips at top
    
    **Filtering:**
    - All posts (default)
    - Success stories only
    - Questions only
    - Problems only
    
    Args:
        group_id: Village group ID
        filter_type: Optional post type filter
        sort_by: recent, helpful, verified
        
    Returns:
        dict: Feed of posts
    """
    # In production, fetch from database with filters
    
    # Example posts
    sample_posts = [
        {
            "post_id": "post_001",
            "farmer_name": "Mary Wanjiku",
            "post_type": "success_story",
            "title": "My maize yield doubled with this fertilizer!",
            "description": "I used DAP fertilizer at planting time...",
            "photo_urls": ["uploads/photos/maize_field.jpg"],
            "upvotes": 24,
            "expert_verified": True,
            "verified_by": "Extension Officer John",
            "reply_count": 8,
            "created_at": "2025-10-20T10:30:00",
            "helpful_count": 24
        },
        {
            "post_id": "post_002",
            "farmer_name": "Peter Mwangi",
            "post_type": "question",
            "title": "Why are my bean leaves turning yellow?",
            "photo_urls": ["uploads/photos/yellow_leaves.jpg"],
            "voice_note_url": "uploads/voice/question_001.mp3",
            "upvotes": 5,
            "reply_count": 12,
            "created_at": "2025-10-22T14:15:00"
        }
    ]
    
    # Apply filters
    if filter_type:
        sample_posts = [p for p in sample_posts if p["post_type"] == filter_type.value]
    
    # Apply sorting
    if sort_by == "helpful":
        sample_posts.sort(key=lambda x: x.get("upvotes", 0), reverse=True)
    elif sort_by == "verified":
        sample_posts.sort(key=lambda x: x.get("expert_verified", False), reverse=True)
    
    return {
        "group_id": group_id,
        "total_posts": len(sample_posts),
        "posts": sample_posts,
        "filter": filter_type.value if filter_type else "all",
        "sort_by": sort_by
    }


# ============================================================================
# API ENDPOINTS - TRUST SYSTEM
# ============================================================================

@router.post("/posts/{post_id}/upvote")
async def upvote_post(post_id: str, farmer_id: str) -> Dict:
    """
    Upvote helpful post (peer validation).
    
    **Trust Building:**
    - Farmers upvote advice that worked for them
    - Most upvoted posts appear at top of feed
    - "Most Helpful Tips in Your Village" section
    
    Args:
        post_id: Post identifier
        farmer_id: Upvoting farmer ID
        
    Returns:
        dict: Updated upvote count
    """
    # Check if already upvoted
    # if db.has_upvoted(farmer_id, post_id):
    #     raise HTTPException(400, "Already upvoted")
    
    # Add upvote
    # db.add_upvote(post_id, farmer_id)
    new_upvote_count = 25  # Fetch from database
    
    return {
        "success": True,
        "post_id": post_id,
        "upvotes": new_upvote_count,
        "message": "Thank you for marking this as helpful!"
    }


@router.post("/posts/{post_id}/verify")
async def expert_verify_post(
    post_id: str,
    expert_id: str,
    expert_name: str
) -> Dict:
    """
    Expert verification of farmer advice (trust amplification).
    
    **Verified Neighbor System:**
    - Extension officers mark scientifically correct advice
    - "Expert Verified" badge shows on post
    - Builds trust in peer-to-peer recommendations
    
    **Who Can Verify:**
    - Government extension officers
    - NGO agricultural experts
    - Certified agronomists
    
    Args:
        post_id: Post to verify
        expert_id: Expert's user ID
        expert_name: Expert's name
        
    Returns:
        dict: Verification confirmation
    """
    # Check if user is expert
    # if not db.is_expert(expert_id):
    #     raise HTTPException(403, "Not authorized as expert")
    
    # Mark as verified
    # db.verify_post(post_id, expert_id)
    
    return {
        "success": True,
        "post_id": post_id,
        "expert_verified": True,
        "verified_by": expert_name,
        "message": f"This advice has been verified by {expert_name}"
    }


@router.post("/posts/{post_id}/correct")
async def expert_correct_misinformation(
    post_id: str,
    expert_id: str,
    correction: str
) -> Dict:
    """
    Expert correction of misinformation (gentle, educational).
    
    **Preventing Bad Advice:**
    - Experts can reply with corrections
    - Tone: "This is close, but here's the better approach..."
    - Original post stays visible (transparency)
    - Correction appears prominently
    
    Args:
        post_id: Post with misinformation
        expert_id: Correcting expert ID
        correction: Correction text
        
    Returns:
        dict: Correction added
    """
    # Add expert reply with correction flag
    # reply = db.add_expert_correction(post_id, expert_id, correction)
    
    return {
        "success": True,
        "post_id": post_id,
        "correction_added": True,
        "message": "Expert correction added to help farmers"
    }


# ============================================================================
# API ENDPOINTS - DIGITAL DEMO PLOT
# ============================================================================

@router.get("/groups/{group_id}/showcase")
async def get_weekly_showcase(group_id: str) -> Dict:
    """
    Weekly "Best Crop" showcase from local farmers.
    
    **Digital Demo Plot:**
    - Highlight 1 successful farmer each week
    - Show photos of their healthy crops
    - Other farmers can ask: "What did you do?"
    - Inspires and educates through real examples
    
    Args:
        group_id: Village group ID
        
    Returns:
        dict: This week's showcase
    """
    # In production, select based on:
    # - Highest upvotes on success stories
    # - Most photo engagement
    # - Rotation to feature different farmers
    
    showcase = {
        "week": "2025-10-20",
        "featured_farmer": {
            "name": "Mary Wanjiku",
            "crops": ["maize", "beans"],
            "success_story": "My maize yield doubled this season!",
            "photos": [
                "uploads/showcase/maize_before.jpg",
                "uploads/showcase/maize_after.jpg"
            ],
            "what_worked": [
                "Used DAP fertilizer at planting",
                "Weeded 3 times instead of 2",
                "Planted earlier (mid-March)"
            ],
            "upvotes": 45,
            "questions_answered": 12
        },
        "message": "Ask Mary your questions about maize growing!"
    }
    
    return showcase


@router.get("/groups/{group_id}/problem-gallery")
async def get_problem_solving_gallery(group_id: str, problem_type: str = "pest") -> Dict:
    """
    Gallery of problems + farmer solutions (visual proof).
    
    **Problem-Solving Gallery:**
    - Farmer posts photo of pest/disease
    - Other farmers reply with their solution photos
    - Creates visual knowledge base
    - "I saw that too. I did this [photo] and it worked."
    
    Args:
        group_id: Village group ID
        problem_type: pest, disease, nutrient, weather
        
    Returns:
        dict: Problem-solution photo gallery
    """
    # Example gallery
    gallery = {
        "problem_type": problem_type,
        "cases": [
            {
                "problem_post": {
                    "farmer": "John Doe",
                    "description": "Strange insects on my maize",
                    "photo": "uploads/problems/pest_001.jpg",
                    "date": "2025-10-15"
                },
                "solutions": [
                    {
                        "farmer": "Jane Mwangi",
                        "description": "I had the same. I used neem oil spray",
                        "photo": "uploads/solutions/neem_spray.jpg",
                        "result": "Worked in 3 days",
                        "upvotes": 8
                    },
                    {
                        "farmer": "Peter Kamau",
                        "description": "I mixed chili + soap + water",
                        "photo": "uploads/solutions/chili_mix.jpg",
                        "result": "Worked in 5 days",
                        "upvotes": 12
                    }
                ]
            }
        ]
    }
    
    return gallery


# ============================================================================
# API ENDPOINTS - COMMUNITY POLLS
# ============================================================================

@router.post("/groups/{group_id}/polls")
async def create_community_poll(
    group_id: str,
    farmer_id: str,
    question: str,
    options: List[str],
    duration_days: int = 7
) -> Dict:
    """
    Create simple poll for group decision-making.
    
    **Community Polls:**
    - "When is everyone planting?" (This Week / Next Week / Waiting)
    - "What seed variety are you using?" (Brand A / Brand B / Local)
    - Helps farmers make decisions together
    - See local consensus
    
    **Poll Ideas:**
    - Planting timing
    - Seed variety choices
    - Fertilizer preferences
    - Market prices
    - Weather observations
    
    Args:
        group_id: Village group ID
        farmer_id: Poll creator ID
        question: Poll question
        options: List of answer options (2-5)
        duration_days: How long poll stays active
        
    Returns:
        dict: Created poll
    """
    import uuid
    from datetime import timedelta
    
    poll_id = f"poll_{uuid.uuid4().hex[:8]}"
    
    poll = CommunityPoll(
        poll_id=poll_id,
        group_id=group_id,
        farmer_id=farmer_id,
        question=question,
        options=options,
        votes={opt: 0 for opt in options},
        expires_at=datetime.now() + timedelta(days=duration_days)
    )
    
    # Save to database
    # db.add(poll)
    
    return {
        "success": True,
        "poll_id": poll.poll_id,
        "poll": poll.dict(),
        "message": "Poll created! Your neighbors can now vote."
    }


@router.post("/polls/{poll_id}/vote")
async def vote_on_poll(poll_id: str, farmer_id: str, option: str) -> Dict:
    """
    Vote on community poll.
    
    Args:
        poll_id: Poll identifier
        farmer_id: Voting farmer ID
        option: Selected option
        
    Returns:
        dict: Updated poll results
    """
    # Check if already voted
    # if db.has_voted(farmer_id, poll_id):
    #     raise HTTPException(400, "Already voted on this poll")
    
    # Record vote
    # db.add_vote(poll_id, farmer_id, option)
    
    # Get updated results
    results = {
        "This Week": 15,
        "Next Week": 23,
        "Waiting for rain": 8
    }
    
    total_votes = sum(results.values())
    percentages = {opt: (count / total_votes * 100) for opt, count in results.items()}
    
    return {
        "success": True,
        "poll_id": poll_id,
        "your_vote": option,
        "results": results,
        "percentages": percentages,
        "total_votes": total_votes,
        "message": f"Your vote recorded! {total_votes} farmers have voted."
    }


@router.get("/polls/{poll_id}/results")
async def get_poll_results(poll_id: str) -> Dict:
    """
    Get real-time poll results.
    
    Args:
        poll_id: Poll identifier
        
    Returns:
        dict: Current poll results with percentages
    """
    # Example results
    results = {
        "poll_id": poll_id,
        "question": "When is everyone planting maize?",
        "options": {
            "This Week": {"votes": 15, "percentage": 32.6},
            "Next Week": {"votes": 23, "percentage": 50.0},
            "Waiting for rain": {"votes": 8, "percentage": 17.4}
        },
        "total_votes": 46,
        "expires_at": "2025-10-31T00:00:00",
        "top_choice": "Next Week"
    }
    
    return results


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def notify_group(group_id: str, message: str):
    """
    Send push notification to all group members.
    
    Args:
        group_id: Village group ID
        message: Notification message
    """
    # In production, use:
    # - Firebase Cloud Messaging (FCM)
    # - Apple Push Notification Service (APNS)
    # - SMS for farmers without smartphones
    pass


def translate_content(text: str, target_language: str) -> str:
    """
    Translate post content to farmer's language.
    
    Args:
        text: Text to translate
        target_language: swahili, english, kikuyu
        
    Returns:
        str: Translated text
    """
    # In production, use:
    # - Google Translate API
    # - Hugging Face translation models
    # - Local language models
    return text


# ============================================================================
# HEALTHCHECK
# ============================================================================

@router.get("/groups/health")
async def healthcheck() -> Dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "digital_village_groups",
        "version": "1.0.0"
    }
