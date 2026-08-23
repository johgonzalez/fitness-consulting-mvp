import type { Metadata } from "next"; import { LeadQuiz } from "@/components/leads/LeadQuiz";
export const metadata:Metadata={title:"Encontre seu Personal | PPerfil",description:"Responda a um quiz rápido e encontre profissionais compatíveis com seu objetivo."};
export default function FindTrainerPage(){return <main className="leads-public"><LeadQuiz/></main>}
