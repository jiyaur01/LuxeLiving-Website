import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_dilation

# Load images
img_lux = Image.open('Real_state_video_JPG_60fps_720p/frame_00001_luxeliving.jpg')
b2 = np.array(img_lux)

b1_raw = Image.open('Real_state_video_JPG_60fps_720p/frame_00001.jpg')
b1 = np.array(b1_raw.resize((b2.shape[1], b2.shape[0]), Image.Resampling.BICUBIC))

# Core white threshold
mask = (b2[:, :, 0] > 230) & (b2[:, :, 1] > 230) & (b2[:, :, 2] > 230)
labeled, num_features = label(mask)

# The exact 12 letter components of LuxeLiving:
# L, u, x, e, L, i(dot), i(stem), v, i(dot), i(stem), n, g
exact_features = [1459, 1493, 1499, 1494, 1461, 1477, 1495, 1500, 1478, 1496, 1497, 1498]

letter_mask = np.isin(labeled, exact_features)

# Dilate by 3 pixels to capture antialiased boundary pixels
dilated_mask = binary_dilation(letter_mask, iterations=3)

h, w, _ = b2.shape
rgba = np.zeros((h, w, 4), dtype=np.uint8)

for y in range(h):
    for x in range(w):
        if not dilated_mask[y, x]:
            continue
        
        c2 = b2[y, x].astype(float)
        c1 = b1[y, x].astype(float)
        
        if letter_mask[y, x]:
            rgba[y, x] = [255, 255, 255, 255]
        else:
            diff = np.maximum(0, c2 - c1)
            denom = np.maximum(1, 255.0 - c1)
            a_est = diff / denom
            alpha = np.mean(a_est)
            alpha = np.clip((alpha - 0.1) / 0.8, 0.0, 1.0)
            rgba[y, x] = [255, 255, 255, int(alpha * 255)]

out_img = Image.fromarray(rgba, mode='RGBA')
out_img.save('luxeliving_overlay.png')
print('Saved luxeliving_overlay.png!')

# Also scale out_img to 1280x720 matching the full frame resolution!
out_1280 = out_img.resize((1280, 720), Image.Resampling.BICUBIC)
out_1280.save('luxeliving_overlay_1280.png')
print('Saved luxeliving_overlay_1280.png!')
