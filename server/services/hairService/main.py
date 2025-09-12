import cv2
from utils import blur_image

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    blurred = blur_image(frame)
    cv2.imshow('frame', blurred)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break


cap.release()
cv2.destroyAllWindows()
