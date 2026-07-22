import { MultiAgentInfographic } from "@/components/home/architecture-infographics/MultiAgentInfographic";
import { RagPipelineInfographic } from "@/components/home/architecture-infographics/RagPipelineInfographic";
import { VectorDbInfographic } from "@/components/home/architecture-infographics/VectorDbInfographic";
import { DeploymentInfographic } from "@/components/home/architecture-infographics/DeploymentInfographic";
import { ARCHITECTURE_STACK } from "@/lib/architecture-stack";
import type { ReactNode } from "react";

type ArchitectureSection = {
  title: string;
  blurb: string;
  tags: string[];
  icon: (typeof ARCHITECTURE_STACK)[number]["icon"];
  imageFirst: boolean;
  infographic: ReactNode;
};

const INFOGRAPHICS: ReactNode[] = [
  <MultiAgentInfographic key="multi-agent" />,
  <RagPipelineInfographic key="rag" />,
  <VectorDbInfographic key="vector-db" />,
  <DeploymentInfographic key="deployment" />,
];

const ARCHITECTURE_SECTIONS: ArchitectureSection[] = ARCHITECTURE_STACK.map((item, index) => ({
  title: item.title,
  blurb: item.blurb,
  tags: item.tags,
  icon: item.icon,
  /** 홀수: 텍스트-좌/인포-우 → imageFirst false, 짝수: 반대 */
  imageFirst: index % 2 === 1,
  infographic: INFOGRAPHICS[index],
}));

export function ArchitectureStackSections() {
  return (
    <div className="space-y-16 sm:space-y-20 lg:space-y-24">
      {ARCHITECTURE_SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <section
            key={section.title}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16"
            aria-labelledby={`architecture-${section.title}`}
          >
            <div
              className={
                section.imageFirst
                  ? "order-2 lg:order-1"
                  : "order-2 lg:order-2"
              }
            >
              {section.infographic}
            </div>

            <div
              className={`min-w-0 ${
                section.imageFirst ? "order-1 lg:order-2" : "order-1 lg:order-1"
              }`}
            >
              <div className="inline-flex size-11 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
                <Icon size={22} aria-hidden />
              </div>
              <h2
                id={`architecture-${section.title}`}
                className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              >
                {section.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--moneo-muted)] sm:text-base">
                {section.blurb}
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {section.tags.map((tag) => (
                  <li key={tag}>
                    <span className="inline-flex rounded-md border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 font-mono text-[11px] text-indigo-200/90">
                      {tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
