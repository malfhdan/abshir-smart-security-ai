# Crime Detection Dataset Recommendations

## Current Dataset Issues
Your current dataset is heavily imbalanced:
- **NormalVideos**: 947,768 images (95%+ of dataset)
- **RoadAccidents**: 23,486 images
- Other classes: 10,000-40,000 images each

This causes the model to be biased toward predicting "NormalVideos" for everything.

## Recommended Datasets

### 1. **UCF-Crime Dataset (Original)**
- **Source**: University of Central Florida
- **Link**: https://www.crcv.ucf.edu/projects/real-world/
- **Classes**: 13 crime classes + normal
- **Format**: Videos (need to extract frames)
- **Size**: ~1900 videos
- **Note**: This is the source of your current dataset, but you may need to re-extract frames with better balancing

### 2. **Kaggle Crime Detection Datasets**
Search Kaggle for:
- "Crime Detection Dataset"
- "UCF Crime Dataset"
- "Anomaly Detection CCTV"
- "Road Accident Detection"

**Kaggle Links:**
- https://www.kaggle.com/datasets?search=crime+detection
- https://www.kaggle.com/datasets?search=UCF+crime

### 3. **Roboflow Crime Detection**
- **Source**: Roboflow Universe
- **Link**: https://universe.roboflow.com/
- **Search**: "crime detection", "anomaly detection", "CCTV"
- **Advantage**: Pre-processed, balanced datasets

### 4. **Google Dataset Search**
- **Link**: https://datasetsearch.research.google.com/
- **Search Terms**: 
  - "crime detection CCTV"
  - "anomaly detection surveillance"
  - "road accident detection"

### 5. **Papers with Code Datasets**
- **Link**: https://paperswithcode.com/
- **Search**: "UCF-Crime", "crime detection"
- **Advantage**: Links to datasets used in research papers

## Immediate Solutions

### Option 1: Rebalance Current Dataset
1. Limit NormalVideos to 50,000-100,000 images (instead of 947K)
2. Ensure all crime classes have at least 20,000-30,000 images
3. Retrain the model

### Option 2: Data Augmentation
Apply augmentation to minority classes:
- Rotation
- Flipping
- Brightness/contrast adjustment
- Cropping

### Option 3: Use Class Weights
Modify training to penalize NormalVideos predictions more heavily.

## Quick Fix Script
Create a script to balance your dataset before training.


