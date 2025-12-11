import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, Aperture, Video, Play, Pause, AlertTriangle } from 'lucide-react';

function RealTimeMonitoring({ onPrediction }) {
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processingIntervalRef = useRef(null);
  const lastProcessedTimeRef = useRef(0);
  const videoFileRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Load saved prediction on mount only if session is active (user has uploaded video before)
  useEffect(() => {
    // Check if this is an active session (user has uploaded video/processed frames)
    const sessionActive = sessionStorage.getItem('securityAppSessionActive');
    const hasVideoProcessed = sessionStorage.getItem('realtimeMonitoringVideoProcessed');
    
    // Only load saved prediction if session is active (page refresh after video was processed)
    if (sessionActive && hasVideoProcessed) {
      const savedPrediction = localStorage.getItem('realtimeMonitoringPrediction');
      
      if (savedPrediction) {
        try {
          const prediction = JSON.parse(savedPrediction);
          setCurrentPrediction(prediction);
        } catch (e) {
          console.error('Error loading saved prediction:', e);
        }
      }
    } else {
      // First time - clear any saved prediction
      setCurrentPrediction(null);
      localStorage.removeItem('realtimeMonitoringPrediction');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Initialize video when URL changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // Reset video state
    setVideoReady(false);
    setVideoError(null);
    setVideoDuration(0);
    setCurrentTime(0);

    // Set video source and load
    video.src = videoUrl;
    video.load();
  }, [videoUrl]);

  // Handle video time updates and loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded. Duration:', video.duration, 'Ready state:', video.readyState);
      setVideoDuration(video.duration);
      setVideoReady(true);
      setVideoError(null);
    };

    const handleCanPlay = () => {
      console.log('Video can play. Ready state:', video.readyState);
      setVideoReady(true);
      setVideoError(null);
    };

    const handleLoadedData = () => {
      console.log('Video data loaded. Ready state:', video.readyState);
      if (video.readyState >= 2) {
        setVideoReady(true);
        setVideoError(null);
      }
    };

    const handleError = (e) => {
      const video = e.target;
      let errorMessage = 'Failed to load video. ';
      let suggestions = '';
      
      if (video.error) {
        switch (video.error.code) {
          case video.error.MEDIA_ERR_ABORTED:
            errorMessage += 'Video loading was aborted.';
            break;
          case video.error.MEDIA_ERR_NETWORK:
            errorMessage += 'Network error occurred.';
            break;
          case video.error.MEDIA_ERR_DECODE:
            errorMessage += 'Video codec not supported or file is corrupted.';
            suggestions = 'The video may use an unsupported codec. Try converting to MP4 with H.264 video codec and AAC audio codec using a tool like HandBrake or VLC.';
            break;
          case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage += 'Video format or codec not supported by your browser.';
            suggestions = 'Try converting the video to a standard format:\n- MP4 with H.264 codec (recommended)\n- WebM with VP8/VP9 codec\n- MOV with H.264 codec\n\nYou can use free tools like HandBrake, VLC, or online converters.';
            break;
          default:
            errorMessage += 'Unknown error occurred.';
            suggestions = 'Try a different video file or convert to MP4 format.';
        }
        console.error('Video error code:', video.error.code, 'Message:', video.error.message, 'Network state:', video.networkState, 'Ready state:', video.readyState);
      } else {
        console.error('Video error event:', e, 'Network state:', video.networkState, 'Ready state:', video.readyState);
        suggestions = 'The video file may be corrupted or use an unsupported codec. Try converting to MP4 with H.264 codec.';
      }
      
      const fullMessage = suggestions ? `${errorMessage}\n\n${suggestions}` : errorMessage;
      setVideoError(fullMessage);
      setVideoReady(false);
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      console.log('Video load started');
      setVideoReady(false);
      setVideoError(null);
    };

    const handleStalled = () => {
      console.warn('Video loading stalled');
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('stalled', handleStalled);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('stalled', handleStalled);
    };
  }, [videoUrl]);

  // Process frames while video is playing
  useEffect(() => {
    if (isPlaying && videoRef.current && canvasRef.current) {
      // Process frames every 200ms for near real-time updates
      processingIntervalRef.current = setInterval(() => {
        // Only process if not already processing (prevent overlapping)
        if (!isProcessingRef.current) {
          processCurrentFrame();
        }
      }, 200);
    } else {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
      // Cancel any pending requests when video stops
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }

    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isPlaying, videoUrl]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate video file - check both MIME type and file extension
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
    const validExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    // Accept if MIME type is video/* OR if extension is valid (some browsers don't set MIME type correctly)
    if (!file.type.startsWith('video/') && !hasValidExtension) {
      alert('Please upload a video file (MP4, WebM, MOV, AVI, or MKV).');
      return;
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert('Video file is too large. Maximum size is 100MB.');
      return;
    }

    // Revoke previous URL if exists
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    // Store file reference
    videoFileRef.current = file;

    try {
      // Create object URL for video
      const url = URL.createObjectURL(file);
      console.log('Created video URL:', url, 'File type:', file.type, 'File name:', file.name, 'File size:', file.size);
      
      setVideoUrl(url);
      setVideoReady(false);
      setVideoError(null);
      
      // Clear previous prediction
      setCurrentPrediction(null);
      setIsPlaying(false);
      lastProcessedTimeRef.current = 0;
      
    } catch (error) {
      console.error('Error creating video URL:', error);
      setVideoError('Failed to process video file. Please try a different file.');
    }
  };

  const processCurrentFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState < 2) return;

    // Skip if we just processed this frame (reduced threshold for faster processing)
    const currentTime = video.currentTime;
    if (Math.abs(currentTime - lastProcessedTimeRef.current) < 0.15) {
      return;
    }
    lastProcessedTimeRef.current = currentTime;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    isProcessingRef.current = true;

    try {
      const ctx = canvas.getContext('2d');
      
      // Use model input size (224x224) - much faster than full resolution
      // Backend will resize anyway, so we do it here to reduce transfer size
      const targetSize = 224;
      canvas.width = targetSize;
      canvas.height = targetSize;
      
      // Draw video frame scaled down to target size (faster processing)
      ctx.drawImage(video, 0, 0, targetSize, targetSize);

      // Convert canvas to base64 with lower quality for faster encoding/transfer
      const frameData = canvas.toDataURL('image/jpeg', 0.5);

      // Send frame to backend WITHOUT explanation first (fast response ~50-150ms)
      setIsProcessing(true);
      const response = await fetch('http://localhost:8000/api/predict/frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal, // Allow cancellation
        body: JSON.stringify({
          frame_data: frameData,
          include_explanation: false, // Get prediction first, explanation later
          timestamp: currentTime
        }),
      });

      if (!response.ok) throw new Error('Prediction failed');

      const result = await response.json();
      
      // Determine prediction status based on confidence
      const confidence = result.confidence || 0;
      let predictionStatus = 'ignored';
      let shouldCount = false;
      
      if (confidence >= 0.9) {
        predictionStatus = 'confirmed';
        shouldCount = true;
      } else if (confidence >= 0.7) {
        predictionStatus = 'potential';
        shouldCount = false;
      } else {
        predictionStatus = 'ignored';
        shouldCount = false;
      }
      
      // Add status to result
      const resultWithStatus = {
        ...result,
        status: predictionStatus,
        should_count: shouldCount
      };
      
      // If confidence < 70%, ignore and do not show to user
      if (predictionStatus === 'ignored') {
        setCurrentPrediction(null);
        localStorage.removeItem('realtimeMonitoringPrediction');
        return;
      }
      
      // Mark that video has been processed (for session tracking)
      sessionStorage.setItem('realtimeMonitoringVideoProcessed', 'true');
      
      // Update prediction immediately (fast - no waiting for explanation)
      setCurrentPrediction(resultWithStatus);
      
      // Save prediction to localStorage
      localStorage.setItem('realtimeMonitoringPrediction', JSON.stringify(resultWithStatus));
      
      // Only call onPrediction if not ignored (it will handle filtering internally)
      onPrediction({
        predicted_class: result.predicted_class,
        confidence: result.confidence,
        explanation: result.explanation,
        timestamp: result.timestamp,
        predictions: result.predictions, // Include full predictions array
        top_prediction: result.top_prediction, // Include top prediction details
        status: predictionStatus,
        should_count: shouldCount
      });

      // Get explanation asynchronously in background (non-blocking)
      // Only fetch explanation for non-normal predictions to save API calls
      if (result.predicted_class !== 'NormalVideos' && result.confidence > 0.5) {
        // Build prediction result format for explanation endpoint
        const predictionForExplanation = {
          top_prediction: result.top_prediction,
          all_classes: result.predictions.reduce((acc, p) => {
            acc[p.class] = p.confidence;
            return acc;
          }, {})
        };

        // Fetch explanation asynchronously (doesn't block video processing)
        fetch('http://localhost:8000/api/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(predictionForExplanation),
        })
        .then(res => {
          if (!res.ok) throw new Error('Explanation failed');
          return res.json();
        })
        .then(explanation => {
          // Update prediction with explanation when ready
          setCurrentPrediction(prev => {
            if (prev && prev.timestamp === result.timestamp) {
              const updated = {
                ...prev,
                explanation: explanation
              };
              // Update localStorage with explanation
              localStorage.setItem('realtimeMonitoringPrediction', JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        })
        .catch(err => {
          // Ignore explanation errors (non-critical)
          if (err.name !== 'AbortError') {
            console.error('Error fetching explanation:', err);
          }
        });
      }
    } catch (error) {
      // Ignore abort errors (expected when canceling)
      if (error.name !== 'AbortError') {
        console.error('Error processing frame:', error);
      }
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // Check if video is ready
    if (!videoReady || video.readyState < 2) {
      setVideoError('Video is still loading. Please wait...');
      return;
    }

    try {
      if (video.paused) {
        await video.play();
        setIsPlaying(true);
        setVideoError(null);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error playing video:', error);
      setVideoError('Failed to play video. Please try again.');
      setIsPlaying(false);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
  };

  // Clear saved data function
  const clearSavedData = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setVideoReady(false);
    setVideoError(null);
    setCurrentPrediction(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setVideoDuration(0);
    videoFileRef.current = null;
    localStorage.removeItem('realtimeMonitoringPrediction');
    sessionStorage.removeItem('realtimeMonitoringVideoProcessed');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = '';
    }
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Real-Time Video Analysis</h1>
          <p className="text-slate-400">Upload and analyze videos for real-time threat detection</p>
        </div>
        {videoUrl && (
          <button
            onClick={clearSavedData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-sm font-medium transition-colors"
          >
            Clear Video
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Video Player Area - Fixed Size */}
          <div className="bg-black rounded-2xl overflow-hidden relative shadow-2xl w-full h-[600px] flex items-center justify-center">
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onEnded={handleVideoEnd}
                  playsInline
                  preload="auto"
                  crossOrigin="anonymous"
                  muted
                />
                {/* Hidden canvas for frame extraction */}
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Error message */}
                {videoError && (
                  <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg text-sm z-20 max-h-48 overflow-y-auto">
                    <div className="font-semibold mb-2">Video Loading Error</div>
                    <div className="whitespace-pre-line text-xs">{videoError}</div>
                    <button
                      onClick={() => {
                        setVideoError(null);
                        clearSavedData();
                      }}
                      className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                
                {/* Loading indicator */}
                {!videoReady && !videoError && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-white font-medium">Loading video...</p>
                    </div>
                  </div>
                )}
                
                {/* Video Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayPause}
                      disabled={!videoReady}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        videoReady 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <div className="flex-1">
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(videoDuration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500">
                <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4 border border-slate-800">
                  <Video size={32} />
                </div>
                <p>No video uploaded</p>
                <p className="text-sm mt-2">Upload a video to begin real-time analysis</p>
              </div>
            )}
            
          </div>
          
          {/* Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#1e293b] border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Upload size={24} className="text-slate-400 group-hover:text-blue-400" />
            </div>
            <p className="text-slate-300 font-medium">
              {videoUrl ? 'Upload New Video' : 'Upload Video for Real-Time Analysis'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Supports MP4, WebM, MOV (Max 100MB)</p>
          </div>

          {/* Additional Monitoring Blocks - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Monitoring Block 1 */}
            <div className="bg-black rounded-2xl overflow-hidden relative shadow-2xl w-full h-[300px] flex items-center justify-center border border-slate-800">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-3 border border-slate-800">
                  <Video size={24} />
                </div>
                <p className="text-sm">Monitoring Stream 2</p>
                <p className="text-xs mt-1 text-slate-600">Not connected</p>
              </div>
            </div>

            {/* Monitoring Block 2 */}
            <div className="bg-black rounded-2xl overflow-hidden relative shadow-2xl w-full h-[300px] flex items-center justify-center border border-slate-800">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-3 border border-slate-800">
                  <Video size={24} />
                </div>
                <p className="text-sm">Monitoring Stream 3</p>
                <p className="text-xs mt-1 text-slate-600">Not connected</p>
              </div>
            </div>

            {/* Monitoring Block 3 */}
            <div className="bg-black rounded-2xl overflow-hidden relative shadow-2xl w-full h-[300px] flex items-center justify-center border border-slate-800">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-3 border border-slate-800">
                  <Video size={24} />
                </div>
                <p className="text-sm">Monitoring Stream 4</p>
                <p className="text-xs mt-1 text-slate-600">Not connected</p>
              </div>
            </div>

            {/* Monitoring Block 4 */}
            <div className="bg-black rounded-2xl overflow-hidden relative shadow-2xl w-full h-[300px] flex items-center justify-center border border-slate-800">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-3 border border-slate-800">
                  <Video size={24} />
                </div>
                <p className="text-sm">Monitoring Stream 5</p>
                <p className="text-xs mt-1 text-slate-600">Not connected</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" />
                Analysis Results
              </h2>
              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {currentPrediction ? (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center p-6 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="text-sm text-slate-400 mb-2">Detected Activity</div>
                  <div className="text-3xl font-bold text-white mb-2">{currentPrediction.predicted_class}</div>
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                    currentPrediction.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : 
                    currentPrediction.status === 'potential' ? 'bg-yellow-500/10 text-yellow-500' : 
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {(currentPrediction.confidence * 100).toFixed(1)}% Confidence
                  </div>
       
               
           
                </div>

                {currentPrediction.explanation && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">AI Analysis</h3>
                    
                    {typeof currentPrediction.explanation.explanation === 'object' ? (
                      <div className="space-y-3">
                        {/* Summary */}
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                          <div className="text-xs text-slate-400 mb-1">Summary</div>
                          <div className="text-sm text-white font-medium">
                            {currentPrediction.explanation.explanation.summary}
                          </div>
                        </div>

                        {/* Potential Event Block - replaces Key Indicators for potential events */}
                        {currentPrediction.status === 'potential' ? (
                          <div className="p-4 bg-yellow-500/10 rounded-xl border-2 border-yellow-500/30 shadow-lg">
                            <div className="text-sm text-yellow-400 mb-3 font-bold flex items-center gap-2 uppercase tracking-wider">
                              <AlertTriangle size={16} />
                              Potential Event (70-90%): Not Confirmed
                            </div>
                            {/* Key Indicators - combine AI-generated and default examples */}
                            <div className="mt-4">
                              <div className="text-xs text-blue-400 mb-2 font-medium uppercase tracking-wider">Key Indicators</div>
                              <div className="flex flex-wrap gap-2">
                                {/* Default examples for potential events */}
                                {currentPrediction.predicted_class === 'RoadAccidents' && (
                                  <>
                                    <div className="px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/20 text-sm text-white">
                                      Reckless driving behavior
                                    </div>
                                    <div className="px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/20 text-sm text-white">
                                      High speed
                                    </div>
                                  </>
                                )}
                                {currentPrediction.predicted_class !== 'RoadAccidents' && (
                                  <>
                                    <div className="px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/20 text-sm text-white">
                                      Suspicious monitoring
                                    </div>
                                    <div className="px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/20 text-sm text-white">
                                      Unusual behavior
                                    </div>
                                  </>
                                )}
                                {/* AI-generated indicators */}
                                {currentPrediction.explanation?.explanation?.keyIndicators && 
                                  currentPrediction.explanation.explanation.keyIndicators.map((indicator, idx) => (
                                    <div key={idx} className="px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/20 text-sm text-white">
                                      {indicator}
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                            {currentPrediction.explanation?.explanation?.potentialWarning && (
                              <div className="mt-4 pt-3 border-t border-yellow-500/20">
                                <div className="text-xs text-yellow-400 mb-2 font-semibold uppercase tracking-wide">
                                  Contextual Warning
                                </div>
                                <div className="text-sm text-yellow-200 leading-relaxed">
                                  {currentPrediction.explanation.explanation.potentialWarning}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Key Indicators - only for confirmed events */
                          currentPrediction.explanation.explanation.keyIndicators && (
                            <div>
                              <div className="text-xs text-blue-400 mb-2 font-medium uppercase tracking-wider">Key Indicators</div>
                              <div className="flex flex-wrap gap-2">
                                {currentPrediction.explanation.explanation.keyIndicators.map((indicator, idx) => (
                                  <div key={idx} className="px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/20 text-sm text-white">
                                    {indicator}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}

                        {/* Confidence & Risk */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">Confidence</div>
                            <div className="text-xs text-slate-300">
                              {currentPrediction.explanation.explanation.confidenceInterpretation}
                            </div>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">Risk Level</div>
                            <div className={`text-xs font-medium ${
                              currentPrediction.explanation.explanation.riskLevel === 'Critical' ? 'text-red-500' :
                              currentPrediction.explanation.explanation.riskLevel === 'High' ? 'text-red-400' :
                              currentPrediction.explanation.explanation.riskLevel === 'Medium' ? 'text-orange-400' :
                              'text-green-400'
                            }`}>
                              {currentPrediction.explanation.explanation.riskLevel || 'Low'}
                            </div>
                          </div>
                        </div>

                        {/* Recommended Action */}
                        {currentPrediction.explanation.explanation.recommendedAction && (
                          <div className="p-4 bg-emerald-500/10 rounded-lg border-2 border-emerald-500/30 shadow-lg">
                            <div className="text-sm text-emerald-400 mb-2 font-bold flex items-center gap-2">
                              <CheckCircle size={16} />
                              Recommended Action
                            </div>
                            <div className="text-sm text-emerald-100 leading-relaxed mb-3">
                              {currentPrediction.explanation.explanation.recommendedAction}
                            </div>
                            
                            {/* Immediate Steps */}
                            {currentPrediction.explanation.explanation.immediateSteps && 
                             currentPrediction.explanation.explanation.immediateSteps.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-emerald-500/20">
                                <div className="text-xs text-emerald-400 mb-2 font-semibold uppercase tracking-wide">
                                  Immediate Steps
                                </div>
                                <ul className="space-y-2">
                                  {currentPrediction.explanation.explanation.immediateSteps.map((step, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-emerald-200">
                                      <span className="text-emerald-400 font-bold mt-0.5">{idx + 1}.</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Alternative Actions */}
                            {currentPrediction.explanation.explanation.alternativeActions && 
                             currentPrediction.explanation.explanation.alternativeActions.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-emerald-500/20">
                                <div className="text-xs text-emerald-400 mb-2 font-semibold uppercase tracking-wide">
                                  Alternative Actions
                                </div>
                                <ul className="space-y-2">
                                  {currentPrediction.explanation.explanation.alternativeActions.map((action, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-emerald-200">
                                      <span className="text-emerald-400 font-bold mt-0.5">•</span>
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-100 text-sm leading-relaxed">
                        {currentPrediction.explanation.explanation}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Probabilities</h3>
                  <div className="space-y-3">
                    {currentPrediction.predictions?.slice(0, 5).map((pred, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">{pred.class}</span>
                          <span className="text-slate-400">{(pred.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${pred.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                  <Aperture size={32} />
                </div>
                <p className="text-center">No analysis yet</p>
                <p className="text-sm text-slate-600">Play the video to see real-time results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(seconds) {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default RealTimeMonitoring;
