import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignLabClient } from "./DesignLabClient";

export const metadata: Metadata = {
  title: "FIT APP — Decision Lab V1",
  description: "Laboratório local de decisões visuais do PPerfil.",
  robots: { index: false, follow: false, nocache: true },
};

export default function DesignLabV1Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignLabClient />;
}
