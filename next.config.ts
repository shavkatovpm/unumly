import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @blocknote/server-util ichkarida React.createContext ishlatadi — Next'ning
  // o'z bundle'i orqali yuklansa, RSC uchun cheklangan "react" versiyasi
  // almashtirib qo'yiladi (createContext yo'q). Bu paketni Node'ning oddiy
  // require()i orqali (haqiqiy react bilan) yuklash uchun tashqariga chiqarilgan.
  serverExternalPackages: ["@blocknote/server-util"],
};

export default nextConfig;
