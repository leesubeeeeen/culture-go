import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { auth, db } from '../../../config/firebase'

const ERROR_MAP: Record<string, string> = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-not-found': '존재하지 않는 계정입니다.',
  'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
  'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
  'auth/too-many-requests': '잠시 후 다시 시도해주세요.',
  'auth/configuration-not-found': 'Firebase Authentication이 활성화되지 않았습니다.',
  'auth/operation-not-allowed': '이메일/비밀번호 로그인을 먼저 활성화해주세요.',
  'auth/network-request-failed': '네트워크 오류가 발생했습니다.',
}
const getErrorMsg = (code: string) => ERROR_MAP[code] ?? `로그인 실패 (${code})`

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const snap = await getDoc(doc(db, 'users', result.user.uid))
      if (!snap.exists()) {
        navigate('/signup', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(getErrorMsg((err as { code?: string }).code ?? ''))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      const snap = await getDoc(doc(db, 'users', result.user.uid))
      if (!snap.exists()) navigate('/signup', { replace: true })
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      if (code !== 'auth/popup-closed-by-user') setError(getErrorMsg(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* 로고 영역 */}
      <div className="flex flex-col items-center pt-16 pb-10 px-6">
        <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-200">
          <span className="text-3xl">🐾</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900">Culture Go</h1>
        <p className="text-sm text-gray-400 mt-1">지역 문화를 탐험하는 몬스터 포획 게임</p>
      </div>

      <div className="flex-1 px-6 pb-8 flex flex-col gap-4">
        {/* Google 로그인 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-gray-200 bg-white font-semibold text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          <GoogleIcon />
          Google로 로그인
        </button>

        {/* 구분선 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* 이메일 폼 */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            autoComplete="email"
            className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-transparent text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            autoComplete="current-password"
            className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-transparent text-sm placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
          />

          {error && (
            <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 font-bold text-gray-900 text-sm transition-all shadow-sm shadow-amber-200 mt-1"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-amber-500 font-semibold">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
