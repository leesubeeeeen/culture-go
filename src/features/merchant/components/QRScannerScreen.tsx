import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Coupon } from '../../../types'

type Status = 'idle' | 'scanning' | 'found' | 'confirmed' | 'error'

export default function QRScannerScreen() {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const [couponId, setCouponId] = useState('')
  const [coupon, setCoupon]     = useState<Coupon | null>(null)
  const [status, setStatus]     = useState<Status>('idle')
  const [errMsg, setErrMsg]     = useState('')
  const [cameraOn, setCameraOn] = useState(false)

  // 카메라 스트림 시작 + QR 스캔 루프
  useEffect(() => {
    let stream: MediaStream | null = null

    if (!cameraOn) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play()
        }
        startScanLoop()
      })
      .catch(() => {
        setErrMsg('카메라 권한이 필요합니다.')
        setCameraOn(false)
      })

    return () => {
      cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [cameraOn])

  const startScanLoop = () => {
    const tick = () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return }
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const result = jsQR(imageData.data, imageData.width, imageData.height)
      if (result?.data) {
        cancelAnimationFrame(rafRef.current)
        setCameraOn(false)
        lookup(result.data)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const lookup = async (id: string) => {
    const trimmed = id.trim()
    if (!trimmed) return
    setStatus('scanning'); setErrMsg(''); setCoupon(null)
    try {
      const snap = await getDoc(doc(db, 'coupons', trimmed))
      if (!snap.exists()) {
        setStatus('error'); setErrMsg('존재하지 않는 쿠폰입니다.'); return
      }
      const d = snap.data()
      if (d.isUsed) {
        setStatus('error'); setErrMsg('이미 사용된 쿠폰입니다.'); return
      }
      setCoupon({
        id:         snap.id,
        userId:     d.userId     ?? '',
        monsterId:  d.monsterId  ?? '',
        templateId: d.templateId ?? null,
        shopId:     d.shopId     ?? '',
        shopName:   d.shopName   ?? '',
        title:      d.title      ?? '',
        benefit:    d.benefit    ?? '',
        category:   d.category   ?? '',
        isUsed:     d.isUsed     ?? false,
        createdAt:  d.createdAt?.toDate?.() ?? new Date(),
      })
      setStatus('found')
    } catch {
      setStatus('error'); setErrMsg('쿠폰 조회에 실패했습니다.')
    }
  }

  const confirm = async () => {
    if (!coupon) return
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), { isUsed: true })
      setStatus('confirmed')
    } catch {
      setStatus('error'); setErrMsg('처리에 실패했습니다.')
    }
  }

  const reset = () => {
    setStatus('idle'); setCoupon(null); setCouponId(''); setErrMsg('')
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-lg font-black text-gray-900">QR 스캔</h2>
        <p className="text-xs text-gray-400 mt-0.5">고객 쿠폰 QR을 스캔하여 사용 처리합니다</p>
      </div>

      {/* 카메라 뷰 */}
      <div className="relative w-full aspect-square bg-gray-900 rounded-2xl overflow-hidden">
        {cameraOn ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-4 border-amber-400 rounded-2xl shadow-lg" />
            </div>
            <p className="absolute bottom-3 left-0 right-0 text-center text-white text-xs opacity-70">
              QR 코드를 네모 안에 맞춰주세요
            </p>
          </>
        ) : (
          <button
            onClick={() => { reset(); setCameraOn(true) }}
            className="w-full h-full flex flex-col items-center justify-center gap-3 text-white"
          >
            <span className="text-5xl">📷</span>
            <span className="text-sm font-bold">카메라 열기</span>
          </button>
        )}
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3 text-xs text-gray-300">
        <div className="flex-1 h-px bg-gray-100" />또는 쿠폰 ID 직접 입력<div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* 수동 입력 */}
      <div className="flex gap-2">
        <input
          value={couponId}
          onChange={(e) => setCouponId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup(couponId)}
          placeholder="쿠폰 ID 입력"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
        />
        <button
          onClick={() => lookup(couponId)}
          className="bg-gray-900 text-white font-bold px-5 rounded-xl text-sm"
        >
          조회
        </button>
      </div>

      {/* 로딩 */}
      {status === 'scanning' && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">쿠폰 조회 중...</p>
        </div>
      )}

      {/* 쿠폰 정보 카드 */}
      {status === 'found' && coupon && (
        <div className="border-2 border-amber-300 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-black text-gray-900">{coupon.title}</p>
              {coupon.benefit && (
                <p className="text-xs text-amber-600 font-semibold mt-0.5">{coupon.benefit}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">{coupon.shopName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {coupon.createdAt instanceof Date ? coupon.createdAt.toLocaleDateString('ko-KR') : ''}
              </p>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">미사용</span>
          </div>
          <button
            onClick={confirm}
            className="w-full bg-amber-400 text-black font-black py-4 rounded-xl text-base"
          >
            ✅ 사용 처리
          </button>
        </div>
      )}

      {/* 완료 */}
      {status === 'confirmed' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center gap-3">
          <span className="text-5xl">✅</span>
          <p className="font-black text-green-700">쿠폰 사용 처리 완료</p>
          <p className="text-sm text-gray-400">{coupon?.title}</p>
          <button onClick={reset} className="text-sm text-gray-400 underline mt-1">다음 쿠폰 스캔</button>
        </div>
      )}

      {/* 에러 */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex flex-col items-center gap-2">
          <span className="text-3xl">❌</span>
          <p className="text-red-600 font-bold text-sm">{errMsg}</p>
          <button onClick={reset} className="text-xs text-gray-400 underline mt-1">다시 시도</button>
        </div>
      )}
    </div>
  )
}
