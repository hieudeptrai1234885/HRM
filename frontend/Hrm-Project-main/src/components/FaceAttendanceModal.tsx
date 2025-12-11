import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera } from 'lucide-react';
import { checkInApi, findEmployeeByName } from "../api/attendanceAPI";


type StatusType = 'default' | 'success' | 'error' | 'loading';

interface LabeledImageConfig {
  label: string;
  images: string[];
}

interface FaceAttendanceModalProps {
  onClose: () => void;
  onSuccess?: (data: { name: string; time: string; type?: "checkin" | "checkout"; location?: string }) => void;
  defaultType?: "checkin" | "checkout";
}


const LABELED_IMAGES: LabeledImageConfig[] = [
  {
    label: 'Nguyen Manh Hieu',
    images: ['/faces/nguyenmanhhieu.png'],
    
  },
  {
    label: 'Nguyen Hoang Linh',
    images: ['/faces/nguyenhoanglinh.png'],
    
  },
];
// Hàm xử lý điểm danh - gọi API để lưu vào database
async function handleAttendance(
  name: string,
  onSuccess?: (data: { name: string; time: string; type?: "checkin" | "checkout"; location?: string }) => void,
  type?: "checkin" | "checkout",
  location?: string
) {
  const currentTime = new Date().toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  try {
    // Tìm nhân viên trong database
    const emp = await findEmployeeByName(name);

    if (!emp || !emp.id) {
      console.log("❌ Không tìm thấy nhân viên trong DB:", name);
      if (onSuccess) {
        onSuccess({
          name: name,
          time: currentTime,
          type: type,
          location,
        });
      }
      return;
    }

    // Gọi API lưu điểm danh
    const result = await checkInApi({
      employee_id: emp.id,
      name
    });

    if (result.success) {
      console.log("✅ Lưu điểm danh thành công");
    } else {
      console.log("❌ Lỗi lưu điểm danh:", result.error);
    }

    // Gọi callback với thông tin
    if (onSuccess) {
      onSuccess({
        name: name,
        time: currentTime,
        type: type,
        location,
      });
    }
  } catch (error) {
    console.error("❌ Lỗi khi xử lý điểm danh:", error);
    // Vẫn gọi callback để cập nhật UI
    if (onSuccess) {
      onSuccess({
        name: name,
        time: currentTime,
        type: type,
        location,
      });
    }
  }
}


