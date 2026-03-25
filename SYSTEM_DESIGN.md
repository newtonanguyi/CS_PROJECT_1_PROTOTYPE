# Smart AI Advisory System - System Design Document

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Architecture](#component-architecture)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Technology Stack](#technology-stack)
6. [API Architecture](#api-architecture)
7. [Database Schema](#database-schema)
8. [Deployment Architecture](#deployment-architecture)
9. [Security Architecture](#security-architecture)
10. [Integration Points](#integration-points)
11. [Scalability Considerations](#scalability-considerations)

---

## Overview

The Smart AI Advisory System is a full-stack agricultural advisory platform that combines AI/ML capabilities with real-time data to provide comprehensive farming guidance to smallholder farmers.

### System Goals
- Provide accurate disease detection using computer vision
- Deliver real-time weather intelligence and forecasts
- Offer market price tracking and predictions
- Enable interactive AI-powered agricultural advisory
- Support seasonal planting and crop management guidance

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         React Frontend (Port 3000)                       │   │
│  │  - Dashboard, Chat, Disease Detection, Weather, Market  │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/REST API
                             │ JWT Authentication
┌────────────────────────────▼────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Django REST Framework                            │   │
│  │  - Request Routing, Authentication, Rate Limiting        │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    APPLICATION LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Disease    │  │   Weather    │  │   Market     │          │
│  │  Detection   │  │  Service     │  │  Service     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Advisory   │  │     RAG      │  │   User       │          │
│  │   Service    │  │   Service    │  │  Management  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      DATA & ML LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   SQLite     │  │   ChromaDB   │  │   ONNX        │        │
│  │  (User Data) │  │  (Vector DB)  │  │  (ML Models)  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  OpenWeatherMap API (Weather Data)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Components

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │   Services   │      │
│  │              │  │              │  │              │      │
│  │ - Dashboard  │  │ - Navbar     │  │ - API Client │      │
│  │ - Login      │  │ - Cards      │  │ - Auth       │      │
│  │ - Register   │  │ - Charts     │  │ - Context    │      │
│  │ - Chat       │  │ - Forms      │  │              │      │
│  │ - Disease    │  │ - Modals     │  │              │      │
│  │ - Weather    │  │              │  │              │      │
│  │ - Market     │  │              │  │              │      │
│  │ - Seasonal   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              State Management                         │   │
│  │  - React Context (Auth, User State)                  │   │
│  │  - Local Storage (Tokens, Preferences)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Backend Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Django Backend                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Core Django Apps                         │   │
│  │  - users/          (Authentication & User Management) │   │
│  │  - disease_detection/  (ML Model Inference)          │   │
│  │  - weather/        (Weather API Integration)          │   │
│  │  - market/         (Price Prediction)                │   │
│  │  - advisory/       (Comprehensive Advisory)           │   │
│  │  - rag/            (RAG Pipeline)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              ML/AI Services                           │   │
│  │  - ONNX Runtime (Disease Detection)                   │   │
│  │  - Sentence Transformers (Embeddings)                 │   │
│  │  - ChromaDB (Vector Search)                          │   │
│  │  - Linear Regression (Price Prediction)               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              External Integrations                    │   │
│  │  - OpenWeatherMap API                                │   │
│  │  - (Future: Market Data APIs)                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Disease Detection Flow

```
User Uploads Image
       │
       ▼
┌──────────────────┐
│  React Frontend  │
│  (Image Upload)  │
└────────┬─────────┘
         │ POST /api/disease/detect/
         │ (multipart/form-data)
         ▼
┌──────────────────┐
│  Django Backend  │
│  (Disease View)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Image Preprocess│
│  (Resize, Normal)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ONNX Runtime    │
│  (Inference)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Post-process    │
│  (Softmax, Top-3)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Load Treatment  │
│  (JSON Lookup)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Return Response │
│  (Disease + Advice)│
└────────┬─────────┘
         │
         ▼
    User Dashboard
```

### RAG Chat Advisory Flow

```
User Query
    │
    ▼
┌──────────────────┐
│  React Frontend  │
│  (Chat Interface)│
└────────┬─────────┘
         │ POST /api/advisory/chat/
         │ { "message": "..." }
         ▼
┌──────────────────┐
│  Advisory View   │
│  (Django)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  RAG Search      │
│  POST /api/rag/  │
│  search/         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Sentence        │
│  Transformer     │
│  (Embed Query)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ChromaDB        │
│  (Vector Search) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Retrieve Top-K  │
│  Documents       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate        │
│  Contextual      │
│  Response        │
└────────┬─────────┘
         │
         ▼
    User Chat UI
```

### Weather Intelligence Flow

```
User Requests Weather
       │
       ▼
┌──────────────────┐
│  React Frontend  │
│  (Weather Page)  │
└────────┬─────────┘
         │ GET /api/weather/<location>/
         ▼
┌──────────────────┐
│  Weather View    │
│  (Django)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  OpenWeatherMap  │
│  API Call        │
│  (Current +      │
│   Forecast)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Process Data    │
│  (Extract Temp,  │
│   Humidity, etc) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate        │
│  Agricultural    │
│  Advice          │
│  (Rule-based)    │
└────────┬─────────┘
         │
         ▼
    Weather Dashboard
```

### Market Price Prediction Flow

```
User Requests Price
       │
       ▼
┌──────────────────┐
│  React Frontend  │
│  (Market Page)   │
└────────┬─────────┘
         │ GET /api/market/predict/<crop>/
         ▼
┌──────────────────┐
│  Market View     │
│  (Django)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate        │
│  Price History   │
│  (Mock Data)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Linear          │
│  Regression      │
│  (Train Model)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Predict Next    │
│  7 Days          │
└────────┬─────────┘
         │
         ▼
    Market Dashboard
```

---

## Technology Stack

### Frontend Stack

```
┌─────────────────────────────────────────┐
│         React 18                        │
│  - Component-based UI                   │
│  - Hooks for state management           │
├─────────────────────────────────────────┤
│         React Router DOM                │
│  - Client-side routing                  │
│  - Protected routes                    │
├─────────────────────────────────────────┤
│         Tailwind CSS                    │
│  - Utility-first styling               │
│  - Responsive design                    │
├─────────────────────────────────────────┤
│         Axios                           │
│  - HTTP client                          │
│  - Request interceptors                 │
├─────────────────────────────────────────┤
│         Recharts                        │
│  - Data visualization                   │
│  - Price charts, trends                 │
├─────────────────────────────────────────┤
│         Lucide React                    │
│  - Icon library                         │
└─────────────────────────────────────────┘
```

### Backend Stack

```
┌─────────────────────────────────────────┐
│         Django 4.2                     │
│  - Web framework                       │
│  - ORM, Admin, Security                │
├─────────────────────────────────────────┤
│         Django REST Framework          │
│  - RESTful API                          │
│  - Serializers, Viewsets               │
├─────────────────────────────────────────┤
│         JWT (Simple JWT)               │
│  - Token-based authentication          │
│  - Access & Refresh tokens             │
├─────────────────────────────────────────┤
│         PyTorch                         │
│  - Model training                       │
│  - Transfer learning                   │
├─────────────────────────────────────────┤
│         ONNX Runtime                    │
│  - Model inference                      │
│  - Optimized deployment                │
├─────────────────────────────────────────┤
│         Sentence Transformers          │
│  - Text embeddings                     │
│  - Semantic search                     │
├─────────────────────────────────────────┤
│         ChromaDB                       │
│  - Vector database                      │
│  - Similarity search                    │
├─────────────────────────────────────────┤
│         scikit-learn                   │
│  - Linear regression                   │
│  - Price prediction                    │
├─────────────────────────────────────────┤
│         SQLite                         │
│  - User data storage                   │
│  - (Can be upgraded to PostgreSQL)     │
└─────────────────────────────────────────┘
```

---

## API Architecture

### API Structure

```
/api/
├── auth/
│   ├── POST   /register/          # User registration
│   ├── POST   /login/             # User login
│   └── GET    /profile/           # Get user profile
│
├── disease/
│   ├── POST   /detect/            # Disease detection
│   └── POST   /train/             # Train model (admin)
│
├── weather/
│   └── GET    /<location>/        # Get weather data
│
├── market/
│   ├── GET    /prices/            # Get all prices
│   ├── GET    /history/<crop>/    # Price history
│   └── GET    /predict/<crop>/     # Price prediction
│
├── advisory/
│   ├── POST   /comprehensive/     # Comprehensive advisory
│   ├── GET    /seasonal/          # Seasonal guide
│   └── POST   /chat/              # AI chat advisory
│
└── rag/
    ├── POST   /search/            # Search knowledge base
    ├── GET    /initialize/        # Initialize knowledge base
    └── POST   /ingest/            # Ingest documents
```

### Request/Response Examples

#### Authentication
```http
POST /api/auth/register/
Content-Type: application/json

{
  "username": "farmer123",
  "email": "farmer@example.com",
  "password": "securepass123",
  "phone": "+1234567890",
  "location": "Nairobi, Kenya"
}

Response: 201 Created
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "farmer123",
    "email": "farmer@example.com"
  }
}
```

#### Disease Detection
```http
POST /api/disease/detect/
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "image": <file>
}

Response: 200 OK
{
  "predicted_class": "Tomato___Early_blight",
  "confidence": 0.92,
  "top_3": [
    {"class": "Tomato___Early_blight", "confidence": 0.92},
    {"class": "Tomato___Late_blight", "confidence": 0.05},
    {"class": "Tomato___healthy", "confidence": 0.03}
  ],
  "treatment": {
    "general": "Early blight is caused by...",
    "prevention": "Use disease-resistant varieties...",
    "organic": "Apply copper-based fungicides..."
  }
}
```

#### Chat Advisory
```http
POST /api/advisory/chat/
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "How do I prevent tomato blight?"
}

Response: 200 OK
{
  "message": "How do I prevent tomato blight?",
  "response": "To prevent tomato blight, use disease-resistant varieties, ensure proper spacing for air circulation, practice crop rotation, remove infected plant material, and avoid overhead watering...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Database Schema

### User Model

```python
User
├── id (Primary Key, Auto)
├── username (Unique, Required)
├── email (Unique, Required)
├── password (Hashed)
├── phone (Optional)
├── location (Optional)
├── is_staff (Boolean)
├── is_active (Boolean)
├── created_at (DateTime)
└── updated_at (DateTime)
```

### Database Relationships

```
┌─────────────┐
│    User     │
│             │
│ - id        │
│ - username  │
│ - email     │
│ - password  │
│ - phone     │
│ - location  │
└─────────────┘
      │
      │ (Future: One-to-Many)
      │
      ▼
┌─────────────┐     ┌─────────────┐
│  Detection  │     │   Advisory  │
│   History   │     │   History   │
│             │     │             │
│ - user_id   │     │ - user_id   │
│ - image     │     │ - query     │
│ - disease   │     │ - response  │
│ - confidence│     │ - timestamp │
│ - timestamp │     └─────────────┘
└─────────────┘
```

### Vector Database (ChromaDB)

```
Collection: agricultural_advisory
├── id (Document ID)
├── embedding (384-dimensional vector)
├── document (Text content)
└── metadata
    └── source (Document source)
```

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────┐
│         Development Setup                │
├─────────────────────────────────────────┤
│                                         │
│  Frontend: npm start (Port 3000)        │
│  Backend:  python manage.py runserver  │
│            (Port 8000)                   │
│  Database: SQLite (File-based)         │
│  ChromaDB: In-memory                    │
│                                         │
└─────────────────────────────────────────┘
```

### Production Architecture (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
│                    (Nginx/HAProxy)                       │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌─────────▼────────┐
│  Frontend      │      │   Backend        │
│  (React Build) │      │   (Django)       │
│                │      │                  │
│  - Static      │      │  - Gunicorn      │
│    Files       │      │  - Multiple      │
│  - CDN         │      │    Workers       │
└────────────────┘      └─────────┬───────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌───────▼────┐  ┌──────▼────┐  ┌───────▼────┐
            │ PostgreSQL  │  │ ChromaDB  │  │  Redis     │
            │ (User Data) │  │ (Vectors) │  │ (Cache)    │
            └─────────────┘  └────────────┘  └────────────┘
                                    │
                            ┌───────▼───────┐
                            │  Object       │
                            │  Storage      │
                            │  (S3/MinIO)   │
                            │  - Models     │
                            │  - Images     │
                            └───────────────┘
```

### Container Architecture (Docker)

```yaml
Services:
  frontend:
    - React build served by Nginx
    - Port: 80
    
  backend:
    - Django + Gunicorn
    - Port: 8000
    - Workers: 4
    
  database:
    - PostgreSQL
    - Port: 5432
    
  chromadb:
    - ChromaDB server
    - Port: 8001
    
  redis:
    - Cache & sessions
    - Port: 6379
```

---

## Security Architecture

### Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. POST /api/auth/login/
       │    {username, password}
       ▼
┌─────────────┐
│   Backend   │
│  (Django)   │
└──────┬──────┘
       │ 2. Verify credentials
       ▼
┌─────────────┐
│   Database  │
│  (SQLite)   │
└──────┬──────┘
       │ 3. User found
       ▼
┌─────────────┐
│   Backend   │
│  (JWT)      │
└──────┬──────┘
       │ 4. Generate tokens
       │    {access, refresh}
       ▼
┌─────────────┐
│   Client    │
│  (Store)    │
└─────────────┘
```

### Security Measures

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│                                         │
│  1. HTTPS/TLS                          │
│     - Encrypt all communications        │
│                                         │
│  2. JWT Authentication                 │
│     - Token-based auth                 │
│     - Refresh token rotation           │
│                                         │
│  3. CORS Configuration                  │
│     - Whitelist allowed origins         │
│                                         │
│  4. Input Validation                   │
│     - Django serializers               │
│     - File type/size checks            │
│                                         │
│  5. Rate Limiting                      │
│     - Prevent abuse                    │
│     - (Future implementation)          │
│                                         │
│  6. SQL Injection Protection           │
│     - Django ORM                       │
│                                         │
│  7. XSS Protection                     │
│     - React auto-escaping              │
│                                         │
│  8. CSRF Protection                    │
│     - Django middleware                │
│                                         │
└─────────────────────────────────────────┘
```

---

## Integration Points

### External APIs

```
┌─────────────────────────────────────────┐
│         OpenWeatherMap API              │
├─────────────────────────────────────────┤
│  Endpoint: api.openweathermap.org       │
│  Method: GET                            │
│  Authentication: API Key                │
│  Rate Limit: 60 calls/min (free tier)  │
│  Data: Current weather + 5-day forecast│
└─────────────────────────────────────────┘
```

### Future Integrations

```
┌─────────────────────────────────────────┐
│         Potential Integrations          │
├─────────────────────────────────────────┤
│                                         │
│  1. Market Data APIs                   │
│     - Real-time crop prices             │
│     - Historical data                   │
│                                         │
│  2. SMS Gateway                         │
│     - Send alerts to farmers           │
│     - Twilio/AfricasTalking            │
│                                         │
│  3. Payment Gateway                    │
│     - Premium features                 │
│     - M-Pesa/Stripe                    │
│                                         │
│  4. Map Services                        │
│     - Location-based services          │
│     - Google Maps/Mapbox               │
│                                         │
│  5. Notification Services               │
│     - Push notifications               │
│     - Firebase Cloud Messaging         │
│                                         │
└─────────────────────────────────────────┘
```

---

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────────────────────────────────┐
│         Scaling Strategy                │
├─────────────────────────────────────────┤
│                                         │
│  Frontend:                              │
│  - Static files on CDN                 │
│  - Multiple instances behind LB         │
│                                         │
│  Backend:                               │
│  - Multiple Django workers              │
│  - Load balancer distribution           │
│  - Stateless design                     │
│                                         │
│  Database:                              │
│  - Read replicas                       │
│  - Connection pooling                   │
│                                         │
│  ML Models:                             │
│  - Model serving (TensorFlow Serving)   │
│  - GPU instances for inference          │
│                                         │
│  Vector DB:                             │
│  - ChromaDB clustering                  │
│  - Distributed embeddings              │
│                                         │
└─────────────────────────────────────────┘
```

### Performance Optimization

```
┌─────────────────────────────────────────┐
│         Optimization Techniques         │
├─────────────────────────────────────────┤
│                                         │
│  1. Caching                             │
│     - Redis for API responses           │
│     - Browser caching for static files  │
│                                         │
│  2. Database Optimization               │
│     - Indexes on frequently queried     │
│     - Query optimization                │
│                                         │
│  3. Image Optimization                 │
│     - Compression before upload         │
│     - CDN for model files              │
│                                         │
│  4. API Optimization                   │
│     - Response pagination               │
│     - Field selection                   │
│                                         │
│  5. ML Model Optimization              │
│     - ONNX format for faster inference │
│     - Batch processing                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## System Requirements

### Minimum Requirements

```
┌─────────────────────────────────────────┐
│         Development                     │
├─────────────────────────────────────────┤
│  CPU: 4 cores                           │
│  RAM: 8 GB                              │
│  Storage: 20 GB                         │
│  OS: Windows/Linux/macOS                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Production (Small Scale)        │
├─────────────────────────────────────────┤
│  CPU: 4-8 cores                         │
│  RAM: 16 GB                             │
│  Storage: 100 GB SSD                    │
│  Network: 100 Mbps                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Production (Large Scale)        │
├─────────────────────────────────────────┤
│  CPU: 16+ cores                         │
│  RAM: 32+ GB                            │
│  Storage: 500+ GB SSD                   │
│  Network: 1 Gbps                        │
│  GPU: Optional (for ML inference)       │
└─────────────────────────────────────────┘
```

---

## Monitoring & Logging

### Monitoring Stack

```
┌─────────────────────────────────────────┐
│         Monitoring Components           │
├─────────────────────────────────────────┤
│                                         │
│  1. Application Monitoring              │
│     - Django Debug Toolbar (dev)       │
│     - Sentry (production)               │
│                                         │
│  2. Performance Monitoring              │
│     - Response time tracking            │
│     - API endpoint metrics              │
│                                         │
│  3. ML Model Monitoring                 │
│     - Inference latency                 │
│     - Prediction accuracy              │
│                                         │
│  4. Infrastructure Monitoring           │
│     - Server resources                 │
│     - Database performance              │
│                                         │
│  5. Logging                             │
│     - Django logging framework          │
│     - Structured logging (JSON)         │
│                                         │
└─────────────────────────────────────────┘
```

---

## Disaster Recovery

### Backup Strategy

```
┌─────────────────────────────────────────┐
│         Backup Components               │
├─────────────────────────────────────────┤
│                                         │
│  1. Database Backups                    │
│     - Daily automated backups           │
│     - Retention: 30 days                │
│                                         │
│  2. Model Backups                       │
│     - Version control                  │
│     - Cloud storage                     │
│                                         │
│  3. Configuration Backups                │
│     - Environment variables             │
│     - Settings files                    │
│                                         │
│  4. Vector DB Backups                   │
│     - ChromaDB persistence              │
│     - Regular exports                   │
│                                         │
└─────────────────────────────────────────┘
```

---

*Last Updated: System Design Document v1.0*
*Document Version: 1.0*
*Date: 2024*


