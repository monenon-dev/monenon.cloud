"use client";

/**
 * 수신자 이메일 입력 + Google 주소록 자동완성
 * - 한 글자 완성마다 검색 (compositionend + debounce 300ms)
 * - 드롭다운으로 이름·이메일 표시
 * - 선택 시 이메일 자동 입력
 */

import { useEffect, useRef, useState } from "react";
import { BookUser, Loader2, User } from "lucide-react";
import { searchContacts, type Contact } from "@/lib/contacts-api";

const CONTACTS_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";

function requestContactsToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = (window as unknown as {google: {accounts: {oauth2: {initTokenClient: (config: {client_id: string; scope: string; callback: (res: {access_token?: string; error?: string}) => void}) => {requestAccessToken: () => void}}}}}).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CONTACTS_SCOPE,
      callback: (res) => {
        if (res.access_token) resolve(res.access_token);
        else reject(new Error(res.error || "권한 거부"));
      },
    });
    client.requestAccessToken();
  });
}

interface ContactAutocompleteProps {
  value: string;
  onChange: (email: string) => void;
  googleToken: string | null;
  placeholder?: string;
  className?: string;
}

export function ContactAutocomplete({
  value,
  onChange,
  googleToken: externalToken,
  placeholder = "수신자 이메일 또는 이름",
  className = "",
}: ContactAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [token, setToken] = useState<string | null>(externalToken);
  const [connecting, setConnecting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleConnectContacts = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    setConnecting(true);
    try {
      const accessToken = await requestContactsToken(clientId);
      sessionStorage.setItem("google_access_token", accessToken);
      setToken(accessToken);
    } catch {
      // 사용자가 거부한 경우 조용히 실패
    } finally {
      setConnecting(false);
    }
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const doSearch = (q: string) => {
    if (!q.trim() || !token) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchContacts(q, token!);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    // 한글 조합 중에는 검색 안 함 (compositionend에서 처리)
    if (!composing) doSearch(v);
  };

  // 한글 한 글자 완성 시점
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setComposing(false);
    doSearch((e.target as HTMLInputElement).value);
  };

  const handleSelect = (contact: Contact) => {
    onChange(contact.email);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-1.5">
      {/* 주소록 연결 버튼 (토큰 없을 때만 표시) */}
      {!token && (
        <button
          type="button"
          onClick={handleConnectContacts}
          disabled={connecting}
          title="Google 주소록 연결"
          className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors whitespace-nowrap"
        >
          {connecting
            ? <Loader2 className="size-3 animate-spin" />
            : <BookUser className="size-3" />}
          주소록
        </button>
      )}
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={handleCompositionEnd}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`w-full pr-8 ${className}`}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-gray-400" />
        )}
      </div>

      {/* 드롭다운 */}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          {suggestions.map((c, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // input blur 방지
                  handleSelect(c);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
              >
                <div className="shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <User className="size-3.5 text-gray-400" />
                </div>
                <div className="min-w-0">
                  {c.name && (
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {c.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {c.email}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
