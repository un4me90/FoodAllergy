# Render + Neon DB + UptimeRobot 배포 가이드

## 구성 요소

| 서비스 | 역할 | 비용 |
|---|---|---|
| [Render.com](https://render.com) | Node.js 앱 서버 | 무료 |
| [Neon.tech](https://neon.tech) | PostgreSQL DB | 무료 (0.5GB) |
| [UptimeRobot](https://uptimerobot.com) | 슬립 방지 핑 | 무료 (5분 간격) |

---

## 1단계: Neon DB 생성

1. https://neon.tech 가입 (GitHub 계정 가능)
2. **New Project** 생성
   - Project name: `food-allergy`
   - Region: `AWS / ap-southeast-1 (Singapore)` 권장
3. 생성 후 **Connection Details** 탭에서 Connection string 복사
   ```
   postgresql://[user]:[password]@[host]/[dbname]?sslmode=require
   ```
4. 이 값을 보관 (Render 환경변수에 사용)

---

## 2단계: GitHub에 코드 푸시

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/[계정]/[레포명].git
git push -u origin main
```

---

## 3단계: Render 배포

1. https://render.com 가입 (GitHub 계정 가능)
2. **New +** → **Blueprint**
3. GitHub 레포 연결
4. `render.yaml` 자동 감지 → `food-allergy-app` 서비스 생성 확인
5. **Environment Variables** 탭에서 다음 값 입력:

| 키 | 값 |
|---|---|
| `DATABASE_URL` | Neon Connection string (위에서 복사한 값) |
| `NEIS_API_KEY` | `c965fbd4fd904985ba1098b21f43a39b` |
| `VAPID_PUBLIC_KEY` | `.env`에서 복사 |
| `VAPID_PRIVATE_KEY` | `.env`에서 복사 |
| `VAPID_EMAIL` | `mailto:admin@foodallergy.local` |

6. **Deploy** 클릭
7. 배포 완료 후 URL 확인 (예: `https://food-allergy-app.onrender.com`)

---

## 4단계: UptimeRobot 슬립 방지 설정

Render 무료 플랜은 15분 비활성 시 슬립 진입 → UptimeRobot으로 방지

1. https://uptimerobot.com 가입
2. **Add New Monitor**
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `food-allergy keepalive`
   - URL: `https://food-allergy-app.onrender.com/api/health`
   - Monitoring Interval: `5 minutes`
3. **Create Monitor** 클릭

> 이후 5분마다 자동 핑 → 서버 슬립 방지

---

## 5단계: 동작 확인

```bash
# 학교 검색
curl "https://food-allergy-app.onrender.com/api/schools?q=석암"

# 오늘 급식 조회
curl "https://food-allergy-app.onrender.com/api/meal?regionCode=E10&schoolCode=7321031&date=$(date +%Y%m%d)"

# 헬스체크
curl "https://food-allergy-app.onrender.com/api/health"
```

---

## 포함 파일

- `render.yaml`: Render Blueprint 설정
- `backend/src/db/client.ts`: PostgreSQL 연결 (Neon SSL 지원)
- `backend/src/db/subscriptions.ts`: 푸시 구독 저장
- `backend/src/db/meals.ts`: 급식 캐시 저장

---

## 주의사항

- **VAPID 키는 절대 변경 금지** — 모든 푸시 구독이 무효화됨
- **Neon DB 무료 플랜**: 저장공간 0.5GB, 5분 미사용 시 DB 스케일다운
  (스케일다운 시 첫 쿼리에 ~1초 지연, 이후 정상)
- **Render 무료 플랜**: UptimeRobot 핑으로 슬립 방지하지만 07:00 크론 정확도는 환경에 따라 다를 수 있음
- **로컬 개발**: `dev.bat` 실행 후 http://localhost:5173

---

## 로컬 PC에서 슬립 방지 (보조 수단)

UptimeRobot 외에 Windows 작업 스케줄러로도 핑 가능:

```powershell
$taskName = 'FoodAllergyRenderKeepAlive'
$scriptPath = 'D:\SharedWork\00_VibeCoding\07_FoodAllergy\keepalive-render.ps1'
schtasks /Create /F /SC MINUTE /MO 5 /TN $taskName /RU SYSTEM /RL HIGHEST /TR "powershell.exe -ExecutionPolicy Bypass -File `"$scriptPath`""
```
