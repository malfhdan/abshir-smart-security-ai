import os
from PIL import Image
import glob

def check_image_sizes(base_path, num_samples=5):
    print(f"Checking images in {base_path}...")
    # Get all class directories
    classes = [d for d in os.listdir(base_path) if os.path.isdir(os.path.join(base_path, d))]
    
    for class_name in classes:
        class_path = os.path.join(base_path, class_name)
        images = glob.glob(os.path.join(class_path, "*.*"))
        
        print(f"\nClass: {class_name} - Total images: {len(images)}")
        
        # Check first few images
        for img_path in images[:num_samples]:
            try:
                with Image.open(img_path) as img:
                    print(f"  {os.path.basename(img_path)}: {img.size} (Mode: {img.mode})")
            except Exception as e:
                print(f"  Could not read {os.path.basename(img_path)}: {e}")

print("--- TRAIN DATA ---")
check_image_sizes("datasets/Train", num_samples=3)
print("\n--- TEST DATA ---")
check_image_sizes("datasets/Test", num_samples=3)
