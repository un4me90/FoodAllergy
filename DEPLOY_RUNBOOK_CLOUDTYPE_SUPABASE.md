# Cloudtype + Supabase Deployment Runbook

이 문서는 이 프로젝트를 `Cloudtype + Supabase` 조합으로 배포할 때, 팀원이나 에이전트가 같은 실수를 반복하지 않도록 실제 시행착오를 반영해 정리한 운영 지침서입니다.

대상 프로젝트:

- 프런트엔드: Vite + TypeScript
- 백엔드: Express + TypeScript
- DB: Supabase Postgres
- 배포: Cloudtype CLI + Dockerfile

## 1. 핵심 원칙

이 프로젝트는 Cloudtype의 기본 Node 템플릿보다 `Dockerfile 기반 배포`가 훨씬 안정적입니다.

따라서 배포 원칙은 아래처럼 고정합니다.

- Cloudtype 대시보드 수동 배포보다 `Cloudtype CLI` 우선
- Node 템플릿보다 `Dockerfile` 배포 우선
- 비밀값은 Git에 넣지 않고, 로컬 셸 환경변수에서 주입
- DB는 Supabase `Session pooler` 연결 문자열 사용

## 2. 현재 저장소에서 중요한 파일

- [`.cloudtype/app.yaml`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/.cloudtype/app.yaml)
- [`Dockerfile`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/Dockerfile)
- [`scripts/deploy-cloudtype.ps1`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/scripts/deploy-cloudtype.ps1)
- [`scripts/supabase-cli.ps1`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/scripts/supabase-cli.ps1)
- [`package.json`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/package.json)
- [`backend/src/db/client.ts`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/backend/src/db/client.ts)
- [`supabase/config.toml`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/supabase/config.toml)

## 3. 배포 전 준비

필수 도구:

- Node.js 20 이상
- Git
- Cloudtype CLI
- Supabase CLI

루트에서 의존성 설치:

```bash
npm install
```

Cloudtype CLI가 없다면:

```bash
npm install -g @cloudtype/cli
```

## 4. Supabase 연결 규칙

### 4.1 반드시 Session pooler 사용

Cloudtype 환경에서 `Direct connection`은 DNS/접속 문제를 일으킬 수 있었습니다.

따라서 `Supabase > Connect > Session pooler`의 연결 문자열을 사용합니다.

형식 예시:

```env
postgresql://postgres.<project-ref>:<PASSWORD>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require
```

주의:

- `Direct connection` 대신 `Session pooler` 우선
- 사용자명은 `postgres`가 아니라 `postgres.<project-ref>` 형식일 수 있음
- 문자열을 직접 조합하지 말고 Supabase가 제공한 값을 복사할 것

### 4.2 DB 비밀번호

DB 비밀번호는 Cloudtype 대시보드가 아니라 로컬 셸 환경변수로 주입합니다.

예시:

```bash
export DATABASE_URL='postgresql://postgres.<project-ref>:<PASSWORD>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require'
```

## 5. Cloudtype 배포 규칙

### 5.1 반드시 CLI로 배포

수동 UI 입력은 다음 문제가 반복됐습니다.

- 잘못된 Install/Build/Start 명령어 적용
- 환경변수 반영 누락
- 이전 설정 캐시/중복 변수 혼선
- Dockerfile 배포 시 git context 누락

따라서 아래 명령만 공식 배포 방식으로 사용합니다.

```bash
npm run deploy:cloudtype
```

### 5.2 deploy 스크립트가 하는 일

[`scripts/deploy-cloudtype.ps1`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/scripts/deploy-cloudtype.ps1)는 다음을 수행합니다.

- workspace 내부 `.cloudtype-home` 사용
- `CLOUDTYPE_TOKEN`이 있으면 자동 로그인
- 현재 셸 환경변수에서 필요한 값을 읽음
- 임시 배포 파일 `.cloudtype/app.generated.yaml` 생성
- `ctype apply -f .cloudtype/app.generated.yaml` 실행

즉 Cloudtype 대시보드에 비밀값을 직접 입력하지 않아도 됩니다.

## 6. 공식 배포 명령

Git Bash 기준:

```bash
export CLOUDTYPE_TOKEN='새로발급한_Cloudtype_토큰'
export DATABASE_URL='postgresql://postgres.<project-ref>:<PASSWORD>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require'
export DATABASE_SSL='true'
export NEIS_API_KEY='여기에_NEIS_API_KEY'
export VAPID_PUBLIC_KEY='여기에_VAPID_PUBLIC_KEY'
export VAPID_PRIVATE_KEY='여기에_VAPID_PRIVATE_KEY'
export VAPID_SUBJECT='mailto:admin@foodallergy.local'
export VAPID_EMAIL='mailto:admin@foodallergy.local'
npm run deploy:cloudtype
```

PowerShell 기준:

