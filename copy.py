import shutil
import sys

src = '/Users/vanshajgarg/.gemini/antigravity-ide/brain/18764411-3176-476f-ab39-63108951f48e/.user_uploaded/media_1788893749552.jpg'
dest = '/Users/vanshajgarg/Desktop/Capital-gain-hub/src/app/icon.jpg'

try:
    shutil.copy2(src, dest)
    print(f"Successfully copied to {dest}")
except Exception as e:
    print(f"Error copying file: {e}")
    sys.exit(1)
