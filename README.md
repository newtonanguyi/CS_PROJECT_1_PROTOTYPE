# Smart AI Advisory System for Smallholder Farmers

A comprehensive full-stack AI-powered agricultural advisory system with disease detection, weather intelligence, market prices, and AI chat advisory.

## 🌟 Features (Implemented Scope)

- **AI Disease Detection**: Upload plant images to detect diseases using a trained MobileNetV2 model
- **Weather Intelligence**: Real-time weather forecasts with agricultural advice
- **Market Prices**: Track crop prices with historical charts and price predictions
- **AI Chat Advisory**: Interactive chat with RAG-powered agricultural advice
- **Seasonal Guide**: Month-by-month planting and management recommendations
- **Beautiful Dashboard**: Modern, responsive UI with green/white theme

### Practical scope note (for evaluation)
This is an integrated decision-support prototype, but the **deepest implemented scope** is the **leaf-image disease detection pipeline for three crop families**: **Tomato, Potato, and Pepper Bell**. The API uses upload validation, crop-selection gating, and unknown/cautious handling to reduce misleading diagnoses on unsupported crops or low-quality photos.

Other modules (weather, market, RAG chat, seasonal guide) are implemented and integrated end-to-end, but their real-world accuracy depends on external data availability and knowledge coverage:
- **Weather**: uses OpenWeatherMap when configured; otherwise falls back to Open-Meteo, and finally to sample data only if providers are unavailable.
- **Market**: uses deterministic, configurable baseline data from `backend/market/data/price_config.json` plus a baseline linear-regression forecast (not a live market feed).

## 🏗️ Project Structure

```
Smart Ai Advisory System/
├── backend/                 # Django REST API
│   ├── advisory/           # Comprehensive advisory endpoints
│   ├── disease_detection/  # Disease detection models and APIs
│   ├── market/             # Market prices and predictions
│   ├── rag/                # RAG pipeline with ChromaDB
│   ├── users/              # User authentication
│   └── weather/            # Weather API integration
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── contexts/       # React contexts
├── dataset/                # PlantVillage dataset
│   └── plant_village/      # Training images
├── models/                 # Trained models and metadata
│   ├── disease_detector.onnx
│   ├── label_map.json
│   └── disease_treatments.json
└── requirements.txt        # Python dependencies
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Create and activate virtual environment:**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Run migrations:**
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

4. **Create superuser (optional):**
```bash
python manage.py createsuperuser
```

5. **Start the server:**
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm start
```

The app will open at `http://localhost:3000`

## 📦 Training the Disease Detection Model

1. **Ensure PlantVillage dataset is in `/dataset/plant_village/`**

2. **Train the model:**
```bash
cd backend
python manage.py shell
```

Then in the shell:
```python
from disease_detection.train import train_model
from django.conf import settings

train_model(
    str(settings.DATASET_DIR),
    str(settings.MODELS_DIR),
    epochs=10,
    batch_size=32
)
```

Or use the API endpoint (requires admin authentication):
```bash
POST /api/disease/train/
```

## 🔧 Configuration

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and set your values:

```env
OPENWEATHER_API_KEY=your_openweathermap_api_key_here   # Get a free key at openweathermap.org for real weather
SECRET_KEY=your-secret-key-here
DEBUG=True
```

- **Weather:** With a valid `OPENWEATHER_API_KEY`, the app uses live data from OpenWeatherMap. Without it, sample data is shown so the app still runs.
- **Market prices:** Realistic data is loaded from `backend/market/data/price_config.json` (based on FAO/regional Uganda–East Africa statistics). The same file can be updated with new reference prices.

### CORS Settings

CORS is configured for `http://localhost:3000`. Update `CORS_ALLOWED_ORIGINS` in `backend/backend/settings.py` for production.

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login
- `GET /api/auth/profile/` - Get user profile

### Disease Detection
- `POST /api/disease/detect/` - Detect disease from image
- `POST /api/disease/train/` - Train model (admin only)

### Weather
- `GET /api/weather/<location>/` - Get weather for location

### Market
- `GET /api/market/prices/` - Get all crop prices
- `GET /api/market/history/<crop>/` - Get price history
- `GET /api/market/predict/<crop>/` - Get price prediction

### Advisory
- `POST /api/advisory/comprehensive/` - Get comprehensive advisory
- `GET /api/advisory/seasonal/` - Get seasonal guide
- `POST /api/advisory/chat/` - AI chat advisory

### RAG
- `POST /api/rag/search/` - Search agricultural knowledge
- `GET /api/rag/initialize/` - Initialize default knowledge base
- `POST /api/rag/ingest/` - Ingest documents

## 🎨 Frontend Pages

- **Login** (`/login`) - User authentication
- **Register** (`/register`) - New user registration
- **Dashboard** (`/`) - Overview with weather, quick actions, and advisory summary
- **AI Chat** (`/chat`) - Interactive agricultural advisory chat
- **Weather** (`/weather`) - Weather forecasts and agricultural advice
- **Disease Detection** (`/disease`) - Upload images for disease detection
- **Market Prices** (`/market`) - Crop prices with charts and predictions
- **Seasonal Guide** (`/seasonal`) - Month-by-month planting guide

## 🧠 AI/ML Components

### Disease Detection Model
- **Architecture**: MobileNetV2
- **Input**: 224x224 RGB images
- **Output**: Disease classification with confidence scores
- **Format**: ONNX for efficient inference

### RAG Pipeline
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)
- **Vector DB**: ChromaDB
- **Knowledge Base**: Agricultural best practices, crop management, etc.

## 🛠️ Technologies Used

### Backend
- Django 4.2
- Django REST Framework
- PyTorch
- ONNX Runtime
- ChromaDB
- Sentence Transformers
- OpenWeatherMap API

### Frontend
- React 18
- React Router DOM
- Tailwind CSS
- Axios
- Recharts
- Lucide React Icons

## 📝 Notes

- The disease detection model needs to be trained before use
- Weather: set `OPENWEATHER_API_KEY` in `.env` for real data (free at openweathermap.org); otherwise sample data is shown
- Market prices use realistic FAO/regional data from `backend/market/data/price_config.json` (Uganda/East Africa reference). Update that file or plug in a live API for different sources
- RAG system initializes with default knowledge base on first use

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- PlantVillage dataset for disease detection training
- OpenWeatherMap for weather data
- All open-source libraries and frameworks used









