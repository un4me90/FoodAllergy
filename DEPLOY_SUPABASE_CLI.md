# Supabase CLI 사용 가이드

이 저장소는 Supabase도 VS Code 터미널에서 CLI 중심으로 다룰 수 있게 정리되어 있습니다.

## 준비

루트에서 한 번 의존성을 설치합니다.

```bash
npm install
```

그러면 `supabase` CLI가 루트 `devDependencies`로 설치됩니다.

## 로그인

Supabase 개인 액세스 토큰을 준비한 뒤 로그인합니다.

```bash
npm run supabase:login
```

토큰 발급 위치:

- Supabase Dashboard
- Account
- Access Tokens

## 프로젝트 연결

현재 프로젝트 ref는 `wjjcodoathuqbpebqbhu` 기준으로 스크립트를 준비해두었습니다.

```bash
npm run supabase:link
```

필요하면 DB 비밀번호를 입력하라는 프롬프트가 나옵니다.

## 원격 스키마 가져오기

```bash
npm run supabase:db:pull
```

원격 Supabase DB 구조를 로컬 migration 형태로 가져올 때 사용합니다.

## 로컬 변경사항 푸시

```bash
npm run supabase:db:push
```

로컬 migration을 원격 Supabase DB에 반영할 때 사용합니다.

## 타입 생성

```bash
npm run supabase:gen:types
```

필요하면 결과를 파일로 리다이렉션해서 사용할 수 있습니다.

예시:

```bash
npm run supabase:gen:types > supabase-types.ts
```

## 참고

- CLI 홈 디렉터리는 workspace 내부 `.supabase-home`으로 분리해 두었습니다.
- 따라서 Windows 권한 문제를 줄이면서 VS Code 터미널에서 바로 실행할 수 있습니다.
- 기존 Supabase 프로젝트를 삭제할 필요는 없습니다. 먼저 CLI 연결과 배포 흐름이 안정적으로 확인된 뒤 정리하는 편이 안전합니다.
