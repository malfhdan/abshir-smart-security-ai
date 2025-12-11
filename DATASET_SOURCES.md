# Crime Detection Dataset Sources

## Current Problem
Your dataset is heavily imbalanced:
- **NormalVideos**: 947,768 images (95%+)
- **RoadAccidents**: 23,486 images
- Other classes: 10,000-40,000 images

## Recommended Datasets

### 1. **UCF-Crime Dataset (Original Source)**
- **Official Link**: https://www.crcv.ucf.edu/projects/real-world/
- **Description**: 13 crime classes + normal videos
- **Format**: Videos (need frame extraction)
- **Size**: ~1900 videos
- **Note**: This is your current dataset source - consider re-extracting with better balancing

### 2. **Kaggle Datasets**
Search for these on Kaggle:
- "UCF Crime Dataset"
- "Crime Detection Dataset"
- "CCTV Anomaly Detection"
- "Road Accident Detection"

**Direct Links:**
- https://www.kaggle.com/datasets?search=UCF+crime
- https://www.kaggle.com/datasets?search=crime+detection

### 3. **Roboflow Universe**
- **Link**: https://universe.roboflow.com/
- **Search Terms**: "crime detection", "anomaly detection", "CCTV"
- **Advantage**: Pre-processed, balanced datasets ready to use

### 4. **Google Dataset Search**
- **Link**: https://datasetsearch.research.google.com/
- **Search Terms**: 
  - "crime detection CCTV"
  - "UCF-Crime dataset"
  - "surveillance anomaly detection"

### 5. **Papers with Code**
- **Link**: https://paperswithcode.com/
- **Search**: "UCF-Crime", "crime detection"
- **Advantage**: Links to datasets used in research papers

### 6. **GitHub Repositories**
Search GitHub for:
- "crime detection dataset"
- "UCF-Crime"
- "anomaly detection dataset"

## Immediate Solutions Applied

### ✅ Improved Dataset Balancing
- Reduced NormalVideos from 50,000 to dynamically calculated based on crime class averages
- NormalVideos now limited to 1.5x average crime class size
- Better balance between normal and crime classes

### ✅ Class Weights
- Added class weights to penalize NormalVideos predictions
- NormalVideos weight reduced by 50% to make it less likely to be predicted
- Helps model learn crime classes better

## Next Steps

1. **Clear cache and retrain**:
   ```bash
   python backend/train_model.py --clear-cache
   ```

2. **Monitor training** - Check if class distribution is better balanced

3. **If still poor results**, consider:
   - Finding a better dataset
   - Increasing epochs (currently 5)
   - Using transfer learning (pre-trained models)
   - Data augmentation for minority classes

## Alternative: Use Transfer Learning
Consider using a pre-trained model (ResNet, VGG, MobileNet) and fine-tuning on your dataset. This often works better than training from scratch.


