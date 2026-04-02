# Cloudtype + Supabase 배포 가이드

운영 표준 문서:

- 실제 배포/장애 대응/팀 공통 규칙은 [`DEPLOY_RUNBOOK_CLOUDTYPE_SUPABASE.md`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/DEPLOY_RUNBOOK_CLOUDTYPE_SUPABASE.md)를 우선 참고합니다.

이 폴더는 Cloudtype 애플리케이션 서버와 Supabase Postgres 조합으로 배포하는 기준으로 정리되어 있습니다.

## 구성

- 애플리케이션 서버: Cloudtype
- 데이터베이스: Supabase Postgres
- 프런트엔드: Vite로 빌드 후 Express가 정적 서빙
- 백엔드: Express + node-cron + web-push

## 1. Supabase 준비

1. Supabase 프로젝트를 생성합니다.
2. `Project Settings > Database`에서 연결 문자열을 확인합니다.
3. URI 형식의 연결 문자열을 복사합니다.

예시:

```text
postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
```

이 프로젝트는 [`backend/src/db/client.ts`](d:/SharedWork/00_VibeCoding/07_FoodAllergy/backend/src/db/client.ts)에서 `DATABASE_URL`로 Postgres에 연결하며, 기본적으로 SSL을 사용합니다.

## 2. 필수 환경변수

Cloudtype에 아래 값을 등록합니다.

```text
NODE_ENV=production
TZ=Asia/Seoul
PORT=3001
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
DATABASE_SSL=true
NEIS_API_KEY=your_neis_api_key
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@example.com
VAPID_EMAIL=mailto:admin@example.com
```

설명:

- `DATABASE_URL`: Supabase Postgres 접속 문자열
- `DATABASE_SSL`: Supabase는 보통 `true`
- `NEIS_API_KEY`: 급식 API 키
- `VAPID_*`: 웹 푸시 알림용 키
- `VAPID_SUBJECT`: `mailto:` 주소 또는 HTTPS URL 권장

## 3. VAPID 키 생성

로컬에서 한 번만 생성한 뒤 계속 같은 값을 사용합니다.

```bash
cd backend
npm install
npm run generate-vapid
```

생성된 `publicKey`, `privateKey`를 Cloudtype 환경변수에 등록합니다.

주의:

- 기존 운영 중인 앱에서 VAPID 키를 바꾸면 기존 푸시 구독이 무효화됩니다.

## 4. Cloudtype 설정 파일

배포 설정 파일은 [`.cloudtype/app.yaml`](d:/SharedWork/00_VibeCoding/07_FoodAllergy/.cloudtype/app.yaml) 입니다.

현재 설정 내용:

- Node 20 사용
- `frontend`, `backend` 의존성 설치
- 프런트 빌드 후 백엔드 빌드
- `node backend/dist/index.js`로 실행
- `3001` 포트 사용

## 5. Cloudtype 배포

1. 이 저장소를 GitHub에 푸시합니다.
2. Cloudtype에서 저장소를 연결합니다.
3. `.cloudtype/app.yaml`을 기준으로 앱을 생성합니다.
4. 환경변수를 입력합니다.
5. 배포 후 `/api/health`로 정상 응답을 확인합니다.

헬스체크 예시:

```text
https://[your-cloudtype-domain]/api/health
```

정상 응답 예시:

```json
{"ok":true}
```

## 6. 실행 구조

- 사용자가 앱에 접속하면 Express가 프런트 정적 파일을 서빙합니다.
- 급식 조회 API는 `/api/meal` 입니다.
- 푸시 관련 API는 `/api/push/*` 입니다.
- 서버 시작 시 DB 테이블을 자동 생성합니다.
- 스케줄러가 매일 05:30, 07:00, 11:00에 실행됩니다. 기준 시간대는 `Asia/Seoul` 입니다.

## 7. 저장 위치

서버 저장:

- `push_subscriptions`
- `meal_cache`
- `notification_runs`

브라우저 저장:

- 학교 정보
- 선택한 알레르기
- 푸시 구독 JSON 일부

## 8. 배포 후 확인 항목

1. `/api/health` 응답 확인
2. 앱 첫 설정 화면 진입 확인
3. 급식 조회 확인
4. 푸시 알림 권한 허용 후 구독 확인
5. 테스트 알림 발송 확인

## 9. 운영 주의사항

- Cloudtype 인스턴스를 여러 개 동시에 운영하면 스케줄러가 중복 실행될 수 있습니다.
- 같은 Supabase DB를 공유하는 서버를 둘 이상 띄울 경우 알림 운영 정책을 분리하는 것이 안전합니다.
- 이 폴더는 Cloudtype + Supabase 전용 기준으로 정리되어 있으므로 Render/Railway 설정은 제거했습니다.
