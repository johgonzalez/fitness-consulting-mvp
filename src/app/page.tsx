import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { BenefitsAndProofSection } from "@/components/sections/BenefitsAndProofSection";
import { OfferSection } from "@/components/sections/OfferSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { FinalCTASection } from "@/components/sections/FinalCTASection";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { ScrollTracking } from "@/components/ui/ScrollTracking";

export default function Home() {
  return <><Header/><main><HeroSection/><HowItWorksSection/><BenefitsAndProofSection/><OfferSection/><FAQSection/><FinalCTASection/></main><Footer/><FloatingWhatsApp/><ScrollTracking/></>;
}