```powershell
$env:CLOUDTYPE_TOKEN='새로발급한_Cloudtype_토큰'
$env:DATABASE_URL='postgresql://postgres.<project-ref>:<PASSWORD>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require'
$env:DATABASE_SSL='true'
$env:NEIS_API_KEY='여기에_NEIS_API_KEY'
$env:VAPID_PUBLIC_KEY='여기에_VAPID_PUBLIC_KEY'
$env:VAPID_PRIVATE_KEY='여기에_VAPID_PRIVATE_KEY'
$env:VAPID_SUBJECT='mailto:admin@foodallergy.local'
$env:VAPID_EMAIL='mailto:admin@foodallergy.local'
npm run deploy:cloudtype
```

## 7. 실행 확인

정상 기동 로그 예시:

```text
[server] started: http://localhost:3001
[server] API: http://localhost:3001/api
```

정상 상태에서 확인할 것:

1. Cloudtype 서비스가 `Running`
2. `/api/health` 응답 확인
3. 웹 앱 접속 확인
4. 설정/급식 조회 확인
5. 푸시 구독 기능 확인

## 8. 실제로 발생했던 오류와 해결법

### 8.1 `/app/frontend/package.json` not found

원인:

- Cloudtype Node 템플릿이 현재 저장소 구조를 잘못 해석

해결:

- Node 템플릿 대신 Dockerfile 배포 사용

### 8.2 `tsc: not found`

원인:

- backend 빌드 시 devDependencies 미설치

해결:

- [`package.json`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/package.json)에서 backend install/build 흐름 보정
- [`Dockerfile`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/Dockerfile)에서 `npm --prefix backend ci --include=dev` 사용

### 8.3 `options.git is required`

원인:

- Cloudtype Dockerfile 배포에서 git context 누락

해결:

- [`.cloudtype/app.yaml`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/.cloudtype/app.yaml)
- [`scripts/deploy-cloudtype.ps1`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/scripts/deploy-cloudtype.ps1)

에 Git URL/branch 명시

### 8.4 `getaddrinfo ENOTFOUND db.<project>.supabase.co`

원인:

- Direct connection 사용
- 또는 잘못 조합한 호스트 사용

해결:

- Supabase `Session pooler` 연결 문자열 사용

### 8.5 `self-signed certificate in certificate chain`

원인:

- `DATABASE_URL`의 `sslmode=require`와 `pg` SSL 옵션 충돌

해결:

- [`backend/src/db/client.ts`](/d:/SharedWork/00_VibeCoding/07_FoodAllergy/backend/src/db/client.ts)에서 `sslmode` 등 SSL 관련 URL 파라미터 제거 후 앱 SSL 옵션 사용

### 8.6 Cloudtype deployment limit 초과

원인:

- 30분 내 배포 횟수 제한 초과

해결:

- 잠시 기다린 뒤 재시도
- 사소한 변경 후 무의미한 연속 재배포를 피할 것

## 9. Supabase CLI 운영 규칙

### 9.1 로그인

```bash
npm run supabase:login
```

### 9.2 프로젝트 링크

```bash
npm run supabase:link
```

### 9.3 타입 생성

```bash
npm run supabase:gen:types
```

### 9.4 db pull 주의사항

```bash
npm run supabase:db:pull
```

이 명령은 현재 환경에서 `Docker Desktop`이 필요합니다.

없으면 이런 에러가 날 수 있습니다.

```text
Docker Desktop is a prerequisite for local development.
```

따라서:

- Docker Desktop이 없으면 `db pull`은 생략 가능
- 배포 자체에는 필수 아님

## 10. 보안 규칙

절대 Git에 커밋하지 말 것:

- 실제 `DATABASE_URL`
- Cloudtype API 토큰
- Supabase DB 비밀번호
- `VAPID_PRIVATE_KEY`

토큰/비밀번호가 대화, 로그, 스크린샷, 문서에 노출되면:

1. 즉시 폐기 또는 변경
2. 새 값으로 다시 배포

## 11. 팀원/에이전트용 권장 작업 순서

새 배포를 맡은 사람은 아래 순서만 따르면 됩니다.

1. 최신 코드 pull
2. `npm install`
3. 필요한 환경변수 export
4. `npm run deploy:cloudtype`
5. Cloudtype 실행 로그 확인
6. `/api/health` 확인
7. 웹 앱 접속 확인

## 12. 결론

이 프로젝트의 공식 운영 조합은 다음으로 간주합니다.

- 서버 배포: Cloudtype CLI
- 애플리케이션 패키징: Dockerfile
- DB: Supabase Session pooler
- 로컬 DB 관리: Supabase CLI

핵심 배포 명령은 한 줄입니다.

```bash
npm run deploy:cloudtype
```

단, 그 전에 필요한 환경변수가 셸에 들어 있어야 합니다.