export default function FaceAttendanceModal({ onClose, onSuccess, defaultType }: FaceAttendanceModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const loginLockedRef = useRef(false);
  const locationRef = useRef<string>('Đang lấy vị trí...');
  const [status, setStatus] = useState<string>('🟡 Đang tải model...');
  const [statusType, setStatusType] = useState<StatusType>('loading');
  const [wrapperActive, setWrapperActive] = useState(false);
  const [locationText, setLocationText] = useState<string>('Đang lấy vị trí...');

  useEffect(() => {
    let isCancelled = false;

    // Lấy vị trí hiện tại của người dùng để hiển thị kèm bản ghi điểm danh
    const loadLocation = () => {
      if (!navigator.geolocation) {
        setLocationText('Thiết bị không hỗ trợ GPS');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isCancelled) return;
          const { latitude, longitude } = pos.coords;
          const next = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          locationRef.current = next;
          setLocationText(next);
        },
        (err) => {
          if (isCancelled) return;
          const next = `Không lấy được vị trí (${err.message})`;
          locationRef.current = next;
          setLocationText(next);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    };

    const loadModels = async () => {
      try {
        setStatus('🔄 Đang tải model...');
        setStatusType('loading');

        // ⚠️ Path model: public/models/...
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models/tiny_face_detector'),
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models/ssd_mobilenetv1'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models/face_landmark_68'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models/face_recognition'),
        ]);

        if (isCancelled) return;

        console.log('✅ Model đã tải xong!');
        await startVideo();
      } catch (error) {
        console.error('❌ Lỗi tải model:', error);
        if (!isCancelled) {
          setStatus('❌ Lỗi khi tải model. Kiểm tra lại thư mục /public/models');
          setStatusType('error');
        }
      }
    };

    const startVideo = async () => {
      try {
        setStatus('📷 Đang mở camera...');
        setStatusType('loading');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 900, height: 650 },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          console.log('🎥 Camera sẵn sàng, bắt đầu nhận diện...');
          videoRef.current?.play();
          void initRecognition();
        };
      } catch (error) {
        console.error('❌ Không mở được camera:', error);
        if (!isCancelled) {
          setStatus('❌ Không thể truy cập camera!');
          setStatusType('error');
        }
      }
    };

    const loadLabeledImages = async () => {
      const labeledDescriptors: faceapi.LabeledFaceDescriptors[] = [];

      for (const person of LABELED_IMAGES) {
        const descriptors: Float32Array[] = [];

        for (const imgPath of person.images) {
          try {
            const img = await faceapi.fetchImage(imgPath);
            const det = await faceapi
              .detectSingleFace(img)
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (det?.descriptor) {
              descriptors.push(det.descriptor);
            }
          } catch (error) {
            console.error('Lỗi load ảnh mẫu:', imgPath, error);
          }
        }

        if (descriptors.length > 0) {
          labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(person.label, descriptors));
        }
      }

      return labeledDescriptors;
    };

    const initRecognition = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      setStatus('🟢 Camera đã bật, đang nhận diện...');
      setStatusType('default');

      const labeledDescriptors = await loadLabeledImages();
      if (labeledDescriptors.length === 0) {
        setStatus('❌ Không tải được ảnh mẫu. Kiểm tra lại thư mục /public/known hoặc /public/faces.');
        setStatusType('error');
        return;
      }

      const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.4);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      const displaySize = {
        width: video.videoWidth || 900,
        height: video.videoHeight || 650,
      };

      canvas.width = displaySize.width;
      canvas.height = displaySize.height;
      faceapi.matchDimensions(canvas, displaySize);

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      intervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        if (video.readyState !== 4) return;

        try {
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptors();

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const resized = faceapi.resizeResults(detections, displaySize);

          if (resized.length === 0) {
            setWrapperActive(false);
            if (!loginLockedRef.current) {
              setStatus('⏳ Không phát hiện khuôn mặt...');
              setStatusType('default');
            }
            return;
          }

          resized.forEach((det) => {
            const best = matcher.findBestMatch(det.descriptor);
            const box = det.detection.box;

            const similarity = (1 - best.distance) * 100;
            const percentText = similarity.toFixed(1);
            const isUnknown = best.label === 'unknown';
            const color = isUnknown ? 'red' : '#00c853';

            // 🎯 Vẽ khung glow, mirror giống code cũ
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(
              canvas.width - (box.x + box.width),
              box.y,
              box.width,
              box.height
            );
            ctx.fillStyle = color;
            ctx.font = '18px Segoe UI';
            ctx.fillText(
              `${best.label} (${percentText}%)`,
              canvas.width - (box.x + box.width),
              box.y - 10
            );
            ctx.restore();

            // ✅ Khi khớp >= 50% & không unknown & chưa lock
            const isMatch = !isUnknown && similarity >= 50;

            if (isMatch && !loginLockedRef.current) {
              loginLockedRef.current = true;
              setWrapperActive(true);
              const time = new Date().toLocaleTimeString();
              const locationInfo = locationRef.current || 'Không xác định';
              setStatus(`✅ ${best.label} đã đăng nhập lúc ${time} (${locationInfo})`);
              // Gửi dữ liệu điểm danh lên server lưu vào MySQL
              setStatusType('success');
              // 👉 XỬ LÝ ĐIỂM DANH (KHÔNG GỌI API)
              console.log("🎯 Điểm danh cho:", best.label);
              handleAttendance(best.label, onSuccess, defaultType, locationInfo);
          
              setTimeout(() => {
                loginLockedRef.current = false;
                setWrapperActive(false);
                setStatus('🟢 Hệ thống sẵn sàng cho lượt tiếp theo...');
                setStatusType('default');
              }, 5000);

              
            } else if (!loginLockedRef.current) {
              setWrapperActive(false);
              setStatus('⏳ Đang xác thực...');
              setStatusType('loading');
            }
          });
        } catch (error) {
          console.error('Lỗi khi nhận diện:', error);
          if (!loginLockedRef.current) {
            setStatus('❌ Lỗi trong quá trình nhận diện. Kiểm tra lại camera / model.');
            setStatusType('error');
          }
        }
      }, 300);
    };
    

    loadLocation();
    void loadModels();

    return () => {
      isCancelled = true;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Map statusType -> class Tailwind
  const statusClass = (() => {
    switch (statusType) {
      case 'success':
        return 'text-green-700 bg-green-50 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
      case 'error':
        return 'text-red-700 bg-red-50 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      case 'loading':
        return 'text-amber-700 bg-amber-50 animate-pulse';
      default:
        return 'text-teal-700 bg-teal-50';
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Nhận diện khuôn mặt</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="h-full w-full space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <Camera className="h-7 w-7 text-emerald-500" />
          HỆ THỐNG CHẤM CÔNG BẰNG KHUÔN MẶT
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sử dụng nhận diện khuôn mặt (tiny + SSD MobilenetV1) để chấm công cho nhân viên.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Vùng video chính */}
        <div
          className={[
            'relative h-[650px] w-[900px] overflow-hidden rounded-2xl bg-white transition-all',
            'shadow-[0_0_18px_rgba(0,0,0,0.2)]',
            wrapperActive ? 'scale-[1.01] shadow-[0_0_40px_#00ff99]' : '',
          ].join(' ')}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // mirror như bản cũ
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute left-0 top-0 h-full w-full"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>

        {/* Thông báo trạng thái */}
        <div
          className={[
            'mt-3 rounded-xl px-6 py-3 text-center text-base font-semibold shadow-sm transition-all',
            statusClass,
          ].join(' ')}
        >
          {status}
        </div>
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Vị trí:</span> {locationText}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}

