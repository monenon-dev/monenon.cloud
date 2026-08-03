---
name: deploy
description: >-
  프로덕션 배포를 수행합니다. 배포 전 테스트를 실행하고 체크리스트를 확인합니다.
disable-model-invocation: true
---

# Deploy

프로덕션 배포 전 체크리스트를 확인한 뒤 배포한다.

## 절차

1. 관련 테스트·빌드가 통과하는지 확인한다
2. `.env` / 시크릿이 커밋되지 않았는지 확인한다
3. 배포 대상(환경)·롤백 방법을 짧게 밝힌다
4. 사용자가 요청한 범위만 배포한다

## 참고

> watson `.claude/skills/deploy/SKILL.md`에서 이식. Monenon Docker / Vercel / EC2 절차에 맞게 보강한다.
