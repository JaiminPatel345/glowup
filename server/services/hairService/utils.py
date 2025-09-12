import cv2
import mediapipe as mp


def blur_image(img, model_selection=0):
    H, W, _ = img.shape

    # detect faces
    mp_face_detection = mp.solutions.face_detection

    with mp_face_detection.FaceDetection(model_selection=model_selection, min_detection_confidence=0.5) as face_detection:
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        out = face_detection.process(img_rgb)

        #if no face detected
        if out.detections is None or len(out.detections) == 0:
            return img

        for detection in out.detections:
            location_data = detection.location_data
            # print(location_data)
            bbox = location_data.relative_bounding_box
            x1, y1, w, h = bbox.xmin, bbox.ymin, bbox.width, bbox.height
            x1 = max(0, int(x1 * W))
            y1 = max(0, int(y1 * H))
            x2 = min(W, x1 + int(w * W))
            y2 = min(H, y1 + int(h * H))

            # cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)

            # blur face
            img[y1:y2, x1:x2, :] = cv2.blur(img[y1:y2, x1:x2, :], (30, 30))

        return img