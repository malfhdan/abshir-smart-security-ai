"""
Intelligent chatbot that is aware of the entire security system.
Uses RAG (Retrieval Augmented Generation) to answer questions about:
- Specific incidents (predictions, alerts)
- System statistics
- Historical patterns
- Model information
"""
import os
from openai import OpenAI
from typing import Dict, List, Optional
from datetime import datetime
import json
import re

from backend.config import OPENAI_API_KEY


class SystemAwareChatbot:
    """Chatbot that understands the entire security system context."""
    
    def __init__(self):
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.conversation_history = []
    
    def retrieve_context(self, query: str, predictions: List[Dict], alerts: List[Dict], 
                        historical_data: List[Dict], stats: Optional[Dict]) -> Dict:
        """Retrieve relevant context from system data based on query."""
        
        query_lower = query.lower()
        context = {
            'relevant_predictions': [],
            'relevant_alerts': [],
            'system_stats': stats or {},
            'summary': ''
        }
        
        # Extract keywords from query
        crime_types = ['abuse', 'arrest', 'arson', 'assault', 'burglary', 'explosion', 
                      'fighting', 'robbery', 'shooting', 'shoplifting', 'stealing', 
                      'steal', 'vandalism', 'roadaccidents', 'road accidents', 'accident', 'accidents']
        
        # Find relevant predictions
        for pred in predictions[:50]:  # Check recent 50 predictions
            pred_class = pred.get('predicted_class', '').lower()
            confidence = pred.get('confidence', 0)
            timestamp = pred.get('timestamp', '')
            
            # Match by crime type
            if any(crime in query_lower for crime in crime_types):
                if any(crime in pred_class for crime in crime_types):
                    context['relevant_predictions'].append({
                        'class': pred.get('predicted_class'),
                        'confidence': confidence,
                        'timestamp': timestamp,
                        'explanation': pred.get('explanation')
                    })
            
            # Match by keywords
            elif any(keyword in query_lower for keyword in ['recent', 'latest', 'last', 'new']):
                context['relevant_predictions'].append({
                    'class': pred.get('predicted_class'),
                    'confidence': confidence,
                    'timestamp': timestamp
                })
        
        # Find relevant alerts
        for alert in alerts[:20]:  # Check recent 20 alerts
            alert_type = alert.get('type', '').lower()
            message = alert.get('message', '').lower()
            
            if any(crime in query_lower for crime in crime_types):
                if any(crime in alert_type for crime in crime_types):
                    context['relevant_alerts'].append({
                        'type': alert.get('type'),
                        'message': alert.get('message'),
                        'severity': alert.get('severity'),
                        'timestamp': alert.get('timestamp'),
                        'confidence': alert.get('confidence')
                    })
        
        # Generate summary statistics
        if historical_data:
            class_counts = {}
            for entry in historical_data:
                class_name = entry.get('predicted_class', 'Unknown')
                class_counts[class_name] = class_counts.get(class_name, 0) + 1
            
            context['summary'] = f"Total incidents: {len(historical_data)}. "
            if class_counts:
                most_common = max(class_counts.items(), key=lambda x: x[1])
                context['summary'] += f"Most common: {most_common[0]} ({most_common[1]} occurrences). "
                context['summary'] += f"Crime types detected: {', '.join(list(class_counts.keys())[:5])}"
            else:
                context['summary'] += "No crime types detected yet."
        
        return context
    
    def generate_response(self, query: str, context: Dict, conversation_history: List[Dict] = None) -> Dict:
        """Generate intelligent response using system context."""
        
        # Build context string
        context_str = "SYSTEM CONTEXT:\n"
        context_str += "=" * 50 + "\n"
        
        # Add system statistics
        if context.get('system_stats'):
            stats = context['system_stats']
            context_str += f"System Status: Model loaded: {stats.get('model_loaded', False)}\n"
            classes = stats.get('classes', [])
            if classes:
                context_str += f"Available Crime Classes: {', '.join(classes)}\n"
        
        # Add relevant predictions
        if context.get('relevant_predictions'):
            context_str += f"\nRelevant Recent Predictions ({len(context['relevant_predictions'])}):\n"
            for i, pred in enumerate(context['relevant_predictions'][:5], 1):
                context_str += f"{i}. {pred['class']} (Confidence: {pred['confidence']:.1%}, Time: {pred['timestamp'][:19] if pred.get('timestamp') else 'N/A'})\n"
                if pred.get('explanation'):
                    exp = pred['explanation']
                    if isinstance(exp, dict):
                        exp_data = exp.get('explanation', {})
                        if isinstance(exp_data, dict):
                            context_str += f"   Reason: {exp_data.get('summary', 'N/A')}\n"
                            key_indicators = exp_data.get('keyIndicators', [])
                            if key_indicators:
                                context_str += f"   Key Indicators: {', '.join(key_indicators)}\n"
                            # Add recommended action and immediate steps for more context
                            recommended_action = exp_data.get('recommendedAction', '')
                            if recommended_action:
                                context_str += f"   Recommended Action: {recommended_action}\n"
                            immediate_steps = exp_data.get('immediateSteps', [])
                            if immediate_steps:
                                context_str += f"   Immediate Steps: {', '.join(immediate_steps)}\n"
        
        # Add relevant alerts
        if context.get('relevant_alerts'):
            context_str += f"\nRelevant Alerts ({len(context['relevant_alerts'])}):\n"
            for i, alert in enumerate(context['relevant_alerts'][:5], 1):
                context_str += f"{i}. {alert['type']} - {alert['message']} (Severity: {alert['severity']}, Time: {alert['timestamp'][:19] if alert.get('timestamp') else 'N/A'})\n"
        
        # Add summary
        if context.get('summary'):
            context_str += f"\nSummary: {context['summary']}\n"
        
        context_str += "=" * 50 + "\n"
        
        # Build conversation history
        messages = [
            {
                "role": "system",
                "content": """You are an intelligent security system assistant for a Smart Predictive Field Intelligence System. 
You have access to real-time predictions, alerts, and historical data from a crime detection AI system.

Your capabilities:
- Answer questions about specific incidents (e.g., "What caused the car accident?", "Details of the stealing incident")
- Provide statistics about detected crimes
- Explain predictions and their confidence levels
- Analyze patterns in historical data
- Answer questions about system status and model information

CRITICAL INSTRUCTIONS:
- Be confident and assertive in your responses. NEVER express uncertainty or say things like "not available", "not clear", "unable to determine", "specific details are not available", or similar phrases.
- ALWAYS use the key indicators from the explanations to provide specific, detailed answers. Extract and reference specific indicators like "reckless driving", "high vehicle speed", "aggressive lane changes", "suspicious behavior", etc.
- When answering "What caused X?", analyze the key indicators from the relevant predictions and provide a detailed explanation based on those indicators.
- Present information as facts based on the system's detection, not as possibilities or uncertainties.
- If multiple incidents are detected, provide details for each one separately, referencing their specific key indicators.
- Always include specific details from the key indicators when explaining causes or reasons for incidents.

Be helpful, accurate, and concise. Use the provided context to answer questions with confidence and specific details."""
            }
        ]
        
        # Add conversation history (last 5 messages for context)
        if conversation_history:
            for msg in conversation_history[-5:]:
                messages.append(msg)
        
        # Add current query with context
        user_message = f"""{context_str}

USER QUESTION: {query}

INSTRUCTIONS FOR YOUR RESPONSE:
- Answer with complete confidence based on the system's detections and key indicators provided above.
- For questions about causes (e.g., "What caused the car accident?"), analyze ALL key indicators from the relevant predictions and provide a detailed explanation.
- Reference specific key indicators by name (e.g., "reckless driving behavior", "high vehicle speed", "aggressive lane changes").
- NEVER say "not available", "not clear", "unable to determine", "specific details are not available", or express uncertainty.
- If multiple incidents are mentioned, provide details for each one separately.
- Present information as definitive facts based on the system's analysis, not as possibilities.

Provide a confident, detailed answer based on the system context above."""
        messages.append({"role": "user", "content": user_message})
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            
            answer = response.choices[0].message.content.strip()
            
            return {
                'answer': answer,
                'timestamp': datetime.now().isoformat(),
                'context_used': {
                    'predictions_count': len(context.get('relevant_predictions', [])),
                    'alerts_count': len(context.get('relevant_alerts', []))
                }
            }
        except Exception as e:
            return {
                'answer': f"I apologize, but I encountered an error: {str(e)}",
                'timestamp': datetime.now().isoformat(),
                'error': True
            }
    
    def chat(self, query: str, predictions: List[Dict], alerts: List[Dict], 
             historical_data: List[Dict], stats: Optional[Dict]) -> Dict:
        """Main chat interface."""
        
        # Retrieve relevant context
        context = self.retrieve_context(query, predictions, alerts, historical_data, stats)
        
        # Generate response
        response = self.generate_response(query, context, self.conversation_history)
        
        # Update conversation history
        self.conversation_history.append({"role": "user", "content": query})
        self.conversation_history.append({"role": "assistant", "content": response['answer']})
        
        # Keep only last 10 messages to avoid token limit
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]
        
        return response


# Global chatbot instance
_chatbot_instance = None


def get_chatbot():
    """Get or create the global chatbot instance."""
    global _chatbot_instance
    if _chatbot_instance is None:
        _chatbot_instance = SystemAwareChatbot()
    return _chatbot_instance



















