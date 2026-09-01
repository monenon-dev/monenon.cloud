import Logo from "@/components/brand/Logo";
import { PRODUCT_NAME, SITE_NAME } from "@/lib/site-brand";

type MoneoServiceBrandProps = {
  subtitle?: string;
  logoSize?: number;
  className?: string;
};

/** 네이버·카카오 동의 화면 등 — Moneo 로고 + 사이트명 */
export function MoneoServiceBrand({
  subtitle,
  logoSize = 44,
  className = "",
}: MoneoServiceBrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo variant="symbol" theme="light" size={logoSize} />
      <div>
        <p className="text-xl font-bold tracking-tight text-slate-900">{SITE_NAME}</p>
        <p className="text-xs text-slate-500">
          {subtitle ?? `${PRODUCT_NAME} · 회원가입 · 약관 동의`}
        </p>
      </div>
    </div>
  );
}
