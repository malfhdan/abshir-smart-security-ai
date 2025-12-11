"""
FastAPI main application for Smart Predictive Field Intelligence System.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
import cv2
from datetime import datetime

from backend.model_utils import get_model
from backend.ai_agent import get_ai_agent
from backend.chatbot import get_chatbot

app = FastAPI(
    title="Smart Predictive Field Intelligence System",
    description="AI-driven security platform with predictive analytics and agentic AI",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model and AI agent
model = None
ai_agent = None
chatbot = None

@app.on_event("startup")
async def startup_event():
    """Initialize model and AI agent on startup."""
    global model, ai_agent, chatbot
    try:
        model = get_model()
        ai_agent = get_ai_agent()
        chatbot = get_chatbot()
        print("✓ Model, AI agent, and Chatbot initialized successfully")
    except Exception as e:
        print(f"⚠ Warning: Could not initialize model: {e}")
        print("⚠ Please run train_model.py first to train the model")


# Pydantic models
class PredictionResponse(BaseModel):
    predictions: List[Dict]
    top_prediction: Dict
    confidence: float
    predicted_class: str
    explanation: Optional[Dict] = None
    timestamp: str


class AlertRequest(BaseModel):
    alerts: List[Dict]
    context: Dict


class HistoricalAnalysisRequest(BaseModel):
    data: List[Dict]
    time_range: Optional[str] = None


class AnomalyDetectionRequest(BaseModel):
    predictions: List[Dict]
    threshold: Optional[float] = 0.7


class ChatRequest(BaseModel):
    query: str
    predictions: Optional[List[Dict]] = []
    alerts: Optional[List[Dict]] = []
    historical_data: Optional[List[Dict]] = []


class FrameRequest(BaseModel):
    frame_data: str  # Base64 encoded image
    include_explanation: bool = True
    timestamp: Optional[float] = None  # Video timestamp in seconds


# API Endpoints

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Smart Predictive Field Intelligence System API",
        "status": "operational",
            "endpoints": {
            "health": "/health",
            "predict": "/api/predict",
            "predict_frame": "/api/predict/frame",
            "predict_batch": "/api/predict/batch",
            "explain": "/api/explain",
            "recommendations": "/api/recommendations",
            "analyze_patterns": "/api/analyze/patterns",
            "anomaly_detection": "/api/anomaly/detect",
            "chat": "/api/chat"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    model_status = "loaded" if model and model.loaded else "not_loaded"
    return {
        "status": "healthy",
        "model": model_status,
        "ai_agent": "ready" if ai_agent else "not_ready",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/predict", response_model=PredictionResponse)
async def predict_crime(file: UploadFile = File(...), include_explanation: bool = True):
    """
    Predict crime type from uploaded image.
    """
    if not model or not model.loaded:
        raise HTTPException(status_code=503, detail="Model not loaded. Please train the model first.")
    
    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Predict
        result = model.predict(img_rgb)
        
        confidence = result['top_prediction']['confidence']
        predicted_class = result['top_prediction']['class']
        
        # Classify prediction based on confidence
        # >= 90%: confirmed (مؤكد)
        # 70-90%: potential (محتمل)
        # < 70%: ignored (متجاهل)
        if confidence >= 0.9:
            prediction_status = "confirmed"
            should_count = True
        elif confidence >= 0.7:
            prediction_status = "potential"
            should_count = False
        else:
            prediction_status = "ignored"
            should_count = False
        
        # Generate explanation if requested
        explanation = None
        if include_explanation and ai_agent:
            context = {
                "image_size": img.shape,
                "timestamp": datetime.now().isoformat(),
                "confidence": confidence,
                "prediction_status": prediction_status
            }
            explanation = ai_agent.generate_explanation(result, context)
        
        # Add status and should_count to result
        result['top_prediction']['status'] = prediction_status
        result['top_prediction']['should_count'] = should_count
        
        return PredictionResponse(
            predictions=result['predictions'],
            top_prediction=result['top_prediction'],
            confidence=confidence,
            predicted_class=predicted_class,
            explanation=explanation,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/api/predict/frame", response_model=PredictionResponse)
async def predict_frame(request: FrameRequest):
    """
    Predict crime type from a video frame (base64 encoded image).
    Used for real-time video processing.
    """
    if not model or not model.loaded:
        raise HTTPException(status_code=503, detail="Model not loaded. Please train the model first.")
    
    try:
        import base64
        
        # Decode base64 image
        image_data = base64.b64decode(request.frame_data.split(',')[-1])
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid frame data")
        
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Predict
        result = model.predict(img_rgb)
        
        confidence = result['top_prediction']['confidence']
        predicted_class = result['top_prediction']['class']
        
        # Classify prediction based on confidence
        # >= 90%: confirmed (مؤكد)
        # 70-90%: potential (محتمل)
        # < 70%: ignored (متجاهل)
        if confidence >= 0.9:
            prediction_status = "confirmed"
            should_count = True
        elif confidence >= 0.7:
            prediction_status = "potential"
            should_count = False
        else:
            prediction_status = "ignored"
            should_count = False
        
        # Generate explanation if requested
        explanation = None
        if request.include_explanation and ai_agent:
            context = {
                "image_size": img.shape,
                "timestamp": datetime.now().isoformat(),
                "video_timestamp": request.timestamp,
                "confidence": confidence,
                "prediction_status": prediction_status
            }
            explanation = ai_agent.generate_explanation(result, context)
        
        # Add status and should_count to result
        result['top_prediction']['status'] = prediction_status
        result['top_prediction']['should_count'] = should_count
        
        return PredictionResponse(
            predictions=result['predictions'],
            top_prediction=result['top_prediction'],
            confidence=confidence,
            predicted_class=predicted_class,
            explanation=explanation,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Frame prediction error: {str(e)}")


@app.post("/api/predict/batch")
async def predict_batch(files: List[UploadFile] = File(...)):
    """
    Predict crime types for multiple images.
    """
    if not model or not model.loaded:
        raise HTTPException(status_code=503, detail="Model not loaded. Please train the model first.")
    
    results = []
    
    for file in files:
        try:
            contents = await file.read()
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                continue
            
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            result = model.predict(img_rgb)
            
            results.append({
                "filename": file.filename,
                "prediction": result['top_prediction'],
                "all_predictions": result['all_classes'],
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    return {"results": results, "total": len(results)}


@app.post("/api/explain")
async def explain_prediction(prediction_result: Dict):
    """
    Generate explainable AI explanation for a prediction.
    """
    if not ai_agent:
        raise HTTPException(status_code=503, detail="AI agent not available")
    
    try:
        explanation = ai_agent.generate_explanation(prediction_result)
        return explanation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation error: {str(e)}")


@app.post("/api/recommendations")
async def get_recommendations(request: AlertRequest):
    """
    Get intelligent recommendations based on multiple alerts.
    """
    if not ai_agent:
        raise HTTPException(status_code=503, detail="AI agent not available")
    
    try:
        recommendations = ai_agent.generate_recommendation(
            request.alerts,
            request.context
        )
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")


@app.post("/api/analyze/patterns")
async def analyze_patterns(request: HistoricalAnalysisRequest):
    """
    Analyze patterns in historical data for predictive insights.
    """
    if not ai_agent:
        raise HTTPException(status_code=503, detail="AI agent not available")
    
    try:
        analysis = ai_agent.analyze_pattern(request.data)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pattern analysis error: {str(e)}")


@app.post("/api/anomaly/detect")
async def detect_anomaly(request: AnomalyDetectionRequest):
    """
    Detect anomalies in predictions based on confidence thresholds and patterns.
    """
    predictions = request.predictions
    threshold = request.threshold
    
    if not predictions:
        return {"anomalies": [], "risk_level": "Low"}
    
    anomalies = []
    high_risk_classes = ['Shooting', 'Explosion', 'Assault', 'Fighting']
    
    for pred in predictions:
        class_name = pred.get('predicted_class', '')
        confidence = pred.get('confidence', 0.0)
        
        # Check for high-risk predictions
        if class_name in high_risk_classes and confidence > threshold:
            anomalies.append({
                "type": "high_risk_detection",
                "class": class_name,
                "confidence": confidence,
                "severity": "High",
                "timestamp": pred.get('timestamp', datetime.now().isoformat())
            })
        # Check for unexpected high confidence in non-normal classes
        elif class_name != 'NormalVideos' and confidence > 0.9:
            anomalies.append({
                "type": "unusual_activity",
                "class": class_name,
                "confidence": confidence,
                "severity": "Medium",
                "timestamp": pred.get('timestamp', datetime.now().isoformat())
            })
    
    # Determine overall risk level
    if any(a['severity'] == 'High' for a in anomalies):
        risk_level = "Critical"
    elif len(anomalies) >= 3:
        risk_level = "High"
    elif len(anomalies) >= 1:
        risk_level = "Medium"
    else:
        risk_level = "Low"
    
    return {
        "anomalies": anomalies,
        "risk_level": risk_level,
        "total_anomalies": len(anomalies),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/stats")
async def get_statistics():
    """
    Get system statistics and model information.
    """
    if not model or not model.loaded:
        return {
            "model_loaded": False,
            "classes": [],
            "message": "Model not loaded"
        }
    
    return {
        "model_loaded": True,
        "classes": model.label_encoder.classes_.tolist() if model.label_encoder else [],
        "model_path": str(model.model_path) if hasattr(model, 'model_path') else "N/A",
        "ai_agent_ready": ai_agent is not None,
        "chatbot_ready": chatbot is not None,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/chat")
async def chat_with_system(request: ChatRequest):
    """
    Chat with the system-aware AI assistant.
    Can answer questions about incidents, predictions, alerts, and system status.
    Examples:
    - "What is the reason of the car accident?"
    - "What are the details of the stealing incident?"
    - "Show me recent alerts"
    - "What is the system status?"
    """
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not available")
    
    try:
        # Get current stats
        stats = None
        if model and model.loaded:
            stats = {
                "model_loaded": True,
                "classes": model.label_encoder.classes_.tolist() if model.label_encoder else []
            }
        
        # Generate response
        response = chatbot.chat(
            query=request.query,
            predictions=request.predictions or [],
            alerts=request.alerts or [],
            historical_data=request.historical_data or [],
            stats=stats
        )
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

