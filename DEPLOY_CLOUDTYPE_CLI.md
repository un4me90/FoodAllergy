# Cloudtype CLI 배포

이 저장소는 Cloudtype의 Node 템플릿 대신 Dockerfile 기반으로 배포하도록 정리되어 있습니다. 이 방식이 현재 프로젝트 구조와 가장 잘 맞고, VS Code 터미널에서 반복 배포하기도 편합니다.

## 왜 Dockerfile 기반으로 바꿨나

Cloudtype의 기본 Node 템플릿은 단일 `package.json` 앱을 가정하는 경향이 있어, 현재처럼 `frontend`와 `backend`가 분리된 저장소에서는 경로 인식 오류가 반복될 수 있습니다.

이 저장소는 이미 [Dockerfile](d:/SharedWork/00_VibeCoding/07_FoodAllergy/Dockerfile)을 가지고 있으므로, Cloudtype가 이를 그대로 사용하게 설정했습니다.

## 준비

1. Node.js 설치
2. Cloudtype CLI 설치

```bash
npm i -g @cloudtype/cli
```

3. Cloudtype 로그인

```bash
ctype login
```

또는 토큰 방식:

```bash
ctype login -t YOUR_TOKEN
```

## 최초 1회

1. Cloudtype 프로젝트와 서비스를 준비합니다.
2. 환경변수를 Cloudtype에 등록합니다.
3. 저장소 루트에서 아래 명령을 실행합니다.

```bash
ctype apply
```

또는 VS Code 터미널에서:

```bash
npm run deploy:cloudtype
```

## 이후 배포

코드 수정 후 아래 둘 중 하나만 실행하면 됩니다.

```bash
ctype apply
```

```bash
npm run deploy:cloudtype
```

## 권장 사항

- 기존 Cloudtype 서비스는 새 CLI 배포가 정상 확인되기 전까지 삭제하지 않는 것을 권장합니다.
- 새 서비스가 정상 동작하면 그때 이전 실패 서비스는 정리하는 편이 안전합니다.
- 비밀값은 `.env`를 Git에 올리지 말고 Cloudtype 환경변수에 유지하세요.
