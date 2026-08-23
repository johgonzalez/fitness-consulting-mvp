"use client"; import { useEffect } from "react";
export function ProfileAnalytics({slug}:{slug:string}){useEffect(()=>{void fetch("/api/analytics",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"profile_view",slug}),keepalive:true})},[slug]);return null}
