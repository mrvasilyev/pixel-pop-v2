
import os
import glob
import json
from PIL import Image

# Configuration
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))
IMAGES_DIRS = [
    os.path.join(FRONTEND_DIR, 'public/images/discover'),
    os.path.join(FRONTEND_DIR, 'public/images/styles')
]
CONTENT_DIRS = [
    os.path.join(FRONTEND_DIR, 'src/content/discover'),
    os.path.join(FRONTEND_DIR, 'src/content/styles')
]

MAX_WIDTH = 800

def optimize_image(image_path):
    """
    Resizes image to max width 800px and converts to WebP.
    Returns the new file path if successful, None otherwise.
    """
    try:
        if image_path.endswith('.webp'):
            return None # Already webp
        
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}.webp"
        new_path = os.path.join(os.path.dirname(image_path), new_filename)
        
        # Open source image
        with Image.open(image_path) as img:
            # Calculate new size
            width, height = img.size
            if width > MAX_WIDTH:
                ratio = MAX_WIDTH / width
                new_width = MAX_WIDTH
                new_height = int(height * ratio)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                print(f"Resized {filename}: {width}x{height} -> {new_width}x{new_height}")
            else:
                print(f"Original size kept for {filename}: {width}x{height}")

            # Save as WebP
            img.save(new_path, 'WEBP', quality=85)
            print(f"Saved: {new_path}")
            
        return new_path
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None

def update_json_references(old_filename, new_filename):
    """
    Updates JSON files to point to the new WebP image.
    Scans all CONTENT_DIRS for json files containing the old filename.
    """
    old_base = os.path.basename(old_filename)
    new_base = os.path.basename(new_filename)
    
    for content_dir in CONTENT_DIRS:
        for json_file in glob.glob(os.path.join(content_dir, '*.json')):
            try:
                with open(json_file, 'r') as f:
                    content = f.read()
                
                if old_base in content:
                    print(f"Updating reference in {os.path.basename(json_file)}")
                    # Simple string replace is risky but likely safe for unique filenames involves here
                    # A more robust way: load json, check 'cover' field.
                    
                    data = json.loads(content)
                    if 'cover' in data and data['cover'].endswith(old_base):
                         # It matches exact filename at end of path
                         data['cover'] = data['cover'].replace(old_base, new_base)
                         # write back
                         with open(json_file, 'w') as f:
                             json.dump(data, f, indent=4) # Keystatic usually defaults but indent 4 is safe
                    
            except Exception as e:
                print(f"Error updating JSON {json_file}: {e}")

def main():
    print("Starting image optimization...")
    
    processed_files = []

    for img_dir in IMAGES_DIRS:
        if not os.path.exists(img_dir):
            print(f"Directory not found: {img_dir}")
            continue
            
        # Find all png/jpg images recursively
        types = ('**/*.png', '**/*.jpg', '**/*.jpeg')
        files = []
        for t in types:
            files.extend(glob.glob(os.path.join(img_dir, t), recursive=True))
            
        print(f"Found {len(files)} images in {img_dir}")
        
        for file_path in files:
            new_path = optimize_image(file_path)
            if new_path:
                processed_files.append((file_path, new_path))
                # Update references
                update_json_references(file_path, new_path)
    
    # Optional: Delete old files?
    # For safety, let's NOT delete them in this script, let user confirm or do it manually.
    # But to prevent duplicate loading, we should probably eventually delete them.
    # The prompt plan said "Convert/Resize". Usually implies replacing.
    # Since we are renaming to .webp, the old .png stays.
    # I will leave them for now.
    
    print("Optimization complete.")

if __name__ == "__main__":
    main()
