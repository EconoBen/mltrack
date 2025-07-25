import { Navigation } from "@/components/navigation";
import { HeroSection } from "@/components/hero-section";
import { ProblemSection } from "@/components/problem-section";
import { SolutionSection } from "@/components/solution-section";
import { CodeExample } from "@/components/code-example";
import { FeaturesSection } from "@/components/features-section";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navigation />
      <main>
        <HeroSection />
        <CodeExample />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}