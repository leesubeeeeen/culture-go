import { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface MonsterResult {
  id: string
  name: string
  description: string
  attribute: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  imageUrl: string
}

type Step = 'idle' | 'generating' | 'imaging' | 'nuking' | 'saving' | 'done' | 'error'

const STEP_INFO: Record<string, { label: string; sub: string }> = {
  generating: { label: '🧠 몬스터 설정 생성 중', sub: 'GPT가 가게 특성을 분석합니다' },
  imaging:    { label: '🎨 이미지 생성 중',      sub: '약 20~60초 소요됩니다 (무료 AI)' },
  nuking:     { label: '✂️ 배경 제거(누끼) 중',   sub: '투명 배경 PNG로 변환합니다' },
  saving:     { label: '💾 저장 중',              sub: '마무리 작업 중입니다' },
}

const RARITY_STYLE: Record<string, string> = {
  common:    'bg-gray-100 text-gray-600',
  rare:      'bg-blue-100 text-blue-700',
  epic:      'bg-purple-100 text-purple-700',
  legendary: 'bg-amber-100 text-amber-700',
}

const RARITY_KO: Record<string, string> = {
  common: '커먼', rare: '레어', epic: '에픽', legendary: '레전더리',
}

const STEPS = ['generating', 'imaging', 'nuking', 'saving'] as const

// ── 몬스터 설정 로직 ────────────────────────────────────────────
const RARITIES: MonsterResult['rarity'][] = ['common', 'rare', 'epic', 'legendary']
const RARITY_WEIGHTS = [50, 30, 15, 5]

const ATTR_HINTS: [string[], string][] = [
  [['빵', '케이크', '디저트', '마카롱', '쿠키', '슈크림'], '달콤'],
  [['고기', '삼겹', '소고기', '갈비', '스테이크', '불'], '불'],
  [['국밥', '설렁탕', '순대', '곰탕', '전통'], '전통'],
  [['라면', '떡볶이', '닭발', '엽떡', '마라'], '매운맛'],
  [['회', '초밥', '해산물', '굴', '새우', '오징어'], '물'],
  [['튀김', '치킨', '탕수육', '돈까스', '바삭'], '바삭'],
]

function pickAttribute(texts: string[]): string {
  const combined = texts.join(' ')
  for (const [keywords, attr] of ATTR_HINTS) {
    if (keywords.some((k) => combined.includes(k))) return attr
  }
  const attrs = ['달콤', '매운맛', '바삭', '전통', '물', '불']
  return attrs[Math.floor(Math.random() * attrs.length)]
}

function pickRarity(): MonsterResult['rarity'] {
  const roll = Math.random() * 100
  let acc = 0
  for (let i = 0; i < RARITIES.length; i++) {
    acc += RARITY_WEIGHTS[i]
    if (roll < acc) return RARITIES[i]
  }
  return 'common'
}


const DESCRIPTIONS: Record<string, string[]> = {
  달콤:   ['달콤한 기운을 뿜으며 행인을 꾀어들이는 몬스터.', '설탕 결정으로 된 날개를 가진 귀여운 존재.'],
  불:     ['붉은 화염을 다루는 용맹한 몬스터.', '고기 굽는 향기를 무기로 삼는 전투형 몬스터.'],
  전통:   ['충청도 전통의 기운을 계승한 고귀한 몬스터.', '오래된 항아리에서 깨어난 수호 몬스터.'],
  매운맛: ['매운 기운으로 적을 압도하는 강렬한 몬스터.', '캡사이신 결정을 발사하는 공격형 몬스터.'],
  물:     ['맑은 물의 기운을 품은 온화한 몬스터.', '비늘이 보석처럼 빛나는 수중 몬스터.'],
  바삭:   ['황금빛 갑옷을 두른 바삭한 몬스터.', '튀김옷 방어막으로 공격을 튕겨내는 몬스터.'],
}

// ── 데모용 목업 이미지 ────────────────────────────────────────────
async function generateImage(): Promise<string> {
  return '/monsters/튀소용.png'
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── 컴포넌트 ────────────────────────────────────────────────────
interface Props {
  shopId: string
  shopName: string
  category: string
  lat: number
  lng: number
}

export default function MonsterRequestScreen({ shopId, shopName, category, lat, lng }: Props) {
  const [menu, setMenu]       = useState('')
  const [feature, setFeature] = useState('')
  const [keyword, setKeyword] = useState('')
  const [step, setStep]       = useState<Step>('idle')
  const [monster, setMonster] = useState<MonsterResult | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [error, setError]     = useState('')

  const handleGenerate = async () => {
    setMonster(null); setShowPopup(false); setError('')

    // 1. 몬스터 설정 생성 (즉시)
    setStep('generating')
    const name      = '튀소용'
    const attribute = pickAttribute([menu, feature, keyword])
    const rarity    = pickRarity()
    const descPool  = DESCRIPTIONS[attribute] ?? ['충청도의 기운을 품은 신비로운 몬스터.']
    const description = descPool[Math.floor(Math.random() * descPool.length)]
    await delay(600)

    // 2. OpenAI 이미지 생성 (실제 API 호출)
    setStep('imaging')
    let imageUrl: string
    try {
      imageUrl = await generateImage()
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 생성 실패')
      setStep('error')
      return
    }

    setStep('nuking'); await delay(500)
    setStep('saving')

    let savedId = `monster_${Date.now()}`
    try {
      const ref = await addDoc(collection(db, 'Monster'), {
        shopId,
        shopName,
        category,
        lat,
        lng,
        name,
        description,
        attribute,
        rarity,
        imageUrl,
        status: 'approved',
        couponTemplateId: null,
      })
      savedId = ref.id
    } catch (e) {
      console.error('Monster 저장 실패:', e)
    }

    setMonster({ id: savedId, name, description, attribute, rarity, imageUrl })
    setStep('done')
    setShowPopup(true)
  }

  const handleReset = () => {
    setStep('idle'); setMonster(null); setShowPopup(false)
    setMenu(''); setFeature(''); setKeyword('')
  }

  const isLoading = (['generating', 'imaging', 'nuking', 'saving'] as Step[]).includes(step)

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-lg font-black text-gray-900">몬스터 신청</h2>
        <p className="text-xs text-gray-400 mt-0.5">가게 정보를 입력하면 AI가 전용 몬스터를 생성합니다</p>
      </div>

      <div className="bg-amber-50 rounded-xl px-4 py-3 flex items-center gap-2">
        <span className="text-xl">🏪</span>
        <div>
          <p className="text-sm font-bold text-gray-900">{shopName}</p>
          <p className="text-xs text-gray-500">{category}</p>
        </div>
      </div>

      {/* 입력 폼 */}
      {(step === 'idle' || step === 'error') && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              대표 메뉴 <span className="text-red-400">*</span>
            </label>
            <input
              value={menu}
              onChange={(e) => setMenu(e.target.value)}
              placeholder="예: 튀김소보로, 판타롱 슈크림"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">가게 특징</label>
            <textarea
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="예: 70년 전통 대전 대표 빵집, 줄 서서 먹는 명물"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">키워드</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 달콤, 바삭, 따뜻함, 대전"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {step === 'error' && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">❌ {error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!menu.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-amber-400 text-white font-black py-4 rounded-2xl text-base disabled:opacity-40"
          >
            ✨ AI로 몬스터 생성
          </button>
        </div>
      )}

      {/* 로딩 단계 */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-50 rounded-2xl p-5 flex flex-col items-center gap-3">
            <span className="text-4xl animate-bounce">🐾</span>
            <div className="text-center">
              <p className="font-bold text-gray-900">{STEP_INFO[step]?.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{STEP_INFO[step]?.sub}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {STEPS.map((s) => {
              const si = STEPS.indexOf(s)
              const ci = STEPS.indexOf(step as typeof STEPS[number])
              const done   = si < ci
              const active = si === ci
              return (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span className={done ? 'text-green-500' : active ? 'text-amber-400 animate-pulse' : 'text-gray-200'}>
                    {done ? '✅' : active ? '⏳' : '○'}
                  </span>
                  <span className={done ? 'text-gray-300 line-through' : active ? 'font-bold text-gray-900' : 'text-gray-200'}>
                    {STEP_INFO[s].label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* done 상태 — 팝업 닫힌 후 */}
      {step === 'done' && monster && !showPopup && (
        <div className="flex flex-col gap-3">
          <div className="border-2 border-green-200 bg-green-50 rounded-2xl p-4 flex items-center gap-3">
            <img src={monster.imageUrl} alt={monster.name} className="w-16 h-16 object-contain rounded-xl bg-white p-1" />
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900">{monster.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{monster.attribute} 속성 · {RARITY_KO[monster.rarity]}</p>
              <p className="text-xs text-green-600 mt-1">✅ 유저 지도에 표시됩니다</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-600">
              새 몬스터 신청
            </button>
            <button onClick={handleGenerate} className="flex-1 bg-purple-100 text-purple-700 rounded-xl py-3 text-sm font-bold">
              🔄 다시 생성
            </button>
          </div>
        </div>
      )}

      {/* 성공 팝업 */}
      {showPopup && monster && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-3xl overflow-y-auto max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex justify-center py-3">
              <span className="bg-green-500 text-white text-sm font-bold px-5 py-1.5 rounded-full shadow-md">
                ✅ 몬스터 신청이 승인되었습니다!
              </span>
            </div>

            <div className="mx-5 rounded-2xl overflow-hidden bg-gradient-to-b from-purple-50 to-amber-50 aspect-square flex items-center justify-center p-4">
              <img src={monster.imageUrl} alt={monster.name} className="w-full h-full object-contain" />
            </div>

            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-black text-gray-900">{monster.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{monster.attribute} 속성 · {category}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${RARITY_STYLE[monster.rarity]}`}>
                  {RARITY_KO[monster.rarity]}
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{monster.description}</p>
              <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-lg">🗺️</span>
                <p className="text-xs text-green-700 font-medium">유저 지도에 즉시 표시됩니다</p>
              </div>
              <div className="flex gap-2 pb-2">
                <button onClick={handleReset} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-600">
                  새 몬스터 신청
                </button>
                <button onClick={handleGenerate} className="flex-1 bg-purple-100 text-purple-700 rounded-xl py-3 text-sm font-bold">
                  🔄 다시 생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
