import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { TrustBar } from "@/components/sections/TrustBar";
import { PainPointsSection } from "@/components/sections/PainPointsSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { BenefitsSection } from "@/components/sections/BenefitsSection";
import { AppExperienceSection } from "@/components/sections/AppExperienceSection";
import { AudienceSection } from "@/components/sections/AudienceSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { OfferSection } from "@/components/sections/OfferSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { FinalCTASection } from "@/components/sections/FinalCTASection";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { ScrollTracking } from "@/components/ui/ScrollTracking";

export default function Home() {
  return <><Header/><main><HeroSection/><TrustBar/><PainPointsSection/><HowItWorksSection/><BenefitsSection/><AppExperienceSection/><AudienceSection/><AboutSection/><TestimonialsSection/><OfferSection/><FAQSection/><FinalCTASection/></main><Footer/><FloatingWhatsApp/><ScrollTracking/></>;
}
