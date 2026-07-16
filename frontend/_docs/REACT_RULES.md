# React 코딩 규칙 (Monenon Frontend)

## useState 사용 원칙

**`useState`는 여러 개 두지 않습니다.**  
필드마다 `useState`를 나누면 리렌더·setter·의존성이 늘어나 유지보수가 어려워집니다.

- 관련 상태는 **하나의 객체**로 묶습니다.
- 폼 입력은 가능하면 **`<form>` + `FormData`** 로 읽고, 객체 state는 제출·UI 전용(로딩, 에러)만 둡니다.
- 객체 state 업데이트 시 **스프레드**로 불변 업데이트합니다.

```tsx
// ❌ BAD — useState 남발
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [nickname, setNickname] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// ✅ GOOD — UI·메타만 객체로, 폼 값은 제출 시 FormData
const [form, setForm] = useState({
  loading: false,
  error: null as string | null,
});

const updateForm = (patch: Partial<typeof form>) =>
  setForm((prev) => ({ ...prev, ...patch }));
```

---

## 폼 제출 패턴 (참조 코드)

아래 패턴을 기본으로 합니다. `e.currentTarget`은 제출한 `<form>` 요소입니다.

```tsx
const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const formProps = Object.fromEntries(formData.entries());
  // formProps: { email, password, nickname, ... } — input name과 일치

  updateForm({ loading: true, error: null });
  try {
    await signupApi(formProps);
  } catch (err) {
    updateForm({
      error: err instanceof Error ? err.message : "요청에 실패했습니다.",
    });
  } finally {
    updateForm({ loading: false });
  }
};
```

```tsx
<form onSubmit={handleSignup}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <input name="nickname" required />
  <button type="submit" disabled={form.loading}>가입</button>
  {form.error && <p role="alert">{form.error}</p>}
</form>
```

### FormData + 객체 state 조합

| 구분 | 방식 |
|------|------|
| 입력값 | `name` 속성 + `FormData` (제출 시 한 번에 읽기) |
| 로딩·에러·모달 열림 등 | `useState` **단일 객체** |
| 부분 수정 | `setX((prev) => ({ ...prev, ...patch }))` |

---

## `alert` 사용 금지 (디버그·임시 코드)

**불필요한 `alert()`는 커밋하지 않습니다.** 디버깅·폼 값 확인용으로 넣었다가 남겨 둔 `alert`는 리팩터링 시 **반드시 제거**합니다.

- 사용자 피드백은 `ui.error`, 토스트, 인라인 메시지(`role="alert"`) 등 UI로 표시합니다.
- `alert`는 브라우저 기본 다이얼로그라 UX가 끊기고, 비밀번호 등 민감 정보가 그대로 노출될 수 있습니다.

```tsx
// ❌ BAD — 제출 전후 디버그용 alert
alert(`닉네임: ${nickname}\n비밀번호: ${password}`);

// ✅ GOOD — 화면 내 에러·성공 메시지
patchUi({ error: "비밀번호가 일치하지 않습니다." });
```

---

## 리팩터링 체크리스트

1. 3개 이상의 `useState`가 같은 컴포넌트·같은 폼에 있으면 **병합 검토**
2. `value` / `onChange`로 모든 필드를 묶고 있으면 → **비제어 폼 + FormData** 검토
3. 병합 후에도 서로 무관한 도메인(예: 폼 vs 지도 좌표)이면 **분리 유지**
4. 디버그·확인용 **`alert()`가 있으면 제거** (UI state·인라인 메시지로 대체)

---

## Cursor에서 쓰는 방법

### 1) 파일 멘션 (권장)

채팅에 아래처럼 붙이면 이 규칙이 컨텍스트로 들어갑니다.

```text
@frontend/_docs/REACT_RULES.md
```

### 2) 복사해서 쓰는 고정 명령어

아래 블록을 그대로 붙여 넣으면, 매번 길게 설명하지 않아도 됩니다.

```text
@frontend/_docs/REACT_RULES.md 를 따르세요.

- useState는 많이 쓰지 말고, 관련 상태는 하나의 객체로 압축하세요.
- 폼은 아래 패턴을 참고하세요.
- 디버그·확인용 alert()는 제거하세요.

const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const formProps = Object.fromEntries(formData.entries());
  ...
};

위 파일의 FormData + 단일 객체 state 패턴으로 현재 컴포넌트를 리팩터링해 주세요.
```

### 3) 짧은 한 줄 명령

```text
@frontend/_docs/REACT_RULES.md 기준으로 useState를 객체 하나로 압축하고 FormData 폼 패턴으로 바꿔줘.
```

---

## 예시: Before → After

### Before

```tsx
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

const onSubmit = async () => {
  setLoading(true);
  try {
    await login({ email, password });
  } catch (e) {
    setError("로그인 실패");
  } finally {
    setLoading(false);
  }
};
```

### After

```tsx
const [ui, setUi] = useState({ loading: false, error: null as string | null });
const patchUi = (p: Partial<typeof ui>) => setUi((s) => ({ ...s, ...p }));

const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formProps = Object.fromEntries(new FormData(e.currentTarget).entries());
  patchUi({ loading: true, error: null });
  try {
    await login(formProps as { email: string; password: string });
  } catch {
    patchUi({ error: "로그인 실패" });
  } finally {
    patchUi({ loading: false });
  }
};
```
